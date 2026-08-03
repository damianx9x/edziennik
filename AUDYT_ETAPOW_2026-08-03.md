# Audyt etapów — dwie tury

Data zakończenia: 3 sierpnia 2026
Zakres: Etapy 0–2 oraz aktualny fragment Etapu 3 (`stage/3-schedule-diary`)

## Wynik w skrócie

Po dwóch turach nie pozostał potwierdzony błąd P0 ani P1 w objętym zakresem
kodzie. Kontrola automatyczna obejmuje 23 pliki i 88 testów. Produkcyjny build
Next.js przechodzi. Etap 3 nie jest jeszcze ukończony: cykliczność, wyjątki,
temat lekcji, obecność i pełny test odbiorczy klientki pozostają w jego dalszej
części.

## Tura 1 — egzaminator

Egzaminator zakwestionował:

1. Zaproszenia kolidowały z kartoteką utworzoną wcześniej bez konta, a
   archiwalne konto mogło odzyskać inną rolę.
2. Kod QR traktował dowolny adres e-mail jak zweryfikowany.
3. Ręczny grafik i publikacja propozycji nie sprawdzały na serwerze wszystkich
   reguł pojemności, dostępności i aktywności zasobów.
4. Edycja kartoteki właściciela systemu omijała wymóg MFA.
5. Host testowy pilnował procesu, ale nie całej ścieżki: aplikacja–baza–tunel.
6. Statystyki odwiedzin przyjmowały zbyt swobodne ścieżki i nie miały
   wystarczającego ograniczenia zapisu.
7. Interfejs miał nakładający się przycisk zgłoszenia, słabe stany oczekiwania,
   brak potwierdzenia cofnięcia zaproszenia i niedopracowane dialogi.
8. Dokumentacja miejscami opisywała planowane funkcje jak już gotowe.

## Tura 1 — obrona studenta

- Umowy, płatności, komunikator oraz materiały nie są brakami bieżącego etapu;
  mają jawnie wyznaczone Etapy 4–6.
- Cykliczność, wyjątki, temat i obecność należą do dalszej części Etapu 3, a nie
  do pierwszego odbioru grafiku.
- Wyłączenie MFA dyrektora dotyczy wyłącznie syntetycznego środowiska demo;
  rola właściciela systemu nadal wymaga MFA.
- Lokalny Mac jest hostem demonstracyjnym, nie środowiskiem z gwarantowanym
  SLA. Watchdog ogranicza awarie, ale nie zastąpi VPS.

Obrona wyjaśniła zakres, lecz nie unieważniła błędów wykonania. Wszystkie
potwierdzone uwagi P1 i P2 zostały przyjęte do poprawy.

## Poprawki po turze 1

- bezpieczne ponowne użycie kartoteki zaproszonej osoby tylko w tej samej
  szkole i roli; brak zmiany roli przy reaktywacji;
- produkcyjny QR wymaga weryfikacji e-mail, a automatyczna weryfikacja dotyczy
  wyłącznie syntetycznej domeny demo;
- wspólny walidator grafiku i blokada transakcyjna na szkołę;
- ponowne sprawdzenie każdego wpisu przed publikacją propozycji;
- odrzucanie nieaktualnych propozycji po zmianie zasobów lub reguł;
- poprawne sprawdzanie MFA dla roli właściciela systemu;
- endpoint zdrowia zależny od zapytania do PostgreSQL, migracje przed startem,
  watchdog lokalnego HTTP i publicznego tunelu;
- ograniczenie i deduplikacja statystyk oraz ścisła lista dozwolonych ścieżek;
- poprawki dialogów, formularzy, stanów oczekiwania, fokusu i elementów 44 px;
- urealnienie dokumentacji i nazw etapów.

## Tura 2 — ponowny egzaminator

Ponowna kontrola nie znalazła P0 ani P1. Znalazła cztery P2:

1. „Zgłoś problem” nadal mógł zasłaniać grafik na desktopie.
2. Szybki formularz po ponownym otwarciu pokazywał komunikat poprzedniego
   sukcesu.
3. Nieudane cofnięcie nieaktualnego zaproszenia nie miało komunikatu.
4. Podczas zapisu przesunięcia można było rozpocząć kolejne przeciągnięcie.

## Tura 2 — obrona studenta i werdykt

Student wykazał, że mobile, dialog cofnięcia, fokus, komunikaty Asystenta,
uchwyt 44 px i obsługa błędu sieciowego były już poprawione. Cztery uwagi
pozostały jednak zasadne i zostały wdrożone:

- przycisk zgłoszenia jest częścią układu i nie nakłada się na treść;
- nowo otwarty szybki formularz nie odziedzicza starego sukcesu;
- cofnięcie zaproszenia zwraca czytelny sukces albo błąd wyścigu;
- plansza blokuje przeciąganie do końca trwającego zapisu.

Próba wdrożenia wykryła jeszcze błąd operacyjny: nowe pliki usług macOS miały
zbyt restrykcyjne uprawnienia dla `launchd`. Pliki konfiguracyjne usług są
teraz zapisywane jako tylko do odczytu dla grupy i pozostałych (`0644`), a
sekrety oraz dane przekazania nadal pozostają prywatne (`0600`).

## Rzeczy świadomie pozostawione na później

- ręczne zarządzanie relacjami rodzic–dziecko i składami grup w pełnym UI;
- cykliczność, wyjątki, temat, obecność i pełny test równoległych żądań Etapu 3;
- moduły Etapów 4–6;
- docelowy dostawca poczty, zewnętrzny szyfrowany backup i próba odtworzenia;
- produkcyjny VPS. Mac może działać stale tylko, gdy jest włączony, zalogowany
  oraz ma sprawny internet i zasilanie.

## Dowody odbioru

- `npm run check`: 23 pliki, 88/88 testów, TypeScript, Prisma i kontrola
  sekretów — zaliczone;
- `npm run build`: produkcyjny build Next.js — zaliczony;
- zrzuty pierwszej i drugiej tury: `outputs/qa/stage-3/`;
- paczka wydaniowa: generowana ponownie po końcowym teście przeglądarkowym.
