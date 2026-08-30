import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false, neutral = false }: { compact?: boolean; neutral?: boolean }) {
  return (
    <Link
      className={`brand ${compact ? "brand-compact" : ""}`}
      href="/"
      aria-label={neutral ? "eDziennik — strona produktu" : "King’s Language Academy — strona główna"}
    >
      <Image
        className="brand-logo"
        src={neutral ? "/product-mark.svg" : "/kla-logo.jpg"}
        width={56}
        height={56}
        alt=""
        priority
      />
      <span className="brand-copy">
        <strong>{neutral ? "eDziennik" : "King’s"}</strong>
        <small>{neutral ? "bezpieczny system" : "Language Academy"}</small>
      </span>
    </Link>
  );
}
