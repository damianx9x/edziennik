# eDziennik KLA — technical handoff przed pre-release

**Stan dokumentu:** 25 sierpnia 2026  
**Odbiorca:** inżynier oceniający architekturę, bezpieczeństwo i gotowość pilota  
**Zakres:** aplikacja dla jednej prywatnej szkoły języka angielskiego; nie jest
to jeszcze deklaracja gotowości produkcyjnej.

## Executive summary

Repozytorium zawiera modularny monolit Next.js z serwerową autoryzacją,
PostgreSQL i prywatnym magazynem plików. Ten wybór minimalizuje liczbę ruchomych
elementów dla małej szkoły, a jednocześnie zachowuje granice modułów i adaptery
dla e-maila, SMS, plików oraz przyszłego realtime. Najbardziej złożona domena —
grafik — ma transakcyjną kontrolę kolizji i deterministyczny solver ograniczeń.

Pre-release obejmuje: konta i role, kartoteki, relacje rodzinne, lokalizacje,
grafik, obecność, umowy i raty, komunikator, powiadomienia, materiały, zadania
oraz opisowe obserwacje postępu. Dane odbiorowe są wyłącznie syntetyczne.
Najważniejszą pozostałą pracą przed produkcją jest zamknięcie bramki prawnej i
RODO, uruchomienie MFA, konfiguracja dostawców, test na fizycznym Raspberry Pi
oraz udokumentowane odtworzenie szyfrowanego backupu spoza urządzenia.

## Stos i uzasadnienie

| Warstwa | Technologia | Powód wyboru |
| --- | --- | --- |
| aplikacja | Next.js 16 App Router, React 19, TypeScript | jeden wdrażalny artefakt, SSR/RSC i serwerowe akcje bez osobnego API dla pilota |
| UI | Tailwind CSS 4, własne tokeny i małe komponenty | mobile-first, przewidywalny CSS, brak ciężkiego frameworka komponentów |
| autoryzacja | Better Auth 1.6 | sesje, hasła, reset i TOTP bez tworzenia własnej kryptografii |
| dane | PostgreSQL, Prisma 7 z adapterem `pg` | transakcje, blokady doradcze, jawne migracje i bezpieczne relacje |
| walidacja | Zod 4 | jeden kontrakt wejścia po stronie serwera i formularza |
| testy | Vitest, ESLint, TypeScript, real-browser QA | szybkie testy reguł oraz osobna kontrola faktycznych przepływów |
| pliki | adapter `FileStorage`, lokalny prywatny katalog / szyfrowany SSD | brak publicznych URL-i i możliwość późniejszego przejścia na S3-compatible |
| edge | Cloudflare Tunnel → nginx na `127.0.0.1:8080` | brak publicznego portu originu i stały HTTPS dla pilota |

Celowo nie ma mikroserwisów, Redisa, Kafki ani Kubernetesa. Przy obecnej skali
zwiększałyby powierzchnię awarii i koszt operacyjny. Trwały outbox e-mail
znajduje się w PostgreSQL; interfejs pozwala zastąpić procesor kolejką bez
zmiany domeny.

## Granice kodu i danych

- `app/` — routing i kompozycja ekranów; logika biznesowa nie powinna tu rosnąć.
- `modules/<feature>/` — Zod, reguły dostępu, serwisy, akcje i komponenty domeny.
- `modules/access-control/can.ts` — centralna decyzja uprawnień, domyślnie odmowa.
- `lib/` — współdzielona technika: baza, sesja, nagłówki i diagnostyka.
- `prisma/` — schemat, rozszerzające migracje i syntetyczny seed demonstracyjny.
- `scripts/`, `deployment/`, `raspberry/` — pakowanie, kontrola zdrowia,
  aktualizacja, backup i rollback.

Każdy rekord biznesowy jest ograniczony przez `schoolId`. Identyfikator w URL
nie daje prawa odczytu: sesja, rola, przynależność do szkoły oraz relacja
rodzic–dziecko / wykładowca–grupa są sprawdzane po stronie serwera.

## Kluczowe decyzje domenowe

### Grafik

