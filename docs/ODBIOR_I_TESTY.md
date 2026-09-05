# Odbiór wydań produkcyjnych KLA

Od 5 września 2026 zakresy 0–7 traktujemy jako obszary regresji. Wynik audytu
bieżącego wydania jest w `docs/CURRENT_WORK.md`; archiwalne wyniki poniżej nie
są dowodem ponownego ręcznego sprawdzenia wszystkich ekranów. Zrzuty bieżących
wydań zapisujemy w `outputs/qa/releases/vX.Y.Z/`.

## Plan audytu Etapów 0–7

### Audyt techniczny wydania 1.2.0 — 4 września 2026

Etapy sprawdzono kolejno, bez pomijania błędów między etapami:

| Etap | Zakres uruchomionych testów | Wynik |
| --- | --- | --- |
| 0–1 | wizytówka, tryb publiczny, role, sesje, zaproszenia, MFA i reset | 67/67 |
| 2 | kartoteki, relacje, import/eksport, pliki i skanowanie | 33/33 |
| 3 | grafik, twarde kolizje, generator, blokady i dziennik lekcji | 38/38 |
| 4 | pakiety umów, dowód decyzji, uprawnienia i płatności | 17/17 |
| 5 | wiadomości, kolejka e-mail, odbiorcy i powiadomienia | 14/14 |
| 6 | materiały, zadania, postępy i PWA | 18/18 |
| 7 | backup, diagnostyka, telemetria, instrukcje i serwer | 42/42 |

Nowa macierz modułów jest dodatkowo testowana osobno. Kontrola działa przed
odczytem strony, wykonaniem akcji i wydaniem prywatnego pliku. Ręczny odbiór
szkoły nadal pozostaje konieczny przed decyzją o prawdziwych danych.

Każdy etap przechodzi osobny test funkcjonalny, negatywny test uprawnień,
telefon 375 × 812, komputer 1440 × 900, kontrolę konsoli i zapis dowodu w
`outputs/qa/stage-N/`. Błąd blokujący zatrzymuje wdrożenie kolejnego wydania.

| Etap | Najważniejszy odbiór | Test, który ma wykryć błąd |
| --- | --- | --- |
| 0 | wizytówka, logowanie, responsywność | treść nie wychodzi poza telefon; neutralny tryb nie pobiera danych szkoły |
| 1 | zaproszenia, role, e-mail, MFA, reset | dyrektor nie resetuje właściciela; hasło tymczasowe wygasa i wymusza zmianę |
| 2 | kartoteki, import/eksport, relacje | rodzic nie widzi obcego dziecka; wielokrotne przypisania zapisują się po odświeżeniu |
| 3 | grafik ręczny i generator | równoległa kolizja sali, grupy, osoby lub przejazdu zostaje odrzucona |
| 4 | umowy, dokumenty i płatności | rodzic nie otwiera cudzej umowy; wysłany PDF pozostaje niezmienny |
| 5 | wiadomości, ogłoszenia, PWA | uczeń nie dostaje formalnych spraw rodzica; załącznik ma właściwy dostęp |
| 6 | materiały, zadania i postępy | wykładowca nie otwiera cudzej grupy; trend nie ujawnia danych innych dzieci |
| 7 | backup, odtworzenie, aktualizacja, monitoring | podpisana paczka tworzy kopię, realnie ją odtwarza i zachowuje rollback |

Po testach etapowych wykonywana jest regresja całego przebiegu: utworzenie szkoły
→ zaproszenia → relacje → grafik → lekcja → wiadomość/materiał → umowa/płatność
→ backup i test odtworzenia. Osobno sprawdzane są role, retencja, audyt, brak
sekretów, migracje rozszerzające, WCAG AA oraz ponowny start Raspberry po zaniku
zasilania.

**Testujemy wyłącznie dane demonstracyjne.** Przy każdej pozycji zaznacz:
`[x] działa`, dopisz urządzenie i ewentualną uwagę. Nie wpisuj danych dzieci.

## Zanim zaczniesz

- [ ] Link otwiera się jako HTTPS na telefonie i komputerze.
- [ ] Zapisuję model telefonu/tabletu oraz przeglądarkę: `________________`.
- [ ] Każda rola loguje się własnym kontem demo i widzi tylko właściwy panel.
- [ ] Sprawdzam przynajmniej raz telefon pionowo i komputer w zwykłym oknie.

