# Walidacja Etapu 2 — 2026-07-26

## Automatyczne

- `npm run check` — OK
- `npm run build` — OK
- 13 plików testowych / 46 testów — OK
- walidacja Prisma — OK
- kontrola sekretów — OK
- migracja `20260726174624_stage2_invitations_and_record_changes` — zastosowana
- `npm run package:preview` — OK
- `npm run package:release` — OK
- test integralności obu ZIP — OK

## Produkcyjny smoke test przez HTTP

- strona główna — 200
- pojedyncze logowanie — 200
- wykładowca otwiera przypisane kartoteki — 200
- wykładowca próbuje otworzyć Narzędzia — 307 do `brak-dostepu`
- rodzic próbuje otworzyć kartoteki szkoły — 307 do `brak-dostepu`
- log serwera podczas testu — bez błędów
- sesje utworzone do testu — wylogowane

## Ponowny odbiór użytkownika — 2026-07-28

- `npm run check` — OK, 16 plików i 56 testów,
- `npm run build` — OK,
- dyrektor loguje się bez MFA i otwiera kartoteki, zaproszenia oraz narzędzia,
- wykładowca widzi wyłącznie przypisaną grupę i osoby,
- rodzic nie otwiera kartotek szkoły,
- uczeń nie otwiera panelu szkoły,
- dyrektor nie otwiera panelu `Bóg`,
- konto `Bóg` po haśle przechodzi obowiązkowo do konfiguracji MFA,
- karta osoby zamyka się klawiszem `Escape`, a fokus wraca do jej przycisku,
- kod QR powstaje, ma przypisaną rolę i można go cofnąć,
- szablon CSV pokazuje 6 poprawnych wierszy przed zapisem,
- eksport CSV rozpoczyna pobieranie,
- brak błędów i ostrzeżeń w konsoli przeglądarki,
- brak poziomego przewijania przy 375 × 812 i 1440 × 900,
- po poprawce wszystkie sprawdzone cele dotykowe mają minimum 44 × 44 px.

Zrzuty z ponownego odbioru:

- `../stage-2-audit-2026-07-28/01-director-mobile-375x812.png`,
- `../stage-2-audit-2026-07-28/02-director-desktop-1440x900.png`,
- `../stage-2-audit-2026-07-28/03-director-mobile-fixed-375x812.png`.
