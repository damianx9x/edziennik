# Cykl testowy eDziennika KLA

Każda funkcja przechodzi ten sam proces. Klientka nigdy nie testuje zmian
bez commita ani wersji, która nie przeszła lokalnej kontroli.

## 1. Implementacja lokalna

- pracujemy na gałęzi bieżącego etapu,
- używamy wyłącznie syntetycznych danych,
- migracje bazy należą do tego samego zakresu co kod,
- nie mieszamy kilku niezależnych funkcji w jednym odbiorze.

## 2. Lokalna bramka jakości

Obowiązkowo:

```bash
npm run check
npm run build
```

Następnie klikamy cały zmieniony przepływ:

- telefon 375 × 812,
- komputer 1440 × 900,
- poprawna rola,
- próba wejścia bez uprawnień,
- stan pusty, sukces i błąd,
- brak błędów w konsoli i logach.

Zrzuty zapisujemy w `outputs/qa/stage-N/`.

## 3. Commit

Commit powstaje dopiero po zaliczeniu lokalnej bramki. Opisuje jeden czytelny
wynik, na przykład:

```bash
git commit -m "feat(schedule): prevent room conflicts"
```

Po commicie `git status --short` ma być pusty.

## 4. Serwer testowy na Macu

Jeżeli poprzedni pokaz nadal działa:

```bash
npm run host:mac:stop
```

Uruchomienie zatwierdzonego commita:

```bash
npm run host:mac:start
```

Skrypt odrzuci brudne repozytorium. Do runtime trafia eksport dokładnie
bieżącego commita, a nie luźna kopia katalogu roboczego.

## 5. Kontrola publiczna

Przed wysłaniem linku sprawdzamy:

- `npm run host:mac:status`,
- stronę główną i logowanie przez publiczny HTTPS,
- logowanie odpowiednimi kontami demo,
- odmowę wejścia do cudzej roli,
- MFA dyrektora,
- wylogowanie,
- log aplikacji i tunelu.

## 6. Odbiór klientki

Klientka dostaje treść prywatnego pliku:

`.data/mac-test-host/PRZEKAZ_KLIENTCE.txt`

Plik zawiera link, konta demo i skrót commita. Nie przekazujemy konta `bog`,
prawdziwych danych dzieci ani pliku `.env`.

## 7. Feedback

Uwagi klientki zapisujemy jako zakres następnej zmiany. Nie edytujemy
działającego pokazu w trakcie odbioru. Po poprawkach cały cykl zaczyna się od
lokalnej bramki jakości.

Po akceptacji etapu tworzymy paczkę:

```bash
npm run package:release
```
