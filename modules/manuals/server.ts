import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ManualAudience } from "./release";

const MANUALS: Record<ManualAudience, { file: string; downloadName: string }> = {
  director: {
    file: "Podrecznik_eDziennika_KLA_dla_dyrektora.pdf",
    downloadName: "Podrecznik-eDziennik-KLA-dyrektor.pdf",
  },
  teacher: {
    file: "Podrecznik_eDziennika_KLA_dla_wykladowcy.pdf",
    downloadName: "Podrecznik-eDziennik-KLA-wykladowca.pdf",
  },
  parent: {
    file: "Podrecznik_eDziennika_KLA_dla_rodzica.pdf",
    downloadName: "Podrecznik-eDziennik-KLA-rodzic.pdf",
  },
  student: {
    file: "Podrecznik_eDziennika_KLA_dla_ucznia.pdf",
    downloadName: "Podrecznik-eDziennik-KLA-uczen.pdf",
  },
  owner: {
    file: "Instrukcja_eDziennika_KLA_dla_wlasciciela_systemu.pdf",
    downloadName: "Podrecznik-wlasciciela-eDziennik-KLA.pdf",
  },
};

export async function manualPdfResponse(audience: ManualAudience): Promise<Response> {
  const manual = MANUALS[audience];
  const file = await readFile(path.join(process.cwd(), "output", "pdf", manual.file));

  return new Response(new Uint8Array(file), {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename="${manual.downloadName}"`,
      "Content-Length": String(file.byteLength),
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
