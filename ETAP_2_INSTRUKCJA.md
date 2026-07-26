# Etap 2 — kartoteki, import i prywatne pliki

## Co jest gotowe

Dyrektor ma jedno miejsce do obsługi:

- sal,
- grup,
- wykładowców, rodziców i uczniów,
- dużej, przesuwanej i skalowalnej karty osoby z edycją i historią,
- relacji rodzic–dziecko i przypisania ucznia do grupy,
- importu CSV/XLSX z podglądem błędów,
- eksportu aktywnych kartotek do zgodnego pliku CSV,
- archiwizacji zamiast trwałego kasowania,
- prywatnych plików poza katalogiem publicznym strony.

Import, eksport, status bazy oraz edycja publicznej strony są w pozycji
`Narzędzia`, dostępnej wyłącznie dyrektorowi.

Wykładowca widzi tylko kartoteki wynikające z przypisanych grup. Może wysłać
propozycję korekty; dyrektor zatwierdza ją w `Powiadomieniach`.

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
- formularzem edycji,
- historią zmian i decyzji,
- świadomą archiwizacją.

Na komputerze okno można przeciągać za nagłówek i skalować za prawy dolny róg.
Na telefonie działa jako pełna karta dolna. Zamyka się przyciskiem, `Escape`
albo akcją `Gotowe`, a fokus wraca do wcześniej otwartego elementu.

## Pojedyncza zmiana

Rozwiń sekcję `Dodaj nową kartotekę`, a potem wybierz:

- `Nowa sala`,
- `Nowa grupa`,
- `Nowa osoba`.

Formularz pokazuje wynik zapisu. `Archiwizuj` wymaga drugiego, świadomego
potwierdzenia. Element znika z aktywnej listy, ale historia pozostaje w bazie.

## Import większej listy

1. W menu wybierz `Narzędzia`, a następnie `Import i eksport`.
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

## Zaproszenia i powrót zarchiwizowanej osoby

W `Zaproszeniach` są dwa osobne sposoby:

- `Zaproś e-mailem` — dyrektor wpisuje dane i rolę,
- `Zaproś kodem QR` — dyrektor wybiera rolę i czas ważności.

Kod QR można pokazać, skopiować jako link lub pobrać jako PNG. Zaproszona osoba
wpisuje imię, nazwisko, e-mail, opcjonalny telefon i hasło. Nie wybiera roli —
jest ona trwale przypisana do kodu. Link jest jednorazowy.

Jeżeli kartoteka była zarchiwizowana i dyrektor ponownie zaprosi ten sam e-mail,
system reaktywuje wcześniejsze konto oraz zachowuje jego historię. Aktywnego
konta nie można zdublować.

## Centrum powiadomień

Dzwonek w prawym górnym rogu pokazuje liczbę propozycji wykładowców. Dyrektor
widzi rekord, autora, czas i nowe wartości. `Zatwierdź zmianę` zapisuje dane;
`Odrzuć` pozostawia kartotekę bez zmian. Obie decyzje trafiają do historii.

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
- [ ] Rodzic i uczeń nie otwierają kartotek szkoły.
- [ ] Wykładowca widzi wyłącznie przypisane kartoteki i wysyła propozycję.
- [ ] Dyrektor zatwierdza propozycję z centrum powiadomień.
- [ ] Jedno logowanie automatycznie otwiera panel właściwej roli.
- [ ] Kliknięcie osoby otwiera dużą kartę i `Escape` przywraca fokus.
- [ ] Dodanie i archiwizacja sali działają.
- [ ] Szablon pokazuje podgląd przed zapisem.
- [ ] Eksport CSV pobiera się z osobnej kategorii.
- [ ] Osobny, czasowy kod QR automatycznie nadaje przypisaną rolę.
- [ ] Ponowne zaproszenie zarchiwizowanego e-maila reaktywuje konto.
- [ ] Błędny wiersz blokuje cały import.
- [ ] Ponowny import nie tworzy niekontrolowanych duplikatów.
- [ ] Widok nie przewija się poziomo przy 375 px.
- [ ] Każdy element dotykowy ma co najmniej 44 × 44 px.
- [ ] `npm run check`, `npm run build` i `npm run package:release` przechodzą.
