import { z } from "zod";

const shortText = z.string().trim().min(1).max(140);
const paragraph = z.string().trim().min(1).max(900);

export const siteSectionIds = [
  "offer",
  "story",
  "locations",
  "digital",
  "modules",
  "widgets",
  "contact",
] as const;

export const defaultSiteLayout = {
  contentWidth: "standard" as const,
  cornerStyle: "rounded" as const,
  heroScale: "balanced" as const,
  sections: siteSectionIds.map((id) => ({
    id,
    visible: true,
    width: id === "story" ? ("narrow" as const) : ("standard" as const),
    spacing: "standard" as const,
  })),
};

export const defaultSiteWidgets = [
  {
    id: "english-focus",
    type: "highlight" as const,
    badge: "Tylko angielski",
    title: "Jedna specjalizacja. Pełne skupienie.",
    text: "Zajęcia dla dzieci i młodzieży rozwijają mówienie, rozumienie, czytanie i pisanie.",
    actionLabel: "Poznaj zajęcia",
    href: "#zajecia",
    size: "large" as const,
    tone: "navy" as const,
  },
  {
    id: "local-and-online",
    type: "stat" as const,
    badge: "Stacjonarnie + online",
    title: "Blisko domu",
    text: "Wybierz dogodną lokalizację albo lekcje online.",
    actionLabel: "Sprawdź lokalizacje",
    href: "#lokalizacje",
    size: "small" as const,
    tone: "blue" as const,
  },
  {
    id: "contact-school",
    type: "link" as const,
    badge: "Kontakt",
    title: "Zapytaj o miejsce w grupie",
    text: "Zespół szkoły pomoże dobrać grupę i termin.",
    actionLabel: "Przejdź do kontaktu",
    href: "#kontakt",
    size: "medium" as const,
    tone: "yellow" as const,
  },
  {
    id: "parent-voice",
    type: "testimonial" as const,
    badge: "Rodzice o KLA",
    title: "Kreatywne lekcje, na które dzieci chcą wracać",
    text: "W publicznych opiniach rodzice zwracają uwagę na zaangażowanych wykładowców, przyjazną atmosferę i zauważalne postępy.",
    actionLabel: "Zobacz publiczne opinie",
    href: "https://www.zlotafirma.pl/company/kings-language-academy-5692344",
    size: "large" as const,
    tone: "navy" as const,
  },
  {
    id: "easy-enrollment",
    type: "enrollment" as const,
    badge: "Zapisy",
    title: "Znajdźmy dobrą grupę",
    text: "Podaj wiek ucznia i dogodną lokalizację. Zespół KLA sprawdzi poziom, termin i aktualne wolne miejsce.",
    actionLabel: "Zapytaj o miejsce",
    href: "#kontakt",
    size: "medium" as const,
    tone: "red" as const,
  },
  {
    id: "learning-method",
    type: "method" as const,
    badge: "Jak uczymy",
    title: "Angielski używany w praktyce",
    text: "Mówienie, rozumienie, czytanie i pisanie rozwijają się razem — w tempie dopasowanym do potrzeb grupy.",
    actionLabel: "Poznaj zajęcia",
    href: "#zajecia",
    size: "medium" as const,
    tone: "yellow" as const,
  },
  {
    id: "school-community",
    type: "social" as const,
    badge: "Życie szkoły",
    title: "Aktualności z KLA",
    text: "Zobacz relacje z zajęć, wyjazdów i wydarzeń publikowane przez szkołę na Facebooku.",
    actionLabel: "Otwórz profil szkoły",
    href: "https://www.facebook.com/szkolakingslanguageacademy",
    size: "small" as const,
    tone: "blue" as const,
  },
];

export const siteWidgetTypeIds = [
  "highlight",
  "stat",
  "link",
  "notice",
  "testimonial",
  "enrollment",
  "course",
  "teacher",
  "event",
  "location",
  "faq",
  "gallery",
  "schedule",
  "benefit",
  "social",
  "availability",
  "method",
  "progress",
  "trust",
] as const;

export type SiteWidgetType = (typeof siteWidgetTypeIds)[number];

export const siteWidgetTemplates: Record<
  Exclude<SiteWidgetType, "highlight" | "stat" | "link" | "notice">,
  {
    label: string;
    badge: string;
    title: string;
    text: string;
    actionLabel: string;
    href: string;
    size: "small" | "medium" | "large";
    tone: "blue" | "yellow" | "red" | "navy";
  }
