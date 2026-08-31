# Raport QA — domknięcie pilota, 31 sierpnia 2026

## Zakres

- pełny audyt wymagań Etapów 1–7 względem kodu, migracji, testów i ekranów;
- regresja funkcji i uprawnień z ostatnich dwóch tygodni;
- mobilne wiadomości 375 × 812 i widok komputerowy 1440 × 900;
- materiały i wiadomości z samym załącznikiem;
- dostępność wykładowcy i role użytkowników;
- pełny eksport, import, odtworzenie i pakiet Raspberry;
- dwie instrukcje PDF renderowane i sprawdzone wizualnie.

## Audyt Etapów 1–7

| Etap | Wynik | Dowód |
| --- | --- | --- |
| 1 — logowanie i role | zamknięty | zaproszenia, weryfikacja, reset, MFA, sesje i odmowy między rolami mają testy oraz tag `stage-1-accepted` |
| 2 — kartoteki i pliki | zamknięty | relacje rodzin, grupy, zasoby, import/eksport i prywatne pliki mają migracje, testy oraz tag `stage-2-accepted` |
| 3 — grafik i dziennik | zamknięty w przyjętym zakresie | ręczny plan, Asystent, kolizje, lokalizacje, temat i obecność mają testy; tag `stage-3-accepted` |
| 4 — umowy i płatności | zamknięty | wersje PDF, pakiety, akceptacja, podpisany skan i raty mają testy; tag `stage-4-accepted` |
| 5 — komunikator | zamknięty technicznie | rozmowy, ogłoszenia, załączniki, odczyty, kolejka e-mail, idempotencja i role przeszły regresję oraz klikanie mobilne |
| 6 — nauka i panele ról | zamknięty technicznie | materiały, zadania, oddania, postępy, panele ról, powiadomienia oraz PWA przeszły regresję i klikanie |
| 7 — pilot | w odbiorze | infrastruktura, backup/restore i podręczniki są gotowe; pozostaje test zadaniowy klientki i decyzja go/no-go dla prawdziwych danych |

Nie znaleziono aktywnych komunikatów „funkcja w przyszłym etapie” ani ekranów
udających wdrożoną funkcję. Nazwa CSS `stage4-document-placeholder` opisuje
bezpieczny pusty podgląd dokumentu, nie niezrealizowany moduł.

## Wyniki automatyczne

- `npm run check`: 64 pliki testowe, 220 testów — wynik pozytywny;
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
- ekran Pomoc i podręczniki sprawdzono na 1440 × 900 i 375 × 812; dyrektor
  pobiera instrukcję szkoły, ale nie widzi chronionego podręcznika właściciela;
- po uruchomieniu produkcyjnego pakietu standalone pobrano cały, niepusty PDF
  przez prawdziwą zalogowaną sesję; test wykrył i usunął wcześniejszy brak PDF
  w katalogu wdrożeniowym;
- przycisk „Napisz do twórcy aplikacji” jest widoczny i czytelny na telefonie;
- ukryta zagadka otwiera się dopiero po pięciu świadomych kliknięciach, przyjmuje
  poprawną odpowiedź i pokazuje zamykany podgląd bez zasłaniania interfejsu po
  zamknięciu;
- konsola przeglądarki po przejściu tych przepływów: 0 błędów i 0 ostrzeżeń.

Zrzuty dowodowe: `manuals-desktop.png`, `manuals-mobile.png`,
`creator-support-mobile.png` i `easter-egg.png` w tym katalogu.

## Granice odbioru

Wersja techniczna jest gotowa do dalszego pilota, ale nie do prawdziwych danych,
dopóki szkoła nie zamknie odbioru każdej roli, nie zatwierdzi treści prawnych i
retencji, nie potwierdzi MFA, SMTP oraz kopii poza Raspberry i nie usunie ostrzeżenia
zasilania/chłodzenia urządzenia. Szczegóły: `docs/ODBIOR_I_TESTY.md`.
