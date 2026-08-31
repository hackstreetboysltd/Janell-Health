import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().min(9),
  age: z.number().int().min(0).max(120),
  diagnosis: z.string().min(2),
  historyHtml: z.string().min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the form fields" }, { status: 400 });
  }

  const { name, phone, age, diagnosis, historyHtml } = parsed.data;

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      phone,
      role: "PATIENT",
      name,
      patientProfile: {
        upsert: {
          create: { name, age, diagnosis, historyHtml },
          update: { name, age, diagnosis, historyHtml },
        },
      },
    },
  });

  return NextResponse.json({ ok: true });
}
