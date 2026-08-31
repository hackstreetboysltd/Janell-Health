import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCaseAttachmentAccess } from "@/lib/access/case-attachments";
import { readCaseFile } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ caseId: string; attachmentId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId, attachmentId } = await context.params;
  const access = await getCaseAttachmentAccess(session.user.id, caseId);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachment = await prisma.caseAttachment.findFirst({
    where: { id: attachmentId, caseId },
  });
  if (!attachment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const data = await readCaseFile(attachment.storageKey);
    return new NextResponse(data, {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(attachment.fileName)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
