# Decyzje architektoniczne

## ADR-084 — ciągłość v1.0, auto-start i podpisane wydania

**Data:** 2026-08-27. **Decyzja:** eksport zawiera PostgreSQL, prywatne pliki i
zaszyfrowane sekrety ciągłości, lecz nie prywatny klucz `age`. Klucz jest
wydawany jeden raz i przechowywany poza Pi. Paczki są podpisywane Ed25519, a Pi
weryfikuje klucz publiczny zapisany root-only. Na tym pilocie wybrano auto-start
po zaniku prądu przez klucz LUKS root-only na karcie systemowej. To świadomie
zmniejsza ochronę przy jednoczesnej kradzieży Pi i SSD; zewnętrzne eksporty
pozostają niezależnie zaszyfrowane.

## ADR-083 — treść strony jest danymi serwerowymi

**Data:** 2026-08-27. **Decyzja:** PostgreSQL jest źródłem prawdy dla treści i
układu strony. IndexedDB jest wyłącznie lokalnym cache/fallbackiem. Dzięki temu
zmiany dyrektora są wspólne na urządzeniach i trafiają do pełnego backupu.
Ten ADR zastępuje lokalny zakres ADR-057.

## ADR-061 — jeden szyfrowany sejf danych na Raspberry Pi

**Data:** 2026-08-22
**Decyzja:** PostgreSQL i prywatne dokumenty przechowujemy razem na osobnym
SSD zaszyfrowanym LUKS2. Karta systemowa nie zawiera bazy, dokumentów ani
sekretów aplikacji. Pierwsza
konfiguracja tworzy hasło codziennego odblokowania i losowy klucz odzyskiwania
pokazany tylko raz. Każdy upload przechodzi przez ClamAV w trybie fail-closed.
Backup łączy bazę, dokumenty i manifest wersji, szyfruje `age`, a następnie może
wysłać go SFTP poza urządzenie. Test odtworzenia używa tymczasowej bazy.
**Dlaczego:** szyfrowanie plików kluczem zapisanym obok danych nie chroni przed
kradzieżą całego urządzenia. Pi 4B nie ma wbudowanego TPM, więc bez dodatkowego
sprzętu po restarcie wymagane jest jedno ręczne odblokowanie.
**Granice:** instalator usuwa wyłącznie wskazany i dwukrotnie potwierdzony SSD.
Retencja umów pozostaje wyłączona (`0`) do zatwierdzenia przez prawnika/IOD.
Produkcja nadal wymaga UPS, HTTPS, zewnętrznego SFTP i procedury awaryjnej.

## ADR-057 — uwagi z ręcznego przeglądu i pamięć zdjęć strony

**Decyzja:** treść demonstracyjnego edytora strony nadal jest lokalna dla
przeglądarki, ale zdjęcia i cały dokument treści zapisujemy w IndexedDB.
`localStorage` służy jedynie jako sygnał synchronizacji i źródło jednorazowej
migracji. Slider ma jawny tryb dzielony/szeroki oraz cover/contain.
**Dlaczego:** base64 w `localStorage` osiągało limit już po jednym zdjęciu, a
jeden sztywny kadr niszczył szerokie grafiki.
**Granica:** wspólna publikacja na wszystkich urządzeniach wymaga zapisu
serwerowego i magazynu plików; lokalny edytor jest demonstracją.

## ADR-058 — Raspberry Pi jest hostem pilota, nie gwarancją HA

**Decyzja:** wspieramy Raspberry Pi 4B 8 GB na 64-bitowym Raspberry Pi OS,
PostgreSQL i Node 22, z systemd, nginx, kontrolą HTTP i szyfrowanymi kopiami.
**Dlaczego:** 1–10 równoczesnych użytkowników mieści się w zasobach Pi, jeśli
baza działa na SSD. Instalacja natywna zużywa mniej RAM niż pełny stos Docker.
**Konsekwencja:** brak prądu lub Internetu nadal wyłącza usługę. Dla pilota
wymagamy SSD, UPS, zewnętrznej kopii i HTTPS; VPS pozostaje bezpieczniejszy.

## ADR-059 — uwagi prawne z PDF nie są automatyczną wykładnią prawa

**Decyzja:** zachowujemy dwa tryby umowy: dokumentowy w eDzienniku i podpis
poza systemem. Nie nazywamy kodu SMS podpisem i nie hardkodujemy stawki VAT.
**Dlaczego:** właściwa forma zależy od treści umowy, a kwalifikowany podpis ma
inny skutek niż zwykła akceptacja. VAT wymaga potwierdzenia księgowego.
**Warunek:** wzorzec, proces konsumencki, VAT i retencja muszą przejść odbiór
prawnika, IOD i księgowej przed danymi rzeczywistymi.

## ADR-060 — informacje konsumenckie należą do wersji umowy

**Data:** 2026-08-22
**Decyzja:** okres świadczenia, zasady wypowiedzenia, warunki płatności i wymóg
osobnego żądania wcześniejszego rozpoczęcia zapisujemy w `ContractVersion`.
Bezpośrednio przed zawarciem rodzic potwierdza osobno przeczytanie PDF,
otrzymanie informacji konsumenckich, obowiązek zapłaty i — jeśli dotyczy —
wcześniejszy start wraz z konsekwencjami. Dowód zapisuje treść oświadczenia,
wersję informacji, etykietę przycisku i zaznaczone potwierdzenia.
**Dlaczego:** jedno ogólne pole „akceptuję” nie pokazuje, które informacje
rodzic rzeczywiście otrzymał. Dane wersjonowane chronią przed późniejszym
nadpisaniem warunków. FAQ jest wspólne dla dyrektora i rodzica, ale nie
zastępuje zatwierdzonego wzorca ani opinii prawnej.

## ADR-024 — akceptacja dokładnej wersji umowy

**Data:** 2026-08-09
**Decyzja:** dokument umowy jest prywatnym plikiem PDF, a każda korekta tworzy
nową wersję z własnym SHA-256. Akceptacja wskazuje przypisanie, rodzica, czas,
wersję oraz skrót dokumentu i nigdy nie nadpisuje wcześniejszej akceptacji.
**Dlaczego:** pozwala wykazać, jaki dokument został świadomie zaakceptowany,
bez udawania kwalifikowanego podpisu elektronicznego. Tekst prawny nadal musi
zatwierdzić prawnik.

## ADR-025 — ręczny rejestr statusu płatności

**Data:** 2026-08-09
**Decyzja:** eDziennik przechowuje wyłącznie administracyjny status okresu,
opcjonalny termin i krótką notatkę. Nie przechowuje danych karty, rachunku ani
treści przelewu. Każda zmiana tworzy zdarzenie audytowe.
**Dlaczego:** odpowiada zakresowi pilota i nie zmienia aplikacji w system
płatniczy lub księgowy.

## ADR-001 — pilot zamiast pełnej produkcji

**Data:** 2026-07-25
**Decyzja:** 1 września dostarczamy pilot na danych demonstracyjnych.
**Dlaczego:** pierwotny zakres nie mieści się w budżecie/czasie, a dane dzieci
wymagają odbioru bezpieczeństwa i prawa.

## ADR-002 — natywny Next.js Node

**Data:** 2026-07-25
**Decyzja:** Next.js App Router z `output: "standalone"`, bez Vinext.
**Dlaczego:** jeden build działa lokalnie i na hostingu Node/PostgreSQL.

## ADR-003 — PostgreSQL i Prisma

**Data:** 2026-07-25
**Decyzja:** PostgreSQL + Prisma 7.
**Dlaczego:** role, rodziny, grupy, grafik i audyt wymagają relacji, transakcji
i mocnych ograniczeń.

## ADR-004 — Better Auth

**Data:** 2026-07-25
**Decyzja:** zaproszenia, weryfikacja e-mail i TOTP 2FA od Etapu 1.
**Dlaczego:** 2FA jest wymogiem, a biblioteka ma utrzymywany plugin TOTP.

## ADR-005 — MyDevil MD2

**Data:** 2026-07-25
**Decyzja:** MD2, nie MD1 ani niezarządzany VPS home.pl.
**Dlaczego:** 2 GB RAM daje rozsądniejszy margines, a użytkownik nie chce
administrować Linuksem.

## ADR-006 — jawny komunikator

**Data:** 2026-07-25
**Decyzja:** dostęp dyrektora nie jest ukrytym DW; jest opisany i audytowany.
**Dlaczego:** przejrzystość oraz proporcjonalność ograniczają ryzyko prywatności.

## ADR-007 — marka KLA bez zdjęć dzieci na stagingu

