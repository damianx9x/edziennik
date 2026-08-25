# Etap 6 — materiały, zadania i postępy

## Cel

Wykładowca przekazuje materiały i zadania swojej grupie, uczeń oddaje pracę,
rodzic widzi przebieg własnych dzieci, a szkoła dokumentuje postęp prostym,
opisowym językiem. Moduł nie diagnozuje dziecka i nie przewiduje jego zachowań.

## Zakres wdrożenia pre-release

- materiał należy do jednej grupy i może mieć opis, prywatny plik albo
  bezpieczny link HTTPS;
- zadanie ma instrukcję, opcjonalny termin i stany pracy ucznia:
  nieotwarte, otwarte, oddane, spóźnione, sprawdzone;
- oddanie może zawierać notatkę oraz jeden prywatny plik;
- wykładowca dodaje informację zwrotną i oznacza pracę jako sprawdzoną;
- dyrektor widzi całą szkołę, wykładowca przypisane grupy, rodzic własne dzieci,
  a uczeń wyłącznie siebie;
- obserwacja postępu zawiera sześć umiejętności językowych w skali 1–5,
  opcjonalne zaangażowanie, notatkę, autora i datę;
- postęp może wskazywać konkretną lekcję; historia jest chronologiczna i może
  być pokazana jako interaktywny wykres oraz opis kierunku zmian;
- obecność jest kontekstem obok postępu, a nie automatyczną oceną ucznia.

## Reguły bezpieczeństwa i pedagogiczne

1. Każdy odczyt i zapis sprawdza `schoolId` oraz relację roli na serwerze.
2. Rodzic nie dostaje danych wszystkich uczniów grupy. Uczeń nie pobiera cudzej
   pracy przez identyfikator URL.
3. Wykładowca działa tylko w aktywnie przypisanej grupie. Dyrektor nie omija
   historii ani integralności danych.
4. Pliki nie mają publicznego adresu. Pobranie ponownie sprawdza uprawnienie,
   a produkcyjny upload wymaga skanera antywirusowego.
5. Wynik 1–5 jest obserwacją pracy nad umiejętnością, nie oceną szkolną,
   diagnozą, rankingiem ani podstawą automatycznej decyzji.
6. System nie generuje predykcji zachowania dziecka. Dozwolony jest wyłącznie
   opis trendu na podstawie widocznych danych, ze wskazaniem ograniczeń.
7. Retencja obserwacji, prac i plików wymaga zatwierdzenia przez szkołę/IOD
   przed prawdziwymi danymi.

## Scenariusze odbioru

### Dyrektor

- tworzy materiał i zadanie dla dowolnej aktywnej grupy;
- widzi liczbę prac w każdym stanie oraz szczegóły wybranego ucznia;
- widzi opisową historię postępu i obecności;
- nie może uzyskać sprzecznych rekordów przez podwójne kliknięcie.

### Wykładowca

- tworzy treść tylko dla swojej grupy;
- sprawdza tylko pracę ucznia przypisanego do tej grupy;
- dodaje obserwację 1–5 z jasnym opisem następnego kroku;
- próba użycia ID cudzej grupy/ucznia kończy się odmową.

### Rodzic

- przełącza własne dzieci i widzi właściwe materiały, zadania, status oraz
  informację zwrotną;
- nie widzi treści oddanych przez innych uczniów;
- wykres i opis nie sugerują pewnej prognozy ani diagnozy.

### Uczeń

- otwiera materiał i własne zadanie, dodaje notatkę/plik oraz widzi status;
- nie zmienia feedbacku i nie otwiera cudzej pracy;
- widzi własny opis postępu i następny krok.

## Dane demonstracyjne

Tryb `rich` zawiera dwa materiały, dwa zadania, różne stany oddania i cztery
punkty postępu dla syntetycznych uczniów. Tryb `clean` pozostawia tylko konta
testowe i lokalizacje. Hasło konta odbiorowego pochodzi z prywatnej zmiennej
`KLA_DEMO_KINGA_PASSWORD`; nie znajduje się w seedzie ani repozytorium.

Bezpieczny reset zawsze robi zaszyfrowany snapshot i odmawia pracy, jeśli baza
zawiera szkołę bez `demo` w nazwie albo e-mail spoza `invalid.example`:

```bash
KLA_ALLOW_DEMO_RESET=1 npm run db:demo:reset:rich
KLA_ALLOW_DEMO_RESET=1 npm run db:demo:reset:clean
```

Nie używaj tych komend dla produkcji. Odtworzenie snapshotu wymaga osobnego
klucza, jawnego potwierdzenia i tej samej kontroli syntetycznego środowiska.

## Definition of done

- [ ] migracja jest rozszerzająca i przechodzi `npm run security:check`,
- [ ] testy dostępu: rodzic/cudze dziecko, wykładowca/cudza grupa,
  uczeń/cudza praca — odmowa,
- [ ] utworzenie materiału, zadania, oddanie i review przechodzą automatycznie,
- [ ] obserwacja waliduje wszystkie wartości 1–5,
- [ ] telefon 375 × 812 i komputer 1440 × 900 przechodzą realne klikanie,
- [ ] prywatne pliki i błędy nie ujawniają danych,
- [ ] `npm run check`, `npm run build` i wcześniejsze testy przechodzą,
- [ ] aktualna paczka oraz instrukcja odbioru wskazują dokładny commit.
