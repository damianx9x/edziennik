# Zakres startowy eDziennika KLA

Stan: 25 lipca 2026. Ten dokument definiuje podstawową wersję pilota na
1 września 2026. Zaawansowane dodatki nie mogą wypierać tych przepływów.

## 1. Umowy online

W pilocie:

- dyrektor dodaje PDF i tworzy jego niezmienną wersję,
- przypisuje umowę do właściwego rodzica i ucznia,
- rodzic widzi dokument, potwierdza zapoznanie i akceptuje wskazaną wersję,
- system zapisuje wersję, skrót pliku, czas, użytkownika i wymagane dowody,
- korekta tworzy kolejną wersję; nie zmienia przyjętego dokumentu,
- dyrektor widzi: robocza, wysłana, wyświetlona, zaakceptowana, wygasła.

Nie w pilocie: kwalifikowany podpis elektroniczny, Autenti, pieczęć
kwalifikowana, automatyczna ocena skutków prawnych. Treść i forma akceptacji
muszą zostać zatwierdzone przez prawnika. Architektura `SignatureProvider`
pozwala później dołączyć zewnętrznego dostawcę bez przebudowy modułu.

## 2. Komunikator i masowe wiadomości

W pilocie:

- wykładowca pisze tylko do przypisanych grup,
- rodzic i uczeń widzą tylko rozmowy wynikające z powiązań,
- dyrektor wysyła ogłoszenie do jednej lub wielu wybranych grup,
- odbiorca widzi wiadomość w aplikacji, a e-mail idzie przez kolejkę,
- wykładowca lub dyrektor może wymagać świadomego potwierdzenia przeczytania,
- wiadomość może mieć prywatny załącznik PDF, JPG albo PNG do 8 MB,
- listę rozmów można filtrować po nazwie grupy i lokalizacji,
- wysyłka ma status, ponowienia, idempotencję i dziennik audytu,
- odczyt rozmowy przez dyrektora wymaga jawnej podstawy i tworzy `AuditLog`.

Na start stosujemy kontrolowane odświeżanie nowych wiadomości. Wymienny
`RealtimeProvider` pozwoli później dołączyć WebSocket lub usługę realtime bez
zmiany logiki rozmów.

Centrum powiadomień łączy nowe wiadomości, umowy do sprawdzenia, zbliżające się
lub przekroczone terminy płatności oraz decyzje dyrektora. Każdy użytkownik
może oznaczyć pozycję jako przeczytaną albo odłożyć ją do następnego dnia.
Pierwsze logowanie uruchamia krótki samouczek zależny od roli; można go później
otworzyć ponownie z górnego paska.

## 3. Status płatności

W pilocie:

- dyrektor ręcznie ustawia: nieustalona, oczekuje, opłacona, po terminie,
- opcjonalnie zapisuje termin, okres i bezpieczną notatkę administracyjną,
- rodzic widzi tylko status dotyczący swojego dziecka,
- każda zmiana autora i czasu pozostaje w historii.

Nie ma płatności wbudowanej, danych kart, integracji bankowej ani KSeF.

## 4. Materiały i zadania domowe

W pilocie:

- wykładowca publikuje plik albo link dla przypisanej grupy,
- tworzy zadanie z instrukcją i terminem,
- uczeń oznacza wykonanie lub dodaje dozwolony plik,
- wykładowca widzi statusy: nieotwarte, otwarte, oddane, po terminie, sprawdzone,
- rodzic widzi bieżący stan swojego dziecka bez treści innych uczniów.

## Wspólny fundament techniczny

- PostgreSQL i Prisma przechowują dane biznesowe z `schoolId`.
- Prywatne pliki obsługuje `FileStorage`: lokalny adapter deweloperski i
  S3-compatible na stagingu/produkcji.
- Pobieranie i wysyłanie plików używa krótkotrwałych podpisanych adresów.
- `Outbox` i pg-boss uruchamiają e-mail, przypomnienia i cięższe zadania bez
  dokładania Redis.
- `EmailProvider`, `FileStorage`, `SignatureProvider` i `RealtimeProvider` są
  wymienne.
- Uprawnienia sprawdza serwer przez centralne `can(...)` przy każdym odczycie
  i zapisie.
- Akcje wrażliwe tworzą audyt bez treści wiadomości, tokenów i nadmiarowych
  danych.

## Kryterium odbioru pilota

Każdy z czterech modułów ma:

- jeden pełny przepływ na danych syntetycznych,
- stan pusty, ładowanie, sukces oraz błąd z dalszą instrukcją,
- uprawnienia testowane negatywnie dla każdej roli,
- działanie na 375 × 812 i 1440 × 900,
- brak prawdziwych danych dzieci w repozytorium, logach i zrzutach QA.

## Zweryfikowane podstawy wyboru

- [Embla Carousel React](https://www.embla-carousel.com/docs/v8/get-started)
  daje lekki, kontrolowany slider bez narzucania wyglądu.
- [Next.js self-hosting](https://nextjs.org/docs/app/guides/self-hosting)
  wspiera samodzielny serwer Node i build standalone.
- [pg-boss](https://github.com/timgit/pg-boss) zapewnia kolejkę, ponowienia i
  dead-letter queue na PostgreSQL.
- [Resend idempotency](https://resend.com/docs/dashboard/emails/idempotency-keys)
  ogranicza ryzyko podwójnej wysyłki po ponowieniu zadania.
- [AWS S3 presigned upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/PresignedUrlUploadObject.html)
  opisuje krótkotrwały, kontrolowany dostęp do prywatnych plików.
- [eSignature Komisji Europejskiej](https://ec.europa.eu/digital-building-blocks/sites/display/DIGITAL/What%2Bis%2BeSignature)
  rozróżnia podpis prosty, zaawansowany i kwalifikowany; dlatego przepływ
  pilota nie jest reklamowany jako podpis kwalifikowany.
