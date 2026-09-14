import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import { MIN_DOCUMENTS_FOR_REVIEW } from "@/lib/provider-documents";

type RouteContext = { params: Promise<{ caregiverId: string }> };

export async function POST(req: Request, context: RouteContext) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caregiverId } = await context.params;
  const profile = await prisma.caregiverProfile.findFirst({
    where: { id: caregiverId, userId: session.user.id },
    include: { _count: { select: { documents: true } } },
  });

  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (profile.verificationStatus === "APPROVED") {
    return NextResponse.json({ error: "Already verified" }, { status: 400 });
  }

  if (profile.verificationStatus === "UNDER_REVIEW") {
    return NextResponse.json({ ok: true, status: "UNDER_REVIEW" });
  }

  if (profile._count.documents < MIN_DOCUMENTS_FOR_REVIEW) {
    return NextResponse.json(
      {
        error: `Upload at least ${MIN_DOCUMENTS_FOR_REVIEW} documents (national ID and license).`,
      },
      { status: 400 },
    );
  }

  await prisma.caregiverProfile.update({
    where: { id: caregiverId },
    data: {
      verificationStatus: "UNDER_REVIEW",
      verificationNote: null,
    },
  });

  return NextResponse.json({ ok: true, status: "UNDER_REVIEW" });
}
