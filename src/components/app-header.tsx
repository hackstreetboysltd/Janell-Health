import { signOut } from "@/auth";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

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
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="text-sm font-medium text-alert underline-offset-2 hover:underline"
            >
              Sign out
            </button>
          </form>
        </div>
      ) : null}
    </header>
  );
}
