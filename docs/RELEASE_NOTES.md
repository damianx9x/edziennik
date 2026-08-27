# Notatki wydania

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
