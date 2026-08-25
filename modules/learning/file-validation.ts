export type SafeLearningFileType = "application/pdf" | "image/jpeg" | "image/png";

export function detectLearningFileType(bytes: Uint8Array): SafeLearningFileType | null {
  if (new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= png.length && png.every((value, index) => bytes[index] === value)) return "image/png";
  return null;
}
