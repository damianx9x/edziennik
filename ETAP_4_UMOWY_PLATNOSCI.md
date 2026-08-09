# Etap 4 — umowy i statusy płatności

## Co działa

- Dyrektor wysyła rodzicowi niezmienny plik PDF przypisany do ucznia.
- System zapisuje numer wersji i skrót SHA-256 dokumentu.
- Rodzic musi najpierw otworzyć PDF, a potem jawnie zaakceptować tę wersję.
- Poprawka umowy tworzy kolejną wersję. Stary plik i wcześniejsza akceptacja
  pozostają w historii.
- Dyrektor ręcznie ustawia status płatności: nieustalona, oczekuje, opłacona
  albo po terminie.
- Rodzic widzi wyłącznie statusy dzieci, z którymi jest powiązany.
- Zmiany umów, wyświetlenia dokumentów, akceptacje i statusy płatności są
  zapisywane w audycie.

## Jak sprawdzić lokalnie

1. Zaloguj się jako `dyrektor` / `dyrektor`.
2. Otwórz **Umowy**, wybierz aktywnego rodzica i powiązanego ucznia, dodaj PDF
   do 10 MB i kliknij **Wyślij rodzicowi**.
3. Wyloguj się i zaloguj jako `rodzic` / `rodzic`.
4. Otwórz **Umowy**, kliknij **Otwórz PDF**, wróć do eDziennika, zaznacz
   potwierdzenie i zaakceptuj dokument.
5. Jako dyrektor otwórz **Płatności**, wybierz ucznia, okres i status. Rodzic
   zobaczy pozycję po ponownym wejściu do **Płatności**.

## Ważne przed prawdziwymi danymi

Akceptacja w eDzienniku nie jest kwalifikowanym podpisem elektronicznym.
Treść umowy i tekst oświadczenia muszą zostać zatwierdzone przez prawnika.
Przed prawdziwymi danymi dyrektor musi mieć 2FA, a magazyn plików i backup
muszą przejść checklistę bezpieczeństwa i RODO.