`ScheduleSlot` wskazuje grupę, salę, wykładowcę i czas. Konflikt obejmuje salę,
wykładowcę, grupę oraz wspólnego ucznia. Zapis jest serializowany blokadą
doradczą PostgreSQL per szkoła, więc dwa poprawne podglądy nie mogą jednocześnie
zapisać sprzecznych zmian. Asystent generuje szkic, wyjaśnia ograniczenia i
publikuje dopiero po ponownej walidacji. Dostępność wykładowcy jest dzienna i
lokalizacyjna; kierunkowe `LocationTravelRule` opisują minimalny czas przejazdu.

Dyrektor zmienia opublikowany grafik. Wykładowca tworzy
`ScheduleChangeRequest`; zmiana działa dopiero po akceptacji. Odwołanie lekcji
ma trwały powód, autora i stan powiadomienia grupy.

### Umowy i płatności

Treść prawną stanowi niezmienny PDF. Korekta tworzy nową `ContractVersion`, a
akceptacja wskazuje dokładny hash pakietu: umowę/RODO, cennik oraz harmonogram.
Proces dokumentowy nie jest przedstawiany jako kwalifikowany podpis.
`ContractAssignment` wiąże wersję z rodzicem i dzieckiem. Raty są rekordami
pochodnymi dla ręcznego statusu — aplikacja nie przetwarza płatności ani kart.

### Nauka i postępy

Materiał i zadanie należą do grupy. Oddanie zadania ma stan, opcjonalny prywatny
plik i informację zwrotną. Dostęp rodzica jest wyprowadzany wyłącznie z aktywnej
relacji z dzieckiem. `StudentProgressObservation` zapisuje opis oraz oceny
umiejętności 1–5 w konkretnym czasie. Jest pomocą pedagogiczną, nie diagnozą,
rankingiem ani automatyczną predykcją zachowania. UI może pokazywać trend
opisowy, lecz nie powinno podejmować decyzji o dziecku.

### Komunikacja

Kanały grupowe wynikają z zapisów, a rozmowy bezpośrednie z kontrolowanej listy
uczestników. Wiadomość i zadania e-mail powstają w jednej transakcji. Treść
wiadomości nie jest kopiowana do zewnętrznego e-maila; odbiorca dostaje
neutralne powiadomienie i bezpieczny link. Dostęp dyrektora do cudzej rozmowy
jest służbowy, widoczny w zasadach i audytowany.

## Security posture

- cookie sesyjne i chronione trasy działają po HTTPS; publiczna rejestracja jest
  wyłączona, a rola pochodzi z jednorazowego zaproszenia;
- role panelowe nie dziedziczą administracyjnego API Better Auth;
- konto obsługi technicznej nie ma dostępu do danych pedagogicznych ani rodzin;
- pliki są poza `public/`, mają losowy klucz, hash, limit, kontrolę sygnatury i
  autoryzację przy każdym pobraniu;
- produkcyjny profil Raspberry wymaga ClamAV i trzyma bazę z dokumentami na
  LUKS2; klucz odzyskiwania nie jest zapisany na urządzeniu;
- logi nie powinny zawierać haseł, tokenów, treści wiadomości, pełnych adresów
  IP ani danych dzieci; zdarzenia biznesowe trafiają do `AuditLog`;
- CSP, `no-store` i `no-transform` chronią prywatny panel; origin nginx nasłuchuje
  tylko lokalnie, a Cloudflare Tunnel udostępnia HTTPS;
- migracje wydania są rozszerzające. Kontrola CI blokuje typowe destrukcyjne
  polecenia SQL oraz przypadkowe sekrety.

Model zagrożeń znajduje się w `wr-threat-model.md`, a bieżący raport w
`security_best_practices_report.md`. Nadal wymagane są: zewnętrzny test
odtworzenia, konfiguracja retencji, MFA wszystkich uprzywilejowanych kont,
rate limits sprawdzone na docelowym originie i okresowy proces aktualizacji.

## Wydanie, aktualizacja i rollback

1. Gałąź etapu przechodzi `npm ci`, `npm run check`, `npm audit --omit=dev` i
   `npm run build`.