## Dyrektor

- [ ] Start pokazuje dzisiejsze sprawy, grafik i powiadomienia; kliknięcie karty
  prowadzi do właściwego miejsca.
- [ ] Kartoteka rodzica pozwala przypisać więcej niż jedno dziecko i zapis jest
  widoczny po ponownym otwarciu.
- [ ] Kartoteka ucznia pozwala zmienić grupę, rodzica, preferowane godziny i
  zobaczyć wynikające powiązania z wykładowcą.
- [ ] Kartoteki grupy, sali i lokalizacji pokazują spójne relacje; sala nie
  przechowuje osobnej, sprzecznej listy uczniów.
- [ ] Reset hasła pozwala wysłać link lub jednorazowo pokazać hasło tymczasowe;
  po zamknięciu okna jawne hasło znika, a kartoteka nadal daje się zamknąć.
- [ ] Import pokazuje instrukcję, waliduje plik i pozwala wybrać bezpieczne
  scalenie albo zastąpienie; eksport otwiera się poprawnie.
- [ ] Grafik ręczny pozwala dodać/przesunąć lekcję, a konflikt sali,
  wykładowcy, grupy lub ucznia jest blokowany z prostym wyjaśnieniem.
- [ ] Asystent tworzy szkic, uwzględnia lokalizacje, dostępność i przejazdy;
  nic nie publikuje bez mojego zatwierdzenia.
- [ ] Odwołanie wymaga powodu, pozostaje widoczne w kalendarzu i informuje
  właściwą grupę/rodzinę.
- [ ] Prośba wykładowcy o zmianę grafiku czeka na decyzję i nie zmienia planu
  przed akceptacją.
- [ ] Lekcja otwiera czytelne szczegóły, temat, obecność i historię na telefonie.
- [ ] Umowa pozwala wysłać właściwemu rodzicowi niezmienny pakiet PDF; można
  wysłać przypomnienie i sprawdzić status odczytu/akceptacji/podpisanego pliku.
- [ ] Płatności pokazują umowy i raty; rozwinięcie pokazuje terminy oraz statusy,
  a ręczna zmiana zapisuje autora i historię.
- [ ] Wiadomości pozwalają wybrać grupę albo konkretną osobę, dodać załącznik,
  wymagać potwierdzenia i wrócić do listy jedną akcją na telefonie.
- [ ] Materiał i zadanie można dodać tylko do właściwej grupy; widać stany prac.
- [ ] Postęp ucznia pokazuje opis, historię, obecność i czytelny trend; można
  dodać obserwację bez diagnozowania lub automatycznego oceniania dziecka.
- [ ] Statystyki i audyt nie pokazują pełnego IP ani treści prywatnych rozmów.
- [ ] Edytor wizytówki pozwala zmienić kolejność, szerokość i odstępy sekcji,
  dodać widget oraz przywrócić poprawny układ mobilny.
- [ ] Zgłoszenie problemu pozwala najpierw przejść do błędu, świadomie zrobić
  zrzut, obejrzeć go i dopiero wysłać.

## Wykładowca

- [ ] Start pokazuje tylko moje lekcje, zadania, wiadomości i powiadomienia.
- [ ] Widzę tylko przypisane grupy oraz potrzebne dane ich uczniów.
- [ ] Ustawiam osobne godziny i lokalizację dla różnych dni; system nie zakłada
  przejazdu bez czasu ani „teleportowania” między lokalizacjami.
- [ ] Nie zmieniam opublikowanego grafiku bezpośrednio; składam prośbę z powodem
  i widzę jej status.
- [ ] Wpisuję temat i oficjalną obecność wyłącznie na swoich lekcjach.
- [ ] Odwołanie lub prośba o odwołanie wymaga jasnego powodu.
- [ ] Dodaję materiał/zadanie do swojej grupy i przeglądam oddane prace.
- [ ] Dodaję opisową obserwację postępu tylko swoim uczniom.
- [ ] Wiadomość do grupy działa, a prywatna rozmowa otwiera właściwą osobę.
- [ ] Nie widzę umów, płatności, narzędzi dyrektora ani cudzych grup.

## Rodzic

- [ ] Start pokazuje sprawy dotyczące wyłącznie moich przypisanych dzieci.
- [ ] Przy kilkorgu dzieciach przełączam dziecko i widzę właściwą grupę, plan,
  obecności, zadania, postęp, umowy i płatności.
