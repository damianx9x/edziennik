# Etap 4 — umowy i statusy płatności

## Co działa

- Dyrektor wysyła rodzicowi niezmienny plik PDF przypisany do ucznia i wybiera
  akceptację w formie dokumentowej albo podpis poza systemem.
- Dla umowy odpłatnej rodzic widzi bezpośrednio przed decyzją zakres usługi,
  cenę i przycisk **Zamówienie z obowiązkiem zapłaty**.
- System zapisuje numer wersji i skrót SHA-256 dokumentu.
- Kliknięcie pozycji otwiera duży podgląd. Rodzic musi najpierw świadomie
  wyświetlić PDF, a potem jawnie zaakceptować dokładną wersję.
- Po akceptacji rodzic i dyrektor mogą pobrać potwierdzenie z datą, tekstem
  oświadczenia i skrótem dokumentu.
- Poprawka umowy tworzy kolejną wersję. Stary plik i wcześniejsza akceptacja
  pozostają w historii.
- Dyrektor ręcznie ustawia status płatności: nieustalona, oczekuje, opłacona
  albo po terminie.
- Rodzic widzi wyłącznie statusy dzieci, z którymi jest powiązany.
- Zmiany umów, wyświetlenia dokumentów, akceptacje i statusy płatności są
  zapisywane w audycie.
- Wykładowca, uczeń i obsługa techniczna nie widzą umów ani płatności rodzin.

## Jak sprawdzić lokalnie

1. Zaloguj się jako `dyrektor` / `dyrektor`.
2. Otwórz **Umowy**, wybierz tryb, wpisz najważniejsze warunki, wybierz
   aktywnego rodzica i powiązanego ucznia, dodaj PDF do 10 MB i kliknij
   **Wyślij rodzicowi**.
3. Wyloguj się i zaloguj jako `rodzic` / `rodzic`.
4. Otwórz **Umowy**, kliknij całą pozycję, wybierz **Wyświetl PDF**, zaznacz
   dokładne oświadczenie i zaakceptuj dokument.
5. Jako dyrektor otwórz **Płatności**, wybierz ucznia, okres i status. Rodzic
   zobaczy pozycję po ponownym wejściu do **Płatności**.

## Ważne przed prawdziwymi danymi

Akceptacja w eDzienniku utrwala oświadczenie w formie dokumentowej. Nie jest
kwalifikowanym podpisem elektronicznym i nie zachowuje formy pisemnej tam,
gdzie jest ona wymagana. Wzorzec umowy, informacje przedkontraktowe, zasady
odstąpienia i tekst oświadczenia muszą zostać zatwierdzone przez prawnika.
Przed prawdziwymi danymi dyrektor musi mieć 2FA, a magazyn plików i backup
muszą przejść checklistę bezpieczeństwa i RODO.
