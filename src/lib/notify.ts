import { prisma } from "@/lib/prisma";
import { sendSms } from "@/lib/sms";

type NotifyInput = {
  userId: string;
  phone?: string | null;
  bookingId?: string;
  type: string;
  title: string;
  body: string;
};

export async function notifyUser(input: NotifyInput) {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      bookingId: input.bookingId,
      type: input.type,
      title: input.title,
      body: input.body,
    },
  });

  if (input.phone) {
    await sendSms(input.phone, `${input.title}: ${input.body}`);
  }
}

export type CaregiverRating = {
  average: number;
  count: number;
};

export async function getCaregiverRating(
  caregiverId: string,
): Promise<CaregiverRating> {
  const agg = await prisma.review.aggregate({
    where: { caregiverId, hidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });
  return {
    average: agg._avg.rating ?? 0,
    count: agg._count.rating,
  };
}

export async function getCaregiverRatingsMap(
  caregiverIds: string[],
): Promise<Map<string, CaregiverRating>> {
  if (caregiverIds.length === 0) return new Map();

  const rows = await prisma.review.groupBy({
    by: ["caregiverId"],
    where: { caregiverId: { in: caregiverIds }, hidden: false },
    _avg: { rating: true },
    _count: { rating: true },
  });

  const map = new Map<string, CaregiverRating>();
  for (const row of rows) {
    map.set(row.caregiverId, {
      average: row._avg.rating ?? 0,
      count: row._count.rating,
    });
  }
  return map;
}

export function formatRating(average: number, count: number): string {
  if (count === 0) return "No reviews yet";
  return `${average.toFixed(1)} ★ (${count})`;
}