- [ ] Nie widzę żadnego obcego dziecka po zmianie adresu albo użyciu starego linku.
- [ ] Kalendarz pokazuje plan oraz odwołanie z powodem i prostą informacją co dalej.
- [ ] Otwieram każdy dokument pakietu umowy, widzę cenę/raty i wykonuję właściwy
  wariant: akceptację dokumentową albo pobranie i wgranie podpisanego egzemplarza.
- [ ] Nie mogę zaakceptować innej wersji niż aktualnie wyświetlona.
- [ ] Widzę swoje raty i terminy, ale nie zmieniam statusu płatności.
- [ ] Widzę materiały, zadania i informacje zwrotne tylko własnych dzieci.
- [ ] Postęp jest opisany prostym językiem, bez rankingów innych uczniów.
- [ ] Wiadomości na telefonie są czytelne; mogę potwierdzić ważne ogłoszenie.

## Uczeń

- [ ] Start pokazuje mój najbliższy plan, zadania i powiadomienia.
- [ ] Widzę tylko własne lekcje, obecność, materiały, prace i postęp.
- [ ] Potwierdzenie przybycia jest dostępne tylko w odpowiednim czasie i nie
  pozwala mi samemu ustawić oficjalnej obecności.
- [ ] Otwieram materiał i zadanie, oddaję notatkę/plik i widzę bezpieczny status.
- [ ] Nie mogę otworzyć pracy ani postępu innego ucznia przez zmianę adresu.
- [ ] Widzę informację zwrotną wykładowcy, ale nie mogę jej edytować.
- [ ] Wiadomości grupowe i wymagane potwierdzenie działają na telefonie.
- [ ] Nie widzę kartotek szkoły, umów, płatności, ustawień ani statystyk.

## Telefon, tablet i komputer

- [ ] Telefon 375 × 812: nie ma poziomego przewijania, treść nie chowa się pod
  klawiaturą/paskiem, główne przyciski mają wygodny obszar dotyku.
- [ ] Tablet: przeciąganie grafiku jest wygodne; każda akcja drag-and-drop ma
  też formularz bez przeciągania.
- [ ] Komputer 1440 × 900: panel wykorzystuje szerokość, ale tekst nie tworzy
  zbyt długich wierszy; dialogi można zamknąć klawiaturą.
- [ ] Jasny i ciemny motyw zachowują czytelność, focus i kontrast.
- [ ] Wolny Internet / podwójne kliknięcie nie tworzy duplikatu; widać stan
  ładowania, sukces albo instrukcję naprawy błędu.
- [ ] Po odświeżeniu zapisane relacje, płatności, wiadomości i prace nadal są.

## Właściciel systemu — kontrola administracyjna

- [ ] Właściciel widzi wszystkie aktywne kartoteki oraz osobną zakładkę
  „Archiwum”, której nie widzi dyrektor.
- [ ] Zarchiwizowana osoba, grupa albo sala jest tylko do odczytu; przywrócenie
  oddaje ją do aktywnego obiegu bez utraty relacji i zapisuje operację w audycie.
- [ ] Właściciel może przygotować hasło tymczasowe dyrektora; dyrektor nie może
  wykonać tej operacji wobec właściciela.
- [ ] Ustawienia serwera, kopii, SMTP i aktualizacji pozostają niedostępne dla
  zwykłych ról szkoły.
- [ ] Przełącznik modułu ukrywa go wybranej roli w menu, pulpicie i samouczku;
  bezpośredni adres nie pokazuje danych, a ponowne włączenie niczego nie traci.

## Wynik odbioru

- [ ] Przetestowałam/em telefon i komputer.
- [ ] Nie użyłam/em prawdziwych danych dzieci.
- [ ] Zgłoszone uwagi mają: rolę, ekran, czynność, oczekiwany wynik i — tylko po
  świadomej zgodzie — zrzut bez danych wrażliwych.
- [ ] Decyzja: **akceptuję pre-release do dalszego pilota / wymaga poprawek**.

Data: `____________`  Osoba: `____________`  Urządzenia: `____________`

Uwagi priorytetowe:

1. `__________________________________________________________________`
2. `__________________________________________________________________`
3. `__________________________________________________________________`
