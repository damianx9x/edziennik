# Marka i system UI KLA

Stan: Etap 0.5, 25 lipca 2026.

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
- Obrazy AI nie są częścią krytycznego interfejsu. Mogą powstać tylko jako
  osobne materiały marketingowe lub karta social.

To celowo ogranicza „generatywny” wygląd: nie używamy przypadkowych gradientów,
szklanych paneli, nadmiaru kapsułek, animacji ani dekoracyjnych dashboardów bez
funkcji.

## Sprawdzony workflow UI

1. Zaczynamy od realnego zadania użytkownika i szerokości 375 px.
2. Definiujemy tokeny koloru, typografii, odstępów i promienia.
3. Budujemy małe komponenty z semantycznego HTML.
4. Dla złożonych formularzy używamy oficjalnego CLI shadcn/ui i Radix, nigdy
   kopiowania losowych snippetów.
5. Ikony wyłącznie z Lucide.
6. Test klawiatury, dotyku, kontrastu i `prefers-reduced-motion`.
7. Klikane QA na 375×812 i 1440×900 przed każdym wydaniem.

## Skille Codex

25 lipca zainstalowano:

- `figma-generate-design`,
- `figma-implement-design`,
- `figma-create-design-system-rules`,
- `security-best-practices`,
- `security-threat-model`,
- `sentry`.

Są dostępne od następnego zadania Codex. Skille Figma wymagają połączenia
oficjalnego pluginu Figma. Nie jest on konieczny do dalszego programowania, ale
warto go połączyć przed projektowaniem dużego panelu grafiku.

Wbudowane i już dostępne:

- ImageGen — wyłącznie do kontrolowanych materiałów rastrowych,
- Browser i Playwright — do testów użytkownika,
- Screenshot — do dowodów QA,
- PDF — do późniejszej instrukcji i ulotki.

## Prywatność materiałów

Do repozytorium trafiło logo. Zdjęcia dzieci z profilu nie są kopiowane do
aplikacji ani stagingu. Z przekazanego zrzutu zapisano tylko nazwy grup i ich
liczebność; nazw uczniów nie przeniesiono.
