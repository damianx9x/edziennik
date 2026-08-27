# eDziennik King’s Language Academy · v1.0

Mobilna aplikacja jednej prywatnej szkoły języka angielskiego. Łączy grafik,
kartoteki, umowy i raty, wiadomości, powiadomienia, materiały, zadania,
obecności oraz postępy uczniów. Publiczny pilot działa na Raspberry Pi pod
`https://demo.kingslanguageacademy.pl`.

## Najprościej

```bash
npm ci
npm run db:generate
npm run dev
```

Otwórz `http://localhost:3000`. Pełna kontrola przed wydaniem:

```bash
npm run check
npm run build
npm run package:release
npm run package:raspberry
```

## Jak czytać dokumentację

- [Funkcje i role](docs/FUNKCJE_I_ROLE.md) — prosty opis tego, co działa.
- [Odbiór i testy](docs/ODBIOR_I_TESTY.md) — lista dla klientki i telefonów.
- [Operacje Raspberry](docs/OPERACJE_RASPBERRY.md) — instalacja, start, backup,
  aktualizacja i awaria.
- [Zakres produktu](docs/PRODUCT_SCOPE.md) — cele i granice wersji.
- [System UI](docs/SYSTEM_UI.md) — zasady kolejnych ekranów.
- [Architektura](docs/ARCHITEKTURA.md) — moduły i przepływy techniczne.
- [Przekazanie inżynierskie](docs/ENGINEERING_HANDOFF.md) — głęboka ocena stosu,
  ryzyka i skalowania.
- [Bezpieczeństwo, prawo i RODO](docs/BEZPIECZENSTWO_PRAWO_RODO.md).
- [Decyzje](docs/DECYZJE.md) i [notatki wydania](docs/RELEASE_NOTES.md).

## Zasady wydania

`main` jest gałęzią stabilną, a bieżąca praca odbywa się na gałęzi etapu.
Paczka Raspberry powstaje wyłącznie z czystego commita, ma manifest SHA-256 i
podpis Ed25519. Sekrety, bazy, eksporty i backupy nigdy nie trafiają do Git.

Produkcja wymaga odbioru klientki, zatwierdzonych dokumentów prawnych/RODO,
MFA dyrektora, działającego SMTP, kopii poza Raspberry oraz testu odtworzenia.
