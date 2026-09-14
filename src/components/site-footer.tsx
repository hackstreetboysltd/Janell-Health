import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-mist px-5 py-6 text-center text-xs text-ink/50">
      <p className="font-medium text-ink/70">Trusted care. Right at home.</p>
      <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">
        <Link href="/support" className="hover:text-sage">
          Support
        </Link>
        <Link href="/legal/terms" className="hover:text-sage">
          Terms
        </Link>
        <Link href="/legal/privacy" className="hover:text-sage">
          Privacy
        </Link>
        <Link href="/legal/subprocessors" className="hover:text-sage">
          Subprocessors
        </Link>
        <Link href="/legal/dpa" className="hover:text-sage">
          DPA
        </Link>
        <Link href="/legal/conduct" className="hover:text-sage">
          Conduct
        </Link>
        <Link href="/legal/refunds" className="hover:text-sage">
          Refunds
        </Link>
      </nav>
    </footer>
  );
}