> = {
  testimonial: { label: "Opinia rodzica", badge: "Rodzice o KLA", title: "Dzieci chętnie wracają na zajęcia", text: "Wstaw krótką opinię opublikowaną za zgodą autora i podaj jej źródło.", actionLabel: "Zobacz profil szkoły", href: "https://www.facebook.com/szkolakingslanguageacademy", size: "medium", tone: "navy" },
  enrollment: { label: "Zapisy", badge: "Zapisy", title: "Zapytaj o miejsce w grupie", text: "Napisz lub zadzwoń. Zespół szkoły pomoże dobrać grupę, poziom i dogodną lokalizację.", actionLabel: "Skontaktuj się", href: "#kontakt", size: "large", tone: "red" },
  course: { label: "Rodzaj zajęć", badge: "Angielski", title: "Zajęcia dopasowane do etapu nauki", text: "Opisz konkretną grupę wiekową, poziom albo cel zajęć.", actionLabel: "Poznaj zajęcia", href: "#zajecia", size: "medium", tone: "blue" },
  teacher: { label: "Wykładowca", badge: "Zespół", title: "Poznaj naszych wykładowców", text: "Przedstaw doświadczenie i sposób pracy bez publikowania prywatnych danych.", actionLabel: "Zapytaj o zespół", href: "#kontakt", size: "medium", tone: "yellow" },
  event: { label: "Wydarzenie", badge: "Wydarzenie", title: "Angielski także poza salą", text: "Zaproś na warsztaty, spotkanie albo wyjazd i dodaj najważniejszy termin.", actionLabel: "Sprawdź aktualności", href: "https://www.facebook.com/szkolakingslanguageacademy", size: "large", tone: "navy" },
  location: { label: "Lokalizacja", badge: "Blisko domu", title: "Wybierz wygodną lokalizację", text: "Pokaż miejsce prowadzenia zajęć i skieruj rodzica do pełnej listy.", actionLabel: "Zobacz lokalizacje", href: "#lokalizacje", size: "small", tone: "blue" },
  faq: { label: "Pytanie i odpowiedź", badge: "Warto wiedzieć", title: "Jak dobrać właściwą grupę?", text: "Krótko odpowiedz na jedno często zadawane pytanie rodzica.", actionLabel: "Zapytaj szkołę", href: "#kontakt", size: "medium", tone: "yellow" },
  gallery: { label: "Galeria", badge: "Życie szkoły", title: "Zobacz, jak uczymy", text: "Poprowadź do zdjęć opublikowanych przez szkołę za odpowiednimi zgodami.", actionLabel: "Otwórz galerię", href: "https://www.facebook.com/szkolakingslanguageacademy", size: "medium", tone: "red" },
  schedule: { label: "Terminy", badge: "Organizacja", title: "Dogodny termin zajęć", text: "Wyjaśnij, jak rodzic może sprawdzić dostępne dni i godziny.", actionLabel: "Zapytaj o termin", href: "#kontakt", size: "small", tone: "blue" },
  benefit: { label: "Korzyść", badge: "Dlaczego warto", title: "Mała grupa, więcej mówienia", text: "Wyróżnij jedną konkretną korzyść wynikającą ze sposobu prowadzenia zajęć.", actionLabel: "Poznaj podejście", href: "#zajecia", size: "medium", tone: "navy" },
  social: { label: "Media społecznościowe", badge: "Bądź na bieżąco", title: "Zajrzyj do życia KLA", text: "Aktualności, relacje z zajęć i ogłoszenia szkoły znajdziesz na Facebooku.", actionLabel: "Otwórz Facebook", href: "https://www.facebook.com/szkolakingslanguageacademy", size: "small", tone: "blue" },
  availability: { label: "Wolne miejsca", badge: "Dostępność", title: "Sprawdź aktualne wolne miejsca", text: "Zachęć do kontaktu bez obiecywania miejsca przed potwierdzeniem przez szkołę.", actionLabel: "Zapytaj o miejsce", href: "#kontakt", size: "medium", tone: "red" },
  method: { label: "Metoda nauki", badge: "Jak uczymy", title: "Język używany w praktyce", text: "Opisz, jak rozmowa, rozumienie, czytanie i pisanie łączą się podczas zajęć.", actionLabel: "Poznaj zajęcia", href: "#zajecia", size: "large", tone: "yellow" },
  progress: { label: "Postępy", badge: "Rozwój", title: "Czytelna informacja o postępach", text: "Pokaż, jak rodzic otrzymuje konkretne obserwacje i kolejne kroki nauki.", actionLabel: "Otwórz eDziennik", href: "/panel", size: "medium", tone: "blue" },
  trust: { label: "Zaufanie", badge: "Sprawdzone przez rodziców", title: "Szkoła polecana przez lokalne rodziny", text: "Dodaj wyłącznie potwierdzoną informację i link do publicznego źródła opinii.", actionLabel: "Zobacz publiczne opinie", href: "https://www.zlotafirma.pl/company/kings-language-academy-5692344", size: "medium", tone: "navy" },
};

