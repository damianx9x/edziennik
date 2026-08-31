# Notatki wydania

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
