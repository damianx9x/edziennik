import type { SiteContent } from "./schema";

export const defaultSiteContent: SiteContent = {
  version: 1,
  hero: {
    eyebrow: "Twoja szkoła językowa",
    title: "Nauka, która",
    accent: "dodaje odwagi.",
    description:
      "Prywatna szkoła języka angielskiego dla dzieci i młodzieży. Kameralne grupy, dużo mówienia i zajęcia, na które chce się wracać — blisko domu i online.",
    primaryCta: "Otwórz eDziennik",
    secondaryCta: "Poznaj szkołę",
  },
  slider: {
    layout: "split",
    imageFit: "cover",
  },
  slides: [
    {
      id: "london-bus",
      src: "/photos/kla-london-bus.jpg",
      alt: "Abstrakcyjna ilustracja podróży z językiem angielskim",
      kicker: "Angielski poza salą",
      title: "Język prowadzi dalej",
      text: "Wyjazdy zamieniają słówka i rozmowy w prawdziwe doświadczenia.",
      position: "center",
    },
    {
      id: "award",
      src: "/photos/kla-award.jpg",
      alt: "Abstrakcyjny symbol jakości nauki",
      kicker: "Jakość każdego dnia",
      title: "Postęp, który widać",
      text: "Małe grupy, czytelna informacja zwrotna i wspólny kierunek pracy.",
      position: "center 35%",
    },
    {
      id: "trip",
      src: "/photos/kla-trip-together.jpg",
      alt: "Abstrakcyjna ilustracja wspólnej nauki",
      kicker: "Razem odważniej",
      title: "Małe grupy. Wielkie historie.",
      text: "Dzieci uczą się mówić, współpracować i odkrywać świat po angielsku.",
      position: "center",
    },
  ],
  proof: [
    { value: "2–8", label: "osób w grupie" },
    { value: "1+", label: "lokalizacji i online" },
    { value: "4", label: "role w jednym systemie" },
    { value: "1", label: "prosty eDziennik" },
  ],
  offer: {
    kicker: "Tylko angielski. Naprawdę dobrze.",
    title: "Jedna specjalizacja, wiele sposobów na postęp",
    text: "Szkoła koncentruje się na języku angielskim. Mówienie, rozumienie, czytanie i pisanie rozwijają się razem, w tempie dopasowanym do wieku i potrzeb grupy.",
    cards: [
      {
        eyebrow: "Speak",
        title: "Angielski, którym się mówi",
        text: "Od pierwszych słów po swobodną rozmowę. Każde spotkanie rozwija praktyczne słownictwo i odwagę do mówienia.",
        detail: "Program dopasowany do grupy",
        tone: "blue",
      },
      {
        eyebrow: "Learn",
        title: "Pewność na lekcjach",
        text: "Gramatyka i szkolne zagadnienia podane jasno, bez presji i w tempie dopasowanym do małej grupy.",
        detail: "Program dopasowany do grupy",
        tone: "yellow",
      },
      {
        eyebrow: "Read",
        title: "Czytanie i pisanie po angielsku",
        text: "Ćwiczenia rozwijają rozumienie tekstu i swobodne pisanie — krok po kroku, z częstą informacją zwrotną.",
        detail: "Program dopasowany do grupy",
        tone: "red",
      },
      {
        eyebrow: "Explore",
        title: "Angielski w prawdziwym świecie",
        text: "Projekty, kultura i wyjazdy pokazują, że język jest narzędziem do poznawania ludzi, miejsc i nowych możliwości.",
        detail: "Program dopasowany do grupy",
        tone: "navy",
      },
    ],
  },
  story: {
    kicker: "Język w prawdziwym świecie",
    title: "Angielski nie kończy się na ostatniej stronie podręcznika.",
    text: "Rozmowa, kultura i wspólne doświadczenia są częścią nauki. Dzięki temu dzieci nie tylko znają odpowiedź — mają też odwagę, by powiedzieć ją po angielsku.",
    linkLabel: "Zobacz życie szkoły",
  },
  locations: {
    kicker: "Szkoła jest blisko",
    title: "Spotkajmy się stacjonarnie albo online",
    text: "Wybierz wygodną lokalizację. Aktualny grafik i dostępność miejsc potwierdzi zespół szkoły.",
    items: ["Lokalizacja szkoły", "Online"],
  },
  digital: {
    kicker: "Cyfrowe zaplecze, ludzkie podejście",
    title: "Jedno proste miejsce dla całej społeczności szkoły.",
    text: "Rodzic, uczeń, wykładowca i dyrektor widzą tylko to, czego potrzebują. Plan, obecności i najważniejsze informacje są pod ręką — szczególnie na telefonie.",
    cta: "Otwórz eDziennik",
    roles: [
      {
        title: "Rodzic",
        text: "Plan dziecka, obecności, postępy i ważne wiadomości bez szukania w czatach.",
      },
      {
        title: "Uczeń",
        text: "Najbliższe zajęcia, materiały i zadania w lekkim widoku na telefon.",
      },
      {
        title: "Wykładowca",
        text: "Dzisiejsze grupy, szybka obecność i komunikacja z właściwymi osobami.",
      },
      {
        title: "Dyrektor",
        text: "Grafik, grupy i spokojna kontrola działania szkoły w jednym miejscu.",
      },
    ],
  },
  modules: {
    kicker: "W pierwszej wersji",
    title: "Najważniejsze sprawy szkoły. W jednym spokojnym miejscu.",
    text: "Panel ma zdejmować pracę z głowy, a nie dokładać kolejny system do obsługi. Każdy moduł prowadzi użytkownika jednym czytelnym przepływem.",
    cards: [
      {
        title: "Umowy online",
        text: "Przypisanie umowy, niezmienna wersja PDF, bezpieczna akceptacja i komplet dowodów.",
        detail: "Rodzic · Dyrektor",
      },
      {
        title: "Komunikator i ogłoszenia",
        text: "Rozmowy grupowe, wiadomości służbowe i wysyłka informacji do całej wybranej grupy.",
        detail: "Grupy · E-mail",
      },
      {
        title: "Status płatności",
        text: "Dyrektor ręcznie oznacza status, a rodzic widzi prostą i aktualną informację.",
        detail: "Bez płatności online",
      },
      {
        title: "Materiały i zadania",
        text: "Materiały dla grupy, termin zadania i czytelny monitoring oddania bez szukania w czatach.",
        detail: "Wykładowca · Uczeń",
      },
    ],
  },
  contact: {
    kicker: "Masz pytanie?",
    title: "Porozmawiajmy o najlepszym starcie.",
    text: "Dane kontaktowe szkoły pojawią się po konfiguracji wizytówki.",
    phoneDisplay: "Kontakt przez e-mail",
    phoneHref: "mailto:damianx9x@me.com",
    email: "damianx9x@me.com",
    facebookUrl: "https://github.com/damianx9x/edziennik",
  },
};
