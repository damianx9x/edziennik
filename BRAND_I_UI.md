# Marka i system UI KLA

Stan: Etap 3, 28 lipca 2026.

## Źródło

Kierunek wizualny oparto na publicznym profilu
[King’s Language Academy](https://www.facebook.com/szkolakingslanguageacademy)
oraz logo pobranym za zgodą właściciela projektu. Aktualny zakres oferty podał
bezpośrednio właściciel projektu: KLA jest prywatną szkołą wyłącznie języka
angielskiego. Ta informacja ma pierwszeństwo przed starszymi opisami profilu.

Potwierdzone elementy:

- znak lwa i brytyjskie akcenty,
- prywatna szkoła języka angielskiego dla dzieci i młodzieży,
- małe grupy i nacisk na praktyczne używanie angielskiego,
- zajęcia stacjonarne i online,
- lokalizacje na Pomorzu,
- wyjazdy językowe,
- telefon `533 609 841` i e-mail `kingsjezykiobce@gmail.com`.

Treści marketingowe są bogatymi tekstami roboczymi. KLA musi zatwierdzić je
przed publiczną publikacją.

## Kierunek wizualny

- Granat i niebieski budują zaufanie oraz nawiązują do logo.
- Czerwień jest akcentem marki i oznacza najważniejsze CTA.
- Żółty ociepla interfejs, lecz nie jest używany do długich tekstów.
- Tło jest ciepłe i papierowe zamiast czystej, technicznej bieli.
- Nunito Sans daje przyjazny charakter i zachowuje czytelność UI.
- Lucide zapewnia jeden spójny zestaw ikon.
- Karty mają czytelną hierarchię, niewiele efektów i wyraźne stany focus.
- Strona główna ma redakcyjny układ, duże prawdziwe zdjęcia i proste linie
  podziału zamiast zestawu wielobarwnych „kart AI”.
- Animacje są krótkie i funkcjonalne: potwierdzają akcję, pokazują zmianę stanu
  albo zachowują ciągłość między widokami.
- Obrazy AI nie są częścią krytycznego interfejsu. Mogą powstać tylko jako
  osobne materiały marketingowe lub karta social.

To celowo ogranicza „generatywny” wygląd: nie używamy przypadkowych gradientów,
szklanych paneli, nadmiaru kapsułek, animacji ani dekoracyjnych dashboardów bez
funkcji.

## Edycja przez dyrektora

Najważniejsze publiczne treści nie są rozrzucone po komponentach. Wspólny
model obejmuje pierwszy ekran, slajdy, ofertę, historię, lokalizacje, panele,
funkcje eDziennika i kontakt. Edytor używa prostych nazw, pokazuje limity i
posiada jedną stałą akcję `Zapisz zmiany`.

Zdjęcia slajdów można dodać, podmienić, usunąć i przestawić. Przeglądarka
zmniejsza duże fotografie przed zapisem. W demie zapis jest lokalny; wersja
produkcyjna dołączy wersjonowanie, bezpieczny magazyn i uprawnienie dyrektora.

## Sprawdzony workflow UI

1. Zaczynamy od realnego zadania użytkownika i szerokości 375 px.
2. Definiujemy tokeny koloru, typografii, odstępów i promienia.
3. Budujemy małe komponenty z semantycznego HTML.
4. Dla złożonych formularzy używamy oficjalnego CLI shadcn/ui i Radix, nigdy
   kopiowania losowych snippetów.
5. Ikony wyłącznie z Lucide.
6. Test klawiatury, dotyku, kontrastu i `prefers-reduced-motion`.
7. Klikane QA na 375×812 i 1440×900 przed każdym wydaniem.

## Wzorce panelu Etapu 2

- Jedno logowanie — rola konta wybiera panel, a nie dodatkowy ekran użytkownika.
- Kartoteki służą codziennej pracy: wyszukiwanie, filtr i otwarcie osoby.
- Import, eksport i historia plików mają osobną pozycję nawigacji.
- Karta osoby jest dużym dialogiem: kontakt, powiązania i sprawy w jednym
  miejscu; na telefonie zachowuje się jak czytelny arkusz od dołu.
- Dialog obsługuje przycisk zamknięcia, `Escape` i przywracanie fokusu.
- Duży dialog roboczy na komputerze ma uchwyt przesuwania i natywne skalowanie;
  po zamknięciu wraca do położenia domyślnego. Na telefonie jest pełnoekranowy,
  bez skalowania i bez konieczności precyzyjnego przeciągania.
- Edycja w popupie zachowuje reguły domeny: zwykłe dane mogą trafić do akceptacji
  dyrektora, ale zaakceptowana umowa nigdy nie jest nadpisywana — korekta tworzy
  kolejną wersję dokumentu.
- Zaproszenie pokazuje link i QR razem; QR nie zmienia zasad bezpieczeństwa.
- Przy 1280 px i szerzej panel wykorzystuje dużą przestrzeń roboczą dyrektora:
  do 1720 px całego panelu i 1420 px treści.
- Złożony formularz na desktopie ma minimum 500 px. Link i QR układają się
  pionowo, dzięki czemu kod nie jest ściskany; poniżej 1280 px cały obszar
  zaproszeń przechodzi w jedną kolumnę.

## Ruch i mikrointerakcje

Projektowy skill `$design-kla-ui` jest źródłem reguł nowoczesnego UI i animacji.
Używa wspólnych czasów oraz easingów, preferuje `transform` i `opacity`, nie
opóźnia działania użytkownika i zawsze zapewnia spokojny wariant
`prefers-reduced-motion`. Nie dodajemy biblioteki animacji do prostych efektów
CSS. Drag-and-drop dostanie ruch dopiero razem z pełną obsługą klawiatury i
czytelnym komunikatem kolizji.

## Jasny i ciemny wygląd

- Użytkownik może przełączyć wygląd stałym przyciskiem z ikoną księżyca lub
  słońca. Wybór zostaje zapamiętany tylko w jego przeglądarce.
- Ciemny wariant korzysta z granatu KLA, nie z czystej czerni. Zachowuje te same
  układy, komunikaty i hierarchię co wariant jasny.
- Tryb systemowy jest używany przy pierwszej wizycie, dopóki użytkownik sam nie
  wybierze wyglądu.
- Zmiana kolorów jest natychmiastowa, bez dekoracyjnej animacji i bez błysku
  jasnego tła przy przechodzeniu między podstronami.

## Skille Codex

25 lipca zainstalowano:

- `design-kla-ui` — projektowy system UI i dostępnego ruchu KLA,
- `figma-use` — obowiązkowy oficjalny przepływ zapisu do Figma,
- `figma-generate-library` — budowanie profesjonalnej biblioteki komponentów,
- `figma-generate-design`,
- `figma-implement-design`,
- `figma-create-design-system-rules`,
- `security-best-practices`,
- `security-threat-model`,
- `sentry`.

Nowo zainstalowane skille są dostępne po ponownym uruchomieniu Codex. Skille
Figma wymagają połączenia oficjalnego pluginu Figma. Nie jest on konieczny do
dalszego programowania, ale warto go połączyć przed projektowaniem dużego
panelu grafiku. Nie instalujemy niesprawdzonych paczek promptów zewnętrznych,
szczególnie w projekcie przetwarzającym dane dzieci.

Wbudowane i już dostępne:

- ImageGen — wyłącznie do kontrolowanych materiałów rastrowych,
- Browser i Playwright — do testów użytkownika,
- Screenshot — do dowodów QA,
- PDF — do późniejszej instrukcji i ulotki.

## Prywatność materiałów

Do repozytorium trafiło logo i trzy zdjęcia wybrane z publicznego profilu za
zgodą właściciela: autobus wyjazdowy, dorosła przedstawicielka KLA z nagrodą
oraz grupa sfotografowana od tyłu. Nie użyto zbliżeń twarzy dzieci ani podpisów
z nazwami. Z przekazanego zrzutu zapisano tylko nazwy grup i ich liczebność;
nazw uczniów nie przeniesiono.
