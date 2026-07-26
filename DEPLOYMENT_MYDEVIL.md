# Pełny eDziennik na MyDevil — Node.js + PostgreSQL

## Najpierw ważne rozróżnienie

Samo wgranie ZIP-a do zwykłego katalogu FTP **nie uruchomi pełnego
eDziennika**. Strona pokazowa działa jako pliki statyczne, ale logowanie,
zaproszenia, kartoteki i historia wymagają stale działającego Node.js oraz
PostgreSQL.

Do testów z klientką używamy:

- `staging.kingslanguageacademy.pl` — pełna aplikacja i wyłącznie dane demo,
- osobnej bazy PostgreSQL dla stagingu,
- hostingu MyDevil MD2 lub lepszego z SSH, Node.js i PostgreSQL,
- `panel.kingslanguageacademy.pl` dopiero później, po bezpieczeństwie i odbiorze.

Nie przenoś prawdziwych danych dzieci, dopóki nie jest zamknięta checklista
`BEZPIECZENSTWO_I_RODO.md`.

## Co przygotowuje Codex

Na Macu:

```bash
npm run package:release
```

Gotowy plik:

```text
outputs/edziennik-kla-stage-2.zip
```

Paczka zawiera zbudowany serwer Next.js, punkt startowy `app.js` dla
Passengera, migracje bazy, publiczne zasoby, skrypty `migrate.sh` oraz
`setup-owner.sh` i tę instrukcję. Nie zawiera haseł, `.env`, bazy ani danych
użytkowników.

## Jednorazowe ustawienie usługi

Poniższe wartości wpisz własne:

- `LOGIN` — login konta MyDevil,
- `DOMENA` — `staging.kingslanguageacademy.pl`,
- `NAZWA_BAZY` — nazwa nowej bazy stagingowej,
- `pgsqlX.mydevil.net` — host pokazany dla Twojego serwera.

### 1. DNS i strona Node.js

1. W DNS domeny dodaj rekord dla `staging` zgodnie z danymi MyDevil.
2. W DevilWEB otwórz `Strony WWW` → `Dodaj stronę`.
3. Wpisz `staging.kingslanguageacademy.pl`.
4. Jako typ wybierz `Node.js`, wersję 22.
5. Włącz SSL Let’s Encrypt i wymuszenie HTTPS.

MyDevil wymaga, aby aplikacja była w:

```text
/usr/home/LOGIN/domains/staging.kingslanguageacademy.pl/public_nodejs
```

a plik startowy nazywał się `app.js`.

### 2. PostgreSQL

W DevilWEB:

1. Otwórz `PostgreSQL`.
2. Kliknij `Dodaj bazę`.
3. Nadaj osobną nazwę i silne, losowe hasło tylko dla stagingu.
4. Zapisz nazwę bazy/użytkownika i host `pgsqlX.mydevil.net`.

Adres połączenia ma postać:

```text
postgresql://NAZWA_BAZY:HASLO@pgsqlX.mydevil.net:5432/NAZWA_BAZY?schema=public
```

Nie zapisuj tego adresu w repozytorium ani przesyłanej paczce.

### 3. Wgranie paczki

Połącz się przez SFTP lub SSH. Rozpakuj zawartość katalogu `edziennik-kla`
bezpośrednio do `public_nodejs`, tak aby istniały:

```text
public_nodejs/app.js
public_nodejs/server.js
public_nodejs/.next/
public_nodejs/public/
public_nodejs/prisma/
public_nodejs/migrate.sh
```

Nie może powstać dodatkowe zagnieżdżenie
`public_nodejs/edziennik-kla/edziennik-kla`.

Jeżeli MyDevil utworzył plik startowy HTML, usuń wyłącznie:

```bash
rm /usr/home/LOGIN/domains/staging.kingslanguageacademy.pl/public_nodejs/public/index.html
```

### 4. Node.js 22 i zmienne środowiskowe

Po SSH:

```bash
mkdir -p ~/bin
ln -fs /usr/local/bin/node22 ~/bin/node
ln -fs /usr/local/bin/npm22 ~/bin/npm
```

