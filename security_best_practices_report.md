# Raport bezpieczeństwa przed finałem — aktualizacja 2026-08-25

## Wynik

Nie wykryto krytycznej luki pozwalającej ominąć role albo pobrać cudze dane.
Testy obejmują odmowę rodzicowi dostępu do cudzego dziecka, wykładowcy do
cudzej grupy i uczniowi do panelu szkoły. Po poprawkach `npm audit` nie zgłasza
znanych podatności produkcyjnych. Projekt nadaje się do odbioru na danych
syntetycznych, lecz poniższe bramki nadal blokują prawdziwe dane dzieci.

## Poprawione ustalenia

### AUTHZ-002 — globalne API administracyjne dla dyrektora (krytyczne)

- **Reguła:** dyrektor zarządza wyłącznie własną szkołą i nie może używać
  globalnych operacji Better Auth.
- **Miejsce:** `modules/identity/auth/access.ts`, `lib/server/auth.ts`,
  `modules/access-control/can.ts`.
- **Dowód:** poprzednia mapa roli przekazywała dyrektorowi pełne uprawnienia
  administracyjne dostawcy tożsamości, które nie miały filtra `schoolId`.
- **Wpływ:** bezpośrednie wywołanie endpointu mogło listować lub zmieniać konta
  poza szkołą i prowadzić do eskalacji roli.
- **Naprawa:** dyrektor utracił globalne `adminAc`; biznesowe zarządzanie kontami
  pozostaje we własnych, ograniczonych akcjach, a konto techniczne jest tylko
  diagnostyczne. Dodano negatywne testy ról.
- **Stan:** zamknięte przed pre-release.

### PRIV-002 — treść rozmowy wysyłana do zewnętrznego e-maila (wysokie)

- **Reguła:** dostawca e-mail dostaje minimum informacji.
- **Miejsce:** `modules/messaging/notification-email.ts`,
  `modules/messaging/email-provider.ts`, `modules/messaging/queue.ts`.
- **Naprawa:** e-mail zawiera wyłącznie neutralne powiadomienie i link do
  zalogowanego eDziennika. Endpoint wymaga HTTPS, ścisłej listy hostów, blokuje
  przekierowania i ma timeout. Treść rozmowy pozostaje w prywatnej bazie.
- **Stan:** zamknięte i objęte testami.

### SUPPLY-001 — podatna zależność pośrednia (wysokie)

- **Reguła:** aktualne zależności bez znanych podatności wysokich.
- **Miejsce:** `package.json` (`overrides`) i `.github/workflows/ci.yml`.
- **Dowód:** Prisma wciągało `deepmerge-ts@7.1.5`; przypięto poprawioną 8.0.2,
  a CI uruchamia `npm audit --omit=dev`.
- **Wpływ:** podatny kod mógł działać podczas konfiguracji lub migracji.
- **Naprawa:** override, nowy lockfile, Dependabot i pełny build.
- **Ryzyko resztkowe:** usunąć override, gdy Prisma zaktualizuje zależność.
- **Fałszywy alarm:** nie — pakiet był obecny w drzewie instalacji.

### DEPLOY-001 — aktualizacja bez pewnego cofania (wysokie)

- **Reguła:** wydanie musi być atomowe, odwracalne i poprzedzone kopią.
- **Miejsce:** `raspberry/update.sh`, `deployment/home-vps/update.sh`,
  `scripts/check-migrations-safe.mjs`.
- **Dowód:** aktualizatory nie przywracały kodu po nieudanym healthchecku.
- **Wpływ:** wadliwa wersja mogła pozostawić niedostępny panel.
- **Naprawa:** blokada, build obok starej wersji, backup, healthcheck, rollback i
  polityka migracji expand–migrate–contract.
- **Ryzyko resztkowe:** rollback kodu nie cofa danych; destrukcyjne porządki są
  osobnym, późniejszym wydaniem.
- **Fałszywy alarm:** nie.

### CSP-001 — zbyt szerokie wykonywanie skryptów (średnie)

- **Reguła:** chronione strony nie dopuszczają dowolnego skryptu inline.
- **Miejsce:** `proxy.ts:5-31`, `app/layout.tsx`, `public/theme-init.js`.
- **Dowód:** poprzedni CSP zawierał `script-src 'unsafe-inline'`.
- **Wpływ:** skuteczny XSS miałby łatwiejsze wykonanie w panelu.
- **Naprawa:** nonce na wrażliwych trasach i zewnętrzna inicjalizacja motywu.
- **Ryzyko resztkowe:** style nadal wymagają `unsafe-inline`; skrypty nie.
- **Fałszywy alarm:** nie.

### DEMO-001 — pozorowany ekran w pełnej aplikacji (niskie)

- **Reguła:** użytkownik nie może pomylić makiety z funkcją biznesową.
- **Miejsce:** `app/panel/demo/page.tsx`.
- **Dowód:** trasa zawierała wizualne przyciski bez źródła danych.
- **Wpływ:** błędny odbiór funkcji.
- **Naprawa:** pełna aplikacja przekierowuje do prawdziwego panelu; makieta
  pozostaje wyłącznie w statycznym pokazie FTP.
- **Ryzyko resztkowe:** statyczny pokaz musi być opisany jako demo.
- **Fałszywy alarm:** nie.

## Otwarte bramki przed produkcją

### AUTH-001 — konta demo i 2FA dyrektora (krytyczne dla produkcji)

- **Miejsce:** `.env.example:14-19`, `raspberry/install.sh:87`.
- **Ryzyko:** łatwe hasła albo wyłączone 2FA oznaczają przejęcie danych rodzin.
- **Stan:** bezpieczna wartość domyślna zabrania łatwych danych; produkcja
  wymaga usunięcia seedów demo, silnych haseł i 2FA dyrektora.

### LEGAL-001 — wgląd dyrektora w wiadomości (wysokie)

- **Miejsce:** `DECYZJE.md` ADR-056 i `modules/messaging/`.
- **Ryzyko:** jawny i audytowany wgląd nadal wymaga zatwierdzonego regulaminu,
  obowiązku informacyjnego, celu oraz retencji.
- **Mitigacja:** właściciel techniczny nie czyta treści; audit nie kopiuje
  wiadomości. Prawnik/IOD musi zatwierdzić proces.

### STORAGE-001 — zewnętrzny backup i retencje (wysokie)

- **Miejsce:** `raspberry/README.md:94`, `raspberry/backup.sh`.
- **Ryzyko:** kopia na tym samym urządzeniu nie chroni przed awarią; okres `0`
  celowo niczego nie usuwa.
- **Mitigacja:** LUKS2, age, SFTP, ClamAV i test odtworzenia są przygotowane.
  Produkcja wymaga osobnego celu SFTP, retencji i udanego odtworzenia.

### OPS-001 — pojedynczy Raspberry Pi (średnie)

- **Ryzyko:** awaria prądu, Internetu lub SSD wyłącza usługę.
- **Mitigacja:** UPS, watchdog, monitoring i przećwiczona odbudowa na zapasowym
  urządzeniu.

## Kontrole wykonane

- centralna odmowa i izolacja `schoolId` (`modules/access-control/can.ts`),
- prywatne losowe klucze plików, brak zapisu w `public/`, 0600 i ClamAV,
- brak `eval`, `new Function` i niekontrolowanych HTML sinków,
- redakcja logów, brak pełnego IP i treści wiadomości w audycie,
- append-only dla zaakceptowanych wersji umów,
- kontrola sekretów, migracji, zależności, testów i builda w CI.
