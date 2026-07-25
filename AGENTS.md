# AGENTS.md — eDziennik KLA 2026

## Kontekst

Właściciel projektu nie jest programistą, pracuje na macOS metodą vibe coding.
Komunikuj się po polsku i prostymi zdaniami. Najpierw podaj wynik oraz sposób
sprawdzenia. Jeśli potrzebna jest czynność poza repozytorium, podaj jedną
kompletną listę kroków zamiast serii pytań.

Budujemy mobilny eDziennik prywatnej szkoły wyłącznie języka angielskiego.
Największy problem biznesowy to grafik oparty na trzech zasobach: sala,
wykładowca i grupa. Role: dyrektor,
wykładowca, rodzic, uczeń. 1 września 2026 ma powstać pilot opisany w
`PLAN_2026.md`, nie cała wizja produktu.

## Źródła prawdy

1. Bieżące polecenie użytkownika.
2. `AGENTS.md`.
3. `PLAN_2026.md`.
4. `ARCHITEKTURA.md`.
5. `BEZPIECZENSTWO_I_RODO.md`.
6. `BRAND_I_UI.md`.
7. `OBSERVABILITY_I_ZGLOSZENIA.md`.
8. `DECYZJE.md`.

Pierwotny RTF był materiałem wejściowym. Nie kopiuj z niego bezkrytycznie cen,
uproszczeń prawnych ani decyzji technicznych.

## Zasady pracy

- Realizuj wyłącznie bieżący etap.
- Przed zmianą sprawdź stan Gita, zależności i testy.
- Nie nadpisuj zmian użytkownika i nie rób pobocznych refaktoryzacji.
- UI i komunikacja: polski. Kod, nazwy zmiennych i commity: angielski.
- Teksty UI trzymaj w obrębie modułu, gotowe do przyszłej lokalizacji.
- Zależność dodawaj tylko dla konkretnej potrzeby; przypinaj wersję w lockfile.
- Po decyzji architektonicznej dopisz wpis do `DECYZJE.md`.
- Każda zmiana obejmuje zależne pliki, migracje, testy, dokumentację i paczkę.
- Nigdy nie używaj prawdziwych danych dzieci w kodzie, logach, seedach,
  zrzutach ani na stagingu.
- Nie wdrażaj prawdziwych danych bez zamknięcia checklisty bezpieczeństwa.

## Git

- Główna gałąź: `main`.
- Kolejny etap: `stage/N-short-name`.
- Przed etapem tag ostatniej zaakceptowanej wersji: `stage-(N-1)-accepted`.
- Commit opisuje wynik, np. `feat(schedule): prevent room conflicts`.
- Nie commituj `.env`, baz, eksportów, backupów ani danych klientki.
- Bez force push i bez przepisywania współdzielonej historii.
- Przed commitem: `npm run check`, `npm run build`.
- Po etapie: `npm run package:release`.

## Stack

- Next.js 16 App Router, React 19, TypeScript, serwer Node.js.
- Tailwind CSS 4; dostępne komponenty, shadcn/ui tylko przez oficjalne CLI.
- PostgreSQL + Prisma ORM 7.
- Etap 1: Better Auth, zaproszenia, weryfikacja e-mail, TOTP 2FA dyrektora.
- Etap 3: dnd-kit.
- Analityka: Recharts.
- E-mail i SMS za interfejsami dostawców oraz przez kolejkę.
- PWA przez manifest Next.js i serwis worker w Etapie 5.
- Pilot: MyDevil MD2 lub lepszy; nie zwykły hosting współdzielony home.pl.

Zmiana stosu wymaga ADR i zgody użytkownika, jeśli wpływa na koszt, hosting albo
migrację danych.

## Architektura

- Moduły biznesowe w `modules/<feature>/`.
- Wspólna technika w `lib/`.
- Uprawnienia wyłącznie przez centralne `modules/access-control/can.ts`.
- Autoryzacja przy każdym odczycie i zapisie na serwerze. Ukrycie przycisku nie
  jest zabezpieczeniem.