**Data:** 2026-07-25
**Decyzja:** używamy prawdziwego logo i zweryfikowanych informacji biznesowych,
ale nie kopiujemy zdjęć ani nazw dzieci do repozytorium lub stagingu.
**Dlaczego:** minimalizacja danych, trwały wygląd i prostsza procedura zgód.

Ta decyzja została doprecyzowana przez ADR-012.

## ADR-008 — zgłoszenie lokalne przed wysyłką serwerową

**Data:** 2026-07-25
**Decyzja:** Etap 0.5 przygotowuje lokalną paczkę diagnostyczną i korzysta z
systemowego udostępniania. Chroniony zapis i automatyczny e-mail włączymy po
uwierzytelnianiu w Etapie 1.
**Dlaczego:** publiczny endpoint z plikami przed logowaniem byłby źródłem spamu
i ryzyka ujawnienia danych.

## ADR-009 — kontrolowany system UI

**Data:** 2026-07-25
**Decyzja:** tokeny marki, semantyczny HTML, Nunito Sans, Lucide i oficjalne
komponenty; ImageGen tylko dla osobnych materiałów marketingowych.
**Dlaczego:** spójność, dostępność i mniejszy „generatywny” wygląd.

## ADR-010 — wyłącznie język angielski

**Data:** 2026-07-25
**Decyzja:** KLA opisujemy jako prywatną szkołę wyłącznie języka angielskiego.
Nie promujemy innych języków, matematyki, robotyki ani zajęć artystycznych.
**Dlaczego:** bezpośrednia informacja właściciela projektu jest aktualnym
źródłem prawdy i ma pierwszeństwo przed starszym opisem profilu społecznościowego.

## ADR-011 — projektowy kontrakt ruchu

**Data:** 2026-07-25
**Decyzja:** każda praca nad interfejsem korzysta ze skilla `$design-kla-ui`.
Animacje są krótkie, funkcjonalne, oparte głównie na `transform` i `opacity`
oraz mają wariant `prefers-reduced-motion`. Bibliotekę ruchu dodajemy tylko dla
uzasadnionej, złożonej interakcji.
**Dlaczego:** jeden kontrakt zapobiega przypadkowym efektom, pogorszeniu
dostępności i niespójnemu „generatywnemu” wyglądowi.

## ADR-012 — kontrolowane zdjęcia szkoły

**Data:** 2026-07-25
**Decyzja:** za zgodą właściciela używamy trzech publicznych zdjęć KLA:
autobusu wyjazdowego, dorosłej przedstawicielki z nagrodą i grupy pokazanej od
tyłu. Nie używamy zbliżeń twarzy dzieci ani nazw.
**Dlaczego:** prawdziwe materiały wzmacniają wiarygodność i usuwają sztuczny
wygląd, a selekcja nadal minimalizuje dane małoletnich.

## ADR-013 — cztery moduły w zakresie startowym

**Data:** 2026-07-25
**Decyzja:** pilot do 1 września zawiera podstawowe umowy online, komunikator z
masowymi ogłoszeniami, ręczny status płatności oraz materiały i zadania.
**Dlaczego:** są to funkcje wymagane do rozpoczęcia pracy szkoły. Ich granice
określa `docs/PRODUCT_SCOPE.md`; funkcje zaawansowane pozostają po pilocie.

## ADR-014 — kolejka bez dodatkowej bazy

**Data:** 2026-07-25
**Decyzja:** zadania asynchroniczne realizują tabela Outbox i pg-boss działający
na tym samym PostgreSQL. Dostawcy e-mail/SMS pozostają za interfejsami.
**Dlaczego:** zachowujemy ponowienia i mierzalny status bez utrzymywania Redis,
a wzorzec można później skalować niezależnym workerem.

## ADR-015 — prywatne pliki i wymienny podpis

**Data:** 2026-07-25
**Decyzja:** pliki przechodzą przez `FileStorage` i prywatny magazyn
S3-compatible; umowy mają append-only wersje i `SignatureProvider`.
**Dlaczego:** materiały, zadania, zgłoszenia i umowy korzystają z jednego
bezpiecznego mechanizmu, a przyszły dostawca zaawansowanego podpisu nie wymaga
przepisania logiki biznesowej.

## ADR-016 — slider Embla bez biblioteki animacji

**Data:** 2026-07-25
**Decyzja:** slider używa Embla 8.6, `next/image`, ręcznych kontrolek i
zatrzymania dla focus, interakcji oraz `prefers-reduced-motion`. Pozostały ruch
realizują tokeny CSS.
**Dlaczego:** Embla zapewnia lekkie gesty i kontrolę zachowania, a proste
mikrointerakcje nie uzasadniają kolejnej biblioteki.

## ADR-017 — statyczny szkielet na home.pl

**Data:** 2026-07-25
**Decyzja:** Etap 0–0,5 ma dodatkowy eksport statyczny dla zwykłego hostingu
home.pl. Nie zastępuje on wydania Node.js pełnego eDziennika.
**Dlaczego:** klientka może szybko i tanio ocenić stronę oraz UX na własnej
domenie, bez udawania, że hosting plików obsłuży logowanie, kolejkę i bazę.

## ADR-018 — jedna domena kanoniczna

**Data:** 2026-07-25
**Decyzja:** `kingslanguageacademy.pl` jest domeną główną, a `kingsedu.pl`
przekierowuje do niej kodem 301. Obie domeny mają SSL.
**Dlaczego:** krótki adres jest wygodny w komunikacji, a jeden adres główny
zapobiega duplikacji strony i porządkuje przyszłe linki.

## ADR-019 — edytor treści bez publicznego zapisu

**Data:** 2026-07-25
**Decyzja:** demonstracyjny edytor używa walidowanego zapisu w przeglądarce i
kopii JSON. Wspólna publikacja do bazy i plików jest dostępna dopiero po
logowaniu dyrektora.
**Dlaczego:** zachowujemy wczesny, intuicyjny test obsługi, ale nie tworzymy
niechronionego CMS, do którego każdy odwiedzający mógłby wysłać treść lub plik.

## ADR-020 — konta wyłącznie przez jednorazowe zaproszenie

**Data:** 2026-07-25
**Decyzja:** publiczna rejestracja jest wyłączona. Dyrektor tworzy siedmiodniowy
link, baza przechowuje tylko SHA-256 tokenu, a użycie jest atomowe i jednorazowe.
**Dlaczego:** szkoła kontroluje dostęp, a wyciek bazy nie ujawnia aktywnych
linków zaproszeń.

## ADR-021 — e-mail globalnie unikalny

**Data:** 2026-07-25
**Decyzja:** jeden adres e-mail identyfikuje jedno konto w systemie; zakres
szkoły nadal pochodzi z `schoolId` sesji.
**Dlaczego:** upraszcza logowanie i reset hasła oraz zapobiega niejednoznacznym
kontom. Obsługę wielu szkół jednym kontem rozważymy dopiero przy realnej
potrzebie biznesowej.

## ADR-022 — obowiązkowe TOTP dyrektora

**Data:** 2026-07-25
**Decyzja:** dyrektor nie otworzy panelu bez konfiguracji TOTP; kody awaryjne
są pokazywane raz i wymagają świadomego potwierdzenia zapisania.
**Dlaczego:** ta rola ma największy zakres danych i funkcji administracyjnych.

## ADR-023 — osobne artefakty FTP i Node.js

**Data:** 2026-07-25
**Decyzja:** `package:preview` buduje z izolowanej kopii tylko publiczne trasy
statyczne, a `package:release` zawiera pełny serwer bieżącego etapu i migracje.
**Dlaczego:** home.pl FTP nie uruchomi bezpiecznych sesji ani PostgreSQL, ale
nadal może służyć do pokazu strony bez udawania pełnej aplikacji.

## ADR-024 — dwuetapowy, transakcyjny import

**Data:** 2026-07-25
**Decyzja:** podgląd importu zapisuje prywatny plik i raport walidacji, a
zatwierdzenie ponownie sprawdza SHA-256, ponownie parsuje plik i zapisuje dane
w jednej transakcji.
**Dlaczego:** użytkownik widzi błędy przed zmianą bazy, a podmiana pliku lub
częściowy zapis nie pozostawiają niespójnych kartotek.

## ADR-025 — rekord ucznia bez konta logowania

**Data:** 2026-07-25
**Decyzja:** uczeń może mieć kartotekę i szkolny `externalId` bez adresu e-mail
i konta. Konto logowania pozostaje osobnym, późniejszym krokiem.
**Dlaczego:** szkoła musi prowadzić grupy również dla dzieci, które nie
korzystają samodzielnie z panelu, bez tworzenia sztucznych adresów kontaktowych.

## ADR-026 — archiwizacja danych podstawowych

