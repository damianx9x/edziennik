# Audyt Etapu 4 — role, umowy i płatności

Data: 2026-08-09
Zakres: bieżąca gałąź `stage/4-contracts-payments`, dane syntetyczne.

## Wynik w skrócie

Etap nadaje się do testów funkcjonalnych na danych syntetycznych. Nie nadaje
się jeszcze do zawierania prawdziwych umów bez zatwierdzenia wzorca, informacji
konsumenckich, retencji i procedury odstąpienia przez prawnika szkoły.

System rozróżnia teraz:

1. akceptację w eDzienniku, która utrwala oświadczenie w formie dokumentowej;
2. podgląd dokumentu do podpisu poza systemem, gdy wymagana jest forma pisemna
   albo szkoła nie zatwierdziła akceptacji dokumentowej.

Nie nazywamy zwykłego kliknięcia kwalifikowanym podpisem elektronicznym.

## Co widzi każda rola

| Rola | Umowy | Płatności | Czego nie widzi |
|---|---|---|---|
| Dyrektor | wszystkie umowy swojej szkoły, wersje, status, właściwego rodzica i ucznia, potwierdzenie | wszystkie ręczne statusy swojej szkoły i notatkę administracyjną | danych innej szkoły; nie może zmieniać zaakceptowanej wersji |
| Wykładowca | brak dostępu | brak dostępu | treści umów, cen, zaległości i danych innych grup |
| Rodzic | tylko umowy przypisane bezpośrednio do jego konta i powiązanego dziecka | tylko statusy powiązanych dzieci, bez notatki administracyjnej | umów i płatności innych rodzin |
| Uczeń | brak dostępu | brak dostępu | formalności rodzica, ceny, zaległości i dokumenty |
| Obsługa techniczna | brak stałego dostępu | brak stałego dostępu | treści rodzin; pozostają wyłącznie narzędzia diagnostyczne |

W przyszłości dostęp serwisowy do danych rodzin może być wyłącznie czasowy,
uzasadniony, zatwierdzony i zapisany w audycie (break-glass).

## Podstawa przyjętych zabezpieczeń prawnych

- Art. 77² i 77³ Kodeksu cywilnego: forma dokumentowa wymaga dokumentu oraz
  możliwości ustalenia osoby składającej oświadczenie. System wiąże
  oświadczenie z uwierzytelnionym rodzicem, dokładną wersją i SHA-256.
- Art. 78¹ Kodeksu cywilnego: równoważność z formą pisemną wymaga
  kwalifikowanego podpisu elektronicznego. Zwykłe kliknięcie tego nie zapewnia.
- Art. 25 eIDAS: podpisu elektronicznego nie można odrzucić wyłącznie dlatego,
  że jest elektroniczny, ale tylko podpis kwalifikowany jest równoważny
  podpisowi własnoręcznemu.
- Art. 17 ustawy o prawach konsumenta: gdy zawarcie umowy online tworzy
  obowiązek zapłaty, informacja musi być jasna bezpośrednio przed decyzją, a
  przycisk musi jednoznacznie wskazywać obowiązek zapłaty.
- Art. 21 tej ustawy: potwierdzenie umowy zawartej na odległość powinno trafić
  do konsumenta na trwałym nośniku. Etap pozwala pobrać umowę i osobne
  potwierdzenie; przed produkcją trzeba dodać automatyczne doręczenie e-mail.
- Art. 5 RODO: minimalizacja i rozliczalność uzasadniają odcięcie wykładowcy,
  ucznia i obsługi technicznej od danych finansowych i umów rodzin.

