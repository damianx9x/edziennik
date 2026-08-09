# Etap 5 — komunikator i ogłoszenia

## Co działa

- wykładowca rozmawia wyłącznie z przypisanymi grupami,
- rodzic widzi grupy powiązanych dzieci, a uczeń własne grupy,
- dyrektor tworzy rozmowę z konkretnymi rodzicami, uczniami lub wykładowcami;
  jej skład jest jawny i nie może być samodzielnie rozszerzony przez uczestnika,
- dyrektor wysyła jedno ogłoszenie do maksymalnie 30 wybranych grup,
- odczyty są zapisywane po świadomym otwarciu rozmowy,
- e-mail trafia do trwałej kolejki z ponowieniami i idempotencją,
- dyrektor otwiera rozmowę bez dodatkowego formularza; dostęp jest automatycznie
  zapisywany w historii bezpieczeństwa,
- każda rola widzi informację, że komunikator jest służbowy i dyrektor ma wgląd,
- otwarcie, wiadomość i ogłoszenie tworzą bezpieczny wpis audytu bez treści.

## Jak sprawdzić

1. Zaloguj się jako `wykladowca` i otwórz **Wiadomości**. Wyślij wiadomość.
2. Zaloguj się jako `rodzic` lub `uczen`. Otwórz tę samą grupę i odpowiedz.
3. Zaloguj się jako `dyrektor`. Utwórz ogłoszenie do dwóch grup.
4. Kliknij kanał jako dyrektor. Treść otwiera się od razu, bez pytania o powód.
5. Wybierz ikonę nowej rozmowy, dodaj jednego rodzica i ucznia, a potem wyślij
   wiadomość. Inne konto nie może zobaczyć tej rozmowy.
6. Po otwarciu sprawdź licznik odczytów, statusy kolejki e-mail oraz wpis audytu.

## Ważne przed prawdziwymi danymi

Regulamin pracy i informacja dla rodzin muszą opisywać służbowy charakter
kanału, zasady dostępu dyrektora, retencję oraz zakaz przesyłania danych
szczególnie wrażliwych. Należy skonfigurować dostawcę e-mail przez zmienne
`KLA_EMAIL_API_URL`, `KLA_EMAIL_API_TOKEN` i `KLA_EMAIL_FROM` oraz wykonać test
ponowienia. SMS i natychmiastowe WebSockety nie należą do tego etapu.
