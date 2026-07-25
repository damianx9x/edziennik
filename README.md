# eDziennik KLA

Mobilny eDziennik King’s Language Academy. Etap 0.7 domyka szkielet Etapu
0–0,5: strona z dostępnym sliderem zdjęć, brama Uczeń/Rodzic/Szkoła, panel
demonstracyjny, edytor treści dla dyrektora, diagnostyka, model PostgreSQL i
centralne uprawnienia.

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
npm run package:preview
npm run db:migrate:dev
npm run db:seed:demo
```

`package:preview` tworzy gotowy do WebFTP plik
`outputs/kla-szkielet-etap-0-5-home-pl.zip`. Instrukcja:
`INSTRUKCJA_HOME_PL.md`.

## Dokumenty

- `START_TUTAJ.md` — instrukcja dla osoby nietechnicznej,
- `PLAN_2026.md` — zakres i harmonogram,
- `ZAKRES_STARTOWY.md` — dokładne granice czterech modułów na start,
- `USTALENIA_Z_KLIENTKA.md` — jeden zestaw pytań,
- `ARCHITEKTURA.md` — moduły i dane,
- `BEZPIECZENSTWO_I_RODO.md` — bramka przed prawdziwymi danymi,
- `BRAND_I_UI.md` — marka, treści i kontrolowany system UI,
- `OBSERVABILITY_I_ZGLOSZENIA.md` — logi, zrzuty i zgłoszenia,
- `INSTRUKCJA_HOME_PL.md` — domeny, SSL, WebFTP i pokaz klientce,
- `AGENTS.md` — zasady kolejnych sesji,
- `DECYZJE.md` — historia decyzji.

## Wymagania i środowisko

Node.js 22.13–24 LTS, npm 11, PostgreSQL od Etapu 1. UI Etapu 0 działa bez
bazy. Skopiuj `.env.example` do `.env`; nigdy nie commituj `.env`. Puste klucze
e-mail/SMS są celowe.

Statyczny szkielet można pokazać na zwykłym hostingu home.pl. Pełny pilot z
logowaniem i bazą jest przygotowany do samodzielnego serwera Node na MyDevil
MD2. Procedury: `INSTRUKCJA_HOME_PL.md` i `DEPLOYMENT_MYDEVIL.md`.
