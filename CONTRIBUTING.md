# Współtworzenie

Dziękuję za techniczny review. Najbardziej wartościowe są małe, dobrze
uzasadnione zmiany z testem regresji. Dane demonstracyjne muszą pozostać
fikcyjne i używać domeny `invalid.example`.

## Przepływ

1. Otwórz issue opisujące problem albo proponowaną zmianę.
2. Utwórz gałąź z krótką nazwą, np. `fix/schedule-room-conflict`.
3. Zachowaj granice `modules/<feature>` i centralną kontrolę dostępu w
   `modules/access-control/can.ts`.
4. Dodaj test dla reguły biznesowej lub uprawnień.
5. Uruchom pełną kontrolę lokalną.

```bash
npm ci
npm run check
npm run build
npm run check:raspberry
```

Pull request powinien opisać rezultat, ryzyko, sposób testu, migrację i wpływ na
telefon 375 × 812 oraz desktop 1440 × 900. Commit używa angielskiego Conventional
Commits, np. `fix(schedule): prevent room conflicts`.

## Zasady bezpieczeństwa

- Nie dodawaj `.env`, sekretów, baz, eksportów, backupów ani prawdziwych danych.
- Autoryzacja musi działać po stronie serwera; ukrycie kontrolki nie wystarcza.
- Migracje są rozszerzające i kompatybilne wstecz z poprzednim wydaniem.
- Nie loguj treści wiadomości, haseł, tokenów, surowych IP ani dokumentów.
- Podatności zgłaszaj zgodnie z [SECURITY.md](SECURITY.md), nie w publicznym issue.
