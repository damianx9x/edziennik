# Wdrożenie na MyDevil — Etap 1

Nie wykonuj tej procedury na prawdziwych danych przed zamknięciem checklisty
`BEZPIECZENSTWO_I_RODO.md`. Konto zakłada i opłaca klientka.

Oficjalne materiały:

- [strony Node.js w MyDevil](https://wiki.mydevil.net/Strona_WWW),
- [oferta i parametry](https://www.mydevil.net/nasza-oferta/),
- [certyfikaty Let's Encrypt](https://wiki.mydevil.net/SSL),
- [zarządzanie wersją Node przez mise](https://wiki.mydevil.net/Mise).

## Docelowy układ

- `staging.kingslanguageacademy.pl` — osobna baza i dane demonstracyjne,
- `panel.kingslanguageacademy.pl` — produkcja dopiero po odbiorze,
- Node.js 22 lub 24 LTS,
- PostgreSQL 16,
- HTTPS z minimalnym TLS ustawionym w panelu,
- sekrety jako zmienne procesu Passenger, nie w repozytorium.

## Co generuje projekt

Na Macu uruchom:

```bash
npm run package:release
```

Powstanie `outputs/edziennik-kla-stage-2.zip`. Paczka zawiera samodzielny
serwer Next.js, migracje, zasoby statyczne, `migrate.sh`, `start.sh` i
przykładowe nazwy zmiennych. Nie zawiera `.env`, haseł, bazy ani danych
użytkowników.

## Kolejność w panelu klientki

1. Załóż dwie bazy PostgreSQL: staging i production, z różnymi użytkownikami
   oraz hasłami.
2. Dodaj domenę staging jako aplikację Node.js w środowisku `staging`.
3. Wgraj i rozpakuj paczkę przez SFTP/SSH do katalogu wskazanego dla domeny.
4. Ustaw zmienne `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`,
   `NEXT_PUBLIC_APP_URL`, `EMAIL_FROM` i `RESEND_API_KEY`. Sekret Better Auth
   musi mieć co najmniej 32 losowe bajty i być inny dla stagingu oraz produkcji.
5. Ustaw plik wykonywalny aplikacji zgodnie z aktualnym panelem MyDevil.
   Dla paczki standalone punktem startu jest `server.js`; `start.sh` przyjmuje
   opcjonalne zmienne `APP_HOST` i `APP_PORT`, a następnie bezpiecznie przekazuje
   je procesowi Next.js.
6. W katalogu paczki uruchom `./migrate.sh` najpierw wyłącznie dla stagingu.
   Skrypt używa dołączonej, przypiętej wersji Prisma 7.8.0 i nie pobiera
   narzędzi podczas wdrożenia. Przed migracją produkcji wykonaj i sprawdź backup.
7. Dodaj Let's Encrypt i wymuś HTTPS.
8. Uruchom testy smoke, test logowania ról i test izolacji danych.
9. Skonfiguruj codzienny backup poza repozytorium i wykonaj próbne odtworzenie.

Po uruchomieniu sprawdź dodatkowo:

- próba publicznej rejestracji jest odrzucana,
- dyrektor musi skonfigurować TOTP,
- rodzic, uczeń i wykładowca nie otwierają panelu dyrektora,
- link zaproszenia działa tylko raz,
- reset hasła unieważnia dotychczasowe sesje.

Dokładne kliknięcia i polecenia zostaną uzupełnione podczas Etapu 6 na podstawie
aktualnego panelu konta klientki. Nie zgadujemy identyfikatorów domeny, ścieżek
ani haseł.
