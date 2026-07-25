# Etap 2 — kartoteki, import i prywatne pliki

## Co jest gotowe

Dyrektor ma jedno miejsce do obsługi:

- sal,
- grup,
- wykładowców, rodziców i uczniów,
- relacji rodzic–dziecko i przypisania ucznia do grupy,
- importu CSV/XLSX z podglądem błędów,
- archiwizacji zamiast trwałego kasowania,
- prywatnych plików poza katalogiem publicznym strony.

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
4. Wybierz `eDziennik → Szkoła → Zaloguj się`.
5. Zaloguj konto dyrektora opisane w `ETAP_1_INSTRUKCJA.md`.
6. W dolnym menu telefonu albo menu bocznym komputera wybierz `Kartoteki`.

## Pojedyncza zmiana

W sekcji `Dodaj bez arkusza` wybierz:

- `Nowa sala`,
- `Nowa grupa`,
- `Nowa osoba`.

Formularz pokazuje wynik zapisu. `Archiwizuj` wymaga drugiego, świadomego
potwierdzenia. Element znika z aktywnej listy, ale historia pozostaje w bazie.

## Import większej listy

1. Kliknij `Pobierz szablon`.
2. Otwórz plik w Excelu, Numbers albo LibreOffice.
3. Nie zmieniaj nazw kolumn.
4. Każda pozycja ma osobny wiersz. Dostępne typy to:
   `sala`, `grupa`, `wykladowca`, `uczen`, `rodzic`, `relacja`.
5. Dla ucznia używaj unikalnego `external_id`, np. numeru z systemu szkoły.
6. Wróć do kartotek, wybierz plik i kliknij `Pokaż podgląd`.
7. Popraw błędy wskazane przy konkretnym wierszu.
8. Gdy liczba błędów wynosi zero, kliknij `Zapisz dane`.

Zapis jest jedną transakcją: albo zapiszą się wszystkie poprawne powiązania,
albo żadne. System przed zapisem ponownie sprawdza prywatny plik i jego skrót.

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
- [ ] Dodanie i archiwizacja sali działają.
- [ ] Szablon pokazuje podgląd przed zapisem.
- [ ] Błędny wiersz blokuje cały import.
- [ ] Ponowny import nie tworzy niekontrolowanych duplikatów.
- [ ] Widok nie przewija się poziomo przy 375 px.
- [ ] Każdy element dotykowy ma co najmniej 44 × 44 px.
- [ ] `npm run check`, `npm run build` i `npm run package:release` przechodzą.
