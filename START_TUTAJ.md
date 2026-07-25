# START TUTAJ — macOS

## Pierwsze uruchomienie

W Terminalu, w katalogu projektu:

```bash
./scripts/setup-macos.sh
npm run dev
```

Otwórz `http://localhost:3000`. Zatrzymanie: `Control + C`.

Instalator sprawdza Node.js, instaluje wersje z lockfile, tworzy `.env` tylko
gdy go nie ma, generuje klienta Prisma i nigdy nie nadpisuje istniejących haseł.

## Codzienna praca

1. Opisz jeden etap albo jeden błąd.
2. Codex wprowadza zmianę i uruchamia testy.
3. Codex klika przepływ na telefonie i komputerze.
4. Oglądasz podgląd i zrzuty.
5. Po akceptacji powstaje commit i aktualna paczka.

Przykład:

> Przeczytaj AGENTS.md i PLAN_2026.md. Zrealizuj Etap 1 do końca, z testami
> klikania 375×812 i 1440×900, zrzutami i aktualnym pakietem.

Błąd opisz jednym zdaniem:

> Klikam [miejsce], robię [czynność], widzę [błąd], powinno być [wynik].

## Dane i hasła

- Hasła tylko w `.env`.
- Nie wklejaj danych uczniów do rozmowy ani kodu.
- Do odbioru pilota używamy wymyślonych osób.
- Hosting, domenę, e-mail i SMS zakłada klientka na swoją firmę.

## Baza od Etapu 1

```bash
brew install postgresql@17
brew services start postgresql@17
createdb edziennik_kla
```

Potem uzupełnij `DATABASE_URL` w `.env`. Migracji produkcji nie uruchamiaj bez
kopii i planu wycofania.

## Pokaz klientce

Do czasu stagingu pokazuj lokalnie. Później:

- `staging.domena.pl` — dane wymyślone,
- `panel.domena.pl` — produkcja po odbiorze.

Paczka z `outputs` wymaga hostingu Node.js i procedury z
`DEPLOYMENT_MYDEVIL.md`; nie jest stroną do zwykłego FTP.
