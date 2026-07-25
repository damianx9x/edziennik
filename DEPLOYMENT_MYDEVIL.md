# Wdrożenie na MyDevil — wersja robocza Etapu 0

Nie wykonuj tej procedury na prawdziwych danych przed zamknięciem checklisty
`BEZPIECZENSTWO_I_RODO.md`. Konto zakłada i opłaca klientka.

Oficjalne materiały:

- [strony Node.js w MyDevil](https://wiki.mydevil.net/Strona_WWW),
- [oferta i parametry](https://www.mydevil.net/nasza-oferta/),
- [certyfikaty Let's Encrypt](https://wiki.mydevil.net/SSL),
- [zarządzanie wersją Node przez mise](https://wiki.mydevil.net/Mise).

## Docelowy układ

- `staging.domena.pl` — osobna baza i dane demonstracyjne,
- `panel.domena.pl` — produkcja dopiero po odbiorze,
- Node.js 22 lub 24 LTS,
- PostgreSQL 16,
- HTTPS z minimalnym TLS ustawionym w panelu,
- sekrety jako zmienne procesu Passenger, nie w repozytorium.

## Co generuje projekt

Na Macu uruchom:

```bash
npm run package:release
```

Powstanie `outputs/edziennik-kla-stage-0.zip`. Paczka zawiera samodzielny serwer
Next.js, zasoby statyczne, `start.sh` i przykładowe nazwy zmiennych. Nie zawiera
`.env`, haseł, bazy ani danych użytkowników.

## Kolejność w panelu klientki

1. Załóż dwie bazy PostgreSQL: staging i production, z różnymi użytkownikami
   oraz hasłami.
2. Dodaj domenę staging jako aplikację Node.js w środowisku `staging`.
3. Wgraj i rozpakuj paczkę przez SFTP/SSH do katalogu wskazanego dla domeny.
4. Ustaw zmienne `DATABASE_URL`, `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL` i pozostałe potrzebne w danym etapie.
5. Ustaw plik wykonywalny aplikacji zgodnie z aktualnym panelem MyDevil.
   Dla paczki standalone punktem startu jest `server.js`; `start.sh` przyjmuje
   opcjonalne zmienne `APP_HOST` i `APP_PORT`, a następnie bezpiecznie przekazuje
   je procesowi Next.js.
6. Uruchom migracje wyłącznie dla stagingu, sprawdź wynik, potem wykonaj backup
   produkcji i dopiero zastosuj zatwierdzoną migrację.
7. Dodaj Let's Encrypt i wymuś HTTPS.
8. Uruchom testy smoke, test logowania ról i test izolacji danych.
9. Skonfiguruj codzienny backup poza repozytorium i wykonaj próbne odtworzenie.

Dokładne kliknięcia i polecenia zostaną uzupełnione podczas Etapu 6 na podstawie
aktualnego panelu konta klientki. Nie zgadujemy identyfikatorów domeny, ścieżek
ani haseł.
