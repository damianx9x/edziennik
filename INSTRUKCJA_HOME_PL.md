# Wdrożenie szkieletu KLA na home.pl

Instrukcja dla wersji pokazowej Etapu 0–0,5. Nie wymaga bazy danych ani Node.js.
Na serwer wysyłamy wyłącznie gotową paczkę:

`outputs/kla-szkielet-etap-0-5-home-pl.zip`

Nie wysyłamy całego repozytorium, katalogu `.next`, pliku `.env`, bazy danych,
backupów ani danych uczniów.

## 1. Co musi być kupione

Same domeny nie przechowują strony. Potrzebny jest jeszcze dowolny współdzielony
hosting home.pl z dostępem FTP/WebFTP. Dla tej statycznej prezentacji wystarczy
najmniejszy sensowny pakiet. Przed zakupem sprawdź cenę **odnowienia**, nie
tylko promocję na pierwszy rok.

Do bezpiecznego pokazu potrzebny jest też certyfikat SSL obejmujący:

- `kingslanguageacademy.pl`,
- `www.kingslanguageacademy.pl`,
- `kingsedu.pl`,
- `www.kingsedu.pl`.

Może to być jeden certyfikat wielodomenowy albo oddzielne certyfikaty. W
szczegółach usługi zawsze sprawdź listę chronionych nazw.

Docelowe adresy:

- główny: `https://kingslanguageacademy.pl`,
- krótki: `https://kingsedu.pl` → przekierowanie 301 do adresu głównego.

## 2. Przygotowanie paczki na Macu

W Terminalu, w katalogu projektu:

```bash
npm run package:preview
```

Skrypt sam uruchamia testy, buduje statyczną stronę i tworzy:

`outputs/kla-szkielet-etap-0-5-home-pl.zip`

Paczka zawiera między innymi `index.html`, katalog `_next`, katalog `panel`,
zdjęcia i ukryty plik `.htaccess`. Ten ostatni wymusza HTTPS i główną wersję
adresu.

## 3. Utworzenie katalogu strony w home.pl

1. Zaloguj się do Panelu Klienta home.pl.
2. Wejdź w `Usługi WWW`.
3. Wybierz hosting.
4. Otwórz `Konta FTP` → `Opcje` → `WebFTP`.
5. W katalogu `/public_html` utwórz folder `kla-preview`.
6. Wejdź do `/public_html/kla-preview`.
7. Wyślij tam plik `kla-szkielet-etap-0-5-home-pl.zip`.
8. Użyj opcji rozpakowania archiwum.
9. Sprawdź, czy **bezpośrednio** w `kla-preview` znajdują się:
   `index.html`, `_next`, `panel`, `photos` i `.htaccess`.
10. Usuń z serwera wysłany ZIP, gdy rozpakowanie się powiedzie.

Nie może powstać podwójny katalog, np.
`/public_html/kla-preview/kla-szkielet-etap-0-5-home-pl/index.html`.

