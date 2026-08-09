# Raport bezpieczeństwa — 5 sierpnia 2026

## Naprawione w tej iteracji

### CSV-001 — High — formuły w eksporcie

- Lokalizacja: `modules/imports/export.ts`, `escapeCsvCell`.
- Wpływ: komórka kontrolowana przez użytkownika mogła zostać wykonana przez
  Excel jako formuła.
- Naprawa: wartości zaczynające się od `=`, `+`, `-`, `@` są neutralizowane;
  parser bezpiecznie przywraca wartość przy ponownym imporcie; dodano test.

### TENANT-001 — High — anonimowa analityka

- Lokalizacja: `app/api/statystyki/odwiedziny/route.ts`.
- Wpływ: ruch publiczny mógł trafić do pierwszej szkoły w bazie.
- Naprawa: anonimowy zapis wymaga jednoznacznego `KLA_PUBLIC_SCHOOL_SLUG`.

### SCHEDULE-001 — High — nieaktualny szkic Asystenta

- Lokalizacja: `modules/schedule/actions.ts`.
- Wpływ: po ręcznej zmianie nadal istniał szkic obliczony dla starego stanu.
- Naprawa: utworzenie, przesunięcie i odwołanie lekcji odrzuca gotowe szkice
  w tej samej transakcji.

## Otwarte przed prawdziwymi danymi

### AUTH-001 — Critical — słabe dane demo

Na wyraźne żądanie właściciela testowe środowisko syntetyczne dopuszcza łatwe
hasła. Flaga ma domyślnie wartość `0`, nie może być użyta w produkcji, a konto
właściciela nadal wymaga MFA. Przed prawdziwymi danymi wyjątek musi zostać
usunięty, wszystkie hasła zmienione i sesje unieważnione.

### BACKUP-001 — High — kopia tylko lokalna

Obecny skrypt VPS nie zapewnia kompletnego szyfrowania, kopii poza serwerem i
automatycznego testu odtworzenia. UI może pokazywać stan, ale nie może nadpisywać
żywej bazy surowym SQL.

### IMPORT-RETENTION-001 — High — retencja plików źródłowych

Potrzebne jest okresowe usuwanie źródłowych plików importu według zatwierdzonej
retencji oraz zapis wyniku zadania bez danych arkusza.

### CHANGE-REQUEST-001 — High — propozycje grafiku

Potrzebny jest osobny, wersjonowany wniosek wykładowcy i ponowna kontrola
kolizji podczas akceptacji dyrektora.

### RECORD-CONCURRENCY-001 — High — stara propozycja kartoteki

Wniosek powinien zapisywać wersję bazową. Akceptacja starego wniosku nie może
nadpisywać nowszej edycji bez pokazania konfliktu.