- Dane biznesowe mają `schoolId`.
- Integracje z e-mailem, SMS i plikami są wymienne.
- Zmiany bazy są migracjami. Preferuj wdrożenia rozszerzające, kompatybilne
  wstecz; usuwanie dopiero w późniejszym wydaniu.
- Wrażliwe operacje zapisuj w audycie bez tokenów, haseł i nadmiarowych danych.
- Diagnostyka i zgłoszenia zachowują kontrakt prywatności z
  `OBSERVABILITY_I_ZGLOSZENIA.md`.

## UI dla osób nietechnicznych

- Mobile-first dla 375 px, potem desktop.
- Element interaktywny minimum 44 × 44 px.
- Brak poziomego przewijania.
- Jeden ekran = jedno główne zadanie.
- Codzienna czynność w maksymalnie trzech dotknięciach.
- Pusty ekran uczy i pokazuje następny krok.
- Błąd mówi, co zrobić dalej.
- Każda akcja ma stan ładowania, sukces lub błąd.
- Akcja nieodwracalna ma potwierdzenie z opisem skutku.
- Grafik: dzień po dniu na telefonie, tydzień na desktopie.
- Semantyczny HTML, klawiatura, focus, WCAG AA, `prefers-reduced-motion`.

## Bezpieczeństwo

- Domyślna decyzja autoryzacji: odmowa.
- Rodzic widzi tylko powiązane dzieci.
- Wykładowca widzi tylko przypisane grupy.
- Uczeń nie wchodzi do panelu szkoły.
- Dyrektor nie omija integralności, retencji, audytu ani niezmienności umów.
- Komunikator jest jawnie służbowy. Odczyt cudzej rozmowy przez dyrektora zawsze
  tworzy AuditLog i wymaga zatwierdzonej podstawy/treści regulaminu.
- Akceptacja umowy jest append-only; korekta tworzy nową wersję.
- Nie zakładaj, że zgoda rodzica jest zawsze podstawą przetwarzania dziecka.
  Art. 8 RODO stosuj tylko w jego właściwym zakresie i według tekstu prawnika.
- Retencja jest osobna dla umów, ocen, obecności, wiadomości, audytu i backupów.
- Sekrety wyłącznie w bezpiecznych zmiennych. Logi redagują e-mail, telefon,
  token, IP oraz treść wiadomości.
- Dyrektor ma 2FA przed prawdziwymi danymi.
- Backup szyfrowany, poza repozytorium i regularnie odtwarzany testowo.
- Nigdy nie rób zrzutu ekranu bez świadomego działania użytkownika i podglądu.

## Testy obowiązkowe

Przed końcem etapu:

1. `npm run check`,
2. `npm run build`,
3. klikanie na 375 × 812,
4. klikanie na 1440 × 900,
5. kontrola logów konsoli,
6. zrzuty do `outputs/qa/stage-N/`,
7. aktualna paczka przez `npm run package:release`.

Każdy etap z danymi ma testy:

- rodzic próbuje pobrać cudze dziecko → odmowa,
- wykładowca próbuje otworzyć cudzą grupę → odmowa,
- uczeń próbuje otworzyć panel dyrektora → odmowa.

Grafik dodatkowo testuje kolizję sali, wykładowcy i grupy, granice czasu,
powtarzalność, zmianę czasu i równoległe zapisy.

## Definicja ukończenia

- [ ] Kryteria etapu spełnione.
- [ ] Polski i prosty interfejs.
- [ ] `npm run check` i `npm run build` przechodzą.
- [ ] Poprzednie testy nadal przechodzą.
- [ ] Mobilny i desktopowy przepływ sprawdzony klikaniem.
- [ ] Brak błędów konsoli.
- [ ] Zrzuty QA zapisane.
- [ ] Brak sekretów i prawdziwych danych.
- [ ] README, `.env.example`, migracje i `DECYZJE.md` aktualne.
- [ ] Paczka wydaniowa aktualna.
- [ ] Użytkownik dostał prostą instrukcję sprawdzenia.
