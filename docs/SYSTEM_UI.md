# Przewodnik modułów eDziennika KLA

Ten dokument jest wspólną umową dla obecnych i przyszłych ekranów. Logika i
łatwość użycia mają pierwszeństwo przed liczbą funkcji i dekoracją.

## 1. Stały układ każdego modułu

1. Krótka nazwa obszaru nad tytułem.
2. Tytuł mówiący językiem użytkownika, nie językiem technicznym.
3. Jedno zdanie: co można tu zrobić.
4. Jedna główna akcja w prawym górnym rogu.
5. Najważniejsza codzienna praca.
6. Filtry i ustawienia dodatkowe.
7. Historia lub informacje techniczne na końcu.

Nie pokazujemy kilku równie ważnych przycisków. Jeśli czynność nie jest
codzienna, trafia do menu dodatkowego, rozwijanej sekcji albo okna dialogowego.

## 2. Nazewnictwo

- `Start` — Command Center i sprawy wymagające uwagi.
- `Kartoteki` — osoby, grupy, sale, lokalizacje oraz zaproszenia i dostęp.
- `Grafik` — plan całej szkoły, Asystent i edycja ręczna.
- `Ustawienia` — strona publiczna, import i eksport danych.
- `Statystyki` — użycie systemu, zgłoszenia i stan techniczny.

Nie używamy w podstawowym interfejsie słów: PostgreSQL, endpoint, rekord,
deployment, payload, cron ani storage. Informacje dla opiekuna systemu powinny
być opisane osobno.

## 3. Hierarchia informacji

- Najpierw: „co wymaga mojej decyzji?”.
- Następnie: „co robię najczęściej?”.
- Potem: „co mogę sprawdzić?”.
- Na końcu: historia, diagnostyka i ustawienia zaawansowane.

Puste miejsce musi mówić, dlaczego jest puste i wskazywać następny krok.
Błąd musi mówić, jak go naprawić. Sukces musi potwierdzić skutek.

## 4. Karty, listy i okna

- Karta służy do krótkiego podsumowania lub wyboru jednego obiektu.
- Lista służy do porównywania wielu podobnych obiektów.
- Tabela jest używana tylko wtedy, gdy porównuje co najmniej trzy kolumny.
- Duże okno dialogowe służy do pełnej kartoteki, podglądu lub zadania, po
  którym użytkownik wraca do tej samej listy.
- Osobna strona służy do pracy wieloetapowej, długiej albo wymagającej linku.

Okno dialogowe ma widoczny tytuł, zamknięcie, focus klawiatury i nie może
wychodzić poza ekran. Przesuwanie i skalowanie jest dodatkiem desktopowym, nie
warunkiem wykonania zadania.

## 5. Telefon i komputer

- Projekt zaczynamy od 375 × 812 px.
- Dotykalne elementy mają minimum 44 × 44 px.
- Na telefonie jeden dzień grafiku, na komputerze tydzień.
- Nie ma poziomego przewijania całej strony.
- Dolne menu ma maksymalnie pięć najważniejszych pozycji.
- Na komputerze szerokość treści wykorzystuje miejsce, ale tekst nie staje się
  przesadnie długi.

## 6. Kolor i ruch

- Granat oznacza główną akcję i strukturę.
- Zieleń oznacza sukces i bezpieczny stan.
- Czerwień oznacza błąd lub działanie nieodwracalne.
- Żółty oznacza uwagę, ale nie awarię.
- Animacja trwa krótko i wyjaśnia zmianę stanu. Respektuje
  `prefers-reduced-motion`.

## 7. Dane i prywatność

- Każdy ekran respektuje rolę użytkownika i `schoolId`.
- Statystyki nie zapisują IP, danych urządzenia, treści wiadomości ani wartości
  parametrów wyszukiwania.
- Zrzut ekranu jest wykonywany tylko świadomie przez użytkownika.
- Dane demonstracyjne są syntetyczne.

## 8. Checklista nowego modułu

- [ ] Jedno główne zadanie jest widoczne bez przewijania.
- [ ] Nazwy rozumie osoba nietechniczna.
- [ ] Codzienna czynność mieści się w trzech dotknięciach.
- [ ] Widok działa na 375 × 812 i 1440 × 900.
- [ ] Jest loading, pusty stan, sukces i błąd z następnym krokiem.
- [ ] Uprawnienia są sprawdzone na serwerze.
- [ ] Zmiany ważnych danych trafiają do audytu.
- [ ] Klawiatura, focus, kontrast i rozmiar dotyku są poprawne.
- [ ] Moduł nie dubluje funkcji z innego działu.
- [ ] Testy, dokumentacja i paczka wydaniowa są aktualne.

## 9. Moduły opcjonalne

- Właściciel systemu ustawia widoczność modułu osobno dla każdej roli.
- Wyłączenie usuwa pozycję z menu, skrótów pulpitu i samouczka.
- Bezpośredni adres pokazuje prostą informację, że szkoła nie korzysta obecnie
  z tej funkcji; nie wolno ujawnić danych modułu przed tą kontrolą.
- Start, logowanie, MFA, pomoc i zgłoszenie problemu są zawsze dostępne.
- Ponowne włączenie przywraca wcześniejsze dane — przełącznik nie jest
  kasowaniem ani retencją.

## 10. Wizytówka modułowa

- Edytor oferuje gotowe typy widgetów, a nie pusty kreator kodu.
- Maksymalnie 24 widgety chronią wydajność i czytelność strony.
- Każdy widget ma typ, etykietę, tytuł, opis, akcję, rozmiar i ton kolorystyczny.
- Link przechodzi walidację: sekcja `#`, bezpieczna ścieżka wewnętrzna,
  `https:`, `mailto:` albo `tel:`.
- Ruch jest jednorazowy i funkcjonalny; użytkownik ograniczający animacje
  otrzymuje nieruchomy, kompletny widok.
