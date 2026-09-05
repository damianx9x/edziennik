# eDziennik KLA — zakres i etapy produktu

Stan produktu na 4 września 2026. Etapy 0–6 tworzą sprawdzony technicznie
zakres pilota, a Etap 7 obejmuje odbiór przedprodukcyjny i przygotowanie
operacyjne.

## Zakres produktu

eDziennik KLA jest systemem dla niewielkiej prywatnej szkoły języka
angielskiego. Priorytetem jest grafik oparty na sali, wykładowcy i grupie.
Zakres obejmuje także kartoteki i relacje rodzinne, umowy oraz raty,
komunikację, materiały, zadania, obecność i opisowe postępy ucznia. Aktualny
podział odpowiedzialności opisuje `docs/FUNKCJE_I_ROLE.md`.

Wydanie pozostaje przedprodukcyjne do czasu zakończenia odbioru bezpieczeństwa,
konfiguracji retencji, procedur RODO, SMTP, zewnętrznej kopii oraz testu
odtworzenia w środowisku docelowym. Podpis kwalifikowany, płatności internetowe
i bramka SMS są możliwymi rozszerzeniami, a nie ukrytymi obietnicami bieżącej
wersji.

## Najważniejsze decyzje zakresowe

1. Pilot nie jest automatycznie zgodą na użycie prawdziwych danych.
2. Better Auth zapewnia gotowe TOTP 2FA dyrektora.
3. Natywny Next.js Node i PostgreSQL obsługują logikę serwerową aplikacji.
4. PWA korzysta ze standardów Next.js i nie cache’uje prywatnych ekranów.
5. Podstawy przetwarzania i retencja są ustalane osobno dla rodzaju danych.
6. Wgląd dyrektora to jawny, audytowany komunikator służbowy, nie ukryte DW.

## Historia etapów

### Etap 0 — fundament (25–27 lipca)

- Git, zasady pracy i dokumentacja,
- Next.js + TypeScript + Tailwind,
- PostgreSQL/Prisma i centralne uprawnienia,
- responsywna strona oraz brama Uczeń/Rodzic/Szkoła,
- instalator, CI, kontrola sekretów i paczka wdrożeniowa.

Odbiór: strona i trzy kafle działają na telefonie i komputerze; build/testy
przechodzą.

### Etap 0.5 — marka i feedback (25 lipca)

- personalizacja King’s Language Academy na podstawie oficjalnego profilu,
- prawdziwe logo, zweryfikowana oferta, lokalizacje i kontakt,
- realne nazwy grup oraz wyłącznie syntetyczni uczniowie demo,
- panel demonstracyjny dyrektora,
- dostępne z każdej roli zgłaszanie problemu,
- zrzut za zgodą, instrukcje platform i eksport bezpiecznej diagnostyki,
- model `FeedbackReport` gotowy do podłączenia po logowaniu.

### Etap 0.6 — zdjęcia, system UI i zakres startowy (25–27 lipca)

- dostępny slider z zatwierdzonymi zdjęciami szkoły,
- spokojniejszy system wizualny bez przypadkowych ozdobników,
- centrum umów, wiadomości, płatności i zadań w panelu demo,
- architektura plików, kolejki i przyszłego dostawcy podpisu,
- zatwierdzony zakres startowy oraz kryteria odbioru.

### Etap 0.7 — publiczne demo na domenie (25–27 lipca)

- główna domena `kingslanguageacademy.pl`,
- krótka domena `kingsedu.pl` przekierowana 301 do domeny głównej,
- statyczna paczka kompatybilna ze zwykłym hostingiem home.pl,
- prosty edytor treści, sekcji i zdjęć dla dyrektora,
- import/eksport kopii treści i automatyczne zmniejszanie zdjęć,
- instrukcja WebFTP, SSL, aktualizacji i pokazu klientce.

Wersja 0.7 zapisuje treści wyłącznie w danej przeglądarce. Wspólny zapis do
bazy, prywatny magazyn zdjęć i autoryzacja dyrektora powstają po Etapie 1.

### Etap 1 — logowanie i role (28–31 lipca)

**Stan: zaakceptowany 25 lipca; oznaczony tagiem `stage-1-accepted`.**

- konta przez zaproszenie, bez publicznej rejestracji,
- e-mail, hasło, weryfikacja i reset,
- dyrektor, wykładowca, rodzic, uczeń,
- obowiązkowe TOTP 2FA dyrektora,
- sesje i ochrona tras na serwerze.

Odbiór: każda rola widzi inny panel; ręczna zmiana adresu nie daje dostępu.