**Data:** 2026-07-25
**Decyzja:** sale, grupy, osoby i ich powiązania są archiwizowane, a nie
fizycznie kasowane w codziennym interfejsie.
**Dlaczego:** przyszły grafik, umowy, płatności i dziennik wymagają ciągłości
historii; usuwanie odbywa się osobną procedurą retencji.

## ADR-027 — jedno logowanie i QR jako nośnik zaproszenia

**Data:** 2026-07-26
**Decyzja:** system ma jeden formularz logowania, a docelowy panel wynika z roli
aktywnego konta. Kod QR zawiera ten sam jednorazowy, siedmiodniowy i przypisany
do roli link co zaproszenie tekstowe.
**Dlaczego:** dodatkowy wybór roli był mylący i nie dawał bezpieczeństwa. QR
upraszcza start na telefonie bez otwierania publicznej rejestracji.

## ADR-028 — oddzielone operacje na plikach i eksport zgodny z importem

**Data:** 2026-07-26
**Decyzja:** import, eksport oraz historia operacji mają osobną kategorię,
a kartoteki są katalogiem do codziennej pracy. Eksport dyrektora generuje CSV
zgodny z parserem importu i zapisuje jedynie bezpieczne liczniki w audycie.
**Dlaczego:** operacje techniczne nie mogą zaciemniać wyszukiwania osób, a jeden
format ogranicza ręczne poprawki i ułatwia wykonanie kopii roboczej.

## ADR-029 — osobne, czasowe zaproszenie QR przypisane do roli

**Data:** 2026-07-26
**Decyzja:** kod QR jest osobnym, jednorazowym zaproszeniem `ROLE_QR`.
Dyrektor wybiera rolę i czas ważności, a zaproszona osoba dopiero na bezpiecznej
stronie wpisuje imię, nazwisko, e-mail, opcjonalny telefon i hasło. Rola zawsze
pochodzi z zaproszenia. Ta decyzja zastępuje część ADR-027 mówiącą, że QR jest
tym samym siedmiodniowym linkiem co zaproszenie e-mail.
**Dlaczego:** dyrektor może pokazać lub przekazać kod bez wcześniejszego
przepisywania danych, ale nadal kontroluje uprawnienia i czas dostępu.

## ADR-030 — reaktywacja zarchiwizowanego konta

**Data:** 2026-07-26
**Decyzja:** ponowne zaproszenie na e-mail zarchiwizowanego użytkownika tej
samej szkoły reaktywuje istniejący rekord, resetuje poświadczenie i sesje oraz
zachowuje identyfikator i historię. Aktywnego konta nie można zdublować.
**Dlaczego:** globalna unikalność e-mail pozostaje bezpieczna, a archiwizacja
nie blokuje legalnego powrotu do szkoły ani nie rozrywa wcześniejszych relacji.

## ADR-031 — zatwierdzane korekty kartotek wykładowcy

**Data:** 2026-07-26
**Decyzja:** dyrektor edytuje kartotekę bezpośrednio. Wykładowca może przesłać
propozycję dla przypisanej osoby lub grupy oraz sali; pełna nowa wartość trafia
do chronionej tabeli `RecordChangeRequest`, a audyt zawiera tylko nazwy
zmienionych pól. Dyrektor zatwierdza albo odrzuca propozycję w centrum
powiadomień.
**Dlaczego:** szkoła korzysta z wiedzy wykładowców bez oddania kontroli nad
danymi podstawowymi. Historia pokazuje autora i decyzję bez kopiowania danych
osobowych do logów.

## ADR-032 — Narzędzia tylko dla dyrektora

**Data:** 2026-07-26
**Decyzja:** import, eksport, stan bazy, publikacja i edytor strony są zebrane
w sekcji `Narzędzia`. Sekcja jest autoryzowana po stronie serwera wyłącznie dla
dyrektora. Sekrety połączenia z bazą nigdy nie są edytowane w UI.
**Dlaczego:** funkcje techniczne są łatwe do znalezienia, ale przypadkowa zmiana
hasła bazy w przeglądarce nie może odciąć całej szkoły od danych.

## ADR-033 — techniczny właściciel systemu ponad rolami szkoły

**Data:** 2026-07-26
**Decyzja:** jedna, nieprzydzielalna przez UI rola `SYSTEM_OWNER`, pokazywana
jako `Obsługa techniczna`, ma osobne centrum diagnostyczne. Pierwotny pełny
dostęp do danych biznesowych został ograniczony przez ADR-044.
Konto tworzy wyłącznie idempotentny skrypt z hasłem pobieranym z prywatnego
`.env`; każda instalacja unieważnia sesje, a MFA jest obowiązkowe. Konto nie
pojawia się w zaproszeniach, QR ani zwykłych kartotekach. Ta decyzja rozszerza
ADR-032: `SYSTEM_OWNER` dziedziczy narzędzia dyrektora.
**Dlaczego:** autor projektu potrzebuje legalnej ścieżki naprawy i diagnostyki,
ale ukryte konto z hasłem w kodzie byłoby furtką i nie dawałoby audytu.

## ADR-034 — dwie skale panelu przy wspólnym mobile-first

**Data:** 2026-07-26
**Decyzja:** interfejs codzienny nadal zaczyna się od 375 px, natomiast od
1280 px panel wykorzystuje do 1720 px szerokości i do 1420 px treści.
Formularze o złożonym wyniku, takie jak QR, dostają co najmniej 500 px i nie
dzielą linku oraz kodu na zbyt wąskie kolumny. Między 1051 a 1279 px przechodzą
w jeden czytelny stos.
**Dlaczego:** rodzice i uczniowie pracują głównie na telefonie, a dyrektor oraz
właściciel systemu potrzebują dużej przestrzeni roboczej na komputerze.

## ADR-035 — staging na VPS home.pl jako odrębny stos

**Data:** 2026-07-26
**Decyzja:** pełny staging działa na VPS Linux S lub lepszym z Ubuntu 24.04.
Docker Compose uruchamia osobne kontenery Next.js, PostgreSQL 17 i Caddy.
Baza i pliki używają nazwanych wolumenów, PostgreSQL nie publikuje portu, a
Caddy kończy HTTPS. Obecny hosting współdzielony nadal służy wyłącznie
statycznej stronie pokazowej.
**Dlaczego:** hosting FTP nie utrzyma procesu Node.js. Budowanie obrazu na VPS
usuwa też ryzyko przeniesienia zależności natywnych z macOS na Linux, a osobny
staging izoluje syntetyczne dane od przyszłej produkcji.

## ADR-036 — powtarzalny seed stagingu bez danych klientki

**Data:** 2026-07-26
**Decyzja:** pierwsza instalacja VPS po migracjach uruchamia idempotentny seed
SQL z ośmioma grupami, syntetycznymi uczniami, czterema kontami ról i trzema
salami. Konto `SYSTEM_OWNER` powstaje osobnym skryptem, a jego hasło nie jest
zapisywane w stałym środowisku kontenera.
**Dlaczego:** staging ma działać od pierwszego wejścia i dać się odtworzyć bez
kopiowania bazy z laptopa, danych widocznych na zrzutach ani danych dzieci.

## ADR-037 — tymczasowy test z Maca przez tunel wychodzący

**Data:** 2026-07-26
**Decyzja:** przed zakupem VPS klientka może testować izolowany build aplikacji
uruchomiony na Macu przez losowy Cloudflare Quick Tunnel HTTPS. Nie otwieramy
portu routera i nie używamy publicznego IP jako adresu logowania. Runtime,
logi, PID-y oraz plik przekazania trafiają wyłącznie do ignorowanego `.data`.
Tunel korzysta tylko z danych syntetycznych i jest ręcznie zatrzymywany po
teście.
**Dlaczego:** domowe łącze i NAT nie zapewniają stabilnego hostingu ani HTTPS,
natomiast tunel wychodzący pozwala wykonać krótki odbiór bez zmiany routera.
Losowy adres i brak SLA są akceptowalne wyłącznie dla tymczasowego testu.

## ADR-038 — lokalna bramka jakości przed każdym odbiorem klientki

**Data:** 2026-07-26
**Decyzja:** każda zmiana najpierw przechodzi komplet lokalnych testów,
następnie trafia do osobnego commita, a dopiero potem jest budowana na
tymczasowym serwerze Mac z dokładnie tego commita. Klientka dostaje link HTTPS
i konta syntetyczne dopiero po publicznym teście logowania, uprawnień i logów.
Jej uwagi rozpoczynają następny commit; nie poprawiamy kodu „w locie” na
działającym pokazie.
**Dlaczego:** zawsze wiadomo, którą wersję klientka ocenia, a błędny lub
nieukończony lokalny kod nie trafia do odbioru.

## ADR-039 — MFA dyrektora czasowo wyłączone w pilocie

