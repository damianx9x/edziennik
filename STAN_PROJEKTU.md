# Stan projektu eDziennika KLA

Aktualizacja: 25 sierpnia 2026. Kandydat pre-release Etapu 6.

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
- dzienna i lokalizacyjna dostępność wykładowcy, preferencje ucznia, minimalne
  czasy przejazdu, powody odwołań oraz prośby wykładowcy zatwierdzane przez
  dyrektora,
- wersjonowane umowy PDF, akceptacja dokumentowa albo podpis poza systemem,
  kontrola podpisanego skanu i płatności wynikające z konkretnej wersji umowy,
- kanały grupowe, rozmowy utworzone przez dyrektora, ogłoszenia masowe,
  załączniki, potwierdzenia odczytu i trwała kolejka e-mail,
- centrum powiadomień każdej roli, tutorial pierwszego logowania, motyw ciemny,
  statystyki bez pełnych IP oraz dwustopniowe zgłaszanie błędu ze zrzutem,
- prywatne pliki poza katalogiem publicznym, sygnatury i limity plików,
  ClamAV w produkcyjnym profilu Raspberry oraz szyfrowany magazyn LUKS2,
- instalator VPS, instalator Raspberry Pi, stałe demo z Maca, kontrola zdrowia,
  szyfrowany backup Raspberry i prawdziwy test odtworzenia,
- profil `--local-demo` Raspberry: szyfrowany SSD, czysta syntetyczna baza i
  test po prywatnym IP; profil jest celowo oddzielony od publicznej produkcji
  HTTPS,
- materiały grup, zadania, stany oddania, informacja zwrotna oraz opisowe
  obserwacje postępów bez diagnoz i automatycznych decyzji o dziecku.

## Zweryfikowane przed rozpoczęciem odbioru Etapu 6

- aktualny kandydat przechodzi pełne `npm run check` (171 testów),
  `npm audit --omit=dev` (0 znanych podatności) i `npm run build`,
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

Dowody wcześniejszego zakresu: `outputs/qa/pre-final/`. Nowy odbiór należy
zapisać oddzielnie. Pełny raport bezpieczeństwa:
`security_best_practices_report.md`. Model zagrożeń: `wr-threat-model.md`.

## Co nie jest jeszcze gotowe do produkcji

- formalne odhaczenie przez klientkę pełnej checklisty odbioru Etapu 6 na jej
  telefonie i komputerze,
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

1. Odbiór pre-release Etapu 6 według `CHECKLISTA_ODBIORU_KLIENTKI.md` wyłącznie
   na danych syntetycznych.
2. Zamknięcie prawne/RODO, konfiguracja dostawców i próba fizycznego Raspberry.
3. Wyzerowanie kont demo, MFA, restore drill i oddzielne środowisko produkcyjne.
4. Dopiero po zamknięciu bramki import rzeczywistych danych.
