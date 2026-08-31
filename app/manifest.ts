import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "eDziennik KLA",
    short_name: "eDziennik",
    description: "Plan, wiadomości, materiały i sprawy szkoły językowej w jednym miejscu.",
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#f8f5ef",
    theme_color: "#172650",
    lang: "pl",
    categories: ["education", "productivity"],
    icons: [
      {
        src: "/icons/edziennik-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/edziennik-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
