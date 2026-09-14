import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9),
  ageBand: z.enum(["CHILD", "ADULT", "ELDERLY"]),
});

export async function POST(req: Request) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form fields" }, { status: 400 });
  }

  const { name, phone, ageBand } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phone,
      role: "PATIENT",
      name,
      patientProfile: {
        upsert: {
          create: {
            name,
            ageBand,
            age: 0,
            diagnosis: "",
            historyHtml: "",
          },
          update: { name, ageBand },
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
