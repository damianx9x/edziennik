# Stan projektu eDziennika KLA

Aktualizacja: 2026-07-28

## Cel

Budujemy mobilny eDziennik prywatnej szkoły wyłącznie języka angielskiego
King’s Language Academy. Najważniejsze obszary pilota:

- łatwy grafik oparty na sali, wykładowcy i grupie,
- umowy online,
- komunikator i wiadomości masowe,
- ręczne statusy płatności,
- materiały i zadania domowe,
- role: właściciel systemu, dyrektor, wykładowca, rodzic i uczeń.

Termin pilota: 1 września 2026.

## Zrealizowane

### Etap 0–0,5

- publiczna strona KLA z responsywnym sliderem i zdjęciami,
- opisy dopasowane do prywatnej szkoły języka angielskiego,
- mobilne wejście do eDziennika,
- statyczna paczka dla zwykłego hostingu FTP home.pl,
- demonstracyjny edytor treści i zdjęć,
- podstawa systemu zgłaszania błędów i diagnostyki,
- dokumentacja marki, UX, RODO, architektury i wdrożenia.

### Etap 1

- PostgreSQL i migracje Prisma,
- Better Auth, sesje i jedno wspólne logowanie,
- role i centralna kontrola dostępu,
- jednorazowe zaproszenia e-mail,
- czasowe zaproszenia QR z rolą,
- formularz rejestracji dla osób nietechnicznych,
- gotowy mechanizm MFA; czasowo wyłączony dla dyrektora w pilocie,
- syntetyczne konta testowe.

### Etap 2 — wykonana część kartotek i ustawień

- uczniowie, rodzice, wykładowcy, grupy i sale,
- model relacji rodzic–dziecko, zapisów do grup i przydziałów nauczycieli,
- transakcyjny import relacji i przypisań,
- duże karty szczegółów zamiast ciasnych tabel,
- archiwizacja i reaktywacja kont,
- import CSV/XLSX z podglądem i transakcyjnym zatwierdzeniem,
- eksport zgodny z importem,
- osobna sekcja `Ustawienia`,
- propozycje zmian wykładowcy zatwierdzane przez dyrektora,
- historia i audyt ważnych operacji,
- szeroki układ desktopowy oraz układ mobile-first.

### Etap 3 — pierwsza część grafiku

- wspólny plan z widokiem odpowiednim dla każdej roli,
- sześć dni na komputerze i jeden dzień na telefonie,
- ręczne dodawanie: grupa → termin → wykładowca → sala,
- wyszarzenie zajętego lub za małego zasobu wraz z powodem,
- serwerowa kontrola kolizji sali, wykładowcy, grupy i wspólnego ucznia,
- Asystent układania grafiku z wymaganiami grup i dostępnością wykładowców,
- generowanie dla szkoły, grupy, wykładowcy albo sali i zakresu do 8 tygodni,
- podgląd propozycji w dużym oknie przed publikacją,
- deterministyczny szkic do sprawdzenia i osobnej publikacji,
- istniejące lekcje zachowane podczas kolejnego generowania,
- wspólny serwerowy walidator aktywności, lokalizacji, pojemności,
  dostępności i kolizji używany przy dodaniu, przesunięciu i publikacji,
- audyt utworzenia, przesunięcia, odwołania i publikacji grafiku.

### Właściciel techniczny

- rola `SYSTEM_OWNER`, widoczna jako `Bóg`,
- konto tworzone tylko skryptem, poza interfejsem zaproszeń,
- pełny dostęp dyrektora oraz centrum diagnostyczne,
- głębokie logi, raport systemu i stan konfiguracji,
- obowiązkowe MFA przed otwarciem panelu,
- hasło przechowywane wyłącznie w prywatnym `.env`.

### Wdrożenie

- statyczny pokaz działa na zwykłym hostingu home.pl,
- pełny instalator VPS dla Ubuntu 24.04,
- Docker Compose: Next.js, PostgreSQL 17 i Caddy HTTPS,
- idempotentny seed: 8 grup z wymaganiami grafiku, 36 syntetycznych uczniów,
  3 sale i 4 konta ról,
- osobny instalator konta właściciela,
- kopia bazy i aktualizacja z migracjami,
- tymczasowe hostowanie testów z Maca przez tunel HTTPS,
- migracje przed każdym pokazem oraz automatyczny test aplikacji razem z bazą.

## Zweryfikowane

- `npm run check`,
- 88 testów automatycznych przechodzących po drugiej rundzie audytu,
- `npm run build`,
- migracje odtworzone na pustym schemacie,
- seed uruchomiony dwukrotnie bez duplikowania danych,
- logowanie właściciela przekierowuje do konfiguracji MFA,
- dyrektor w pilocie loguje się bez MFA, a diagnostyka pokazuje ten wyjątek,
- paczki nie zawierają `.env`, lokalnej bazy ani haseł.
- Asystent ułożył i opublikował 18 lekcji bez powtórzenia grupy tego samego dnia,
- rodzic i uczeń widzą tylko powiązane grupy, a wykładowca nie ma edycji planu,
- kontrola konsoli na nowej karcie nie wykazała ostrzeżeń ani błędów.

## Aktualne paczki

- statyczny FTP:
  `outputs/kla-szkielet-etap-0-5-home-pl.zip`,
- serwer Node:
  `outputs/edziennik-kla-stage-3.zip`,
- pełny instalator VPS:
  `outputs/edziennik-kla-home-vps-stage-3.zip`.

## Czego jeszcze nie ma w pilocie

- cyklicznych serii, wyjątków, tematu i szybkiej obecności — dalsza część Etapu 3,
- ręcznego przypisywania rodzica do dziecka, ucznia do grupy i wykładowcy do
  grupy z poziomu karty — korekta interfejsu Etapu 2,
- umów i wersjonowania akceptacji — Etap 4,
- statusów płatności — Etap 4,
- komunikatora i masowych ogłoszeń — Etap 5,
- materiałów i zadań domowych — Etap 6,
- produkcyjnej wysyłki e-mail i SMS,
- produkcyjnego prywatnego magazynu plików,
- zewnętrznych backupów, retencji i pełnego monitoringu,
- wyczyszczonej produkcyjnej bazy.

## Świadomie przesunięte przed prawdziwe dane

- ponowne włączenie obowiązkowego MFA dyrektora,
- produkcyjna wysyłka e-mail i SMS,
- prywatny magazyn plików poza dyskiem serwera,
- zewnętrzny szyfrowany backup i test odtwarzania,
- retencja, dokumenty prawne i końcowa checklista RODO.

## Najbliższa kolejność

1. Odbiór poprawionego Asystenta i ręcznego grafiku na syntetycznych danych.
2. Domknięcie ręcznych relacji w kartotekach.
3. Dokończenie Etapu 3: serie, wyjątki, temat i obecność.
4. Etap 4: umowy i ręczne statusy płatności.
5. Etap 5: komunikator i masowe ogłoszenia.
6. Etap 6: materiały, zadania i panele klienta.
7. Etap 7: VPS, staging, instrukcje, odbiór i dopiero produkcja.
