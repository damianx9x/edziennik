const reserved = new Set(["bog", "kinga", "dyrektor", "wykladowca", "rodzic", "uczen"]);

export function childLoginBase(name: string): string {
  const base = name.toLowerCase().replaceAll("ł", "l").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "").slice(0, 48);
  return base.length < 3 ? `dziecko${base}` : reserved.has(base) ? `uczen${base}` : base;
}
