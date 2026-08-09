# Plan rozwoju po audycie

## Obecność

- Dyrektor i prowadzący lekcję zapisują stan autorytatywny.
- Uczeń i rodzic mogą zgłosić planowaną nieobecność lub usprawiedliwienie, ale
  nie oznaczają samodzielnie obecności.
- Ewentualny kod lekcji służy tylko jako check-in oczekujący na potwierdzenie.
- Każda korekta ma autora, czas, poprzedni i nowy status oraz opcjonalny powód.

## Zmiany grafiku wykładowcy

Wykładowca wybiera własną lekcję, podaje proponowany termin i powód. Powstaje
wniosek ze stanem `PENDING`. Dyrektor widzi różnicę, kolizje i zatwierdza albo
odrzuca. Dopiero zatwierdzenie pod blokadą szkoły zmienia grafik.

## Łatwe logowanie

Docelowy mechanizm to passkeys/WebAuthn. Face ID, Touch ID lub PIN potwierdza
klucz lokalnie na urządzeniu; aplikacja nie zapisuje biometrii. Hasło i
procedura odzyskania pozostają kontrolowaną ścieżką awaryjną.

## Messenger

Nie zakładamy dostępu do istniejących prywatnych grup. Najpierw powstaje
`NotificationProvider` dla wiadomości w aplikacji, e-mail i SMS. Messenger
może być dodatkowym adapterem dopiero po potwierdzeniu oficjalnego API,
warunków Meta, zgód i retencji.

## Import i synchronizacja

- `Uzupełnij i zaktualizuj` — obecny, domyślny tryb; niczego nie archiwizuje.
- `Synchronizuj z plikiem` — osobny etap: podgląd tworzeń, zmian i archiwizacji,
  dodatkowe potwierdzenie; brakujące rekordy są archiwizowane, nigdy kasowane.

## Backup

Dyrektor widzi datę ostatniej kopii i testu odtworzenia. Konfigurację techniczną
wykonuje właściciel z MFA. Kopia jest szyfrowana, znajduje się poza serwerem,
ma retencję i jest okresowo odtwarzana do tymczasowej bazy. Nie dodajemy
formularza „wgraj SQL do produkcji”.

## Modułowa strona

Kontrolowane widgety: hero, slider, oferta, liczby, opinie, lokalizacje, CTA i
kontakt. Dyrektor zmienia kolejność, widoczność, wariant szerokości, zdjęcia i
kolory z palety marki. Każda publikacja tworzy wersję i audyt. Brak dowolnego
HTML/JS oraz absolutnego pozycjonowania.
