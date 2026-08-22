# Stan projektu eDziennika KLA

Aktualizacja: 22 sierpnia 2026. Wersja przedwydaniowa Etapu 5.

## Co działa

- jedna aplikacja mobilna i desktopowa dla dyrektora, wykładowcy, rodzica i
  ucznia; osobne konto obsługi technicznej nie ma dostępu do treści rodzin,
- wspólne logowanie, zaproszenia e-mail i czasowe QR, role, sesje, odzyskiwanie
  hasła oraz gotowe TOTP MFA,
- kartoteki osób, grup, sal i lokalizacji, import CSV/XLSX z podglądem,
  eksport, archiwizacja, propozycje zmian i historia audytowa,
- tygodniowy grafik, widok dnia na telefonie, ręczne układanie, przeciąganie,
  Asystent oraz blokady kolizji sali, wykładowcy, grupy i ucznia,
- temat lekcji i obecność zapisywane przez dyrektora lub przypisanego
  wykładowcę,
- wersjonowane umowy PDF, akceptacja dokumentowa albo podpis poza systemem,
  kontrola podpisanego skanu i płatności wynikające z konkretnej wersji umowy,
- kanały grupowe, rozmowy utworzone przez dyrektora, ogłoszenia masowe,
  załączniki, potwierdzenia odczytu i trwała kolejka e-mail,
- centrum powiadomień każdej roli, tutorial pierwszego logowania, motyw ciemny,
  statystyki bez pełnych IP oraz dwustopniowe zgłaszanie błędu ze zrzutem,
- prywatne pliki poza katalogiem publicznym, sygnatury i limity plików,
  ClamAV w produkcyjnym profilu Raspberry oraz szyfrowany magazyn LUKS2,
- instalator VPS, instalator Raspberry Pi, stałe demo z Maca, kontrola zdrowia,
  szyfrowany backup Raspberry i prawdziwy test odtworzenia.

## Zweryfikowane w audycie przedwydaniowym

- `npm run check`: lint, TypeScript, schemat Prisma, 128 testów i kontrola
  sekretów,
- `npm run build`: pełny build Next.js 16,
- izolacja ról podczas klikania na realnej bazie demonstracyjnej,
- dyrektor: Start, Kartoteki, Grafik, Umowy, Płatności, Wiadomości,
  Powiadomienia, Ustawienia i Statystyki,
- wykładowca: własny plan, kartoteki w dozwolonym zakresie, wiadomości i
  powiadomienia; odmowa umów i płatności,
- rodzic: własne dzieci, plan, wiadomości, umowy, płatności i powiadomienia;
  odmowa panelu szkoły,
- uczeń: własny plan, wiadomości i powiadomienia; odmowa panelu szkoły, umów i
  płatności,
- brak poziomego przewijania na sprawdzonych ekranach 375 × 812 po korekcie
  opcji komunikatora; brak przewijania na 1440 × 900,
- produkcyjne nagłówki bezpieczeństwa oraz ścisły CSP z nonce na chronionych
  ekranach,
- zero znanych podatności z `npm audit --omit=dev`,
- aktualizacja Raspberry i VPS ma blokadę równoległego uruchomienia, backup,
  kontrolę zdrowia i automatyczny powrót do poprzedniego kodu.

Dowody ekranowe: `outputs/qa/pre-final/`. Pełny raport bezpieczeństwa:
`security_best_practices_report.md`. Model zagrożeń: `wr-threat-model.md`.

## Co nie jest jeszcze gotowe do produkcji

- materiały, zadania domowe, oddawanie prac i monitoring postępów (Etap 6),
- produkcyjny dostawca e-mail i SMS wraz z limitami kosztu,
- zatwierdzone przez prawnika/IOD wzorce umów, regulamin komunikatora,
  informacje RODO, retencja i analiza DPIA,
- produkcyjne MFA dyrektora, mocne indywidualne hasła i wyzerowana baza,
- UPS, domena HTTPS, monitoring zewnętrzny i wykonany na fizycznym Raspberry
  test instalacji, zaniku zasilania oraz odtworzenia z SFTP,
- dla VPS: szyfrowana kopia poza serwerem i test odtworzenia plików; pełny
  sejf danych jest obecnie przygotowany dla Raspberry.

Nie wolno wprowadzać prawdziwych danych dzieci, dopóki powyższa bramka nie
zostanie zamknięta i odnotowana w `BEZPIECZENSTWO_I_RODO.md`.

## Bezpieczny rytm kolejnych aktualizacji

1. Zmiana powstaje na osobnej gałęzi i używa migracji rozszerzających.
2. `npm run check`, `npm run build` i klikanie ról muszą przejść lokalnie.
3. Powstaje commit, paczka i suma SHA-256.
4. Aktualizator robi backup, migruje i przełącza wersję dopiero po buildzie.
5. Brak poprawnej kontroli zdrowia automatycznie przywraca poprzedni kod.
6. Dopiero sprawdzony commit trafia na demo i do odbioru klientki.

Pełna procedura: `AKTUALIZACJE_I_ROLLBACK.md` oraz `CYKL_TESTOWY.md`.

## Następna kolejność

1. Odbiór obecnego Etapu 5 wyłącznie na danych syntetycznych.
2. Etap 6: materiały, zadania, prace ucznia i postępy.
3. Zamknięcie prawne/RODO, konfiguracja dostawców i próba Raspberry.
4. Oddzielne środowisko produkcyjne i dopiero import rzeczywistych danych.
