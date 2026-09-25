import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SignOutButton } from "@/components/sign-out-button";

export function AppHeader({
  size = "sm",
  isAdmin,
  guest,
}: {
  size?: "sm" | "md" | "lg";
  isAdmin?: boolean;
  guest?: boolean;
}) {
  const showActions = !guest;

  return (
    <header
      className={`flex items-center gap-3 ${showActions ? "justify-between" : ""}`}
    >
      <BrandMark size={size} />
      {showActions ? (
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Link href="/admin" className="text-sm font-medium text-sage">
              Admin
            </Link>
          ) : null}
          <SignOutButton className="text-sm font-medium text-alert underline-offset-2 hover:underline disabled:opacity-60" />
        </div>
      ) : null}
    </header>
  );
}
