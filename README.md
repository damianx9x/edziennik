# eDziennik KLA

Mobilny eDziennik King’s Language Academy. Etapy 0–5 są funkcjonalne na danych
syntetycznych i przechodzą odbiór przedprodukcyjny. Działają role, kartoteki,
zaproszenia, import/eksport, grafik z asystentem, obecności, wersjonowane umowy,
ręczne płatności, komunikator, powiadomienia i prywatne pliki. Aktualny stan,
blokery produkcyjne i bezpieczny rytm wydawania opisuje `STAN_PROJEKTU.md`.

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
npm run package:raspberry
npm audit --omit=dev
npm run db:migrate:dev
npm run db:seed:demo
```

`package:preview` tworzy gotowy do WebFTP plik
`outputs/kla-szkielet-etap-0-5-home-pl.zip`. Instrukcja:
`INSTRUKCJA_HOME_PL.md`.

`package:release` tworzy aplikację Node.js
Paczka w `outputs/` wymaga PostgreSQL i hostingu
Node.js; zwykłe FTP jej nie uruchomi.

## Dokumenty

- `START_TUTAJ.md` — instrukcja dla osoby nietechnicznej,
- `ETAP_1_INSTRUKCJA.md` — uruchomienie i odbiór logowania oraz ról,
- `ETAP_2_INSTRUKCJA.md` — kartoteki, szablon importu i odbiór Etapu 2,
- `ETAP_3_GRAFIK.md` — Asystent, ręczny grafik i checklista odbioru,
- `PLAN_2026.md` — zakres i harmonogram,
- `ZAKRES_STARTOWY.md` — dokładne granice czterech modułów na start,
- `USTALENIA_Z_KLIENTKA.md` — jeden zestaw pytań,
- `ARCHITEKTURA.md` — moduły i dane,
- `BEZPIECZENSTWO_I_RODO.md` — bramka przed prawdziwymi danymi,
- `BRAND_I_UI.md` — marka, treści i kontrolowany system UI,
- `OBSERVABILITY_I_ZGLOSZENIA.md` — logi, zrzuty i zgłoszenia,
- `INSTRUKCJA_HOME_PL.md` — domeny, SSL, WebFTP i pokaz klientce,
- `AGENTS.md` — zasady kolejnych sesji,
- `DECYZJE.md` — historia decyzji,
- `AKTUALIZACJE_I_ROLLBACK.md` — bezpieczne aktualizacje i cofanie,
- `security_best_practices_report.md` — bieżący raport bezpieczeństwa,
- `wr-threat-model.md` — model zagrożeń całego systemu,
- `AUDYT_ETAPOW_2026-08-21.md` — wykonane funkcje, uwagi z PDF i zaległości,
- `raspberry/README.md` — instalacja pilota na Raspberry Pi 4B 8 GB.

## Wymagania i środowisko

Node.js 22.13–24 LTS, npm 11 i PostgreSQL. Skopiuj `.env.example` do `.env`;
nigdy nie commituj `.env`. Puste klucze e-mail/SMS są celowe.

Statyczny szkielet można pokazać na zwykłym hostingu home.pl. Pełny pilot z
logowaniem i bazą wymaga serwera Node. Procedury: `INSTRUKCJA_HOME_PL.md`,
`DEPLOYMENT_MYDEVIL.md` oraz `raspberry/README.md`.
