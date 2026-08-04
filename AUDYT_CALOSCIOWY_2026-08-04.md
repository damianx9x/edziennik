# Audyt całościowy — 4 sierpnia 2026

Zakres: Etapy 0–2 i aktualna część Etapu 3, role, baza, publiczny tunel,
responsywność, logi, zależności oraz paczki wydaniowe.

## Wynik

Nie pozostał potwierdzony błąd P0 ani P1 w zrealizowanym zakresie. Audyt nie
zmienia granic etapów: umowy, płatności, komunikator oraz materiały nadal
należą do Etapów 4–6, a cykliczność i obecność do dalszej części Etapu 3.

## Znalezione i poprawione

1. Długo działająca lokalna baza testowa mogła zamknąć połączenie używane przez
   aplikację. Produkcyjne chunki Next.js tworzyły przy tym konkurencyjne pule
   i przekraczały limit dziesięciu połączeń bazy demo. Host sprawdza teraz
   kilka niezależnych zapytań SQL, czeka na pełną gotowość, a cały proces
   współdzieli jedną ograniczoną pulę.
2. macOS sporadycznie odrzucał pierwszą próbę instalacji procesu usługi.
   Uruchomienie jest ponawiane do pięciu razy.
3. Rejestr odwiedzin zwracał 403 za tunelem, ponieważ porównywał publiczny
   origin z wewnętrznym adresem aplikacji. Walidacja uwzględnia zaufane
   nagłówki proxy i nadal odrzuca obce żądania.
4. Formularz dodawania lekcji nie miał jawnego przycisku zamknięcia i nie
   reagował na `Escape`. Obie drogi są dostępne, a fokus wraca na przycisk
   otwierający.
5. Chwilowy błąd serwera pokazywał techniczny ekran Next.js. Panel ma teraz
   prosty polski ekran z ponowieniem i powrotem do panelu.
6. Audyt npm wykrył podatne wersje pośrednie `fast-uri` i `hono`. Lockfile
   został zaktualizowany; końcowy audyt zwraca zero znanych podatności.

## Sprawdzone przepływy

- strona główna i zdjęcia na telefonie 375 × 812,
- wspólne logowanie i wylogowanie,
- Command Center, Kartoteki, Ustawienia, Statystyki i Zaproszenia dyrektora,
- ręczny grafik, filtry lokalizacji i formularz nowej lekcji,
- automatyczny szkic dla szkoły i modalny podgląd przed publikacją,
- plan wykładowcy bez narzędzi edycji,
- plan rodzica wyłącznie dla powiązanych grup,
- plan ucznia i odmowa wejścia do panelu szkoły,
- brak poziomego przewijania na 375 × 812 i 1440 × 900.

## Dowody

- `npm run check`: 23 pliki testowe, 90/90 testów,
- `npm run build`: zaliczony,
- `npm audit --omit=dev`: zero podatności,
- zrzuty: `outputs/qa/stage-3/full-audit/`,
- paczki: `outputs/edziennik-kla-stage-3.zip` i
  `outputs/edziennik-kla-home-vps-stage-3.zip`.
