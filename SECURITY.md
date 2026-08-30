# Security policy

Bezpieczeństwo danych dzieci, rodzin i pracowników ma pierwszeństwo przed
demonstracją funkcji. Publiczna strona `demo.kingslanguageacademy.pl` działa w
neutralnym trybie produktu i nie renderuje danych szkoły. Uwierzytelniony panel
jest właściwym pilotem aplikacji, a nie otwartym laboratorium pentestowym.

## Odpowiedzialne zgłoszenie

Raport wyślij prywatnie na [damianx9x@me.com](mailto:damianx9x@me.com). Podaj:

- adres i krok po kroku sposób odtworzenia;
- oczekiwany oraz faktyczny rezultat;
- wpływ na poufność, integralność lub dostępność;
- minimalny dowód bez kopiowania cudzych danych;
- opcjonalnie propozycję naprawy.

Nie publikuj szczegółów podatności przed potwierdzeniem poprawki. Pierwsze
potwierdzenie zgłoszenia jest celem operacyjnym, nie gwarancją SLA ani nagrody.
Projekt nie prowadzi programu płatnego bug bounty, chyba że zostanie to osobno
uzgodnione na piśmie.

## Dozwolony zakres testów

Bez dodatkowej pisemnej zgody dozwolone są wyłącznie ręczne,
niskonatężeniowe testy publicznej wizytówki i granicy logowania. Jeżeli uda się
utworzyć konto bez ważnego zaproszenia, uzyskać cudzą rolę albo odczytać cudzy
rekord, zatrzymaj test i zgłoś wynik. Konto wydane przez właściciela systemu nie
rozszerza zakresu poza funkcje i dane wyraźnie przypisane temu kontu.

Testy obciążeniowe, automatyczne skanowanie oraz szerszy pentest wymagają
osobnego, pisemnie zatwierdzonego zakresu i izolowanego środowiska z oddzielną
bazą, magazynem plików, sesjami i sekretami. Bieżący pilot nie spełnia tej roli.

Zabronione są:

- DoS/DDoS, testy obciążeniowe i automatyczne skanowanie o dużym natężeniu;
- socjotechnika, phishing, kontaktowanie szkoły, rodziców, uczniów lub dostawców;
- pobieranie, modyfikowanie albo usuwanie danych innych osób;
- utrzymywanie dostępu, instalowanie kodu, pivoting i testy infrastruktury poza
  domeną demo;
- próby pozyskania sekretów, kluczy, kopii, treści wiadomości lub dokumentów;
- testowanie prawdziwej domeny szkoły, poczty i usług osób trzecich.

Przypadkowo ujawnione dane należy usunąć lokalnie i opisać w raporcie bez ich
ponownego przesyłania. Te zasady nie upoważniają do działań zakazanych prawem.

## Zakres utrzymania

Aktualnie poprawki bezpieczeństwa dotyczą bieżącej gałęzi pre-production.
Sekrety, `.env`, bazy, dokumenty, backupy i klucze podpisujące nie są częścią
repozytorium. Automatyczna kontrola CI obejmuje typy, testy, migracje, skan
sekretów, audyt zależności i build produkcyjny.