Passenger na MyDevil czyta zmienne z `~/.bash_profile`, nie z `.bashrc`.
Dodaj tam poniższe wpisy z własnymi wartościami:

```bash
export DATABASE_URL='postgresql://NAZWA_BAZY:HASLO@pgsqlX.mydevil.net:5432/NAZWA_BAZY?schema=public'
export BETTER_AUTH_SECRET='LOSOWY_SEKRET_MINIMUM_32_BAJTY'
export BETTER_AUTH_URL='https://staging.kingslanguageacademy.pl'
export NEXT_PUBLIC_APP_URL='https://staging.kingslanguageacademy.pl'
export NEXT_PUBLIC_APP_RELEASE='stage-2'
export NEXT_PUBLIC_SUPPORT_EMAIL='ADRES_SZKOLY'
export EMAIL_FROM='ADRES_NADAWCY'
export RESEND_API_KEY=''
export FILE_STORAGE_PROVIDER='local'
export KLA_PRIVATE_FILES_DIR='/usr/home/LOGIN/.kla-private/staging'
export SMS_PROVIDER='disabled'
export KLA_SYSTEM_OWNER_PASSWORD='PRYWATNE_HASLO_AUTORA'
export KLA_SYSTEM_OWNER_SCHOOL_SLUG='kings-language-academy-demo'
export KLA_SYSTEM_OWNER_RESET_MFA='0'
```

Utwórz prywatny katalog plików poza katalogiem WWW:

```bash
mkdir -p /usr/home/LOGIN/.kla-private/staging
chmod 700 /usr/home/LOGIN/.kla-private/staging
source ~/.bash_profile
```

### 5. Migracje i restart

W katalogu aplikacji:

```bash
cd /usr/home/LOGIN/domains/staging.kingslanguageacademy.pl/public_nodejs
chmod +x migrate.sh start.sh setup-owner.sh
./migrate.sh
./setup-owner.sh
devil www restart staging.kingslanguageacademy.pl
```

Nie uruchamiaj `prisma migrate dev` na serwerze. Wdrożenie używa wyłącznie
zatwierdzonych migracji przez `migrate deploy`.

### 6. Sprawdzenie

Otwórz:

```text
https://staging.kingslanguageacademy.pl
```

Sprawdź kolejno:

1. strona główna i `eDziennik`,
2. logowanie czterech kont demo,
3. utworzenie zaproszenia i jednorazowego kodu QR,
4. kartoteki, import podglądowy i centrum powiadomień,
5. pierwsze logowanie `bog`, wymuszenie MFA i otwarcie `/panel/bog`,
6. brak dostępu dyrektora do `/panel/bog`,
7. brak dostępu ucznia do `/panel/szkola`,
8. wylogowanie i ponowne logowanie.

Log błędów MyDevil:

```text
/usr/home/LOGIN/domains/staging.kingslanguageacademy.pl/logs/error.log
```

Podgląd ostatnich wpisów:

```bash
tail -n 100 /usr/home/LOGIN/domains/staging.kingslanguageacademy.pl/logs/error.log
```

Nie usuwaj katalogu `logs`.

## Każda kolejna aktualizacja

1. Lokalnie wykonaj testy i `npm run package:release`.
2. Zrób backup bazy stagingowej.
3. Wgraj nową paczkę do osobnego katalogu roboczego.
4. Zachowaj zmienne w `~/.bash_profile` i prywatne pliki.
5. Podmień pliki aplikacji w `public_nodejs`.
6. Uruchom `./migrate.sh`.
7. Wykonaj `devil www restart staging.kingslanguageacademy.pl`.
8. Przejdź checklistę z punktu „Sprawdzenie”.

## Źródła operatora

- Node.js i Passenger: https://dev.pomoc.mydevil.net/Node.js/
- PostgreSQL: https://pomoc.mydevil.net/PostgreSQL/
- strony WWW: https://dev.pomoc.mydevil.net/Strona_WWW/
- SSL: https://dev.pomoc.mydevil.net/SSL/