**Data:** 2026-07-26
**Decyzja:** na czas odbioru na danych syntetycznych dyrektor loguje się bez
drugiego składnika. Konto `SYSTEM_OWNER` nadal zawsze wymaga MFA. Politykę
kontroluje `KLA_REQUIRE_DIRECTOR_MFA`; brak zmiennej oznacza bezpieczne
wymuszenie, a wartość `0` jest jawnym wyjątkiem pilota. Diagnostyka pokazuje
wyjątek jako ostrzeżenie. Przed prawdziwymi danymi ustawiamy wartość `1` i
ponownie przechodzimy test MFA.
**Dlaczego:** klientka ma szybciej testować bieżące funkcje bez zmiany danych
logowania, ale wyjątek nie może osłabić konta technicznego ani zostać
niezauważony przy przejściu na produkcję.

## ADR-040 — Asystent grafiku jako wymienny solver ograniczeń

**Data:** 2026-07-28
**Decyzja:** Etap 3 ma równorzędny tryb ręczny i automatyczny. Automat jest
nazywany `Asystentem układania grafiku`, tworzy wyłącznie szkic i nigdy nie
publikuje bez decyzji dyrektora. Twarde reguły obejmują salę, wykładowcę,
grupę, wspólnego ucznia, dostępność i pojemność. Preferencje dnia, godziny,
stabilnej sali oraz krótszych przerw wpływają na wynik, ale nie obchodzą reguł.
Pilot używa deterministycznej implementacji TypeScript za interfejsem
`ScheduleSolver`. Istniejące lekcje są stałe podczas kolejnego generowania.

**Dlaczego:** KLA ma niewielką liczbę grup, więc osobny serwis Java/Python
zwiększyłby koszt wdrożenia i awaryjność bez korzyści na tym etapie. Interfejs
pozwala później podłączyć Timefold lub OR-Tools, jeśli liczba zasobów i
złożoność preferencji uzasadnią zmianę.

## ADR-041 — grafik dostępny bez przeciągania

**Data:** 2026-07-28
**Decyzja:** dnd-kit jest skrótem dla dyrektora na desktopie. Każde dodanie i
przeniesienie ma formularz obsługiwany pojedynczym kliknięciem/dotykiem i
klawiaturą. Niedostępne zasoby są wyszarzone z tekstowym powodem, a serwer
sprawdza kolizję ponownie.

**Dlaczego:** przeciąganie nie jest wystarczającą ani dostępną jedyną metodą
obsługi, szczególnie na telefonie i dla użytkowników nietechnicznych.

## ADR-042 — zakres automatu i podgląd w dialogu

**Data:** 2026-07-28
**Decyzja:** dyrektor przed generowaniem wybiera zakres zasobów: całą szkołę,
jedną grupę, wykładowcę albo salę, a następnie daty od–do. Jedno żądanie
obejmuje maksymalnie osiem tygodni. Dla sali Asystent bierze grupy, które mają
ją ustawioną jako preferowaną, i nie używa w tej propozycji innych sal.
Wynik otwiera się w natywnym modalnym dialogu, który zatrzymuje fokus, obsługuje
`Escape`, działa jako pełny arkusz na telefonie i nie publikuje bez osobnego
potwierdzenia.

**Dlaczego:** dyrektor może poprawiać mały fragment planu bez ponownego
układania całej szkoły, a podgląd nie miesza się z długimi formularzami
konfiguracji. Limit chroni synchroniczny pilot przed zbyt długim obliczeniem;
większe okresy można układać partiami, a później przenieść do kolejki zadań.

## ADR-043 — lokalizacja jako nadrzędny zasób operacyjny

**Data:** 2026-07-28
**Decyzja:** każdy aktywny pokój i każda grupa należą dokładnie do jednej
lokalizacji szkoły. Grafik może łączyć grupę wyłącznie z salą z tej samej
lokalizacji. Dyrektor może przełączać kartoteki i plan między widokiem
„Wszystkie lokalizacje” a jednym oddziałem, a Asystent może generować zakres
całej szkoły lub pojedynczej lokalizacji. Zajęcia online są reprezentowane
lokalizacją z flagą `isOnline`, a nie wyjątkiem w nazwie sali. Import może
utworzyć brakującą lokalizację z kolumny `lokalizacja`; starszy plik bez tej
kolumny trafia do pierwszej aktywnej lokalizacji i wymaga późniejszego
sprawdzenia.

Lista lokalizacji na stronie marketingowej pozostaje treścią redakcyjną,
natomiast `Location` w bazie jest źródłem prawdy dla kartotek i grafiku.
Automatyczna synchronizacja obu list zostanie rozważona przy docelowym CMS.

**Dlaczego:** oddziały nie mogą być luźną etykietą, bo wtedy automat mógłby
przydzielić grupie fizycznie niedostępną salę. Osobny zasób daje spójne filtry,
bezpieczne reguły serwerowe oraz możliwość późniejszego dodania adresów,
koordynatorów i godzin pracy bez przebudowy grup i sal.

## ADR-044 — testowy host sprawdza aplikację razem z bazą

**Data:** 2026-07-28
**Decyzja:** testowy host na Macu udostępnia minimalny endpoint
`/api/health`, który zwraca sukces dopiero po odpowiedzi PostgreSQL. Przed
każdym pokazem stosuje migracje. Osobna usługa macOS sprawdza zdrowie co
30 sekund zarówno lokalnie, jak i przez publiczny tunel. Po trzech kolejnych
błędach restartuje właściwy element: aplikację albo tunel. Start usługi
podnosi również nazwaną lokalną bazę Prisma Dev, jeśli rzeczywiste zapytanie
`SELECT 1` nie przechodzi (samo otwarcie portu nie wystarcza).
Endpoint nie ujawnia wersji, błędu ani danych połączenia.

**Dlaczego:** sam `KeepAlive` wykrywa wyłącznie zakończony proces. Żywy proces
z błędem bazy albo stałym HTTP 500 mógł wcześniej pozostać formalnie
„uruchomiony”. Migracje i kontrola całego toru zapobiegają pokazowi nowego
commita na starej strukturze bazy.

## ADR-045 — wspólna blokada integralności grafiku

**Data:** 2026-08-03
**Decyzja:** wszystkie operacje, które mogą zmienić poprawność grafiku — zapis
i publikacja zajęć, import, archiwizacja zasobów, edycja grup i sal,
dostępność wykładowcy oraz wymagania Asystenta — używają tej samej blokady
transakcyjnej na szkołę. Zmiana danych wejściowych odrzuca gotowe, ale jeszcze
nieopublikowane propozycje Asystenta. Publikacja ponownie sprawdza aktywność,
lokalizację, pojemność, dostępność oraz kolizje każdego wpisu.

**Dlaczego:** sprawdzenie konfliktu tylko tuż przed zapisem lekcji nie chroni
przed równoległą zmianą sali, składu grupy albo dostępności. Jedna krótka
blokada na szkołę zamyka ten wyścig bez wprowadzania dodatkowego serwisu.

# 2026-07-28 — wspólny model nawigacji, Command Center i statystyki

- Start panelu dyrektora jest Command Center: zawiera plan całej szkoły,
  sprawy do decyzji i szybkie przejścia.
- Zaproszenia są częścią Kartotek, a dotychczasowe Powiadomienia częścią Startu.
- „Narzędzia” w interfejsie użytkownika nazywają się „Ustawienia”.
- Statystyki są osobnym modułem dyrektora. Rejestrują ścieżkę, czas i
  opcjonalnie konto, ale nie zapisują IP, urządzenia, treści ani parametrów URL.
- Zdarzenia statystyczne są przechowywane przez 90 dni.
- Wspólne reguły przyszłych modułów opisuje `docs/SYSTEM_UI.md`.

## ADR-046 — gotowość bazy i origin za zaufanym tunelem

**Data:** 2026-08-04
**Decyzja:** host testowy uznaje lokalną bazę za gotową dopiero po kilku
niezależnych zapytaniach SQL. Po uruchomieniu bazy aplikacja czeka na gotowość
SQL, a nie tylko na otwarty port. Pula połączeń aplikacji ma krótki czas
bezczynności, limit życia połączenia i TCP keepalive. Instalacja usług macOS
ponawia chwilowo odrzucone wywołanie `launchctl`.

Endpoint statystyk nadal wymaga żądania same-origin. Za tunelem wylicza
oczekiwany publiczny origin z pierwszych wartości `X-Forwarded-Host` i
`X-Forwarded-Proto`, ustawianych przez zaufaną warstwę Cloudflare. Obcy origin
oraz brak nagłówka pozostają odrzucane.

