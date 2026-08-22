# Meta i kopie zapasowe — przygotowanie wdrożenia

Stan: przygotowanie techniczne i instrukcja. Panel nie zapisuje jeszcze sekretów
i nie uruchamia automatycznych kopii ani wysyłki przez Meta.

## Facebook i Messenger — decyzja

Meta usunęła Groups API oraz związane z nim uprawnienia w wersji Graph API
19.0. Od 22 kwietnia 2024 aplikacja nie może oficjalnie publikować ani wysyłać
wiadomości do zwykłych grup Facebooka. Nie budujemy obejścia przez prywatne
konto, automatyzację przeglądarki ani nieoficjalne API.

Nie wdrażamy połączenia z API Meta. Panel udostępnia wyłącznie bezpieczny skrót,
który otwiera `messenger.com` w osobnej karcie. eDziennik nie przekazuje do
Facebooka list uczniów, treści wiadomości, tokenów ani danych logowania.

Źródła:

- [Meta: Graph API v19 i wycofanie Groups API](https://developers.facebook.com/blog/post/2024/01/23/introducing-facebook-graph-and-marketing-api-v19/)
- [Meta: Messenger Platform — wysyłanie wiadomości](https://developers.facebook.com/docs/messenger-platform/send-messages/)
- [Meta: integracje biznesowe](https://www.facebook.com/help/615546898822465/)

Dyrektor nie musi przygotowywać konta deweloperskiego ani przekazywać haseł.

## Kopie zapasowe

Docelowy moduł użyje wspólnego interfejsu miejsca docelowego. Pierwsze trzy
adaptery to prywatny folder lokalny, zamontowany dysk/NAS i SFTP. Zwykłego FTP
nie używamy dla bazy zawierającej dane dzieci, ponieważ nie zapewnia
szyfrowania transmisji.

Minimalny standard kopii:

- szyfrowanie przed wysłaniem poza serwer,
- sekret i klucz szyfrowania poza bazą oraz repozytorium,
- osobna retencja i automatyczne usuwanie starych kopii,
- dziennik wyniku bez danych osobowych i sekretów,
- alarm po nieudanej kopii,
- regularny test odtworzenia do oddzielnego środowiska,
- co najmniej jedna kopia poza urządzeniem aplikacji.

### Dane potrzebne od dyrektora

Dla folderu lub NAS: pełna ścieżka, sposób montowania po restarcie, dostępne
miejsce i uprawnienia. Dla SFTP: host, port, użytkownik, docelowy folder, odcisk
klucza serwera i osobny klucz SSH lub hasło przekazane bezpiecznym kanałem.
Dyrektor wybiera też częstotliwość, retencję oraz osobę otrzymującą alarm.

## Następny krok wdrożeniowy

Po wyborze dostawców powstaną: migracja konfiguracji bez sekretów, adapter
docelowy, szyfrowane zadanie kolejki, kontrola integralności, ekran historii,
alarmy oraz obowiązkowy test przywrócenia. Dopiero przejście testu pozwoli
oznaczyć miejsce jako aktywne.
