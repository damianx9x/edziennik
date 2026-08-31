# Raport QA — domknięcie pilota, 31 sierpnia 2026

## Zakres

- regresja funkcji i uprawnień z ostatnich dwóch tygodni;
- mobilne wiadomości 375 × 812 i widok komputerowy 1440 × 900;
- materiały i wiadomości z samym załącznikiem;
- dostępność wykładowcy i role użytkowników;
- pełny eksport, import, odtworzenie i pakiet Raspberry;
- dwie instrukcje PDF renderowane i sprawdzone wizualnie.

## Wyniki automatyczne

- `npm run check`: 61 plików testowych, 215 testów — wynik pozytywny;
- `npm audit --omit=dev`: 0 znanych podatności;
- `npm run check:raspberry`: pakiet, archiwa, migracje i skrypty — wynik pozytywny;
- `npm run build`: produkcyjny build Next.js — wynik pozytywny;
- `npm run package:release` i `npm run package:raspberry` — paczki utworzone.

## Wyniki klikania

- rozmowa na telefonie zajmuje 375 × 812, a przewijana jest wyłącznie lista
  wiadomości; nagłówek i pole odpowiedzi pozostają widoczne;
- załącznik bez tekstu został wysłany, po zapisie wybrany plik zniknął z pola;
- wykładowca opublikował z telefonu syntetyczny plik PNG bez błędu widoku;
- pięć zapisanych przedziałów dostępności pozostało widocznych po zmianie ekranu;
- panele dyrektora, wykładowcy, rodzica i ucznia otworzyły właściwe widoki;
- wygenerowane instrukcje mają odpowiednio 16 i 10 stron A4, bez uciętych treści.

## Granice odbioru

Wersja techniczna jest gotowa do dalszego pilota, ale nie do prawdziwych danych,
dopóki szkoła nie zamknie odbioru każdej roli, nie zatwierdzi treści prawnych i
retencji, nie potwierdzi MFA, SMTP oraz kopii poza Raspberry i nie usunie ostrzeżenia
zasilania/chłodzenia urządzenia. Szczegóły: `docs/ODBIOR_I_TESTY.md`.