Proces Next.js współdzieli jednego klienta Prisma także między serwerowymi
chunkami produkcyjnego buildu. Pula ma domyślnie maksymalnie pięć połączeń;
wartość można zmienić przez `KLA_DATABASE_POOL_MAX`, ale jest ograniczona do
20. Lokalny serwer `prisma dev` na domyślnym porcie 51214 jest automatycznie
ograniczany do jednego połączenia, zgodnie z jego kontraktem. Dzięki temu wiele
równoległych fragmentów strony czeka w jednej kolejce zamiast mieszać odpowiedzi
protokołu albo przekraczać limit bazy.

**Dlaczego:** sam otwarty port nie gwarantował gotowości PostgreSQL, a stara
pula mogła zwrócić pojedynczy błąd po restarcie bazy. Produkcyjny podział
Next.js na chunki tworzył też więcej niż jedną pulę, podczas gdy lokalny
Prisma Postgres przyjmuje jedno połączenie naraz. Jednocześnie porównanie
origin z wewnętrznym adresem `127.0.0.1` błędnie blokowało prawidłowe zdarzenia
statystyczne przesłane przez publiczny HTTPS.

## ADR-047 — dziennik lekcji bez ujawniania składu grupy

**Data:** 2026-08-05
**Decyzja:** temat i obecność są edytowane z karty lekcji w jednym modalnym
oknie. Dyrektor może edytować każdą lekcję szkoły, a wykładowca tylko lekcję
grupy, do której jest przypisany. Ta sama centralna reguła uprawnień jest
sprawdzana na serwerze przed zapisem. Lista uczniów i statusy obecności są
dołączane do danych strony wyłącznie dla uprawnionego pracownika; rodzic i
uczeń nie dostają ich nawet jako ukryte dane klienta. Zapis tematu i obecności
jest atomowy, używa wersji lekcji i tworzy wpis audytu bez treści tematu oraz
bez nazwisk.

Formularz logowania deklaruje `method="post"`, mimo że właściwe logowanie
obsługuje JavaScript. Dzięki temu kliknięcie przed hydratacją albo awaria
skryptu nie umieszcza identyfikatora i hasła w adresie strony.

**Dlaczego:** wykładowca potrzebuje codziennej czynności w jednym dotknięciu,
ale wygoda nie może rozszerzać dostępu do innych grup. Awaryjne zachowanie
formularza także musi pozostać bezpieczne, nawet gdy kod klienta jeszcze nie
działa.

## ADR-048 — aliasy demo i jawny wyjątek wyłącznie dla danych syntetycznych

**Data:** 2026-08-05
**Decyzja:** konta demo mają krótkie aliasy `dyrektor`, `wykladowca`, `rodzic`,
`uczen` i `bog`. Na wyraźne żądanie właściciela łatwe hasła dopuszcza tylko
prywatna flaga `KLA_ALLOW_INSECURE_DEMO_CREDENTIALS=1`; wartość domyślna to
`0`, hasła nie trafiają do repozytorium, a właściciel nadal wymaga MFA.
**Dlaczego:** upraszcza bieżący odbiór na syntetycznych danych, nie zmieniając
bezpiecznej wartości domyślnej ani wymagań produkcyjnych.

## ADR-049 — szczegółowa analityka bez pełnego IP

**Data:** 2026-08-05
**Decyzja:** szczegóły strony pokazują liczbę odsłon, role, godziny i zakres
czasu. Nie zapisujemy pełnego IP, dokładnej lokalizacji ani surowego
User-Agent. Anonimowa odsłona wymaga jednoznacznego sluga szkoły.
**Dlaczego:** daje dyrektorowi użyteczną diagnostykę bez nieproporcjonalnego
profilowania dzieci i rodziców.

## ADR-050 — import uzupełniający i przyszła bezpieczna synchronizacja

**Data:** 2026-08-05
**Decyzja:** obecny import oznacza „uzupełnij i zaktualizuj”. Przyszły tryb
„synchronizuj z plikiem” najpierw pokaże różnice, a brakujące rekordy wyłącznie
zarchiwizuje po dodatkowym potwierdzeniu.
**Dlaczego:** słowo „zastąp” sugerowałoby niebezpieczne usuwanie historii.

## ADR-051 — dwie ścieżki umowy i minimalny dostęp do danych rodzin

**Data:** 2026-08-09
**Decyzja:** dyrektor wybiera dla każdej umowy jeden z dwóch trybów:
akceptację w eDzienniku w formie dokumentowej albo wyłącznie udostępnienie PDF
do podpisu poza systemem. Umowa odpłatna pokazuje bezpośrednio przed decyzją
zakres usługi, cenę i jednoznaczny przycisk „Zamówienie z obowiązkiem
zapłaty”. System zapisuje dokładny tekst oświadczenia, wersję, skrót PDF oraz
czas i pozwala pobrać potwierdzenie. Akceptacja nie jest nazywana
kwalifikowanym podpisem elektronicznym.

Treść umów i płatności widzi wyłącznie dyrektor oraz właściwy rodzic.
Wykładowca, uczeń i obsługa techniczna nie otrzymują tych danych. Dostęp
serwisowy do danych biznesowych może powstać później wyłącznie jako czasowy,
uzasadniony i audytowany mechanizm break-glass.

**Dlaczego:** diagnostyka nie jest podstawą do stałego dostępu do prywatnych
danych rodzin. Forma dokumentowa pozwala utrwalić oświadczenie i ustalić
osobę, ale nie zastępuje formy pisemnej, gdy wymaga jej prawo lub umowa.
Rozdzielenie trybów zapobiega obiecywaniu skutku prawnego, którego system nie
zapewnia.

## ADR-052 — płatność wynika z niezmiennej wersji umowy

**Data:** 2026-08-09
**Decyzja:** nazwa umowy, zakres usługi, kwota, tytuł i termin płatności są
zapisywane w `ContractVersion`, czyli dokładnie w wersji PDF przekazanej
rodzicowi. `PaymentRecord` jest połączony z konkretnym przypisaniem umowy i
przechowuje wyłącznie administracyjny status oraz krótką notatkę. Dyrektor może
zmienić status bezpośrednio; zmiana ceny, terminu albo zakresu zawsze tworzy
nową wersję umowy i wymaga ponownego przekazania jej rodzicowi. Przed akceptacją
system pokazuje „Czeka na akceptację”, a nie zaległość. Po terminie używa
określenia „Po terminie”, nie prawnego pojęcia „przedawniona”.

Lista umów i rozliczeń dyrektora jest grupowana według rodziców. Duże okna
robocze można przeciągać i skalować na komputerze; na telefonie zajmują cały
ekran i nie wymagają precyzyjnego chwytania krawędzi.

**Dlaczego:** warunków zaakceptowanej umowy nie wolno nadpisywać późniejszą
edycją statusu. Rozdzielenie źródła zobowiązania od operacyjnego rozliczenia
zapewnia czytelny audyt i nie sugeruje zaległości przed zawarciem umowy.

## ADR-053 — komunikator grupowy z audytowanym dostępem dyrektora

**Data:** 2026-08-09
**Decyzja:** jedna grupa ma jeden służbowy kanał. Wykładowca widzi tylko
przypisane grupy, rodzic grupy powiązanych dzieci, a uczeń własne grupy.
Dyrektor widzi metadane kanałów i wysyła ogłoszenia, lecz treść rozmowy otwiera
na 15 minut dopiero po wskazaniu celu oraz konkretnego uzasadnienia. Otwarcie
tworzy wpis audytu bez treści wiadomości. Właściciel techniczny nie ma dostępu
do treści. Wiadomości są append-only w pilocie.

Powiadomienia e-mail używają trwałego outboxu w PostgreSQL, osobnego rekordu na
odbiorcę, klucza idempotencji i maksymalnie pięciu prób z ograniczonym
wykładniczym odstępem. Brak skonfigurowanego dostawcy jest widocznym błędem
kolejki, a nie fałszywym sukcesem. Widok odświeża się co 15 sekund tylko przy
widocznej karcie; późniejszy realtime zachowa ten sam kontrakt modułu.

**Dlaczego:** komunikacja grupowa musi być prosta, ale nie może tworzyć
ukrytego nadzoru ani rozszerzać dostępu technicznego do rozmów rodzin. Outbox
oddziela zapis wiadomości od zawodnej usługi zewnętrznej i umożliwia bezpieczne
ponowienie bez podwójnej wysyłki.

## ADR-054 — centrum uwagi, potwierdzenia i brak pozorowanej integracji Meta

**Data:** 2026-08-09
**Decyzja:** wszystkie role mają jedno centrum powiadomień. Zdarzenia są
wyliczane z właściwych źródeł biznesowych (wiadomość, umowa, wersja umowy,
status płatności albo wniosek o zmianę), a użytkownik zapisuje wyłącznie swój
stan „przeczytane” lub „przypomnij jutro”. Powiadomienie nie tworzy drugiej
kopii kwoty, terminu ani treści wiadomości.

