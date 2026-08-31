import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  wantHtml: z.string().min(3),
  services: z.array(z.string()).min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Add what you want and at least one service" },
      { status: 400 },
    );
  }

  const created = await prisma.case.create({
    data: {
      patientId: session.user.id,
      wantHtml: parsed.data.wantHtml,
      services: parsed.data.services,
    },
  });

  return NextResponse.json({ id: created.id });
}
