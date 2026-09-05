# Notatki wydania

## 1.4.0 — utrzymanie produkcji i niezawodny edytor

- produkcja i rozwój zastępują planowanie etapami; domeny dodatkowe są odłożone;
- zapis treści jest niezależny od blokad pamięci Safari, ograniczony czasowo i
  wymaga rzeczywistego potwierdzenia serwera;
- edytor chroni przed podwójnym zapisem, pokazuje niezapisane zmiany i pozwala
  odrzucić szkic; telefon dostaje kompaktowy wybór sekcji;
- widgety można powielać, ukrywać bez kasowania, wyrównywać i ustawiać odstępy;
  rozwijany podgląd pokazuje roboczy wygląd bez publikacji;
- poprawiony kontrast i zachowanie obramowania przy wskazaniu myszą;
- strumieniowy limit API chroni pamięć także bez nagłówka rozmiaru;
- test odtworzenia wykonany podczas aktualizacji odświeża stan w panelu;
- pięć podręczników ma aktualną listę zmian. Nie zmieniamy danych ani kluczy.

## 1.3.0 — spójna administracja i bezpieczna personalizacja

- kartoteki oraz zaproszenia działają jako jeden obszar „Kartoteki i konta” z
  czytelnymi zakładkami;
- edycja strony i masowy import/eksport są delegowane dyrektorowi z macierzy
  modułów, a operacje są chronione również po stronie serwera;
- import oraz eksport danych pozostają domyślnie dostępne tylko właścicielowi;
- widgety otrzymały ograniczone ustawienia tła, krycia, obramowania i łagodnego
  łączenia kolorów bez możliwości wstrzyknięcia kodu;
- ustawienia dyrektora nie dublują już kartotek, zaproszeń i statystyk;
- publiczna dokumentacja ma neutralny opis zakresu, większą galerię,
  angielski README oraz aktualną checklistę prac;
- wdrożenie Raspberry weryfikuje rzeczywiste pliki CSS i JavaScript, a przy
  ich braku automatycznie odrzuca wydanie i wraca do działającej wersji.

## 1.1.4 — odzyskiwanie kont i modułowa wizytówka

- dyrektor może wysłać standardowy link resetu albo wygenerować losowe hasło
  tymczasowe; właściciel systemu ma ten sam przepływ także dla dyrektora;
- hasło tymczasowe jest widoczne tylko raz, wygasa po 30 minutach, unieważnia
  wcześniejsze sesje i blokuje panel do czasu ustawienia własnego hasła;
- dyrektor nie może resetować konta właściciela systemu, a własne hasło zmienia
  wyłącznie w ustawieniach własnego konta;
- edytor wizytówki pozwala zmieniać kolejność i widoczność sekcji, ich szerokość,
  odstępy, skalę początku strony oraz styl narożników;
- konfigurowalne widgety mają rodzaj, wielkość, kolor, tekst i bezpieczny link;
  mobilny układ zawsze składa je do jednej kolumny;
- edytor ma jawny preset publicznego kontaktu i lokalizacji szkoły, przygotowany
  na podstawie informacji opublikowanych przez King’s Language Academy;
- właściciel systemu otwiera osobne archiwum wszystkich osób, grup i sal oraz
  może przywrócić kartotekę bez niszczenia historii albo zależności;
- okno resetu hasła jest odseparowane od okna kartoteki: po zamknięciu usuwa
  jawne hasło z pamięci widoku i nie pozostawia niewidocznej blokady ekranu;
- starsze zapisane treści są uzupełniane o bezpieczne ustawienia domyślne bez
  ręcznej migracji, a każda publikacja nadal tworzy wpis audytu.

## 1.1.3 — spójne relacje kartotek, umów i grafiku

- rodzic po wybraniu pokazuje wszystkie przypisane dzieci, także przed
  aktywacją ich kont;