Świadome potwierdzenie ogłoszenia jest osobne od automatycznego znacznika
odczytu. Załączniki komunikatora są prywatne, ograniczone do PDF/JPG/PNG,
sprawdzane po sygnaturze pliku i pobierane po ponownej autoryzacji członkostwa
w grupie. Skład rozmowy wynika wyłącznie z kartoteki grupy.

Nie oznaczamy integracji Facebook Messenger jako gotowej. Nie traktujemy
Messenger Platform jako ogólnego interfejsu do istniejących prywatnych czatów
grupowych. Ewentualny konektor powstanie osobno dopiero po weryfikacji
aktualnych uprawnień aplikacji, przeglądzie Meta, podstawie prawnej, retencji i
zgodzie szkoły na transfer danych do dostawcy.

**Dlaczego:** centrum powiadomień ma kierować do jednego źródła prawdy, a nie
duplikować dane. Potwierdzenie musi oznaczać świadome działanie. Pozorowany
przycisk „Połącz Messenger” tworzyłby fałszywą obietnicę i ryzyko ujawnienia
danych uczniów poza kontrolowanym kanałem szkoły.

## ADR-055 — dwustopniowy zrzut, granatowy tryb ciemny i powtarzalne demo

**Data:** 2026-08-09

- Zrzut problemu jest uzbrajany w formularzu, ale wykonywany dopiero z małej
  ikony po przejściu do miejsca błędu. Formularz nie może zasłaniać zrzutu.
- Motyw ciemny jest wariantem istniejących tokenów KLA, zapamiętywanym lokalnie;
  nie tworzy osobnego zestawu komponentów.
- Seed demonstracyjny jest idempotentny i zawiera syntetyczne grupy, rodziców,
  wykładowców, lekcje z historią obecności, rozmowy, umowy i różne stany
  płatności. Uruchomienie hosta uzupełnia seed przed zbudowaniem commita.
- Pliki `.command` są prostą, lokalną warstwą obsługi nad istniejącym
  launchd/watchdog. Nie zastępują mechanizmu nadzoru.

## ADR-056 — bezpośredni, jawny wgląd dyrektora i rozmowy z wybranymi osobami

**Data:** 2026-08-09
**Decyzja:** dyrektor może otworzyć treść służbowej rozmowy bez każdorazowego
wpisywania celu i uzasadnienia. System automatycznie zapisuje w audycie kto,
kiedy i którą rozmowę otworzył, bez kopiowania jej treści do logu. Każda rola
widzi stałą, krótką informację, że dyrektor ma wgląd w komunikację służbową.
Niniejsza decyzja zastępuje wymóg ręcznego formularza z ADR-053; pozostałe
zasady jawności i audytu nadal obowiązują.

Oprócz kanałów grupowych istnieją rozmowy z wybranymi osobami. Ich skład ustala
dyrektor. Uczestnik widzi rozmowę tylko wtedy, gdy został do niej jawnie dodany;
wykładowca nie może sam rozszerzyć składu ani uzyskać dostępu do nieprzypisanej
grupy. Powiadomienia i załączniki korzystają z tej samej centralnej kontroli
członkostwa.

**Dlaczego:** szybki dostęp operacyjny dyrektora nie powinien wymagać pozornego
formularza, ale nadal musi być przejrzysty i rozliczalny. Osobne członkostwo
rozmowy zapobiega ujawnieniu prywatnej wiadomości całej grupie.

Build wydaniowy Next.js używa jawnie Webpacka. Turbopack pozostaje narzędziem
developerskim, ale w środowisku pakowania próbował uruchamiać pomocniczy proces
nasłuchujący na porcie i uniemożliwiał powtarzalne zbudowanie paczki. Zmiana nie
wpływa na kod ani hosting aplikacji; daje ten sam produkcyjny wynik Next.js.

## ADR-061 — kalendarz jako domyślny grafik i kolory lokalizacji

**Data:** 2026-08-22
**Decyzja:** wejście „Otwórz grafik” prowadzi bezpośrednio do kalendarza
tygodniowego. Asystent automatyczny pozostaje osobnym, świadomie wybranym
trybem. Każda lokalizacja otrzymuje stabilny kolor wyliczany z jej identyfikatora,
a grupa, lokalizacja, sala i wykładowca są dodatkowo oznaczone ikoną i tekstem.

**Dlaczego:** dyrektor najczęściej chce najpierw zobaczyć faktyczny plan.
Kolor przyspiesza skanowanie, lecz nie jest jedynym nośnikiem informacji, dzięki
czemu grafik pozostaje czytelny dla osób nierozróżniających barw.

## ADR-062 — jawne granice Meta i wymienne miejsca kopii

**Data:** 2026-08-22
**Decyzja:** rezygnujemy z integracji API Meta. Po wycofaniu Groups API Meta
nie udostępnia wspieranej drogi automatycznej wysyłki do zwykłych grup.
Dyrektor otrzymuje wyłącznie skrót otwierający Messenger w osobnej karcie;
eDziennik nie przekazuje tam danych ani tokenów.

Kopie zapasowe otrzymają wymienne adaptery: prywatny folder, zamontowany dysk
lub NAS oraz SFTP. Zwykłe FTP nie jest dopuszczone dla produkcyjnych danych.
Obecny ekran jest planem konfiguracji, a nie pozorowanym przełącznikiem usługi.
Aktywacja w przyszłym etapie wymaga szyfrowania, audytu, alarmów i skutecznego
testu odtworzenia.

## ADR-063 — podpisany skan jako kontrolowany tryb umowy

**Data:** 2026-08-22
**Decyzja:** obok akceptacji w formie dokumentowej dyrektor może wybrać tryb
„wydruk, podpis odręczny i wgranie”. Rodzic pobiera niezmienny PDF, podpisuje
cały egzemplarz i wgrywa PDF/JPG/PNG. Dokument otrzymuje stan „Podpis do
sprawdzenia”; dopiero dyrektor zatwierdza zgodność albo prosi o ponowne wgranie.
Każdy odczyt, upload, skrót pliku i decyzja są audytowane.

Wgrany skan jest dowodem i kopią roboczą w formie dokumentowej; sam skan nie
jest nazywany kwalifikowanym podpisem elektronicznym ani automatycznie
równoważnym oryginałowi papierowemu. Oryginał należy zachować, jeżeli umowa lub
przepis wymaga formy pisemnej. Kod SMS pozostaje poza pilotem: może wspierać
identyfikację i dowód działania, lecz bez kwalifikowanej usługi nie zastępuje
podpisu własnoręcznego.

**Dlaczego:** proces jest prosty dla rodzica, zachowuje dokładną wersję umowy i
nie przypisuje zwykłemu SMS-owi ani skanowi skutku podpisu kwalifikowanego.

## ADR-064 — przedwydaniowa bramka bezpieczeństwa i odwracalne aktualizacje

**Data:** 2026-08-22
**Decyzja:** CI sprawdza testy, typy, sekrety, ryzykowne migracje, podatności
produkcyjnych zależności, build i składnię skryptów wdrożeniowych. Nowe migracje
mają być rozszerzające i zgodne ze starą wersją aplikacji. Aktualizatory budują
nową wersję obok działającej, tworzą kopię, przełączają usługę dopiero po
przygotowaniu i automatycznie cofają kod po nieudanym teście zdrowia. Paczki
otrzymują sumę SHA-256.

**Dlaczego:** samo odtworzenie starego kodu nie cofnie bezpiecznie destrukcyjnej
migracji bazy. Połączenie reguły expand–migrate–contract, kopii i testu zdrowia
ogranicza ryzyko utraty danych oraz przestoju.

## ADR-065 — ścisły CSP panelu i brak pozorowanego demo

**Data:** 2026-08-22
**Decyzja:** chronione i wrażliwe trasy panelu otrzymują CSP z jednorazowym
nonce, bez `unsafe-inline` dla skryptów w produkcji. Inicjalizacja motywu jest
zewnętrznym, statycznym skryptem bez danych użytkownika. Dawny ekran
`/panel/demo` przekierowuje w pełnej aplikacji do prawdziwego panelu; pozostaje
jedynie elementem odrębnego statycznego pokazu FTP.

**Dlaczego:** CSP ogranicza skutki wstrzyknięcia skryptu, a nieaktywny ekran z
pozorowanymi przyciskami nie może być mylony z wdrożonym modułem.

## ADR-066 — kontrolowana poprawka zależności Prisma

**Data:** 2026-08-22
**Decyzja:** podatna zależność pośrednia `deepmerge-ts` używana przez narzędzia
Prisma jest przypięta przez `overrides` do poprawionej wersji 8.0.2. CI wykonuje
`npm audit --omit=dev`, a Dependabot przygotowuje małe, cykliczne aktualizacje.

