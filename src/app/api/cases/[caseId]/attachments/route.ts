import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  canUploadCaseAttachments,
  getCaseAttachmentAccess,
} from "@/lib/access/case-attachments";
import {
  ALLOWED_ATTACHMENT_TYPES,
  MAX_ATTACHMENT_BYTES,
  MAX_CASE_ATTACHMENTS,
} from "@/lib/case-attachments";
import { saveCaseFile } from "@/lib/storage";

type RouteContext = { params: Promise<{ caseId: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId } = await context.params;
  const access = await getCaseAttachmentAccess(session.user.id, caseId);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const attachments = await prisma.caseAttachment.findMany({
    where: { caseId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ attachments });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caseId } = await context.params;
  const canUpload = await canUploadCaseAttachments(session.user.id, caseId);
  if (!canUpload) {
    return NextResponse.json({ error: "Cannot upload to this case" }, { status: 403 });
  }

  const existingCount = await prisma.caseAttachment.count({ where: { caseId } });
  if (existingCount >= MAX_CASE_ATTACHMENTS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_CASE_ATTACHMENTS} files per case` },
      { status: 400 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size === 0) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 400 });
  }

  const mimeType = file.type || "application/octet-stream";
  if (!ALLOWED_ATTACHMENT_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: "Only PDF and image files are allowed" },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const attachment = await prisma.caseAttachment.create({
    data: {
      caseId,
      fileName: file.name,
      mimeType,
      storageKey: "",
      sizeBytes: file.size,
    },
  });

  try {
    const storageKey = await saveCaseFile(
      caseId,
      attachment.id,
      file.name,
      buffer,
    );
    const updated = await prisma.caseAttachment.update({
      where: { id: attachment.id },
      data: { storageKey },
      select: {
        id: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ attachment: updated });
  } catch {
    await prisma.caseAttachment.delete({ where: { id: attachment.id } });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