Źródła: [Kodeks cywilny — ELI](https://eli.gov.pl/api/acts/DU/2024/1061/text.html),
[ustawa o prawach konsumenta — ELI](https://eli.gov.pl/api/acts/DU/2024/1796/text.html),
[eIDAS — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2014/910/oj/eng),
[RODO — EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng),
[wyjaśnienia UOKiK](https://prawakonsumenta.uokik.gov.pl/pytania-i-odpowiedzi/prawo-do-informacji/).

## Ustalenia bezpieczeństwa

### KLA-AUTHZ-001 — naprawione

- **Ważność:** wysoka
- **Lokalizacja:** `modules/access-control/can.ts`, funkcja `can`, linie 52–70
- **Dowód:** działania dotyczące umów i płatności są jawnie odrzucane dla
  `SYSTEM_OWNER` przed ogólną regułą diagnostyczną.
- **Wpływ przed poprawką:** konto techniczne mogło stale czytać prywatne
  dokumenty i rozliczenia wszystkich rodzin.
- **Poprawka:** najmniejsze uprawnienia; dokumenty są dostępne tylko
  dyrektorowi szkoły i właściwemu rodzicowi.
- **Dalsza ochrona:** przyszły break-glass z podstawą, czasem wygaśnięcia i
  pełnym audytem.

### KLA-LEGAL-001 — naprawione w zakresie technicznym

- **Ważność:** wysoka
- **Lokalizacja:** `modules/contracts/components/contract-create-form.tsx`,
  linie 39–119; `modules/contracts/actions.ts`, linie 283–368
- **Dowód:** dyrektor wybiera formę dokumentową albo podpis zewnętrzny;
  system zapisuje dokładny tekst oświadczenia, wersję i skrót dokumentu.
- **Wpływ przed poprawką:** UI mogło sugerować, że każdy PDF można skutecznie
  „podpisać” zwykłym checkboxem.
- **Poprawka:** rozdzielone tryby, jasne zastrzeżenie i blokada serwerowa.
- **Mitigacja:** wymagane zatwierdzenie prawne konkretnego wzorca. System nie
  decyduje sam, jaka forma jest wymagana dla danej czynności.

### KLA-CONSUMER-001 — naprawione częściowo

- **Ważność:** wysoka
- **Lokalizacja:** `modules/contracts/components/contract-list.tsx`, linie
  130–199; `modules/contracts/legal.ts`
- **Dowód:** zakres, cena i jednoznaczny tekst obowiązku zapłaty są pokazane
  bezpośrednio przed decyzją; rodzic może pobrać potwierdzenie.
- **Wpływ przed poprawką:** niejednoznaczny przycisk mógł nie spełnić art. 17
  ustawy o prawach konsumenta.
- **Poprawka:** dokładne podsumowanie i przycisk „Zamówienie z obowiązkiem
  zapłaty”.
- **Pozostała praca:** automatyczne doręczenie potwierdzenia na e-mail,
  informacje z art. 12 oraz przepływ odstąpienia muszą powstać przed produkcją.

### NEXT-FILE-001 — naprawione

- **Ważność:** średnia
- **Lokalizacja:** `modules/contracts/actions.ts`, linie 87–160;
  `app/panel/umowy/[assignmentId]/plik/route.ts`, linie 58–68
- **Dowód:** plik jest usuwany po nieudanej transakcji, a odpowiedź PDF ma
  `nosniff`, prywatny cache, brak referrera i CSP `sandbox`.
- **Wpływ przed poprawką:** nieudany zapis zostawiał osierocony dokument;
  plik był osadzany bez dodatkowego sandboxingu.
- **Poprawka:** kontrolowane sprzątanie i bezpieczniejsze nagłówki.
- **Pozostała praca:** przed produkcją skan antywirusowy plików PDF oraz
  zewnętrzny, szyfrowany magazyn z testem odtwarzania backupu.

## Blokery przed prawdziwymi umowami

- zatwierdzenie wzorca i całego procesu przez prawnika szkoły;
- komplet informacji z art. 12 ustawy o prawach konsumenta;
- obsługa odstąpienia i żądania rozpoczęcia usługi przed upływem terminu;
- automatyczne doręczenie potwierdzenia na trwałym nośniku;
- retencja, eksport dowodowy i procedura korekty danych;
- skan antywirusowy PDF, szyfrowany storage i odtworzenie backupu;
- MFA dyrektora przed użyciem prawdziwych danych.

## Scenariusze odbioru

1. Dyrektor tworzy odpłatną umowę dokumentową i widzi podgląd w popupie.
2. Rodzic otwiera tylko swoją pozycję, świadomie wyświetla PDF, widzi cenę,
   składa oświadczenie i pobiera potwierdzenie.
3. Rodzic nie może otworzyć cudzego identyfikatora umowy.
4. Wykładowca, uczeń i obsługa techniczna otrzymują odmowę dla listy, PDF i
   potwierdzenia.
5. Tryb „podpis poza systemem” nigdy nie pokazuje przycisku akceptacji.
6. Kliknięcie pozycji płatności otwiera szczegóły; rodzic nie otrzymuje
   notatki administracyjnej.
