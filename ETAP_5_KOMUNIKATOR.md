# Etap 5 — komunikator i ogłoszenia

## Co działa

- wykładowca rozmawia wyłącznie z przypisanymi grupami,
- rodzic widzi grupy powiązanych dzieci, a uczeń własne grupy,
- dyrektor wysyła jedno ogłoszenie do maksymalnie 30 wybranych grup,
- odczyty są zapisywane po świadomym otwarciu rozmowy,
- e-mail trafia do trwałej kolejki z ponowieniami i idempotencją,
- dyrektor otwiera treść rozmowy na 15 minut po podaniu celu i uzasadnienia,
- otwarcie, wiadomość i ogłoszenie tworzą bezpieczny wpis audytu bez treści.

## Jak sprawdzić

1. Zaloguj się jako `wykladowca` i otwórz **Wiadomości**. Wyślij wiadomość.
2. Zaloguj się jako `rodzic` lub `uczen`. Otwórz tę samą grupę i odpowiedz.
3. Zaloguj się jako `dyrektor`. Utwórz ogłoszenie do dwóch grup.
4. Kliknij kanał jako dyrektor. Treść pozostaje ukryta do podania powodu.
5. Po otwarciu sprawdź licznik odczytów oraz statusy kolejki e-mail.

## Ważne przed prawdziwymi danymi

Regulamin pracy i informacja dla rodzin muszą opisywać służbowy charakter
kanału, zasady dostępu dyrektora, retencję oraz zakaz przesyłania danych
szczególnie wrażliwych. Należy skonfigurować dostawcę e-mail przez zmienne
`KLA_EMAIL_API_URL`, `KLA_EMAIL_API_TOKEN` i `KLA_EMAIL_FROM` oraz wykonać test
ponowienia. SMS, czat prywatny i natychmiastowe WebSockety nie należą do tego
etapu.