- generator i formularz ręczny korzystają z prowadzącego przypisanego do grupy;
- ręczny plan podpowiada prowadzącego i preferowaną salę;
- identyfikator ucznia może zostać utworzony automatycznie, bez obowiązkowego
  pola technicznego;
- twórca widzi wszystkie aktywne kartoteki bez limitu 300 i może usuwać je z
  aktywnego obiegu z zachowaniem audytu;
- zaktualizowano biblioteki pośrednie wskazane przez audyt npm, a pakowanie
  Raspberry przerywa pracę bez prawidłowego raportu rejestru;
- walidacja zaproszenia od razu wskazuje różne hasła.

## 1.1.2 — pełne podręczniki każdej roli

- dyrektor, wykładowca, rodzic i uczeń otrzymują osobny podręcznik PDF, który
  opisuje wyłącznie funkcje dostępne dla danej roli;
- każda główna funkcja ma własny rozdział ze zrzutem ekranu, ścieżką w panelu,
  przygotowaniem, dokładną obsługą, oczekiwanym wynikiem, uprawnieniami oraz
  rozwiązaniem typowych problemów;
- po pierwszym samouczku system pyta, czy użytkownik chce od razu pobrać swój
  podręcznik; odmowa nie zamyka dostępu — aktualny PDF pozostaje pod przyciskiem
  „Instrukcja”;
- właściciel systemu może pobrać komplet czterech instrukcji ról oraz osobny
  podręcznik techniczny;
- serwer sprawdza rolę przy każdym pobraniu, dlatego zwykły użytkownik nie może
  pobrać instrukcji innej roli przez ręczną zmianę adresu;
- kontrola wydania odrzuca brakujący, zbyt mały albo niezgodny wersją PDF.

## 1.1.1 — podręczniki w aplikacji i zamknięcie techniczne Etapów 5–6

- strona „Pomoc i podręczniki” udostępnia aktualną instrukcję zgodną z
  uruchomionym wydaniem; podręcznik techniczny widzi tylko właściciel systemu;
- pierwsza strona obu PDF-ów pokazuje zmiany względem poprzedniej wersji, a
  każdy moduł prowadzi użytkownika kolejno przez kliknięcie i oczekiwany skutek;
- kontrola przed commitem sprawdza zgodność wersji wygenerowanych PDF-ów z
  manifestem podręczników;
- produkcyjny pakiet standalone zawiera te same zweryfikowane PDF-y, więc
  pobieranie instrukcji działa również po wdrożeniu na Raspberry;
- uzupełniono PWA: manifest, ikony i service worker, który nie cache'uje
  prywatnych danych panelu;
- każda rola szkoły może otworzyć prywatny, audytowany kanał pomocy technicznej
  z twórcą aplikacji bez przechodzenia do poczty;
- Etapy 5 i 6 są zamknięte technicznie; zadaniowy odbiór szkoły pozostaje w
  Etapie 7.

## 1.1.0 · 30 sierpnia 2026

- właściciel przełącza publiczną stronę między zachowaną wizytówką szkoły a
  bogatym pokazem produktu; przełącznik nie zmienia kont, panelu, bazy,
  dokumentów ani workflow szkoły;
- pokaz produktu używa wyłącznie syntetycznych przykładów czterech ról i nie
  pobiera nazwy, kontaktów, zdjęć ani lokalizacji szkoły;
- panel pokazuje dokładną wersję, commit i wynik audytu zależności podpisanej
  paczki, ale celowo nie uruchamia `npm update` na żywym serwerze;
- aktualizacja jest odrzucana bez przypiętego klucza, podpisu i dokładnie
  zgodnego manifestu; przed migracją obowiązuje szyfrowany backup z testem
  odtworzenia;
- ustawienia SMTP, backupu, eksportu, importu i wizytówki korzystają z wąskiej
  usługi systemowej przez prywatne gniazdo Unix, bez osłabiania zabezpieczeń
  procesu aplikacji;
