import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { isAdminUser } from "@/lib/access/admin";
import { enforceApiRateLimits } from "@/lib/api-rate-limit";
import { prisma } from "@/lib/prisma";
import {
  ALLOWED_PROVIDER_DOC_TYPES,
  MAX_PROVIDER_DOC_BYTES,
  MAX_PROVIDER_DOCUMENTS,
} from "@/lib/provider-documents";
import { secureBinaryUpload } from "@/lib/upload-security";
import { saveProviderDocumentFile } from "@/lib/storage";
import type { ProviderDocumentType } from "@prisma/client";

type RouteContext = { params: Promise<{ caregiverId: string }> };

async function documentAccess(
  userId: string,
  email: string,
  caregiverId: string,
) {
  const profile = await prisma.caregiverProfile.findUnique({
    where: { id: caregiverId },
    select: { userId: true },
  });
  if (!profile) return "none" as const;
  if (profile.userId === userId) return "owner" as const;
  if (await isAdminUser(userId)) return "admin" as const;
  return "none" as const;
}

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caregiverId } = await context.params;
  const access = await documentAccess(
    session.user.id,
    session.user.email,
    caregiverId,
  );
  if (access === "none") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const documents = await prisma.providerDocument.findMany({
    where: { caregiverId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      documentType: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: Request, context: RouteContext) {
  const limited = await enforceApiRateLimits(req);
  if (limited) return limited;

  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { caregiverId } = await context.params;
  const access = await documentAccess(
    session.user.id,
    session.user.email,
    caregiverId,
  );
  if (access !== "owner") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const profile = await prisma.caregiverProfile.findUnique({
    where: { id: caregiverId },
    select: { verificationStatus: true },
  });
  if (
    !profile ||
    profile.verificationStatus === "APPROVED" ||
    profile.verificationStatus === "SUSPENDED"
  ) {
    return NextResponse.json({ error: "Cannot upload documents now" }, { status: 403 });
  }

  const existingCount = await prisma.providerDocument.count({ where: { caregiverId } });
  if (existingCount >= MAX_PROVIDER_DOCUMENTS) {
    return NextResponse.json(
      { error: `Maximum ${MAX_PROVIDER_DOCUMENTS} documents` },
      { status: 400 },
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");
  const documentTypeRaw = String(formData.get("documentType") || "OTHER");
  const documentTypeSchema = z.enum([
    "NATIONAL_ID",
    "PROFESSION_LICENSE",
    "CERTIFICATE",
    "OTHER",
  ]);
  const parsedType = documentTypeSchema.safeParse(documentTypeRaw);
  if (!(file instanceof File) || !parsedType.success) {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (file.size === 0 || file.size > MAX_PROVIDER_DOC_BYTES) {
    return NextResponse.json({ error: "Invalid file size" }, { status: 400 });
  }

  const claimedMime = file.type || "application/octet-stream";
  if (
    claimedMime !== "application/octet-stream" &&
    !ALLOWED_PROVIDER_DOC_TYPES.has(claimedMime)
  ) {
    return NextResponse.json({ error: "Only PDF and images allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validated = await secureBinaryUpload({
    buffer,
    claimedMime,
    allowedTypes: ALLOWED_PROVIDER_DOC_TYPES,
  });
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: validated.status });
  }
  const mimeType = validated.mimeType;

  const document = await prisma.providerDocument.create({
    data: {
      caregiverId,
      documentType: parsedType.data as ProviderDocumentType,
      fileName: file.name,
      mimeType,
      storageKey: "",
      sizeBytes: file.size,
    },
  });

  try {
    const storageKey = await saveProviderDocumentFile(
      caregiverId,
      document.id,
      file.name,
      buffer,
      mimeType,
    );
    const updated = await prisma.providerDocument.update({
      where: { id: document.id },
      data: { storageKey },
      select: {
        id: true,
        documentType: true,
        fileName: true,
        mimeType: true,
        sizeBytes: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ document: updated });
  } catch {
    await prisma.providerDocument.delete({ where: { id: document.id } });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
