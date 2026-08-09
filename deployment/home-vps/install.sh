#!/usr/bin/env bash

set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/../.." && pwd)"
compose_file="$script_dir/compose.yml"
env_file="$script_dir/.env"
test_accounts_file="$script_dir/DANE_TESTOWE.txt"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Uruchom instalator przez: sudo ./deployment/home-vps/install.sh"
  exit 1
fi

if [[ ! -f "$project_dir/package.json" ]]; then
  echo "Nie znaleziono plików aplikacji. Uruchom skrypt z rozpakowanej paczki."
  exit 1
fi

if [[ -f "$env_file" ]]; then
  echo "Instalacja ma już prywatny plik .env."
  echo "Aktualizację wykonaj przez: sudo ./deployment/home-vps/update.sh"
  exit 1
fi

read -r -p "Domena testowa [staging.kingslanguageacademy.pl]: " app_domain
app_domain="${app_domain:-staging.kingslanguageacademy.pl}"

if [[ ! "$app_domain" =~ ^[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
  echo "Podaj samą nazwę domeny, bez https:// i bez ukośnika."
  exit 1
fi

read -r -s -p "Hasło konta obsługi technicznej (minimum 12 znaków): " owner_password
echo
read -r -s -p "Powtórz hasło konta obsługi technicznej: " owner_password_repeat
echo

if [[ ${#owner_password} -lt 12 ]]; then
  echo "Hasło jest za krótkie."
  exit 1
fi

if [[ "$owner_password" != "$owner_password_repeat" ]]; then
  echo "Hasła nie są identyczne."
  exit 1
fi

if [[ "$owner_password" =~ [[:space:]\"\'\$\\] ]]; then
  echo "Hasło nie może zawierać spacji, cudzysłowu, apostrofu, dolara ani ukośnika wstecznego."
  exit 1
fi

install_docker() {
  if command -v docker >/dev/null 2>&1 \
    && docker compose version >/dev/null 2>&1; then
    return
  fi

  if [[ ! -r /etc/os-release ]]; then
    echo "Nie można rozpoznać systemu. Instalator obsługuje Ubuntu 24.04."
    exit 1
  fi

  # shellcheck disable=SC1091
  source /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]]; then
    echo "Instalator obsługuje Ubuntu. Wykryto: ${ID:-nieznany system}."
    exit 1
  fi

  echo "Instaluję Docker Engine i Docker Compose z oficjalnego repozytorium..."
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  cat >/etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: ${UBUNTU_CODENAME:-$VERSION_CODENAME}
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF

  apt-get update
  apt-get install -y \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin
  systemctl enable --now docker
}

install_docker

postgres_password="$(openssl rand -hex 24)"
auth_secret="$(openssl rand -hex 48)"
demo_password="$(openssl rand -hex 16)"

umask 077
cat >"$env_file" <<EOF
APP_DOMAIN=${app_domain}
POSTGRES_DB=kla_edziennik
POSTGRES_USER=kla_app
POSTGRES_PASSWORD=${postgres_password}
DATABASE_URL=postgresql://kla_app:${postgres_password}@db:5432/kla_edziennik?schema=public
BETTER_AUTH_SECRET=${auth_secret}
BETTER_AUTH_URL=https://${app_domain}
NEXT_PUBLIC_APP_URL=https://${app_domain}
NEXT_PUBLIC_APP_RELEASE=0.5.0-stage-2
NEXT_PUBLIC_SUPPORT_EMAIL=kingsjezykiobce@gmail.com
KLA_SYSTEM_OWNER_SCHOOL_SLUG=kings-language-academy-demo
KLA_REQUIRE_DIRECTOR_MFA=0
FILE_STORAGE_PROVIDER=local
KLA_PRIVATE_FILES_DIR=/app/.data/private-files
EMAIL_FROM=
RESEND_API_KEY=
SMS_PROVIDER=disabled
SMS_API_KEY=
SMS_MONTHLY_LIMIT=200
MESSAGE_REFRESH_MS=8000
LOG_LEVEL=info
EOF

cat >"$test_accounts_file" <<EOF
eDziennik KLA — syntetyczne konta testowe

Adres: https://${app_domain}/panel/logowanie
Wspólne hasło kont demo: ${demo_password}

Dyrektor: dyrektor.demo@invalid.example
Wykładowca: wykladowca.demo@invalid.example
Rodzic: rodzic.demo@invalid.example
Uczeń: uczen.panel.demo@invalid.example

Konto techniczne:
Login: bog
Hasło: podane podczas instalacji (nie zapisano go w tym pliku)
MFA: obowiązkowe przy pierwszym logowaniu
EOF

chmod 600 "$env_file" "$test_accounts_file"

compose() {
  docker compose --env-file "$env_file" -f "$compose_file" "$@"
}

echo "Buduję aplikację na serwerze..."
compose build --pull app
compose up -d db
compose run --rm app ./migrate.sh
compose run --rm -e KLA_DEMO_PASSWORD="$demo_password" app ./seed-demo.sh
compose run --rm app ./apply-director-mfa-policy.sh
compose run --rm -e KLA_SYSTEM_OWNER_PASSWORD="$owner_password" app ./setup-owner.sh
unset owner_password owner_password_repeat
compose up -d

echo "Czekam na uruchomienie aplikacji..."
for attempt in {1..30}; do
  app_status="$(
    compose ps --format json app 2>/dev/null \
      | grep -o '"Health":"[^"]*"' \
      | head -1 \
      | cut -d'"' -f4 \
      || true
  )"
  if [[ "$app_status" == "healthy" ]]; then
    break
  fi
  if [[ "$attempt" -eq 30 ]]; then
    echo "Aplikacja nie osiągnęła stanu healthy. Ostatnie logi:"
    compose logs --tail=100 app
    exit 1
  fi
  sleep 2
done

compose ps
echo
echo "Gotowe: https://${app_domain}/panel/logowanie"
echo "Dane kont demo: ${test_accounts_file}"
echo "Konto obsługi technicznej wymusi konfigurację MFA przy pierwszym logowaniu."
