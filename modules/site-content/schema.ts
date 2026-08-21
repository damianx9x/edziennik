import { z } from "zod";

const shortText = z.string().trim().min(1).max(140);
const paragraph = z.string().trim().min(1).max(900);

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
  contact: z.object({
    kicker: shortText,
    title: shortText,
    text: paragraph,
    phoneDisplay: z.string().trim().min(5).max(40),
    phoneHref: z.string().trim().startsWith("tel:").max(50),
    email: z.email().max(160),
    facebookUrl: z.url().max(300),
  }),
});

export type SiteContent = z.infer<typeof siteContentSchema>;