Oficjalne instrukcje:
[struktura katalogów hostingu](https://pomoc.home.pl/baza-wiedzy/umiescic-strone-www-serwerze-home-pl-struktura-katalogow),
[uruchomienie WebFTP](https://pomoc.home.pl/baza-wiedzy/jak-uruchomic-webftp-panelu-klienta).

## 4. Przypisanie domeny głównej

1. Wróć do `Usługi WWW`.
2. Wybierz hosting.
3. Otwórz `Przypisane domeny`.
4. Kliknij `Przypisz` lub wybierz domenę z listy wszystkich domen.
5. Wybierz `kingslanguageacademy.pl`.
6. Jako sposób przypisania wybierz `Podkatalog z separacją serwisu`.
7. Jako katalog wpisz `/kla-preview`.
8. Zapisz.

W tym polu nie wpisuj `/public_html/kla-preview`. Panel home.pl traktuje
`/public_html` jako katalog bazowy.

Separacja serwisu ogranicza dostęp strony do jej własnego katalogu. Oficjalna
instrukcja:
[przypisanie domeny do hostingu](https://pomoc.home.pl/baza-wiedzy/jak-przypisac-domene-do-hostingu-w-panelu-klienta).

## 5. Ustawienie krótkiej domeny

`kingsedu.pl` ma być wygodnym adresem na ulotkach, ale jedna domena powinna być
głównym adresem indeksowanym przez wyszukiwarki.

1. Przypisz `kingsedu.pl` do tego samego hostingu.
2. Wejdź w edycję przypisania tej domeny.
3. Wybierz przekierowanie `301`.
4. Wpisz `https://kingslanguageacademy.pl`.
5. Zapisz.
6. Tak samo obsłuż wariant `www`, jeśli panel pokazuje go oddzielnie.

Oficjalna instrukcja:
[przekierowanie 301 w Panelu Klienta](https://pomoc.home.pl/baza-wiedzy/jak-ustawic-przekierowanie-301-w-panelu-klienta).

## 6. Włączenie SSL

Najpierw domeny muszą wskazywać na hosting.

1. Wejdź w `Certyfikaty SSL`.
2. Przy opłaconym certyfikacie wybierz `Opcje` → `Aktywuj`.
3. Wybierz odpowiednią domenę i wariant `www`.
4. Włącz instalację certyfikatu na przypisanym serwerze.
5. Powtórz dla drugiej domeny, jeżeli nie obejmuje jej ten sam certyfikat.
6. Poczekaj kilka–kilkanaście minut na instalację.

Plik `.htaccess` wymusza HTTPS, dlatego stronę testuj dopiero po poprawnym
zainstalowaniu certyfikatu.

Oficjalne instrukcje:
[aktywacja certyfikatu SSL](https://pomoc.home.pl/baza-wiedzy/aktywacja-oplaconego-certyfikatu-ssl-w-panelu-klienta),
[adresy chronione certyfikatem](https://pomoc.home.pl/baza-wiedzy/chce-kupic-certyfikat-ssl-dla-jakich-adresow-mojej-domeny-bedzie-on-dzialal).

## 7. Test przed wysłaniem klientce

Otwórz po kolei:

- `https://kingslanguageacademy.pl`,
- `https://www.kingslanguageacademy.pl` — ma przejść na adres bez `www`,
- `https://kingsedu.pl` — ma przejść na domenę główną,
- `https://kingslanguageacademy.pl/panel/`,
- `https://kingslanguageacademy.pl/panel/demo/`,
- `https://kingslanguageacademy.pl/panel/demo/ustawienia-strony/`.

Na telefonie sprawdź:

- slider można przesuwać palcem i zatrzymać,
- nie ma poziomego przewijania,
- kafle Uczeń/Rodzic/Szkoła są czytelne,
- panel demo i edytor treści mieszczą się na ekranie,
- ikona zgłoszenia błędu jest dostępna.

Do klientki wyślij:

> Dzień dobry, pod adresem https://kingslanguageacademy.pl jest pierwszy
> interaktywny szkielet strony i eDziennika. Proszę wejść również w:
> eDziennik → Szkoła → Zobacz panel demonstracyjny. To bezpieczne demo na
> wymyślonych danych. Na tym etapie zbieramy uwagi do treści, zdjęć i wygody
> obsługi — funkcje biznesowe są pokazane jako projekt przepływów.

## 8. Edycja strony przez dyrektora w demie

Ścieżka:
`eDziennik → Szkoła → panel demonstracyjny → Treść strony`.

Dyrektor może bez kodowania:

- zmienić tekst i przyciski pierwszego ekranu,
- dodać, podmienić, usunąć i ustawić kolejność slajdów,
- zmienić ofertę, opis szkoły i lokalizacje,
- edytować opis paneli i funkcji eDziennika,
- zmienić telefon, e-mail i wezwanie do kontaktu,
- wyeksportować i zaimportować kopię treści w JSON,
- jednym przyciskiem przywrócić treść domyślną.

Zdjęcie jest automatycznie zmniejszane przed zapisem. Dopuszczalne są JPG,
PNG i WebP do 10 MB.

**Ograniczenie demonstracyjne:** zmiany zapisują się w pamięci konkretnej
przeglądarki. Nie aktualizują serwera ani innych telefonów. To celowe:
publiczny edytor bez logowania byłby niebezpieczny. W Etapie 1 edycję
przeniesiemy za logowanie dyrektora, do bazy i bezpiecznego magazynu plików.
Do tego czasu po zaakceptowanej zmianie należy użyć `Eksportuj kopię` i
przekazać plik wykonawcy.

## 9. Aktualizacja i wycofanie

Przed kolejną publikacją:

1. Pobierz kopię obecnego `/public_html/kla-preview`.
2. Utwórz obok folder `kla-preview-next`.
3. Rozpakuj nową paczkę i sprawdź jej strukturę.
4. Przestaw domenę na nowy folder.
5. Sprawdź wszystkie adresy z punktu 7.
6. Stary folder zachowaj przez kilka dni jako możliwość szybkiego powrotu.

Nie nadpisuj na ślepo działającej strony. Backup hostingu nie zastępuje tej
prostej procedury wydaniowej.

## 10. Dostępy i rozwiązywanie problemów

- Utwórz osobne konto FTP dla wykonawcy; nie udostępniaj głównego hasła do
  Panelu Klienta.
- Nie wysyłaj hasła przez zwykły e-mail ani komunikator.
- W demo nie wpisuj prawdziwych nazw dzieci, telefonów rodziców ani umów.
- Jeśli widać błąd certyfikatu, sprawdź listę domen objętych SSL i poczekaj na
  aktywację.
- Jeśli jest biała strona lub 404, sprawdź, czy `index.html` leży bezpośrednio
  w katalogu przypisanym do domeny.
- Jeśli strona nie ma stylów, sprawdź, czy obok `index.html` istnieje `_next`.
- Jeśli zmiany treści „zniknęły”, sprawdź, czy używasz tej samej przeglądarki
  i nie włączono trybu prywatnego.
- Jeśli przekierowanie zapętla się, pozostaw `kingslanguageacademy.pl` jako
  domenę przypisaną do katalogu, a tylko `kingsedu.pl` ustaw jako 301.

## Granica tej paczki

Ta paczka służy do pokazania strony, UX i przepływów. Nie zawiera serwera
logowania, PostgreSQL, wspólnego CMS, wysyłki wiadomości, prawdziwych umów ani
danych uczniów. Zwykły hosting współdzielony home.pl wystarcza dla prezentacji,
ale nie dla docelowego eDziennika w obecnej architekturze. Wersja aplikacyjna
będzie wdrażana na hostingu Node.js/PostgreSQL zgodnie z
`DEPLOYMENT_MYDEVIL.md`.
