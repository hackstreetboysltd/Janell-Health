import { signOut } from "@/auth";
import { BrandMark } from "@/components/brand-mark";

export function AppHeader({ size = "sm" }: { size?: "sm" | "md" | "lg" }) {
  return (
    <header className="flex items-center justify-between gap-3">
      <BrandMark size={size} />
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
    </header>
  );
}