### Etap 2 — kartoteki, import i pliki (1–4 sierpnia)

**Stan: zaakceptowany i oznaczony tagiem `stage-2-accepted`.**

- sale, wykładowcy, grupy, uczniowie, relacje rodzic–dziecko,
- import szablonu CSV/XLSX z podglądem,
- eksport zgodnego CSV w osobnej sekcji danych,
- raport błędów, duplikaty, archiwizacja zamiast kasowania,
- duża karta osoby i zaproszenia przez link lub QR,
- prywatny magazyn plików przez wymienny `FileStorage`.

### Etap 3 — grafik i podstawowy dziennik (5–11 sierpnia)

**Stan: przyjęty do dalszych prac w punkcie `stage-3-accepted`. Odbiór
obejmuje grafik ręczny, Asystenta, widoki ról, temat lekcji i szybką obecność.
Cykliczność pozostaje kontrolowanym rozszerzeniem grafiku.**

- tydzień na desktopie, dzień na telefonie,
- dnd-kit,
- ręczne układanie w kolejności grupa → termin → wykładowca → sala,
- wyszarzenie niedostępnego zasobu z podaniem przyczyny,
- Asystent układania grafiku tworzący szkic do świadomego zatwierdzenia,
- serwerowa blokada konfliktu sali, wykładowcy, grupy i wspólnego ucznia,
- twarde reguły dostępności i pojemności oraz miękkie preferencje dnia,
  godziny i stabilnej sali,
- istniejące opublikowane lekcje pozostają stałe przy kolejnym generowaniu,
- cykliczność, wyjątki, zmiana/odwołanie,
- filtry po trzech zasobach,
- dzisiejsze zajęcia, temat oraz szybka obecność na telefonie.

Odbiór: osoba testująca układa demonstracyjny tydzień bez instrukcji; również dwie
równoległe próby nie zapisują konfliktu.

### Etap 4 — umowy i płatności (12–16 sierpnia)

**Stan: przyjęty w punkcie `stage-4-accepted`.**

- wersjonowany, niezmienny PDF umowy i przypisanie do rodzica,
- pakiet trzech wymaganych dokumentów KLA: umowa i informacje RODO, indywidualny
  kosztorys oraz harmonogram zajęć,
- akceptacja online z dowodem czasu, wersji i integralności,
- wersjonowane informacje konsumenckie, osobne potwierdzenia i wspólne FAQ,
- raty wyprowadzone z kosztorysu, ręczny status każdej raty oraz historia zmian,
- tekst umowy i sposób akceptacji po zatwierdzeniu przez prawnika.

### Etap 5 — komunikator i ogłoszenia (17–21 sierpnia)

**Stan: zamknięty technicznie 31 sierpnia 2026. Funkcje przeszły testy
automatyczne, test roli i klikanie na telefonie oraz komputerze. Ostateczny
odbiór zadaniowy pozostaje częścią Etapu 7.**

- służbowe rozmowy grupowe i potwierdzenia odczytu,
- rozmowy z osobami wskazanymi przez dyrektora, z jawnym składem uczestników,
- masowe ogłoszenie do wybranych grup,
- kolejka, ponowienia i idempotencja e-mail,
- jawny, audytowany dostęp dyrektora.

Odbiór techniczny: rozmowa grupowa i bezpośrednia, sam załącznik, potwierdzenie
odczytu, ogłoszenie, neutralny e-mail, ponowienie kolejki oraz odmowa dostępu
osobie spoza kanału działają na tej samej, serwerowej kontroli ról.

### Etap 6 — materiały, zadania i panele klienta (22–25 sierpnia)

**Stan: zamknięty technicznie 31 sierpnia 2026. Funkcje przeszły testy
automatyczne, test roli i klikanie na telefonie oraz komputerze. Ostateczny
odbiór zadaniowy pozostaje częścią Etapu 7.**

- materiał jako plik lub link przypisany do grupy,
- zadanie, termin i status oddania,
- monitoring wykładowcy,
- prosty plan, obecności i sprawy bieżące rodzica i ucznia,
- dzwonek w aplikacji i manifest PWA.

Odbiór techniczny: materiały, zadania, prywatne oddania prac i panele wszystkich
ról korzystają z kontroli `schoolId`. Pliki są weryfikowane po sygnaturze,
skanowane i wydawane prywatną trasą. Manifest, ikony i bezpieczny service worker
pozwalają dodać panel do ekranu telefonu bez cache'owania danych szkoły.