- importy i archiwa są sprawdzane przed uprzywilejowanym rozpakowaniem, a
  operacje backupu, importu, odtworzenia i aktualizacji mają wspólną blokadę;
- publiczna strona i logowanie renderują treść od razu, również gdy mobilna
  przeglądarka opóźnia albo blokuje pamięć IndexedDB;

- naprawiono mobilne publikowanie materiałów i wiadomości z samym załącznikiem;
- widok dostępności wykładowcy nie znika po zapisie, a mobilny grafik nie
  renderuje wielkiego pustego dnia;
- uczeń nie otrzymuje formalnych powiadomień o umowach i płatnościach rodzica;
- centrum właściciela pokazuje priorytetowe sygnały chronionych operacji,
  pseudonimowy ruch, urządzenia i przybliżoną mapę województw;
- anonimowy ruch neutralnej strony produktu trafia do osobnego strumienia
  platformowego i nie zanieczyszcza statystyk szkoły;
- centrum zdarzeń ma filtrowanie, role, moduły, okresy, stronicowanie oraz osobny
  widok każdej operacji i wejścia na ekran;
- SMTP, nośniki backupu, eksport i import pozostają obsługiwane z chronionego UI;
- Raspberry otrzymało cache zasobów, kompresję i kontrolowane limity ruchu;
- watchdog wymaga trzech kolejnych awarii i respektuje budżet restartów również
  dla PostgreSQL, a bezpieczny benchmark działa wyłącznie na loopbacku;
- repozytorium ma publiczną politykę bezpieczeństwa, instrukcję współtworzenia,
  galerię, szablony zgłoszeń i dokumentację produktu dla klienta oraz inżyniera.
- panel pokazuje osiem niezależnych warstw startu, a aktualizacja ponownie
  stosuje trwałe logi, sprzętowy watchdog i politykę restartu tunelu;
- dyrektor ma czytelne wejścia do edycji strony, kont i statystyk odwiedzin,
  natomiast backup, SMTP, wersje i diagnostyka pozostają w osobnym panelu
  właściciela.
- rozmowa na telefonie zajmuje cały ekran, utrzymuje pole odpowiedzi nad paskiem
  systemowym i pozwala wrócić do skrzynki jedną akcją bez podwójnego przewijania;
- naprawiono pełny eksport i odtwarzanie uruchamiane z chronionego panelu:
  odizolowana usługa nie korzysta już z niedozwolonego `sudo`, a archiwum nadal
  zawiera bazę PostgreSQL oraz prywatne dokumenty i załączniki;
- wydanie zawiera dwie ilustrowane instrukcje PDF: prostą instrukcję wszystkich
  ról szkoły oraz osobny podręcznik serwera, szyfrowania, kopii i awarii.

## 1.0.0 · 27 sierpnia 2026

- domknięto przepływy wszystkich ról, grafik, kartoteki, umowy/płatności,
  komunikację, powiadomienia, naukę i postępy;
- dodano publikację poprawnej części automatycznej propozycji grafiku;
- treść publicznej strony przeniesiono z jednej przeglądarki do PostgreSQL;
- pełny eksport jest szyfrowany, audytowany, ważny 24 godziny i obsługuje
  HTTP Range/ETag/If-Range, więc pobieranie można wznowić;
- klucz odtworzenia jest wydawany tylko raz i musi zostać zapisany poza Pi;
- aktualizacje Raspberry obejmują aplikację i wszystkie usługi, mają rollback,
  manifest i podpis Ed25519;
- dodano worker ponowień e-mail, watchdog, auto-start po zaniku prądu oraz
  panel parametrów Raspberry;
- usunięto historyczne buildy, zrzuty i dokumenty etapowe z bieżącego drzewa.

Znane wymagania przed prawdziwymi danymi: podpisane teksty prawne/RODO,
skonfigurowane SMTP, zapasowy nośnik/SFTP, test odtworzenia poza Pi oraz odbiór
każdej roli na telefonie.
