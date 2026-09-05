# Bezpieczeństwo i RODO — przed prawdziwymi danymi

To checklista techniczno-organizacyjna, nie porada prawna. Treści i podstawy
musi zatwierdzić prawnik lub IOD administratora danych.

## Audyt umów elektronicznych — 22 sierpnia 2026

- Akceptacja w eDzienniku pozostaje **formą dokumentową**, nie jest opisywana
  jako podpis kwalifikowany. Kodeks cywilny wymaga możliwości ustalenia osoby
  składającej oświadczenie (art. 77²), a równoważność z formą pisemną daje
  dopiero forma elektroniczna z kwalifikowanym podpisem (art. 78¹). System
  utrwala wersję PDF, hash, konto, czas i treść oświadczenia. Źródło:
  [Kodeks cywilny](https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20250001071/T/D20251071L.pdf).
- eIDAS zabrania odrzucenia podpisu tylko dlatego, że jest elektroniczny, ale
  nie nadaje każdemu kliknięciu skutku podpisu własnoręcznego. Równoważny jest
  podpis kwalifikowany. Źródło: [art. 25 eIDAS](https://eur-lex.europa.eu/legal-content/DE-EN/TXT/?uri=CELEX%3A32014R0910).
- Nie wdrażamy „podpisu SMS” jako automatycznie zgodnego prawnie. Kod SMS może
  być dodatkowym dowodem identyfikacji dopiero po wyborze dostawcy, analizie
  ryzyka, kosztów, treści umowy i opinii prawnika.
- Nauczanie języków obcych jest wskazane w art. 43 ust. 1 pkt 28 ustawy o VAT,
  ale aplikacja nie może sama rozstrzygać zwolnienia konkretnej usługi. Stawka
  lub zwolnienie muszą być zatwierdzone przez księgową i zapisane w umowie/PDF.
  Źródło: [ustawa o VAT](https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20210000685/O/D20210685.pdf).
- Minimalizacja, prywatność w projekcie, szyfrowanie, odtwarzalność i regularne
  testy zabezpieczeń wynikają odpowiednio z art. 5, 25 i 32 RODO. Źródło:
  [RODO](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32016R0679).
- Przed prawdziwymi umowami prawnik musi zaakceptować wzorzec, tryb zawarcia,
  informacje konsumenckie, odstąpienie, retencję dowodów oraz tekst przycisku.
  Księgowa musi zaakceptować sposób pokazania kwoty brutto i VAT/zwolnienia.
- Dla umowy odpłatnej system pokazuje bezpośrednio przed decyzją usługę, okres,
  cenę, termin, zasady zakończenia oraz przycisk „Zamówienie z obowiązkiem
  zapłaty”. Rodzic osobno potwierdza dokument, informacje konsumenckie i — gdy
  dotyczy — żądanie rozpoczęcia zajęć przed upływem 14 dni. Źródła:
  [ustawa o prawach konsumenta](https://eli.gov.pl/eli/DU/2014/827/ogl/pol),
  [wyjaśnienia UOKiK](https://prawakonsumenta.uokik.gov.pl/pytania-i-odpowiedzi/prawo-do-informacji/).
- Dane dzieci wymagają szczególnej ochrony; zakres kartotek, wiadomości,
  statystyk i zrzutów trzeba ograniczać do celu. Pomocnicze źródło urzędowe:
  [poradnik UODO dla szkół](https://uodo.gov.pl/pl/138/479).

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

### Raspberry Pi — szyfrowany sejf

- Baza PostgreSQL i prywatne dokumenty znajdują się na jednym woluminie LUKS2
  na osobnym SSD; karta microSD nie jest magazynem danych biznesowych.
- Klucz odzyskiwania jest generowany podczas pierwszej konfiguracji i nie jest
  później przechowywany na urządzeniu. Jego utrata razem z hasłem oznacza brak
  możliwości odzyskania danych.
- Każdy plik przechodzi centralny skan ClamAV. Na produkcji niedostępność
  skanera blokuje upload — plik nie trafia do magazynu „na później”.
- Kopia bazy, dokumentów i manifestu wersji jest szyfrowana przed wysłaniem
  SFTP. Serwer SFTP musi być poza Raspberry Pi i najlepiej poza lokalem.
- Test odtworzenia tworzy tymczasową bazę, wykonuje realne `pg_restore` i
  sprawdza archiwum dokumentów. Wynik jest dowodem technicznym, nie zastępuje
  protokołu okresowego testu podpisanego przez odpowiedzialną osobę.
- Automatyczne usuwanie umów i wiadomości pozostaje wyłączone do zatwierdzenia
  okresów przez prawnika/IOD. Wartość `0` oznacza brak automatycznego kasowania.

### Podpisane egzemplarze umów

- Oryginał PDF i wgrany podpisany egzemplarz są przechowywane poza `public/`.
- Dostęp ma wyłącznie właściwy rodzic i dyrektor po autoryzacji na serwerze;
  sama znajomość adresu pliku nie wystarcza.
- System sprawdza sygnaturę PDF/JPG/PNG, limit 10 MB, nadaje losowy klucz,
  zapisuje plik z prawami `0600` i liczy SHA-256.
- Upload, pobranie, zatwierdzenie i odrzucenie tworzą wpis audytowy bez treści
  pliku i bez danych podpisu.
- Odrzucony plik jest logicznie archiwizowany. Fizyczne usunięcie wykona
  polityka retencji uzgodniona z prawnikiem i IOD.
- Backup umów jest szyfrowany, poza serwerem aplikacji i przechodzi okresowy
  test odtworzenia. Klucz szyfrowania nie znajduje się w bazie ani repozytorium.

## Minimalizacja

Nie zbieramy PESEL, zdrowia, pełnego adresu, zdjęcia ani daty urodzenia „na
przyszłość”. Nowe pole wymaga celu, podstawy, odbiorców, retencji i odpowiedzi,
czy usługa może działać bez niego.

Import próbny zawsze korzysta z danych syntetycznych i domeny
`invalid.example`. Przed pierwszym importem prawdziwych danych trzeba zamknąć
bramkę produkcji, ustalić retencję pliku źródłowego i wykonać zaszyfrowaną
kopię bazy.
