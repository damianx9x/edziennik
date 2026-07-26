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

Panel demonstracyjny szkoły:
`eDziennik → Szkoła → Zobacz panel demonstracyjny`.

Logowanie z Etapu 1:
`eDziennik → Zaloguj się`. Rola konta automatycznie otwiera właściwy panel.
Konta testowe i bezpieczna procedura
są opisane w `ETAP_1_INSTRUKCJA.md`.

Kartoteki z Etapu 2:
`eDziennik → Szkoła → Zaloguj się → Kartoteki`. Dyrektor może dodać pojedynczą
salę, grupę lub osobę albo najpierw sprawdzić import CSV/XLSX. Procedura i
szablon są opisane w `ETAP_2_INSTRUKCJA.md`.

Edycja strony bez kodowania:
`panel dyrektora → Narzędzia → Treść publicznej strony`. W tej wersji zmiany
zapisują się tylko w danej przeglądarce. Użyj `Eksportuj kopię`, aby przekazać
je do publikacji.

Przycisk z czerwoną ikoną błędu jest zawsze dostępny. Pozwala pobrać bezpieczny
plik diagnostyczny, który można dołączyć do kolejnego zadania Codex.

## Codzienna praca

1. Opisz jeden etap albo jeden błąd.
2. Codex wprowadza zmianę i uruchamia testy.
3. Codex klika przepływ na telefonie i komputerze.
4. Oglądasz podgląd i zrzuty.
5. Po akceptacji powstaje commit i aktualna paczka.

Przykład:

> Przeczytaj AGENTS.md i PLAN_2026.md. Zrealizuj bieżący etap do końca, z testami
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

Wyłącznie dla lokalnego środowiska testowego:

```bash
npm run db:migrate:dev
npm run db:seed:demo
```

Tworzy 8 grup KLA, 36 syntetycznych uczniów oraz cztery konta ról z domeną
`invalid.example`. Hasło testowe pochodzi wyłącznie z lokalnej zmiennej
`KLA_DEMO_PASSWORD`.

## Pokaz klientce

Gotową stronę pokazową dla home.pl utworzysz poleceniem:

```bash
npm run package:preview
```

Paczka pojawi się w
`outputs/kla-szkielet-etap-0-5-home-pl.zip`. Dokładne kroki dla domen
`kingslanguageacademy.pl`, `kingsedu.pl`, SSL i WebFTP opisuje
`INSTRUKCJA_HOME_PL.md`.

Późniejsze środowiska aplikacji:

- `staging.kingslanguageacademy.pl` — dane wymyślone,
- `panel.kingslanguageacademy.pl` — produkcja po odbiorze.

Paczka `kla-szkielet-etap-0-5-home-pl.zip` jest stroną do zwykłego FTP. Paczka
`edziennik-kla-stage-2.zip` wymaga hostingu Node.js i procedury z
`DEPLOYMENT_MYDEVIL.md`.
