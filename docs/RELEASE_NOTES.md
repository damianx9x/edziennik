# Notatki wydania

## 1.1.0-rc.2 · 30 sierpnia 2026

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
