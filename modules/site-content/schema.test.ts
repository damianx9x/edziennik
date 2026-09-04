import { describe, expect, it } from "vitest";

import { defaultSiteContent } from "./default-content";
import { siteContentSchema } from "./schema";

describe("siteContentSchema", () => {
  it("accepts the versioned default KLA content", () => {
    expect(siteContentSchema.safeParse(defaultSiteContent).success).toBe(true);
  });

  it("adds safe slider defaults to an older exported file", () => {
    const legacyContent: Partial<typeof defaultSiteContent> = {
      ...defaultSiteContent,
    };
    delete legacyContent.slider;
    const result = siteContentSchema.parse(legacyContent);

    expect(result.slider).toEqual({ layout: "split", imageFit: "cover" });
  });

  it("adds the modular layout and widgets to an older exported file", () => {
    const legacyContent: Partial<typeof defaultSiteContent> = {
      ...defaultSiteContent,
    };
    delete legacyContent.layout;
    delete legacyContent.widgets;

    const result = siteContentSchema.parse(legacyContent);

    expect(result.layout.sections).toHaveLength(7);
    expect(result.widgets.length).toBeGreaterThan(0);
  });

  it("rejects repeated layout sections and unsafe widget links", () => {
    const invalidContent = {
      ...defaultSiteContent,
      layout: {
        ...defaultSiteContent.layout,
        sections: defaultSiteContent.layout.sections.map((section) => ({
          ...section,
          id: "offer",
        })),
      },
      widgets: defaultSiteContent.widgets.map((widget, index) =>
        index === 0 ? { ...widget, href: "javascript:alert(1)" } : widget,
      ),
    };

    expect(siteContentSchema.safeParse(invalidContent).success).toBe(false);
  });

  it("requires at least one slider photo", () => {
    const contentWithoutSlides = {
      ...defaultSiteContent,
      slides: [],
    };

    expect(siteContentSchema.safeParse(contentWithoutSlides).success).toBe(
      false,
    );
  });

  it("rejects more than five slider photos", () => {
    const firstSlide = defaultSiteContent.slides[0];
    const contentWithTooManySlides = {
      ...defaultSiteContent,
      slides: Array.from({ length: 6 }, (_, index) => ({
        ...firstSlide,
        id: `slide-${index}`,
      })),
    };

    expect(siteContentSchema.safeParse(contentWithTooManySlides).success).toBe(
      false,
    );
  });

  it("rejects an invalid public contact address", () => {
    const invalidContact = {
      ...defaultSiteContent,
      contact: {
        ...defaultSiteContent.contact,
        email: "niepoprawny-adres",
      },
    };

    expect(siteContentSchema.safeParse(invalidContact).success).toBe(false);
  });
});