**Dlaczego:** czekanie na wydanie zależności nadrzędnej pozostawiałoby znaną
podatność w drzewie produkcyjnym. Każda aktualizacja nadal przechodzi pełne
testy i build przed przyjęciem.

## ADR-067 — pakiet dokumentów klientki i harmonogram rat

**Data:** 2026-08-22
**Decyzja:** źródłem treści prawnej pozostają niezmienne PDF-y przygotowane
przez szkołę. Rodzic otrzymuje jeden pakiet z trzema pozycjami: umową i
informacjami RODO,
właściwym cennikiem lub kosztorysem oraz harmonogramem zajęć. System nie wymaga
ponownego przepisywania okresu zajęć, wypowiedzenia ani treści RODO. Osobno
zapisuje tylko liczbę rat, kwotę jednej raty, kwotę całkowitą i terminy, bo te
dane służą do listy rozliczeń i przypomnień. Gotowy wariant można przypisać
kolejnej rodzinie bez ponownego wgrywania plików.

Każdy dokument ma prywatny plik i osobny, trwały zapis odczytu. Serwer odmawia
akceptacji do czasu otwarcia wszystkich wymaganych pozycji, a oświadczenie
odnosi się do skrótu całego pakietu. Dla trybu podpisu odręcznego podpisywana i ponownie
wgrywana jest umowa; cennik i harmonogram są załącznikami do świadomego wglądu.

**Dlaczego:** odpowiada to rzeczywistemu procesowi szkoły, usuwa pracę
powtarzaną przy około 200 uczniach i nie pozwala, aby dane pomocnicze w panelu
rozjechały się z treścią PDF.

## ADR-068 — wymagania prawne pokazane jako mapa procesu KLA

**Data:** 2026-08-22
**Decyzja:** pomoc prawna nie używa ogólnych, niepewnych komunikatów. Pokazuje
wprost, jak proces KLA realizuje art. 77² i 77³ Kodeksu cywilnego, art. 12,
17 i przepisy o odstąpieniu z ustawy o prawach konsumenta oraz art. 5, 13 i 32
RODO. Jednocześnie nie przypisuje kliknięciu skutku podpisu własnoręcznego ani
kwalifikowanego. Treść zatwierdzonego wzoru szkoły pozostaje w PDF, a system
odpowiada za jego niezmienność, komplet kroków i dowód oświadczenia.

**Dlaczego:** dyrektor i rodzic potrzebują pewnej instrukcji dopasowanej do
kursów języka angielskiego, ale interfejs nie może składać fałszywej obietnicy,
że mechanizm techniczny naprawi brak wymaganej informacji w źródłowym PDF.

## ADR-069 — dzienna dostępność i rozdzielenie przybycia od obecności

**Data:** 2026-08-22
**Decyzja:** wykładowca ustawia osobne godziny dostępności dla każdego dnia
tygodnia. Grafik i asystent uznają termin za poprawny tylko wtedy, gdy cała
lekcja mieści się w oknie wskazanego dnia. Każda lekcja otwiera jeden wspólny
widok szczegółów: dyrektor i przypisany wykładowca wpisują temat oraz oficjalną
obecność, rodzic odczytuje dane swoich dzieci, a uczeń odczytuje własne dane i
może potwierdzić przybycie od 30 minut przed zajęciami do 15 minut po nich.
Potwierdzenie ucznia jest osobnym, audytowanym zapisem i nigdy nie zastępuje
obecności wpisanej przez szkołę.

Przed pełnymi powiadomieniami push aplikacja pokazuje przypomnienie w centrum
powiadomień i pozwala pobrać prywatny plik kalendarza z alarmem 30 minut przed
lekcją. Powiadomienia działające w tle po zamknięciu strony wymagają zgody
urządzenia i infrastruktury PWA/VAPID w kolejnym etapie.

**Dlaczego:** różne dni pracy wykładowcy nie mogą być spłaszczane do jednych
godzin. Rozdzielenie samodzielnego check-inu od dokumentacji szkoły zapobiega
sytuacji, w której uczeń sam ustala oficjalną frekwencję, a kalendarz telefonu
daje proste i niezawodne przypomnienie bez pozorowania niewdrożonej funkcji.

## ADR-070 — graf relacji kartotek i preferencje uczniów

**Data:** 2026-08-22
**Decyzja:** rodzic jest łączony z dziećmi, a uczeń i wykładowca z grupami.
Grupa przechowuje swój skład, prowadzących i preferowaną salę. Sala nie ma
osobnych przypisań osób: jej uczniowie i wykładowcy zawsze wynikają z grup oraz
konkretnych lekcji. Dyrektor zapisuje relacje bezpośrednio, a wykładowca
proponuje zmianę wyłącznie w swoim zakresie; propozycja wymaga zatwierdzenia.

Każdy uczeń może mieć osobne okno preferowanych godzin dla każdego dnia.
Generator odrzuca terminy poza dostępnością któregokolwiek ucznia grupy i
premiuje terminy wspólne. Brak ustawień ucznia oznacza brak dodatkowego
ograniczenia. Zmiana relacji lub dostępności unieważnia nieopublikowany szkic
grafiku i zapisuje się w audycie.

**Dlaczego:** jedno źródło prawdy zapobiega rozjechaniu kartotek, grafiku,
obecności i komunikacji, a codzienna czynność pozostaje prosta: najpierw grupa,
potem jej osoby i preferowana sala.

## ADR-071 — Cloudflare nie przekształca HTML panelu

**Data:** 2026-08-22
**Decyzja:** prywatne odpowiedzi `/panel/*` mają nagłówek
`Cache-Control: private, no-store, no-transform, max-age=0`. Dyrektywa
`no-transform` blokuje modyfikowanie adresów e-mail w HTML przez warstwę
pośrednią. Statyczne zasoby Next.js zachowują własne reguły cache.

**Dlaczego:** automatyczne maskowanie e-maili przez Cloudflare zmieniało drzewo
dokumentu przed uruchomieniem Reacta i powodowało błąd hydratacji przy
bezpośrednim otwarciu kartotek.

## ADR-072 — postęp opisowy zamiast predykcji zachowania dziecka

**Data:** 2026-08-25
**Decyzja:** Etap 6 zapisuje obserwacje sześciu umiejętności językowych w skali
1–5, autora, czas, opcjonalną lekcję i opis następnego kroku. Interfejs może
pokazać historyczny trend i frekwencję jako kontekst. Nie tworzy rankingu,
diagnozy, profilu psychologicznego ani automatycznej predykcji zachowania lub
wyniku ucznia. Dostęp rodzica i ucznia pozostaje ograniczony do powiązanej
osoby, a wykładowcy do aktywnie przypisanych grup.

**Dlaczego:** szkoła potrzebuje użytecznej informacji o rozwoju, lecz mała
liczba obserwacji nie daje rzetelnej podstawy do predykcji. Dane dzieci i
decyzje pedagogiczne wymagają minimalizacji, wyjaśnialności i udziału człowieka.

## ADR-073 — dwa odtwarzalne stany bazy demonstracyjnej

**Data:** 2026-08-25
**Decyzja:** środowisko demo ma tryb `clean` (konta ról, lokalizacje i puste
kartoteki) oraz `rich` (syntetyczne dane potrzebne do testu całej aplikacji).
Reset jest możliwy tylko po jawnym potwierdzeniu i gdy wszystkie szkoły oraz
e-maile spełniają warunki danych demonstracyjnych. Przed usunięciem zawsze
powstaje szyfrowany snapshot bazy i prywatnych plików. Klucz odzyskiwania jest
przechowywany oddzielnie od snapshotu i repozytorium.

**Dlaczego:** klientka musi móc powtarzać odbiór od zera oraz wrócić do bogatego
demo bez ręcznego odtwarzania danych. Twarda blokada zapobiega przypadkowemu
uruchomieniu destrukcyjnej komendy na produkcji.

## ADR-074 — materiały, zadania i pliki jako osobne rekordy domenowe

**Data:** 2026-08-25
**Decyzja:** materiał i zadanie należą do grupy, a oddanie do zadania i ucznia.
Prywatny plik jest opcjonalnym rekordem `StoredFile`, nigdy publicznym URL-em.
Stany oddania są jawne: nieotwarte, otwarte, oddane, spóźnione i sprawdzone.
Informacja zwrotna ma autora i czas. Reguły dostępu są takie same dla listy,
zapisu i pobrania pliku.

**Dlaczego:** jednoznaczny model zapobiega mieszaniu treści grupy z prywatną
pracą ucznia, pozwala prowadzić audyt i później zmienić lokalny magazyn na
S3-compatible bez przebudowy modułu nauki.

