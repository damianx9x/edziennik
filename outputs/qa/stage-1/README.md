# QA Etapu 1 — 2026-07-25

Sprawdzone ręcznie w przeglądarce:

- 375 × 812: logowanie rodzica, wykładowcy, ucznia i dyrektora,
- 375 × 812: odmowa dostępu rodzica i ucznia do panelu szkoły,
- 375 × 812: utworzenie oraz cofnięcie jednorazowego zaproszenia,
- konfiguracja TOTP dyrektora i ponowne logowanie z kodem,
- wymagane potwierdzenie zapisania kodów awaryjnych,
- pełne użycie zaproszenia: konto powstaje, e-mail jest zweryfikowany, a drugie
  użycie tego samego linku jest odrzucane,
- reset hasła zwraca jednakowy komunikat i nie ujawnia istnienia konta,
- formularz zgłoszenia problemu automatycznie rozpoznaje rolę,
- 1440 × 900: panel dyrektora i brak poziomego przewijania,
- konsola przeglądarki: brak błędów i ostrzeżeń,
- rozpakowana paczka Node.js: start serwera, nagłówki bezpieczeństwa,
  przekierowanie trasy chronionej i odrzucenie publicznej rejestracji.

Zrzuty nie zawierają haseł, tokenów zaproszeń ani kodów awaryjnych.
