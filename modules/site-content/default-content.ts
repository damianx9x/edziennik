import type { SiteContent } from "./schema";

export const defaultSiteContent: SiteContent = {
  version: 1,
  hero: {
    eyebrow: "King’s Language Academy",
    title: "Nauka, która",
    accent: "dodaje odwagi.",
    description:
      "Prywatna szkoła języka angielskiego dla dzieci i młodzieży. Kameralne grupy, dużo mówienia i zajęcia, na które chce się wracać — blisko domu i online.",
    primaryCta: "Przejdź do eDziennika",
    secondaryCta: "Poznaj KLA",
  },
  slides: [
    {
      id: "london-bus",
      src: "/photos/kla-london-bus.jpg",
      alt: "Fioletowy autobus przed Warner Bros. Studio Tour London",
      kicker: "Angielski poza salą",
      title: "Język prowadzi dalej",
      text: "Wyjazdy KLA zamieniają słówka i rozmowy w prawdziwe doświadczenia.",
      position: "center",
    },
    {
      id: "award",
      src: "/photos/kla-award.jpg",
      alt: "Przedstawicielka KLA z dyplomem plebiscytu edukacyjnego",
      kicker: "Docenieni na Pomorzu",
      title: "Jakość, którą widać",
      text: "Pierwsze miejsce KLA w plebiscycie edukacyjnym Dziennika Bałtyckiego 2025.",
      position: "center 35%",
    },
    {
      id: "trip",
      src: "/photos/kla-trip-together.jpg",
      alt: "Grupa KLA podczas wspólnego wyjazdu, sfotografowana od tyłu",
      kicker: "Razem odważniej",
      title: "Małe grupy. Wielkie historie.",
      text: "Dzieci uczą się mówić, współpracować i odkrywać świat po angielsku.",
      position: "center",
    },
  ],
  proof: [
    { value: "2–8", label: "osób w grupie" },
    { value: "8+", label: "lokalizacji i online" },
    { value: "100%", label: "poleceń na profilu KLA" },
    { value: "1", label: "prosty eDziennik" },
  ],
  offer: {
    kicker: "Tylko angielski. Naprawdę dobrze.",
    title: "Jedna specjalizacja, wiele sposobów na postęp",
    text: "KLA koncentruje się wyłącznie na języku angielskim. Mówienie, rozumienie, czytanie i pisanie rozwijają się razem, w tempie dopasowanym do wieku i potrzeb grupy.",
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
    text: "W KLA rozmowa, kultura i wspólne doświadczenia są częścią nauki. Dzięki temu dzieci nie tylko znają odpowiedź — mają też odwagę, by powiedzieć ją po angielsku.",
    linkLabel: "Zobacz życie szkoły",
  },
  locations: {
    kicker: "KLA jest blisko",
    title: "Spotkajmy się na Pomorzu albo online",
    text: "Wybierz wygodną lokalizację. Aktualny grafik i dostępność miejsc potwierdzi zespół szkoły.",
    items: [
      "Przodkowo",
      "Czeczewo",
      "Wilanowo",
      "Gdańsk Nowatorów",
      "Gdańsk Morena",
      "Gdańsk Niedźwiednik",
      "Gdynia Pogórze",
      "Online",
    ],
  },
  digital: {
    kicker: "Cyfrowe zaplecze, ludzkie podejście",
    title: "Jedno proste miejsce dla całej społeczności KLA.",
    text: "Rodzic, uczeń, wykładowca i dyrektor widzą tylko to, czego potrzebują. Plan, obecności i najważniejsze informacje są pod ręką — szczególnie na telefonie.",
    cta: "Wybierz swój panel",
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
    text: "Napisz lub zadzwoń. Zespół KLA pomoże dobrać zajęcia, lokalizację i grupę odpowiednią dla dziecka.",
    phoneDisplay: "533 609 841",
    phoneHref: "tel:+48533609841",
    email: "kingsjezykiobce@gmail.com",
    facebookUrl: "https://www.facebook.com/szkolakingslanguageacademy",
  },
};