## ADR-075 — Raspberry: lokalne demo jest osobnym profilem od produkcji

**Data:** 2026-08-26
**Decyzja:** instalator Raspberry ma dwa jawne profile. `--local-demo` zakłada
nowy szyfrowany sejf LUKS2, czystą bazę i wyłącznie syntetyczne dane odbiorowe.
nginx udostępnia go na porcie 8080 tylko z prywatnych zakresów sieciowych,
bez tunelu i bez MFA dyrektora. Profil produkcyjny zachowuje origin na
`127.0.0.1`, wymaga adresu HTTPS oraz tokenu Cloudflare Tunnel i egzekwuje MFA
dyrektora. Zmiana lokalnego adresu jest obsługiwana tylko przez `kla-local-url`,
który aktualizuje konfigurację i przebudowuje aplikację.

**Dlaczego:** testowanie na telefonie w tej samej sieci ma być dostępne dla
osoby nietechnicznej, ale HTTP i dynamiczne IP nie spełniają wymagań dla
prawdziwych danych dzieci, dokumentów ani produkcyjnej sesji. Rozdzielenie
profili usuwa ryzyko przypadkowego zamienienia wygodnego demo w serwer szkoły.

## ADR-076 — istniejący dysk APFS nie jest zmniejszany przez Raspberry

**Data:** 2026-08-26
**Decyzja:** instalator publicznego demo nigdy nie zmienia rozmiaru istniejącej
partycji APFS ani nie formatuje całego dysku. Miejsce wydziela się wcześniej na
Macu jako osobną partycję `KLA_DATA` o rozmiarze co najmniej 40 GiB. Raspberry
odmawia użycia partycji systemowej, zamontowanej albo bez tej etykiety i po
dokładnym potwierdzeniu szyfruje wyłącznie wskazaną nową partycję LUKS2.

**Dlaczego:** Linux nie zapewnia wspieranego, bezpiecznego zmniejszania APFS.
Twarde rozdzielenie operacji zachowuje istniejące dane użytkownika i ogranicza
destrukcyjną operację do jednoznacznie przygotowanej, pustej partycji.

## ADR-077 — konserwatywny profil serwera dla Raspberry Pi 4

**Data:** 2026-08-26
**Decyzja:** instalator dobiera ograniczenia Node.js, PostgreSQL, ClamAV,
systemd i dziennika systemowego do wykrytej pamięci urządzenia. Dla Pi 4 z
4 GiB RAM aplikacja ma twardy limit pamięci, PostgreSQL używa umiarkowanych
buforów, a logi mają limit miejsca i czasu. Dane PostgreSQL otrzymują sumy
kontrolne, zaszyfrowany wolumin jest montowany bez aktualizacji czasu odczytu,
SSH jest dostępne wyłącznie z sieci prywatnych, a urządzenie zachowuje domyślne
taktowanie i chłodzenie producenta.

**Dlaczego:** profil ma zapewnić przewidywalną pracę 24/7 bez ryzykownego
podkręcania, wyczerpania pamięci albo karty systemowej przez logi. Parametry
można ponownie bezpiecznie zastosować poleceniem `kla-optimize-server` po
zmianie pamięci lub wersji PostgreSQL.

## ADR-078 — pierwsze konto wyłącznie przez zamknięty bootstrap

**Data:** 2026-08-26
**Status:** zastąpiona częściowo przez ADR-079 w zakresie aktywacji e-mail
**Decyzja:** czysta instalacja nie zawiera szkoły, kont ani danych startowych.
Jedyny publiczny kreator pierwszego uruchomienia wymaga losowego kodu, którego
serwer przechowuje wyłącznie jako SHA-256. Założenie szkoły, konta właściciela i
poświadczenia odbywa się atomowo pod blokadą bazy. Konto wymaga potwierdzenia
rzeczywistego e-maila, a przed dostępem do panelu obowiązkowo konfiguruje TOTP i
kody awaryjne. Kreator zamyka się po aktywacji. Pozostałe role powstają tylko
przez zaproszenia; `SYSTEM_OWNER` nigdy nie jest rolą zapraszalną.

**Dlaczego:** otwarta rejestracja pustej instancji pozwoliłaby pierwszej osobie
z Internetu przejąć serwer. Fabryczne konto lub hasło byłoby powtarzalnym
sekretem. Jednorazowy bootstrap zachowuje prosty onboarding, a jednocześnie
wiąże najwyższe uprawnienia z kontrolowanym adresem i drugim składnikiem.
# ADR-079 — Pierwszy właściciel nie wymaga gotowego serwera poczty

**Data:** 2026-08-26
**Status:** przyjęta

W czystej instalacji jednorazowy kod bootstrap potwierdza kontrolę nad
Raspberry Pi i może aktywować wyłącznie pierwsze konto `SYSTEM_OWNER` bez
wysyłki e-mail. MFA nadal jest obowiązkowe po pierwszym logowaniu. Brak SMTP
lub Resend jest wyraźnie pokazywany i blokuje funkcje zależne od poczty, ale nie
blokuje uruchomienia serwera. Jeśli dostawca jest skonfigurowany, zachowujemy
standardową aktywację linkiem e-mail. Decyzja nie dotyczy kont tworzonych z
zaproszeń.

## ADR-080 — Wielowarstwowa samonaprawa Raspberry bez przechowywania klucza LUKS

**Data:** 2026-08-26
**Status:** przyjęta

Każda usługa serwera ma własną politykę restartu systemd. Niezależny test co
minutę sprawdza PostgreSQL, aplikację wraz z bazą, nginx, ClamAV oraz gotowość
Cloudflare Tunnel i wykonuje najwyżej jeden restart niesprawnego elementu.
Sprzętowy watchdog Raspberry restartuje całe urządzenie, gdy system przestanie
odpowiadać. Panel na Macu odnajduje serwer ponownie po zmianie lokalnego IP.

Klucz odblokowujący LUKS nie jest przechowywany na tym samym Raspberry. Po
pełnym zaniku zasilania właściciel ręcznie odblokowuje sejf z panelu na Macu.
Automatyczne odblokowanie kluczem zapisanym obok zaszyfrowanych danych
zniwelowałoby ochronę dysku w przypadku kradzieży urządzenia.

## ADR-081 — Właściciel systemu dziedziczy uprawnienia dyrektora

**Data:** 2026-08-26
**Status:** przyjęta; zastępuje ograniczenie opisane w ADR-033

Jedyny `SYSTEM_OWNER` ma wszystkie możliwości dyrektora w swojej instalacji
oraz dodatkowe centrum diagnostyczne. Obejmuje to zaproszenia, kartoteki,
grafik, wiadomości, naukę, postępy, umowy, płatności, powiadomienia, ustawienia
i statystyki. Operacje nadal są ograniczane do `schoolId`, przechodzą normalne
reguły integralności i tworzą wpisy audytu. MFA pozostaje obowiązkowe, a roli
nie można nadać przez zaproszenie ani edycję kartoteki.

**Dlaczego:** właściciel pierwszej, samodzielnie utrzymywanej instalacji musi
móc uruchomić szkołę od pustej bazy i zaprosić pierwszego dyrektora. Osobne
blokady `SYSTEM_OWNER` w modułach tworzyły niespójny interfejs: centrum systemu
pokazywało akcję, którą docelowa strona odrzucała.

## ADR-082 — Konfigurowalne kanały operacyjne i fizyczny nośnik backupu

**Data:** 2026-08-27
**Status:** przyjęta

Poczta wychodząca jest konfigurowana w centrum właściciela przez SMTP albo
Resend, a zgłoszenia błędów domyślnie trafiają do opiekuna technicznego.
Bezpłatnym adapterem SMS pilota jest otwarty SMS Gateway for Android; szkoła
używa własnego telefonu i karty SIM, więc aplikacja nie obiecuje bezpłatnych
wiadomości u operatora. Brak konfiguracji kanału nie blokuje podstawowych
operacji — kolejka zapisuje kontrolowany błąd i pozwala ponowić wysyłkę.

Backup z panelu nie przyjmuje dowolnej ścieżki tekstowej. Właściciel wybiera
wyłącznie zamontowany nośnik USB wykryty przez system pod `/media` albo `/mnt`.
Skrypt nie formatuje urządzenia, sprawdza możliwość zapisu, szyfruje kopię,
zapisuje sumę kontrolną i wykonuje test odtworzenia. Dysk będący głównym sejfem
danych nie może równocześnie stanowić jedynej kopii zapasowej.

**Dlaczego:** konfiguracja musi być wykonalna przez osobę nietechniczną, ale
nie może umożliwiać wysłania sekretów do przypadkowej usługi ani pozorować
backupu przez kopiowanie pliku na ten sam uszkadzalny nośnik.
