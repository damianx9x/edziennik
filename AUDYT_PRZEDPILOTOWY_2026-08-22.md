# Audyt przedpilotowy eDziennika KLA — 22 sierpnia 2026

## Wynik

Zakres zaakceptowanych Etapów 0–5 jest spójny i nadaje się do dalszych testów
na danych syntetycznych. Audyt nie jest zgodą na wprowadzenie prawdziwych danych
dzieci. Produkcję odblokowuje dopiero zamknięcie bramek opisanych w sekcji
„Przed prawdziwymi danymi”.

## Sprawdzone obszary

- role i odmowy dostępu po stronie serwera,
- kartoteki, import, eksport i historia zmian,
- grafik ręczny, automatyczny i blokady kolizji,
- pakiety umów, podpisany skan, akceptacja dokumentowa i raty,
- wiadomości, ogłoszenia, załączniki i jawny audyt dyrektora,
- powiadomienia, analityka, zgłaszanie błędów i samouczek,
- prywatne pliki, backup, aktualizacje oraz instalacja Raspberry Pi,
- responsywność telefonu 375 × 812 i komputera 1440 × 900.

## Znalezione i poprawione

### Wysokie

1. Interfejs pamiętał otwarcie trzech dokumentów tylko w przeglądarce. Serwer
   znał ogólny stan „wyświetlono”, więc bezpośrednie żądanie mogło ominąć
   kolejność UI. Dodano trwały zapis odczytu każdego dokumentu oraz serwerową
   odmowę akceptacji niepełnego pakietu.
2. Identyfikatory w trasach prywatnych plików nie były odrzucane przed zapytaniem
   do PostgreSQL. Niepoprawny identyfikator mógł powodować błąd 500. Wszystkie
   trasy umów i załączników walidują teraz UUID i zwracają kontrolowane 404.
3. Polityka CSP panelu używała jednorazowego nonce, lecz część publicznego buildu
   była statyczna. Przeglądarka prawidłowo blokowała wtedy skrypty startowe
   Next.js. Cały panel jest teraz renderowany dynamicznie, dzięki czemu własne
   skrypty otrzymują nonce konkretnego żądania. Publiczny test nie zgłasza błędów
   CSP.

### Średnie

1. Dane demo wskazywały ten sam pusty PDF jako umowę, kosztorys i harmonogram.
   Seed tworzy teraz trzy różne, czytelne dokumenty syntetyczne i wspólny skrót
   całego pakietu.
2. Endpoint anonimowej statystyki nie odrzucał żądania o nadmiernym rozmiarze.
   Dodano limit wejścia przed parsowaniem JSON.
3. Pobranie podpisanego dokumentu przez dyrektora nie używało wzmocnionej
   kontroli sesji dyrektora. Trasa korzysta teraz z tego samego mechanizmu co
   pozostałe wrażliwe operacje.
4. Powiadomienie o konkretnej racie otwierało kartę całej umowy zamiast tej
   raty. Odnośnik wskazuje teraz dokładny wiersz rozliczenia.
5. W bazie demonstracyjnej pozostało pięć historycznych umów bez aktualnego
   pakietu dokumentów. Usunięto wyłącznie te syntetyczne wpisy i ich zależne
   statusy. Demo pokazuje teraz trzy kompletne warianty z trzema PDF-ami.

### Spójność i UX

1. Usunięto numery etapów z działających ekranów. Użytkownik widzi nazwę
   czynności, a nie wewnętrzny harmonogram projektu.
2. Ujednolicono nazwę „Umowa i informacje RODO”. RODO jest obowiązkiem
   informacyjnym i zasadami przetwarzania, nie automatyczną zgodą rodzica.
3. Pomoc prawna została powiązana z realnym procesem kursu KLA i konkretnymi
   artykułami. Rozróżnia formę dokumentową, podpis odręczny i kwalifikowany.
4. Widok rodzica pamięta otwarte dokumenty po ponownym wejściu. Nadal nie pozwala
   zaakceptować pakietu, którego wymaganych pozycji nie odczytano.

## Stan etapów

| Etap | Stan po audycie | Uwagi |
|---|---|---|
| 0–0.7 | gotowy do demo | marka, strona, feedback, statyczny pokaz |
| 1 | gotowy do demo | logowanie, role i kontrola tras |
| 2 | gotowy do demo | kartoteki, pliki, import/eksport |
| 3 | gotowy do demo | grafik, konflikty, widoki ról, obecność |
| 4 | gotowy do ponownego odbioru | pakiet 3 PDF-ów, podpis/akceptacja, raty |
| 5 | gotowy do ponownego odbioru | rozmowy, ogłoszenia, powiadomienia |
| 6 | nieukończony | materiały, zadania, oddawanie prac i PWA |
| 7 | nie rozpoczęty | formalny odbiór, retencja, backup i test odtworzenia |

Nie ukrywamy braków Etapu 6. Nieaktywne kafle mówią wprost, że moduł nie jest
jeszcze uruchomiony i nie pozorują działającej funkcji.

## Przed prawdziwymi danymi

- włączyć wymagane 2FA dyrektora,
- uruchomić obowiązkowy ClamAV zamiast trybu demonstracyjnego,
- użyć szyfrowanego woluminu dla PostgreSQL i prywatnych plików,
- skonfigurować szyfrowany backup poza urządzeniem i wykonać test odtworzenia,
- wpisać zatwierdzone okresy retencji dla umów, wiadomości, obecności i audytu,
- podpisać umowy powierzenia z dostawcami infrastruktury,
- zatwierdzić ostateczne PDF-y KLA i obowiązek informacyjny przed pierwszą wysyłką,
- wykonać test zadaniowy klientki na wszystkich czterech rolach.

## Regresja obowiązkowa

Każde kolejne wydanie musi przejść `npm run check`, `npm run build`, migracje,
test telefonu i desktopu, kontrolę logów, paczkowanie oraz publiczną kontrolę
dokładnie tego commita. Aktualizacja nie może nadpisywać przyjętej umowy ani
usuwać historii audytu.
