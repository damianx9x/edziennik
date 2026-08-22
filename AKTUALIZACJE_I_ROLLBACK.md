# Aktualizacje i cofanie KLA

## Zasada

Jedna wersja pokazana klientce zawsze wskazuje jeden commit. Aktualizujemy tylko
czysty, przetestowany commit; nie kopiujemy pojedynczych plików na działający
serwer. Baza i prywatne dokumenty nigdy nie są częścią paczki z kodem.

## Przed wydaniem

1. `npm ci`
2. `npm run check`
3. `npm audit --omit=dev`
4. `npm run build`
5. test klikania telefonu 375 × 812 i komputera 1440 × 900,
6. `npm run package:release` oraz `npm run package:raspberry`.

Obok każdej paczki powstaje plik `.sha256`. Przed rozpakowaniem sprawdź go w
tym samym katalogu:

```bash
shasum -a 256 -c NAZWA_PACZKI.sha256
```

Wynik musi kończyć się słowem `OK`. Suma chroni przed uszkodzeniem transferu;
przy produkcji paczkę i sumę należy pobierać z tego samego zatwierdzonego
wydania GitHub, a dostęp do repozytorium chronić MFA.

## Raspberry Pi

Po wgraniu i rozpakowaniu zaakceptowanej paczki w katalogu aplikacji:

```bash
sudo kla-update
sudo kla-status
```

Aktualizator:

- nie pozwala uruchomić dwóch aktualizacji naraz,
- sprawdza pliki środowiska i bieżącą instalację,
- buduje nową wersję, gdy stara nadal obsługuje użytkowników,
- robi szyfrowaną kopię bazy i dokumentów,
- wykonuje zatwierdzone migracje,
- przełącza usługę i sprawdza `/api/health`,
- automatycznie przywraca poprzedni kod, jeśli nowa wersja nie wstanie.

## VPS

Nową paczkę rozpakuj obok poprzedniej, skopiuj wyłącznie prywatny plik
`deployment/home-vps/.env`, a następnie uruchom:

```bash
sudo ./deployment/home-vps/update.sh
sudo ./deployment/home-vps/status.sh
```

Skrypt zachowuje identyfikator poprzedniego obrazu i automatycznie go uruchamia,
gdy test zdrowia nowej wersji nie przejdzie.

## Migracje bazy

Nowa migracja nie może usuwać ani zmieniać istniejącej kolumny w tym samym
wydaniu. Stosujemy trzy kroki:

1. **rozszerz** — dodaj nowe pole/tabelę jako zgodne ze starą wersją,
2. **przenieś** — uzupełnij dane i przełącz kod,
3. **posprzątaj** — usuń stare pole dopiero w późniejszym, osobno zaakceptowanym
   wydaniu.

`npm run security:check` blokuje typowe destrukcyjne migracje. Automatyczne
cofanie dotyczy kodu, nie cofa samodzielnie zmian danych — dlatego ta reguła
jest obowiązkowa.

## Gdy aktualizacja się nie uda

1. Nie uruchamiaj ponownie instalatora i nie kasuj katalogu oznaczonego jako
   nieudany.
2. Sprawdź `sudo kla-status` albo skrypt `status.sh` na VPS.
3. Pobierz ostatnie bezpieczne logi bez wklejania danych dzieci.
4. Przekaż nazwę commita, godzinę próby i wynik testu zdrowia do Codex.
5. Odtwarzanie bazy wykonuj dopiero, gdy automatyczny powrót kodu nie wystarcza
   i po wskazaniu właściwej szyfrowanej kopii.

## Produkcyjne minimum

Przed prawdziwymi danymi: zamknięta checklista RODO, zatwierdzone retencje,
2FA dyrektora, szyfrowany backup poza urządzeniem, udany test odtworzenia,
monitoring oraz plan awarii z osobą odpowiedzialną.