### Etap 7 — pilot i odbiór (26–28 sierpnia)

**Stan: w toku — funkcje, infrastruktura i podręczniki są wdrożone testowo.
Pozostają: zadaniowy odbiór szkoły i decyzja prawno-bezpieczeństwowa
„go/no-go” przed prawdziwymi danymi.**

- prawdziwa marka, bez danych uczniów,
- test zadaniowy z przedstawicielem szkoły bez podpowiadania,
- staging, backup i próbne odtworzenie,
- osobny, obszerny podręcznik ze zrzutami dla dyrektora, wykładowcy, rodzica i
  ucznia oraz osobny podręcznik właściciela; wszystkie pobierane z bieżącego
  wdrożenia, i protokół odbioru.

### Odbiór przedprodukcyjny

Pokaz i decyzja „go/no-go” dla prawdziwych danych. Produkcja wymaga zamknięcia
czerwonych punktów z `BEZPIECZENSTWO_PRAWO_RODO.md` oraz checklisty w
`docs/CURRENT_WORK.md`.

## Rozwój po pilocie

1. Zaawansowany lub kwalifikowany podpis przez zewnętrznego dostawcę.
2. Płatności internetowe i automatyczne uzgadnianie wpłat.
3. Powiadomienia SMS z kolejką i miesięcznym limitem.
4. Rozbudowana analityka, filtry, CSV i wydruki.
5. Skarbiec Słówek: fiszki, powtórki, passy, wykres rodzica.
6. Rozszerzenia komunikatora i zadań po feedbacku pilota.
7. Ulotki/instrukcje rodzica i wykładowcy w PDF.

## Hosting

Szkielet Etapu 0–0,5 jest osobnym statycznym eksportem i może działać na
zwykłym współdzielonym hostingu home.pl. Nie zawiera logowania ani prawdziwych
danych. Procedura znajduje się w `INSTRUKCJA_HOME_PL.md`.

Jedną z opcji dla pełnego pilota jest MyDevil MD2. Oficjalna oferta podaje Node.js,
PostgreSQL 16, SSH/Git, Warszawę, codzienne kopie i 2 GB RAM. Cena regularna
MD2 to obecnie 400 zł brutto/rok; promocje są czasowe:
[oferta MyDevil](https://www.mydevil.net/nasza-oferta/).

Zwykły hosting stron home.pl nie jest celem dla stałego serwera Next.js. Przy
konieczności użycia infrastruktury home.pl pozostaje
[VPS Linux](https://home.pl/serwery/vps-linux/) wraz z samodzielnym utrzymaniem
systemu, reverse proxy, firewalla, aktualizacji i backupów. Przy tym budżecie
to nieproporcjonalne ryzyko.

Polska lokalizacja nie zapewnia sama w sobie zgodności z RODO. Potrzebne są
umowy powierzenia, podwykonawcy, retencja, kontrola dostępu, procedura incydentu
i sprawdzony backup.

## Technologia i źródła

| Obszar | Wybór |
|---|---|
| Aplikacja | Next.js 16, React 19, TypeScript |
| UI | Tailwind 4, dostępne komponenty, mobile-first |
| Dane | PostgreSQL + Prisma 7 |
| Logowanie | Better Auth, TOTP 2FA |
| Grafik | dnd-kit + `ScheduleSolver` + transakcyjna logika kolizji |
| Pliki | prywatny magazyn S3-compatible + krótkie adresy podpisane |
| Zadania asynchroniczne | pg-boss na PostgreSQL + tabela Outbox |
| E-mail | `EmailProvider`, adapter Resend i klucze idempotencji |
| Umowy | niezmienne wersje + wymienny `SignatureProvider` |
| Wdrożenie | standalone Node.js, MyDevil MD2 |

[Self-hosting Next.js](https://nextjs.org/docs/app/guides/self-hosting),
[PWA w Next.js](https://nextjs.org/docs/app/guides/progressive-web-apps),
[Prisma + Next.js](https://docs.prisma.io/docs/guides/frameworks/nextjs),
[Better Auth 2FA](https://better-auth.com/docs/plugins/2fa).

## Bramki

- Przed Etapem 1: zatwierdzone wymagania funkcjonalne i role.
- Przed prawdziwym importem: zatwierdzony zakres pól i bezpieczny kanał.
- Przed e-mail/SMS: konto dostawcy szkoły i limit kosztu.
- Przed produkcją: checklista bezpieczeństwa i odbiór.
- Przed umowami: treść i sposób akceptacji zatwierdzone przez prawnika.
