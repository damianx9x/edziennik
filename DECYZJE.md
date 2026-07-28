# Decyzje architektoniczne

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
określa `ZAKRES_STARTOWY.md`; funkcje zaawansowane pozostają po pilocie.

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
jako `Bóg`, ma pełny dostęp między szkołami oraz osobne centrum diagnostyczne.
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
