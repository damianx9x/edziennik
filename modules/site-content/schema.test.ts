import { describe, expect, it } from "vitest";

import { defaultSiteContent } from "./default-content";
import { siteContentSchema } from "./schema";

describe("siteContentSchema", () => {
  it("accepts the versioned default KLA content", () => {
    expect(siteContentSchema.safeParse(defaultSiteContent).success).toBe(true);
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
