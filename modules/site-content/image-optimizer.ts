"use client";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 1_200_000;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function optimizeSitePhoto(file: File): Promise<string> {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Wybierz plik JPG, PNG albo WebP.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("Zdjęcie jest większe niż 10 MB.");
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / bitmap.width, 1200 / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Ta przeglądarka nie może przygotować zdjęcia.");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let output = await canvasToBlob(canvas, 0.8);
  if (output.size > MAX_OUTPUT_BYTES) output = await canvasToBlob(canvas, 0.64);
  if (output.size > MAX_OUTPUT_BYTES) {
    throw new Error("Zdjęcie nadal jest za duże. Wybierz lżejszy plik.");
  }

  return blobToDataUrl(output);
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error("Nie udało się zmniejszyć zdjęcia.")),
      "image/webp",
      quality,
    );
  });
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nie udało się odczytać zdjęcia."));
    reader.readAsDataURL(blob);
  });
}
