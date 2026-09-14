import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireAdminSession } from "@/lib/access/admin";
import { prisma } from "@/lib/prisma";
import { storedFileResponse } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ caregiverId: string; documentId: string }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = await requireAdminSession(session);
  if (!admin.ok) {
    return NextResponse.json({ error: "Forbidden" }, { status: admin.status });
  }

  const { caregiverId, documentId } = await context.params;
  const document = await prisma.providerDocument.findFirst({
    where: { id: documentId, caregiverId },
  });
  if (!document?.storageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    return await storedFileResponse(document.storageKey, {
      contentType: document.mimeType,
      fileName: document.fileName,
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