const safeWidgetHref = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) =>
      /^#[a-z0-9-]+$/i.test(value) ||
      /^\/[a-z0-9/_?=&.-]*$/i.test(value) ||
      /^(https?:|mailto:|tel:)/i.test(value),
    "Podaj bezpieczny adres https:, mailto:, tel: albo odnośnik #sekcja.",
  );

export const siteContentSchema = z.object({
  version: z.literal(1),
  hero: z.object({
    eyebrow: shortText,
    title: shortText,
    accent: shortText,
    description: paragraph,
    primaryCta: shortText,
    secondaryCta: shortText,
  }),
  slider: z
    .object({
      layout: z.enum(["split", "wide"]),
      imageFit: z.enum(["cover", "contain"]),
    })
    .default({ layout: "split", imageFit: "cover" }),
  layout: z
    .object({
      contentWidth: z.enum(["standard", "wide"]),
      cornerStyle: z.enum(["soft", "rounded", "square"]),
      heroScale: z.enum(["compact", "balanced", "cinematic"]),
      sections: z
        .array(
          z.object({
            id: z.enum(siteSectionIds),
            visible: z.boolean(),
            width: z.enum(["narrow", "standard", "wide"]),
            spacing: z.enum(["compact", "standard", "spacious"]),
          }),
        )
        .length(siteSectionIds.length)
        .superRefine((sections, context) => {
          const ids = sections.map((section) => section.id);
          if (new Set(ids).size !== siteSectionIds.length) {
            context.addIssue({
              code: "custom",
              message: "Każda sekcja strony może wystąpić tylko raz.",
            });
          }
          for (const id of siteSectionIds) {
            if (!ids.includes(id)) {
              context.addIssue({
                code: "custom",
                message: `Brakuje sekcji ${id}.`,
              });
            }
          }
        }),
    })
    .default(defaultSiteLayout),
  slides: z
    .array(
      z.object({
        id: z.string().min(1).max(80),
        src: z.string().min(1).max(2_500_000),
        alt: z.string().trim().min(5).max(240),
        kicker: shortText,
        title: shortText,
        text: paragraph,
        position: z.string().max(40),
      }),
    )
    .min(1)
    .max(5),
  proof: z
    .array(
      z.object({
        value: z.string().trim().min(1).max(20),
        label: z.string().trim().min(1).max(80),
      }),
    )
    .length(4),
  offer: z.object({
    kicker: shortText,
    title: shortText,
    text: paragraph,
    cards: z
      .array(
        z.object({
          eyebrow: shortText,
          title: shortText,
          text: paragraph,
          detail: shortText,
          tone: z.enum(["blue", "yellow", "red", "navy"]),
        }),
      )
      .length(4),
  }),
  story: z.object({
    kicker: shortText,
    title: shortText,
    text: paragraph,
    linkLabel: shortText,
  }),
  locations: z.object({
    kicker: shortText,
    title: shortText,
    text: paragraph,
    items: z.array(shortText).min(1).max(20),
  }),
  digital: z.object({
    kicker: shortText,
    title: shortText,
    text: paragraph,
    cta: shortText,
    roles: z
      .array(
        z.object({
          title: shortText,
          text: paragraph,
        }),
      )
      .length(4),
  }),
  modules: z.object({
    kicker: shortText,
    title: shortText,
    text: paragraph,
    cards: z
      .array(
        z.object({
          title: shortText,
          text: paragraph,
          detail: shortText,
        }),
      )
      .length(4),
  }),
  widgets: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        type: z.enum(siteWidgetTypeIds),
        badge: z.string().trim().min(1).max(60),
        title: shortText,
        text: paragraph,
        actionLabel: shortText,
        href: safeWidgetHref,
        size: z.enum(["small", "medium", "large"]),
        tone: z.enum(["blue", "yellow", "red", "navy"]),
        surface: z.enum(["solid", "tint", "soft", "transparent"]).optional(),
        opacity: z.enum(["100", "85", "65", "40"]).optional(),
        borderStyle: z.enum(["none", "line", "accent", "shadow"]).optional(),
        blend: z.enum(["normal", "multiply", "soft-light"]).optional(),
      }),
    )
    .min(1)
    .max(24)
    .superRefine((widgets, context) => {
      if (new Set(widgets.map((widget) => widget.id)).size !== widgets.length) {
        context.addIssue({ code: "custom", message: "Widgety muszą mieć unikalne identyfikatory." });
      }
    })
    .default(defaultSiteWidgets),
  contact: z.object({
    kicker: shortText,
    title: shortText,
    text: paragraph,
    phoneDisplay: z.string().trim().min(5).max(40),
    phoneHref: z
      .string()
      .trim()
      .max(160)
      .refine(
        (value) => value.startsWith("tel:") || value.startsWith("mailto:"),
        "Podaj bezpieczny link tel: albo mailto:",
      ),
    email: z.email().max(160),
    facebookUrl: z.url().max(300),
  }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;
