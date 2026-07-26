# Etap 2 — kartoteki, import i prywatne pliki

## Co jest gotowe

Dyrektor ma jedno miejsce do obsługi:

- sal,
- grup,
- wykładowców, rodziców i uczniów,
- dużej karty osoby z kontaktem, powiązaniami i skrótami do jej spraw,
- relacji rodzic–dziecko i przypisania ucznia do grupy,
- importu CSV/XLSX z podglądem błędów,
- eksportu aktywnych kartotek do zgodnego pliku CSV,
- archiwizacji zamiast trwałego kasowania,
- prywatnych plików poza katalogiem publicznym strony.

Import, eksport i historia operacji mają własną pozycję `Import i eksport`.
Nie zajmują miejsca w codziennym widoku kartotek.

Pozostałe role nie mają dostępu do kartotek szkoły.

## Jak sprawdzić lokalnie

1. Uruchom PostgreSQL.
2. W katalogu projektu wykonaj:

   ```bash
   npm run db:migrate:deploy
   npm run db:seed:demo
   npm run dev
   ```

3. Otwórz `http://localhost:3000`.
4. Wybierz `eDziennik → Przejdź do logowania`.
5. Zaloguj konto dyrektora opisane w `ETAP_1_INSTRUKCJA.md`.
6. System sam otworzy panel wynikający z roli konta.
7. W dolnym menu telefonu albo menu bocznym komputera wybierz `Kartoteki`.

## Karta osoby

Wpisz imię, e-mail, telefon albo identyfikator w wyszukiwarce. Możesz też użyć
filtru roli. Dotknięcie osoby otwiera duże okno z:

- imieniem i nazwiskiem, e-mailem, telefonem i identyfikatorem,
- dziećmi, grupami albo przypisaniami,
- przygotowanymi skrótami do wiadomości, płatności i postępów,
- świadomą archiwizacją.

Okno zamyka się przyciskiem, `Escape` albo akcją `Gotowe`, a fokus wraca do
otwartej wcześniej osoby.

## Pojedyncza zmiana

Rozwiń sekcję `Dodaj nową kartotekę`, a potem wybierz:

- `Nowa sala`,
- `Nowa grupa`,
- `Nowa osoba`.

Formularz pokazuje wynik zapisu. `Archiwizuj` wymaga drugiego, świadomego
potwierdzenia. Element znika z aktywnej listy, ale historia pozostaje w bazie.

## Import większej listy

1. W menu wybierz `Import i eksport`.
2. Kliknij `Pobierz szablon CSV`.
3. Otwórz plik w Excelu, Numbers albo LibreOffice.
4. Nie zmieniaj nazw kolumn.
5. Każda pozycja ma osobny wiersz. Dostępne typy to:
   `sala`, `grupa`, `wykladowca`, `uczen`, `rodzic`, `relacja`.
6. Dla ucznia używaj unikalnego `external_id`, np. numeru z systemu szkoły.
7. Wybierz plik i kliknij `Pokaż podgląd`.
8. Popraw błędy wskazane przy konkretnym wierszu.
9. Gdy liczba błędów wynosi zero, kliknij `Zapisz dane`.

Zapis jest jedną transakcją: albo zapiszą się wszystkie poprawne powiązania,
albo żadne. System przed zapisem ponownie sprawdza prywatny plik i jego skrót.

Przycisk `Pobierz CSV` tworzy kopię aktywnych kartotek zgodną z tym samym
formatem. Eksport nie zawiera tokenów ani sztucznych technicznych adresów
uczniów. Pobranie zapisuje w audycie wyłącznie identyfikator szkoły i liczby.

## Zaproszenie z kodem QR

W `Zaproszeniach` dyrektor wybiera rolę, imię i e-mail. Po utworzeniu może:

- skopiować jednorazowy link,
- pokazać kod QR do zeskanowania telefonem,
- pobrać QR jako PNG.

QR nie otwiera publicznej rejestracji. Zawiera ten sam jednorazowy,
siedmiodniowy i przypisany do wybranej roli token co bezpieczny link.

## Ważne ograniczenia

- plik ma maksymalnie 5 MB, 1000 wierszy i 30 kolumn,
- obsługiwane formaty to `.csv` oraz `.xlsx`,
- podgląd jest ważny 24 godziny,
- pliki źródłowe nie trafiają do `public/` ani do Gita,
- do testów używaj wyłącznie osób wymyślonych i domeny `invalid.example`,
- prawdziwy import dopiero po zamknięciu checklisty
  `BEZPIECZENSTWO_I_RODO.md`.

## Odbiór Etapu 2

- [ ] Dyrektor widzi kartoteki.
- [ ] Rodzic, uczeń i wykładowca nie otwierają kartotek dyrektora.
- [ ] Jedno logowanie automatycznie otwiera panel właściwej roli.
- [ ] Kliknięcie osoby otwiera dużą kartę i `Escape` przywraca fokus.
- [ ] Dodanie i archiwizacja sali działają.
- [ ] Szablon pokazuje podgląd przed zapisem.
- [ ] Eksport CSV pobiera się z osobnej kategorii.
- [ ] Zaproszenie pokazuje działający link i kod QR przypisany do roli.
- [ ] Błędny wiersz blokuje cały import.
- [ ] Ponowny import nie tworzy niekontrolowanych duplikatów.
- [ ] Widok nie przewija się poziomo przy 375 px.
- [ ] Każdy element dotykowy ma co najmniej 44 × 44 px.
- [ ] `npm run check`, `npm run build` i `npm run package:release` przechodzą.
