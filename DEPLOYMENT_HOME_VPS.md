# Pełny eDziennik KLA na VPS home.pl

Ta instrukcja dotyczy wersji z logowaniem, PostgreSQL, kartotekami,
zaproszeniami, MFA, plikami i panelem diagnostycznym.

## Najważniejsza różnica

Obecny serwer `serwer2663515.hosting-home.pl` jest hostingiem współdzielonym.
Może nadal pokazywać statyczną stronę z katalogu `/public_html/kla-preview`,
ale nie może stale uruchomić serwera Node.js potrzebnego pełnemu eDziennikowi.

Pełna aplikacja wymaga osobnej usługi **VPS Linux**. Dla środowiska testowego
wybieramy:

- VPS Linux S lub lepszy,
- minimum 2 vCPU i 4 GB RAM,
- Ubuntu 24.04,
- bez panelu Plesk,
- domenę `staging.kingslanguageacademy.pl`,
- wyłącznie dane syntetyczne.

Strona główna na `kingslanguageacademy.pl` może pozostać na dotychczasowym
hostingu. Zmieniamy tylko rekord subdomeny `staging`.

## Co robi instalator

Paczka `outputs/edziennik-kla-home-vps-stage-5.zip` zawiera kod i instalator.
Jedno uruchomienie:

1. instaluje Docker Engine i Docker Compose z oficjalnego repozytorium,
2. generuje oddzielne losowe sekrety aplikacji i bazy,
3. uruchamia PostgreSQL 17 bez publicznego portu,
4. buduje aplikację Next.js na Linuksie,
5. wykonuje zatwierdzone migracje Prisma,
6. dodaje syntetyczne grupy, osoby i sale,
7. tworzy konto `bog` jako `SYSTEM_OWNER`,
8. wymusza MFA właściciela przy pierwszym logowaniu,
9. uruchamia automatyczny HTTPS przez Caddy,
10. zapisuje wolumeny bazy, plików i certyfikatów poza kontenerem aplikacji.

Hasło właściciela jest pobierane bez wyświetlania podczas instalacji. Nie
trafia do paczki, repozytorium ani stałych zmiennych kontenera aplikacji.

## Część A — co trzeba zrobić w Panelu home.pl

### 1. Zamów VPS

1. Zamów `VPS Linux S` lub lepszy.
2. Wybierz `Ubuntu 24.04`.
3. Nie dokupuj Pleska do tego wariantu.
4. Po aktywacji otwórz usługę VPS w Panelu Klienta.
5. Zapisz publiczny adres IPv4 serwera.
6. Podczas instalacji systemu dodaj klucz publiczny SSH, jeśli panel o niego
   zapyta. W przeciwnym razie zapisz jednorazowe hasło `root`.

Nie przesyłaj tych danych zwykłym e-mailem. Najlepiej dodać osobny klucz SSH
wykonawcy, który później można usunąć.

### 2. Ustaw subdomenę

1. W Panelu Klienta przejdź do `Domeny`.
2. Otwórz `kingslanguageacademy.pl`.
3. Utwórz subdomenę `staging`.
4. Wejdź w `Hosting DNS` → `Opcje` → `Zarządzaj rekordami DNS`.
5. Dodaj lub edytuj rekord:
   - typ: `A`,
   - nazwa/host: `staging`,
   - wartość: publiczny IPv4 nowego VPS.
6. Nie zmieniaj rekordów MX poczty ani rekordu głównej domeny.
7. Poczekaj na propagację DNS. Zwykle zmiana jest widoczna szybko, ale
   zależnie od pamięci DNS może potrwać dłużej.

Sprawdzenie na Macu:

```bash
dig +short staging.kingslanguageacademy.pl
```

Polecenie ma zwrócić IPv4 VPS. Dopiero wtedy Caddy pobierze certyfikat HTTPS.

## Część B — pierwsza instalacja

Po zakupie VPS można przekazać mi adres IP i dostęp przez osobny klucz SSH.
Wtedy wykonam część techniczną i testy. Samodzielna procedura wygląda tak:

### 1. Wyślij paczkę

Na Macu:

```bash
scp outputs/edziennik-kla-home-vps-stage-5.zip root@ADRES_IP:/root/
```

Przy pierwszym połączeniu potwierdź odcisk serwera dopiero po porównaniu go
z danymi usługi.

### 2. Zaloguj się i rozpakuj

```bash
ssh root@ADRES_IP
apt-get update
apt-get install -y unzip
mkdir -p /opt/kla
unzip /root/edziennik-kla-home-vps-stage-5.zip -d /opt/kla
cd /opt/kla/edziennik-kla-home-vps
```

### 3. Uruchom instalator

```bash
sudo ./deployment/home-vps/install.sh
```

Instalator poprosi tylko o:

- domenę — Enter zatwierdza `staging.kingslanguageacademy.pl`,
- hasło konta `bog`,
- powtórzenie hasła.

Na końcu pokaże adres logowania. Dane czterech syntetycznych kont testowych
zapisze w pliku dostępnym wyłącznie dla `root`:

`deployment/home-vps/DANE_TESTOWE.txt`

## Część C — test po instalacji

Otwórz:

- `https://staging.kingslanguageacademy.pl/panel/logowanie`,
- zaloguj się jako `bog`,
- skonfiguruj MFA aplikacją 2FAS, Google Authenticator, Microsoft
  Authenticator lub odpowiednikiem,
- zapisz kody awaryjne poza serwerem,
- przejdź do `/panel/bog`.

Potem sprawdź konta dyrektora, wykładowcy, rodzica i ucznia z pliku
`DANE_TESTOWE.txt`.

Stan i ostatnie bezpieczne logi:

```bash
cd /opt/kla/edziennik-kla-home-vps
sudo ./deployment/home-vps/status.sh
```

## Kopia bazy

Przed aktualizacją:

```bash
cd /opt/kla/edziennik-kla-home-vps
sudo ./deployment/home-vps/backup.sh
```

Kopia powstaje w `deployment/home-vps/backups/` z uprawnieniami tylko dla
`root`. To kopia lokalna. Przed prawdziwymi danymi trzeba dodatkowo ustawić
szyfrowaną kopię poza VPS i test odtwarzania.

## Aktualizacja

Nową paczkę rozpakuj do nowego katalogu. Przenieś do niego wyłącznie prywatny
plik `deployment/home-vps/.env`, a następnie uruchom:

```bash
sudo ./deployment/home-vps/update.sh
```

Skrypt blokuje równoległe aktualizacje, buduje nową wersję, gdy stara nadal
działa, robi kopię, uruchamia sprawdzone migracje i dopiero potem przełącza
aplikację. Po przełączeniu sprawdza stan usługi; jeśli test nie przejdzie,
automatycznie przywraca poprzedni obraz aplikacji. Nie uruchamia ponownie danych
demo ani nie zmienia hasła właściciela. Szczegóły:
`AKTUALIZACJE_I_ROLLBACK.md`.

## Czego jeszcze nie nazywamy produkcją

To jest staging do odbioru Etapów 0–5. Przed prawdziwymi danymi potrzebne są
między innymi:

- formalna umowa powierzenia i zamknięta checklista RODO,
- osobny adres `panel.kingslanguageacademy.pl`,
- zewnętrzny, szyfrowany backup z testem odtwarzania,
- dostawca prywatnego magazynu plików S3-compatible,
- skonfigurowana i zweryfikowana wysyłka e-mail,
- retencja danych, monitoring i alarmy,
- usunięcie danych i kont demo.

Nie przenosimy bazy z laptopa ani danych dzieci na staging.
