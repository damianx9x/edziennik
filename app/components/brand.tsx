import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      className={`brand ${compact ? "brand-compact" : ""}`}
      href="/"
      aria-label="King’s Language Academy — strona główna"
    >
      <Image
        className="brand-logo"
        src="/kla-logo.jpg"
        width={56}
        height={56}
        alt=""
        priority
      />
      <span className="brand-copy">
        <strong>King’s</strong>
        <small>Language Academy</small>
      </span>
    </Link>
  );
}
