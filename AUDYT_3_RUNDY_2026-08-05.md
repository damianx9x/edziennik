# Audyt trzech rund — 5 sierpnia 2026

## Stan wejściowy

Etap 3 miał działający grafik ręczny i automatyczny, lokalizacje, dziennik
lekcji, obecność pracownika oraz serwerowe blokady kolizji. Publiczny pokaz
wskazywał commit `81430b3`. Niniejsza iteracja nie oznacza zakończenia całej
wizji produktu.

## Runda 1 — bezpieczeństwo i prywatność

Profesor zakwestionował słabe hasła demo, formuły w CSV, anonimowe statystyki
przypisywane do pierwszej szkoły i pomysł zbierania pełnych IP. Obrona była
skuteczna tylko dla istniejących uprawnień oraz braku ujawniania listy uczniów.

Wdrożono:

- krótkie aliasy loginów; słabe hasła dopuszcza wyłącznie jawna flaga lokalnego
  demo, której bezpieczna wartość domyślna to `0`,
- neutralizację formuł arkusza w eksporcie CSV i test powrotnego importu,
- jednoznaczny wybór szkoły publicznej przez `KLA_PUBLIC_SCHOOL_SLUG`,
- szczegóły statystyk bez pełnego IP, dokładnej lokalizacji i surowego
  User-Agent.

Pozostaje przed produkcją: usunąć wyjątek słabych haseł, włączyć MFA dyrektora,
dodać retencję plików importu oraz testy akcji z rzeczywistą bazą.

## Runda 2 — logika danych i grafiku

Profesor wykazał, że ręczna zmiana planu nie unieważniała gotowego szkicu
Asystenta, a eksport ucznia gubił kolejne grupy. Obrona tych punktów się nie
powiodła.

Wdrożono:

- każda ręczna zmiana planu odrzuca gotowe szkice Asystenta w tej samej
  transakcji,
- eksport tworzy osobny wiersz ucznia dla każdego aktywnego przypisania do
  grupy, a parser rozpoznaje taki plik bez fałszywego duplikatu,
- większy uchwyt dotykowy, osobny czujnik dotyku i widok jednego dnia do 860 px,
- blokadę przewijania dokumentu podczas otwartego dialogu.

Pozostaje w Etapie 3: wniosek wykładowcy o zmianę grafiku, cykliczność, wyjątki,
historia korekt obecności i respektowanie blokady lekcji.

## Runda 3 — intuicyjność i rozwój

Wdrożono:

- klikalne szczegóły historii kartoteki z autorem, recenzentem, czasem,
  źródłem i zakresem pól,
- instrukcję CSV pod widocznym znakiem zapytania,
- klikalne, szczegółowe statystyki strony z rolami i godzinami użycia,
- priorytet pierwszego zdjęcia slidera i poprawki responsywne.

Nie wdrożono pozornych funkcji: dowolnego HTML/JS w CMS, wgrania SQL do żywej
bazy jednym kliknięciem ani zapisu obecności przez ucznia. Zamiast tego
przyjęto bezpieczne kontrakty opisane w `PLAN_ROZWOJU_PO_AUDYCIE.md`.
