import { redirect } from "next/navigation";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const params = await searchParams;
  const portal = params.portal === "giver" ? "giver" : "patient";
  redirect(`/?portal=${portal}`);
}
