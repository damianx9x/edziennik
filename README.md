# eDziennik KLA

Mobilny eDziennik King’s Language Academy. Etap 0.5: spersonalizowana strona,
brama Uczeń/Rodzic/Szkoła, panel demo, diagnostyka, model PostgreSQL i centralne
uprawnienia.

## Start

```bash
./scripts/setup-macos.sh
npm run dev
```

Otwórz `http://localhost:3000`.

## Kontrola

```bash
npm run check
npm run build
npm run package:release
npm run db:migrate:dev
npm run db:seed:demo
```

## Dokumenty

- `START_TUTAJ.md` — instrukcja dla osoby nietechnicznej,
- `PLAN_2026.md` — zakres i harmonogram,
- `USTALENIA_Z_KLIENTKA.md` — jeden zestaw pytań,
- `ARCHITEKTURA.md` — moduły i dane,
- `BEZPIECZENSTWO_I_RODO.md` — bramka przed prawdziwymi danymi,
- `BRAND_I_UI.md` — marka, treści i kontrolowany system UI,
- `OBSERVABILITY_I_ZGLOSZENIA.md` — logi, zrzuty i zgłoszenia,
- `AGENTS.md` — zasady kolejnych sesji,
- `DECYZJE.md` — historia decyzji.

## Wymagania i środowisko

Node.js 22.13–24 LTS, npm 11, PostgreSQL od Etapu 1. UI Etapu 0 działa bez
bazy. Skopiuj `.env.example` do `.env`; nigdy nie commituj `.env`. Puste klucze
e-mail/SMS są celowe.

Pilot jest przygotowany do samodzielnego serwera Node na MyDevil MD2.
Procedura: `DEPLOYMENT_MYDEVIL.md`.
