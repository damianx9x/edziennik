# Logi, diagnostyka i zgłaszanie błędów

## Cel użytkownika

Każda rola ma zawsze widoczny przycisk „Zgłoś problem”. Zgłoszenie ma pomagać
odtworzyć błąd bez proszenia użytkownika o techniczny opis i bez wysyłania
nadmiarowych danych.

## Gotowe w Etapie 0.5

- przycisk jest dostępny na stronie, wyborze panelu i ekranach ról,
- formularz pyta o rolę i ostatnie kroki,
- zrzut można wykonać za zgodą użytkownika albo dodać ręcznie,
- iOS, Android, macOS i Windows mają krótkie instrukcje,
- zrzut ma podgląd i można go usunąć przed udostępnieniem,
- bezpieczny plik JSON można pobrać i przekazać Codexowi,
- Web Share API przekazuje opis, diagnostykę i zrzut do wybranej aplikacji,
- gdy systemowe udostępnianie plików nie działa, pliki są pobierane, a
  przygotowany e-mail przypomina o ich ręcznym dołączeniu.

Przeglądarka nigdy nie robi zrzutu ukradkiem. System operacyjny pokazuje wybór
ekranu/karty, a użytkownik musi wyrazić zgodę.

## Zawartość bezpiecznej diagnostyki

- numer zgłoszenia,
- wersja aplikacji,
- czas,
- rola,
- bieżąca ścieżka bez parametrów,
- typ systemu i przeglądarki,
- rozmiar ekranu i pixel ratio,
- stan online/offline,
- maksymalnie 60 ostatnich zdarzeń technicznych.

Nie zapisujemy:

- hasła, tokenu ani cookie,
- treści wiadomości,
- nazw i danych uczniów,
- zawartości formularzy,
- pełnych adresów URL z parametrami,
- historii przeglądania.

E-mail, telefon, sekret i wrażliwe parametry zapytania są redagowane przez
`modules/observability/sanitize.ts`.

## Docelowy przepływ po Etapie 1

1. Zalogowany użytkownik wysyła formularz do chronionego endpointu.
2. Serwer nadaje `referenceCode` i zapisuje rekord `FeedbackReport`.
3. Zrzut trafia do prywatnego zasobu obiektowego pod losowym kluczem.
4. E-mail do pomocy zawiera opis i bezpieczny link, nie publiczny załącznik.
5. Zdarzenia serwera mają korelacyjny `requestId`.
6. Sentry otrzymuje tylko zredagowane zdarzenie i `referenceCode`.
7. Dyrektor widzi status: nowe, sprawdzone, w realizacji, rozwiązane.
8. Odczyt zrzutu jest audytowany.

Publiczny endpoint bez logowania nie zostanie włączony, ponieważ można by go
wykorzystać do spamu i wysyłania cudzych plików.

## Retencja do zatwierdzenia

Propozycja:

- zrzut: 14 dni od zamknięcia,
- opis i diagnostyka: 90 dni od zamknięcia,
- zagregowane statystyki błędów bez danych użytkownika: 12 miesięcy.

Wartości muszą trafić do polityki retencji KLA przed produkcją.

## Jak przekazać feedback Codexowi

1. Kliknij czerwony przycisk z ikoną błędu.
2. Wybierz „Tylko plik dla pomocy”.
3. Dołącz pobrany plik `kla-diagnostyka-....json` do zadania Codex.
4. Jeśli problem jest wizualny, dołącz też zrzut.

Nie trzeba kopiować logów z Terminala ani ujawniać danych konta.