2. Real-browser QA obejmuje role, 375 × 812 i 1440 × 900, konsolę oraz zrzuty.
3. Dopiero czysty commit jest pakowany. Manifest oraz `.sha256` wiążą paczkę z
   konkretnym commitem.
4. Aktualizator buduje kandydackie wydanie obok aktywnego, tworzy szyfrowany
   backup, wykonuje migracje, przełącza usługę i sprawdza `/api/health`.
5. Błąd healthchecku cofa kod. Migracji danych nie cofa automatycznie, dlatego
   obowiązuje expand → migrate → contract.
6. Odtworzenie bazy jest osobną, jawną operacją do kandydackiej bazy. Dopiero
   po weryfikacji przełącza dane i pliki; błąd przywraca poprzedni stan.

Raspberry: `sudo kla-update "/ścieżka/do/rozpakowanej-paczki"`, potem
`sudo kla-status`. Pełna procedura i ograniczenia są w
`AKTUALIZACJE_I_ROLLBACK.md` oraz `raspberry/README.md`.

## Deployments

- **local** — macOS, osobna baza syntetyczna, `npm run dev`;
- **demo** — stały adres HTTPS przez Cloudflare Tunnel do Maca, tylko dane
  `invalid.example`; demonstracja wskazuje jeden commit;
- **pilot Raspberry** — Raspberry Pi OS 64-bit, aplikacja jako systemd,
  PostgreSQL i pliki na LUKS2, nginx loopback, tunel jako systemd;
- **VPS** — alternatywa z Node/PostgreSQL; statyczny home.pl nie uruchomi tras
  serwerowych, sesji, bazy, kolejki ani prywatnych pobrań.

Środowiska i sekrety muszą być rozdzielone. Produkcyjnej bazy nigdy nie kopiuje
się na demo. Paczka nie zawiera `.env`, bazy, backupu ani danych klientki.

## Główne ryzyka i rekomendowana kolejność

| Priorytet | Ryzyko | Działanie przed produkcją |
| --- | --- | --- |
| P0 | prawo/RODO i treści umów niezatwierdzone | podpis prawnika/IOD pod wzorcami, retencją, komunikatorem i DPIA |
| P0 | pojedynczy Raspberry to single point of failure | UPS, monitoring zewnętrzny, SFTP poza lokalem i udokumentowany restore drill |
| P0 | łatwe konta demo | wyzerować bazę, usunąć konta demo, indywidualne hasła i wymuszone MFA |
| P1 | dostawcy e-mail/SMS i koszty | umowy powierzenia, limity, retry/dead-letter i alerty |
| P1 | duży zakres bez pełnego E2E CI | utrzymać testy RBAC i dodać krytyczne scenariusze Playwright do CI |
| P1 | pliki oraz retencja | produkcyjny test ClamAV, polityka usuwania i test odzyskania dokumentów |
| P2 | solver wraz ze wzrostem skali | mierzyć czas/jakość; adapter umożliwia później OR-Tools/Timefold |
| P2 | jeden monolit | pozostawić, dopóki profil obciążenia nie uzasadni wydzielenia workera |

## Pytania do niezależnego review

1. Czy reguły dostępu mają brakujące ścieżki IDOR lub nadmiarowy odczyt relacji?
2. Czy blokady i transakcje grafiku wystarczą przy równoległej publikacji?
3. Czy dowody akceptacji umowy i model append-only odpowiadają zatwierdzonemu
   procesowi prawnemu szkoły?
4. Czy model FileStorage i restore zachowuje atomowość bazy względem plików?
5. Czy operacyjny koszt self-hostingu Raspberry jest akceptowalny wobec małego
   zarządzanego VPS/PostgreSQL?
6. Jakie scenariusze E2E i chaos/recovery powinny zostać bramką kolejnego release?

## Powtarzalna weryfikacja

```bash
npm ci
npm run check
npm audit --omit=dev
npm run build
npm run check:raspberry
npm run package:release
npm run package:raspberry
```

Po komendach nadal wymagane jest klikanie każdej roli na telefonie i desktopie,
sprawdzenie logów, publicznego HTTPS oraz zgodności commita demo z paczką.
