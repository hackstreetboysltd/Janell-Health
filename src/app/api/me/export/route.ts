import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportUserData } from "@/lib/privacy";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await exportUserData(session.user.id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": 'attachment; filename="janell-health-export.json"',
    },
  });
}
