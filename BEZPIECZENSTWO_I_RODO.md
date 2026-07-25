# Bezpieczeństwo i RODO — przed prawdziwymi danymi

To checklista techniczno-organizacyjna, nie porada prawna. Treści i podstawy
musi zatwierdzić prawnik lub IOD klientki.

## Korekty ważne

1. Dane dziecka nie są automatycznie szczególną kategorią art. 9, lecz wymagają
   szczególnej ochrony; frekwencja, oceny, rodzina i wiadomości są ryzykowne.
2. Art. 8 RODO dotyczy zgody przy usłudze społeczeństwa informacyjnego
   oferowanej bezpośrednio dziecku. Nie oznacza zgody rodzica na każdy proces
   osoby poniżej 16 lat:
   [RODO art. 8](https://eur-lex.europa.eu/legal-content/PL/TXT/?uri=CELEX%3A32016R0679).
3. Polska lokalizacja nie zastępuje podstaw, minimalizacji, powierzeń,
   bezpieczeństwa i praw osób.
4. Monitoring komunikacji pracowników wymaga celu, zakresu, informacji i
   ochrony prywatnej korespondencji:
   [materiał UODO](https://uodo.gov.pl/pl/701/4469).
5. Nie ustawiamy arbitralnie jednej retencji. Każdy typ danych ma uzasadniony
   okres i procedurę usunięcia/anonimizacji.

## Bramka produkcji

### Prawo i organizacja

- [ ] Szkoła jest administratorem danych.
- [ ] Powierzenia z hostingiem, e-mailem, SMS i plikami są podpisane.
- [ ] Znani są podwykonawcy i transfery.
- [ ] Rejestr czynności jest gotowy.
- [ ] Ocena potrzeby DPIA jest zapisana.
- [ ] Prywatność, obowiązki, regulamin, podstawy i zgody są zatwierdzone.
- [ ] Procedury praw osób są gotowe.
- [ ] Retencja osobno dla kont, ocen, obecności, umów, płatności, wiadomości,
      audytu, plików i backupów.
- [ ] Komunikator i dostęp dyrektora zatwierdził prawnik/IOD.

### Konta

- [ ] Tylko zaproszenia, brak publicznej rejestracji.
- [ ] Weryfikacja e-mail.
- [ ] Dyrektor ma wymuszone TOTP i kody awaryjne.
- [ ] Reset hasła unieważnia sesje.
- [ ] Bezpieczne cookie, limit sesji i wylogowanie innych urządzeń.
- [ ] Testy izolacji ról przechodzą.
- [ ] Imienne dostępy techniczne, natychmiastowe odebranie.

### Aplikacja

- [ ] Wymuszony HTTPS, port Node niepubliczny.
- [ ] CSP/nagłówki, rate limiting i limity żądań.
- [ ] Walidacja na serwerze.
- [ ] Logi bez haseł, tokenów, treści, pełnego IP i zbędnych danych.
- [ ] Załączniki: rozmiar, typ, kontrola dostępu i skanowanie.
- [ ] Pliki importu są prywatne, mają ustaloną retencję i są usuwane zgodnie
      z harmonogramem po zakończeniu importu.
- [ ] Eksporty krótkotrwałe i audytowane.
- [ ] ContractAcceptance niezmienne.
- [ ] Odczyt rozmowy przez dyrektora audytowany.
- [ ] SMS blokowany po limicie.

### Hosting i awaria

- [ ] Osobne bazy/sekrety staging i production.
- [ ] Staging ma wyłącznie dane syntetyczne.
- [ ] Codzienny szyfrowany backup poza repozytorium.
- [ ] Ustalono RPO/RTO.
- [ ] Próbne odtworzenie zakończone sukcesem.
- [ ] Backup ma retencję i procedurę usuwania.
- [ ] Aktualizacje zależności, monitoring i alerty.
- [ ] Plan incydentu i osoby kontaktowe.

## Minimalizacja

Nie zbieramy PESEL, zdrowia, pełnego adresu, zdjęcia ani daty urodzenia „na
przyszłość”. Nowe pole wymaga celu, podstawy, odbiorców, retencji i odpowiedzi,
czy usługa może działać bez niego.

Import próbny zawsze korzysta z danych syntetycznych i domeny
`invalid.example`. Przed pierwszym importem prawdziwych danych trzeba zamknąć
bramkę produkcji, ustalić retencję pliku źródłowego i wykonać zaszyfrowaną
kopię bazy.
