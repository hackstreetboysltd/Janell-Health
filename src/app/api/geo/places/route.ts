import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchPlaces, type PlaceSuggestion } from "@/lib/geo-places";

export type { PlaceSuggestion };

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return NextResponse.json({ places: [] as PlaceSuggestion[] });
  }

  try {
    const places = await searchPlaces(q);
    return NextResponse.json({ places });
  } catch {
    return NextResponse.json(
      { error: "Address search unavailable right now" },
      { status: 502 },
    );
  }
}
