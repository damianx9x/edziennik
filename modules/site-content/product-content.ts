import { defaultSiteLayout, type SiteContent } from "./schema";

const neutralSlide = (
  id: string,
  title: string,
  text: string,
  color: string,
): SiteContent["slides"][number] => ({
  id,
  src: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="${color}"/><circle cx="960" cy="180" r="260" fill="#ffffff" fill-opacity=".12"/><path d="M0 650C260 520 450 760 720 610s330-70 480-160v350H0z" fill="#ffffff" fill-opacity=".1"/></svg>`)}`,
  alt: "Abstrakcyjna ilustracja neutralnego pokazu produktu eDziennik",
  kicker: "Neutralny pokaz",
  title,
  text,
  position: "center",
});

export const productSiteContent: SiteContent = {
  version: 1,
  hero: {
    eyebrow: "eDziennik",
    title: "System, który porządkuje",
    accent: "codzienną pracę.",
    description:
      "Neutralny pokaz produktu nie renderuje danych, zdjęć, lokalizacji ani kontaktów szkoły.",
    primaryCta: "Logowanie dla zaproszonych",
    secondaryCta: "Poznaj system",
  },
  slider: { layout: "split", imageFit: "cover" },
  layout: defaultSiteLayout,
  slides: [
    neutralSlide(
      "product-workflow",
      "Jeden spójny workflow",
      "Grafik, komunikacja, umowy i postępy w jednym systemie.",
      "#17336f",
    ),
    neutralSlide(
      "product-security",
      "Bezpieczeństwo od podstaw",
      "Kontrola ról, audyt i szyfrowane kopie.",
      "#9e3342",
    ),
  ],
  proof: [
    { value: "4", label: "role użytkowników" },
    { value: "1", label: "spójny system" },
    { value: "24/7", label: "monitoring usług" },
    { value: "0", label: "renderowanych danych szkoły" },
  ],
  offer: {
    kicker: "Zakres",
    title: "Codzienne procesy szkoły",
    text: "Moduły pracują na wspólnej kontroli dostępu i historii zmian.",
    cards: [
      {
        eyebrow: "Plan",
        title: "Grafik",
        text: "Zasoby, kolizje i dostępności.",
        detail: "Ręcznie i z asystentem",
        tone: "blue",
      },
      {
        eyebrow: "Kontakt",
        title: "Wiadomości",
        text: "Rozmowy i ogłoszenia z kontekstem.",
        detail: "Role i potwierdzenia",
        tone: "yellow",
      },
      {
        eyebrow: "Formalności",
        title: "Umowy",
        text: "Wersje, dokumenty i ślad decyzji.",
        detail: "Bez przepisywania",
        tone: "red",
      },
      {
        eyebrow: "Rozwój",
        title: "Postępy",
        text: "Obecność, obserwacje i kierunek pracy.",
        detail: "Czytelnie dla rodziny",
        tone: "navy",
      },
    ],
  },
  story: {
    kicker: "Architektura",
    title: "Dane pozostają pod kontrolą wdrożenia",
    text: "Kod, baza i magazyn plików tworzą audytowalne środowisko możliwe do dopasowania do procesu szkoły.",
    linkLabel: "Dokumentacja techniczna",
  },
  locations: {
    kicker: "Prywatność",
    title: "Brak danych lokalizacyjnych w pokazie",
    text: "Neutralny tryb nie publikuje nazw ani adresów szkoły.",
    items: ["Środowisko demonstracyjne"],
  },
  digital: {
    kicker: "Role",
    title: "Każdy widzi właściwy zakres",
    text: "Uprawnienia są weryfikowane po stronie serwera przy każdym odczycie i zapisie.",
    cta: "Logowanie",
    roles: [
      { title: "Dyrektor", text: "Zarządza procesami i akceptuje zmiany." },
      {
        title: "Wykładowca",
        text: "Prowadzi zajęcia, materiały i obserwacje.",
      },
      { title: "Rodzic", text: "Widoki powiązanych dzieci, umów i płatności." },
      { title: "Uczeń", text: "Prosty plan, materiały i postępy." },
    ],
  },
  modules: {
    kicker: "System",
    title: "Moduły połączone jednym modelem danych",
    text: "Zmiana w jednym miejscu aktualizuje zależne widoki bez duplikowania pracy.",
    cards: [
      { title: "Grafik", text: "Lekcje i zasoby.", detail: "Bez kolizji" },
      {
        title: "Komunikacja",
        text: "Rozmowy i alerty.",
        detail: "Z potwierdzeniem",
      },
      { title: "Formalności", text: "Umowy i raty.", detail: "Z audytem" },
      {
        title: "Nauka",
        text: "Materiały i postępy.",
        detail: "Dla właściwych osób",
      },
    ],
  },
  widgets: [
    {
      id: "product-roles",
      type: "stat",
      badge: "4 role",
      title: "Właściwe informacje dla właściwej osoby",
      text: "Każdy widok wynika z roli oraz relacji zapisanych po stronie serwera.",
      actionLabel: "Poznaj system",
      href: "#jak-to-dziala",
      size: "medium",
      tone: "blue",
    },
    {
      id: "product-privacy",
      type: "highlight",
      badge: "Prywatność",
      title: "Neutralny pokaz bez danych szkoły",
      text: "Publiczna prezentacja opisuje funkcje, ale nie renderuje danych operacyjnych.",
      actionLabel: "Zobacz zakres",
      href: "#mozliwosci",
      size: "medium",
      tone: "navy",
    },
  ],
  contact: {
    kicker: "Kontakt techniczny",
    title: "Zgłoś błąd prywatnie",
    text: "Nie publikuj danych ani szczegółów podatności.",
    phoneDisplay: "Kontakt przez e-mail",
    phoneHref: "mailto:damianx9x@me.com",
    email: "damianx9x@me.com",
    facebookUrl: "https://github.com/damianx9x/edziennik",
  },
};
