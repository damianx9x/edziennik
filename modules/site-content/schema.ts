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
];

const safeWidgetHref = z
  .string()
  .trim()
  .max(300)
  .refine(
    (value) =>
      /^#[a-z0-9-]+$/i.test(value) ||
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
        type: z.enum(["highlight", "stat", "link", "notice"]),
        badge: z.string().trim().min(1).max(60),
        title: shortText,
        text: paragraph,
        actionLabel: shortText,
        href: safeWidgetHref,
        size: z.enum(["small", "medium", "large"]),
        tone: z.enum(["blue", "yellow", "red", "navy"]),
      }),
    )
    .min(1)
    .max(8)
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
