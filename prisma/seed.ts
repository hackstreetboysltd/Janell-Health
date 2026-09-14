/**
 * Local / staging demo dataset — idempotent.
 *
 *   npx prisma db seed
 *   # or: npm run db:seed
 *
 * Sign in with demo email + any name at the matching portal (ALLOW_DEV_LOGIN / non-prod).
 */
import "dotenv/config";
import {
  type BookingStatus,
  type CareCategory,
  type PaymentStatus,
  type Profession,
  type RateType,
  PrismaClient,
} from "@prisma/client";
import { splitCommission } from "../src/lib/commission";

const prisma = new PrismaClient();

const DEMO_EMAILS = [
  "patient@gmail.com",
  "family@gmail.com",
  "nurse@gmail.com",
  "caregiver@gmail.com",
  "doctor@gmail.com",
  "pending.nurse@gmail.com",
  "admin@gmail.com",
  "patient.demo@example.com",
  "giver.demo@example.com",
  "admin.demo@example.com",
] as const;

function daysFromNow(days: number, hour = 10, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function weekdayOffset(days: number, hour = 10): Date {
  const d = daysFromNow(days, hour);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + (days >= 0 ? 1 : -1));
  }
  return d;
}

async function clearDemoGraph() {
  const users = await prisma.user.findMany({
    where: { email: { in: [...DEMO_EMAILS] } },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  const caregivers = await prisma.caregiverProfile.findMany({
    where: { userId: { in: userIds } },
    select: { id: true },
  });
  const caregiverIds = caregivers.map((c) => c.id);

  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { patientId: { in: userIds } },
        ...(caregiverIds.length
          ? [{ caregiverId: { in: caregiverIds } }]
          : []),
      ],
    },
    select: { id: true, caseId: true },
  });
  const bookingIds = bookings.map((b) => b.id);
  const caseIds = bookings.map((b) => b.caseId);

  if (bookingIds.length) {
    await prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.review.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.visitNote.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.complaint.deleteMany({ where: { bookingId: { in: bookingIds } } });
    await prisma.notification.deleteMany({
      where: { bookingId: { in: bookingIds } },
    });
    await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  }

  await prisma.caseAttachment.deleteMany({
    where: { case: { patientId: { in: userIds } } },
  });
  await prisma.case.deleteMany({
    where: {
      OR: [
        { patientId: { in: userIds } },
        ...(caseIds.length ? [{ id: { in: caseIds } }] : []),
      ],
    },
  });

  if (caregiverIds.length) {
    await prisma.membershipPurchase.deleteMany({
      where: { caregiverId: { in: caregiverIds } },
    });
    await prisma.providerTimeOff.deleteMany({
      where: { caregiverId: { in: caregiverIds } },
    });
    await prisma.providerDocument.deleteMany({
      where: { caregiverId: { in: caregiverIds } },
    });
    await prisma.verificationAudit.deleteMany({
      where: { caregiverId: { in: caregiverIds } },
    });
    await prisma.complaint.deleteMany({
      where: { caregiverId: { in: caregiverIds } },
    });
  }

  await prisma.complaint.deleteMany({ where: { reporterId: { in: userIds } } });
  await prisma.notification.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.adminAuditLog.deleteMany({
    where: { adminUserId: { in: userIds } },
  });
}

async function upsertUser(input: {
  email: string;
  name: string;
  role: "PATIENT" | "CAREGIVER" | "ADMIN";
  phone?: string;
}) {
  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name,
      role: input.role,
      phone: input.phone,
      emailVerified: new Date(),
    },
    update: {
      name: input.name,
      role: input.role,
      phone: input.phone,
      emailVerified: new Date(),
    },
  });
}

async function upsertPatient(
  userId: string,
  data: {
    name: string;
    ageBand: "CHILD" | "ADULT" | "ELDERLY";
    age: number;
    diagnosis: string;
    historyHtml: string;
  },
) {
  return prisma.patientProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}

async function upsertGiver(
  userId: string,
  data: {
    fullName: string;
    nationalId: string;
    profession: Profession;
    professionId: string;
    region: string;
    address: string;
    lat: number;
    lng: number;
    rateType: RateType;
    rateKes: number;
    specializations: string[];
    bio: string;
    yearsExperience: number;
    verificationStatus:
      | "PENDING"
      | "UNDER_REVIEW"
      | "APPROVED"
      | "REJECTED"
      | "SUSPENDED";
    isActive: boolean;
    membershipTier?: "BASIC" | "PROFESSIONAL";
    membershipUntil?: Date | null;
    featuredUntil?: Date | null;
  },
) {
  return prisma.caregiverProfile.upsert({
    where: { userId },
    create: {
      userId,
      availableWeekdaysStart: "08:00",
      availableWeekdaysEnd: "18:00",
      availableWeekendsStart: "09:00",
      availableWeekendsEnd: "14:00",
      membershipTier: "BASIC",
      ...data,
    },
    update: data,
  });
}

type BookingSeed = {
  patientId: string;
  caregiverId: string;
  category: CareCategory;
  services: string[];
  wantHtml: string;
  careSummary: string;
  visitAddress: string;
  visitLat: number;
  visitLng: number;
  scheduledAt: Date;
  durationMinutes: number;
  rateKes: number;
  rateType: RateType;
  status: BookingStatus;
  institutionId?: string;
  paymentStatus?: PaymentStatus;
  mpesaPhone?: string;
  review?: { rating: number; comment: string };
  visitNote?: string;
  caseStatus?: "OPEN" | "BOOKED" | "COMPLETED" | "CANCELLED";
};

async function createLinkedBooking(seed: BookingSeed) {
  const { platformFee, caregiverPayout } = splitCommission(seed.rateKes);
  const caseStatus =
    seed.caseStatus ??
    (seed.status === "COMPLETED"
      ? "COMPLETED"
      : seed.status === "CANCELLED" || seed.status === "DECLINED"
        ? "CANCELLED"
        : seed.status === "CONFIRMED" || seed.status === "PENDING_PAYMENT"
          ? "BOOKED"
          : "OPEN");

  const caseRecord = await prisma.case.create({
    data: {
      patientId: seed.patientId,
      category: seed.category,
      ageBand: "ADULT",
      careSummary: seed.careSummary,
      wantHtml: seed.wantHtml,
      services: seed.services,
      visitAddress: seed.visitAddress,
      visitLat: seed.visitLat,
      visitLng: seed.visitLng,
      scheduledAt: seed.scheduledAt,
      durationMinutes: seed.durationMinutes,
      institutionId: seed.institutionId,
      status: caseStatus,
    },
  });

  const booking = await prisma.booking.create({
    data: {
      caseId: caseRecord.id,
      caregiverId: seed.caregiverId,
      patientId: seed.patientId,
      grossAmount: seed.rateKes,
      platformFee,
      caregiverPayout,
      scheduledAt: seed.scheduledAt,
      durationMinutes: seed.durationMinutes,
      visitAddress: seed.visitAddress,
      visitLat: seed.visitLat,
      visitLng: seed.visitLng,
      status: seed.status,
    },
  });

  if (seed.paymentStatus) {
    await prisma.payment.create({
      data: {
        bookingId: booking.id,
        mpesaPhone: seed.mpesaPhone ?? "254712345678",
        checkoutRequestId: `demo-chk-${booking.id.slice(-8)}`,
        merchantRequestId: `demo-mrc-${booking.id.slice(-8)}`,
        resultCode: seed.paymentStatus === "SUCCESS" ? 0 : 1,
        status: seed.paymentStatus,
      },
    });
  }

  if (seed.review) {
    await prisma.review.create({
      data: {
        bookingId: booking.id,
        caregiverId: seed.caregiverId,
        patientId: seed.patientId,
        rating: seed.review.rating,
        comment: seed.review.comment,
      },
    });
  }

  if (seed.visitNote) {
    await prisma.visitNote.create({
      data: {
        bookingId: booking.id,
        caregiverId: seed.caregiverId,
        body: seed.visitNote,
      },
    });
  }

  return booking;
}

async function main() {
  console.log("Seeding Janell Health demo data…");

  await clearDemoGraph();

  const knh = await prisma.institution.upsert({
    where: { slug: "knh" },
    create: {
      name: "Kenyatta National Hospital",
      slug: "knh",
      description:
        "Discharge-to-home nursing referrals for patients leaving KNH wards.",
      contactPhone: "0202726300",
      isActive: true,
    },
    update: {
      name: "Kenyatta National Hospital",
      description:
        "Discharge-to-home nursing referrals for patients leaving KNH wards.",
      contactPhone: "0202726300",
      isActive: true,
    },
  });

  const nairobiHospital = await prisma.institution.upsert({
    where: { slug: "nairobi-hospital" },
    create: {
      name: "The Nairobi Hospital",
      slug: "nairobi-hospital",
      description: "Partner discharge pathway for home nursing and wound care.",
      contactPhone: "0703072222",
      isActive: true,
    },
    update: {
      name: "The Nairobi Hospital",
      description: "Partner discharge pathway for home nursing and wound care.",
      contactPhone: "0703072222",
      isActive: true,
    },
  });

  const ambulanceSeeds = [
    {
      name: "AAR Emergency Ambulance",
      phone: "0722222252",
      coverageArea: "Nairobi metro",
      services: [
        "Emergency road ambulance",
        "ICU / ALS transfer",
        "Event standby",
      ],
      monthlyFeeKes: 1500,
      sortOrder: 1,
    },
    {
      name: "St John Ambulance Kenya",
      phone: "0721221321",
      coverageArea: "Nairobi & environs",
      services: [
        "Emergency road ambulance",
        "First aid response",
        "Hospital transfer",
      ],
      monthlyFeeKes: 1000,
      sortOrder: 2,
    },
    {
      name: "Amref Flying Doctors (road)",
      phone: "0703074000",
      coverageArea: "Greater Nairobi",
      services: [
        "Emergency road ambulance",
        "Critical care transfer",
        "Inter-facility evacuation",
      ],
      monthlyFeeKes: 2000,
      sortOrder: 3,
    },
  ];

  for (const row of ambulanceSeeds) {
    const existing = await prisma.ambulanceProvider.findFirst({
      where: { name: row.name },
    });
    if (existing) {
      await prisma.ambulanceProvider.update({
        where: { id: existing.id },
        data: { ...row, isActive: true },
      });
    } else {
      await prisma.ambulanceProvider.create({
        data: { ...row, isActive: true },
      });
    }
  }

  const admin = await upsertUser({
    email: "admin@gmail.com",
    name: "Ops Admin",
    role: "ADMIN",
    phone: "254700000001",
  });
  await upsertUser({
    email: "admin.demo@example.com",
    name: "Ops Demo",
    role: "ADMIN",
    phone: "254700000002",
  });

  const patient = await upsertUser({
    email: "patient@gmail.com",
    name: "Amina Otieno",
    role: "PATIENT",
    phone: "254712000101",
  });
  await upsertPatient(patient.id, {
    name: "Amina Otieno",
    ageBand: "ADULT",
    age: 42,
    diagnosis: "Type 2 diabetes · post-op wound care",
    historyHtml:
      "<p>Controlled T2DM. Recent minor surgery; needs dressing changes and vitals checks at home.</p>",
  });

  const family = await upsertUser({
    email: "family@gmail.com",
    name: "Grace Mwangi",
    role: "PATIENT",
    phone: "254712000102",
  });
  await upsertPatient(family.id, {
    name: "Joseph Mwangi (father)",
    ageBand: "ELDERLY",
    age: 78,
    diagnosis: "Stroke recovery · limited mobility",
    historyHtml:
      "<p>Family booking for elderly father. Needs daytime caregiving and transfer help.</p>",
  });

  await upsertUser({
    email: "patient.demo@example.com",
    name: "Patient Demo",
    role: "PATIENT",
    phone: "254712000103",
  }).then((u) =>
    upsertPatient(u.id, {
      name: "Patient Demo",
      ageBand: "ADULT",
      age: 35,
      diagnosis: "General home nursing",
      historyHtml: "<p>Demo patient record for local exploration.</p>",
    }),
  );

  const nurseUser = await upsertUser({
    email: "nurse@gmail.com",
    name: "Jane Wanjiku",
    role: "CAREGIVER",
    phone: "254722000201",
  });
  const nurse = await upsertGiver(nurseUser.id, {
    fullName: "Jane Wanjiku, RN",
    nationalId: "28456789",
    profession: "NURSE",
    professionId: "NCK-48291",
    region: "kilimani",
    address: "Argwings Kodhek Rd, Kilimani, Nairobi",
    lat: -1.289,
    lng: 36.785,
    rateType: "VISIT",
    rateKes: 4500,
    specializations: [
      "home-nursing-visit",
      "vitals",
      "medication",
      "wound-dressing",
      "post-hospitalization",
    ],
    bio: "Registered nurse with home-visit wound care and post-hospital support across Kilimani and Westlands.",
    yearsExperience: 9,
    verificationStatus: "APPROVED",
    isActive: true,
    membershipTier: "PROFESSIONAL",
    membershipUntil: daysFromNow(25),
    featuredUntil: daysFromNow(12),
  });

  const caregiverUser = await upsertUser({
    email: "caregiver@gmail.com",
    name: "Peter Kamau",
    role: "CAREGIVER",
    phone: "254722000202",
  });
  const caregiver = await upsertGiver(caregiverUser.id, {
    fullName: "Peter Kamau",
    nationalId: "30112233",
    profession: "CAREGIVER",
    professionId: "CG-77821",
    region: "westlands",
    address: "Ring Rd Parklands, Westlands, Nairobi",
    lat: -1.267,
    lng: 36.81,
    rateType: "HOURLY",
    rateKes: 800,
    specializations: [
      "bathing",
      "feeding",
      "mobility",
      "companionship",
      "daytime",
      "elder-care-visit",
    ],
    bio: "Experienced home caregiver for elderly clients — mobility, hygiene, and companionship.",
    yearsExperience: 6,
    verificationStatus: "APPROVED",
    isActive: true,
    membershipTier: "BASIC",
  });

  const doctorUser = await upsertUser({
    email: "doctor@gmail.com",
    name: "Dr. Sarah Njeri",
    role: "CAREGIVER",
    phone: "254722000203",
  });
  const doctor = await upsertGiver(doctorUser.id, {
    fullName: "Dr. Sarah Njeri",
    nationalId: "27554411",
    profession: "DOCTOR",
    professionId: "KMPDC-11902",
    region: "karen",
    address: "Karen Road, Nairobi",
    lat: -1.3197,
    lng: 36.7115,
    rateType: "VISIT",
    rateKes: 8000,
    specializations: [
      "home-nursing-visit",
      "chronic-support",
      "palliative",
      "post-op",
    ],
    bio: "GP offering scheduled home visits for chronic care and post-op reviews.",
    yearsExperience: 12,
    verificationStatus: "APPROVED",
    isActive: true,
    membershipTier: "PROFESSIONAL",
    membershipUntil: daysFromNow(18),
  });

  const pendingUser = await upsertUser({
    email: "pending.nurse@gmail.com",
    name: "Mercy Achieng",
    role: "CAREGIVER",
    phone: "254722000204",
  });
  const pending = await upsertGiver(pendingUser.id, {
    fullName: "Mercy Achieng",
    nationalId: "29887766",
    profession: "NURSE",
    professionId: "NCK-55102",
    region: "eastlands",
    address: "Jogoo Road, Eastlands, Nairobi",
    lat: -1.2864,
    lng: 36.8915,
    rateType: "VISIT",
    rateKes: 4000,
    specializations: ["home-nursing-visit", "vitals", "medication"],
    bio: "Newly onboarded nurse — documents submitted, awaiting admin review.",
    yearsExperience: 3,
    verificationStatus: "UNDER_REVIEW",
    isActive: false,
  });

  await upsertUser({
    email: "giver.demo@example.com",
    name: "Giver Demo",
    role: "CAREGIVER",
    phone: "254722000205",
  }).then((u) =>
    upsertGiver(u.id, {
      fullName: "Giver Demo, RN",
      nationalId: "20000001",
      profession: "NURSE",
      professionId: "NCK-DEMO",
      region: "cbd",
      address: "CBD, Nairobi",
      lat: -1.2864,
      lng: 36.8172,
      rateType: "VISIT",
      rateKes: 3500,
      specializations: ["home-nursing-visit", "vitals", "wound-dressing"],
      bio: "Demo caregiver for local exploration.",
      yearsExperience: 4,
      verificationStatus: "APPROVED",
      isActive: true,
    }),
  );

  await prisma.membershipPurchase.create({
    data: {
      caregiverId: nurse.id,
      plan: "professional",
      idempotencyKey: `seed-pro-${nurse.id}`,
    },
  });
  await prisma.membershipPurchase.create({
    data: {
      caregiverId: nurse.id,
      plan: "featured",
      idempotencyKey: `seed-feat-${nurse.id}`,
    },
  });

  await prisma.verificationAudit.create({
    data: {
      caregiverId: nurse.id,
      adminUserId: admin.id,
      action: "APPROVED",
      note: "License and national ID verified (seed).",
    },
  });
  await prisma.verificationAudit.create({
    data: {
      caregiverId: pending.id,
      adminUserId: admin.id,
      action: "UNDER_REVIEW",
      note: "Documents received — awaiting final check (seed).",
    },
  });

  await prisma.providerTimeOff.create({
    data: {
      caregiverId: nurse.id,
      date: daysFromNow(5),
      startTime: "08:00",
      endTime: "18:00",
      note: "Clinic shift",
    },
  });

  // --- Linked bookings (patient ↔ nurse / caregiver / doctor) ---
  const kilimani = {
    visitAddress: "Riara Road, Kilimani, Nairobi",
    visitLat: -1.291,
    visitLng: 36.788,
  };
  const westlands = {
    visitAddress: "Mpaka Road, Westlands, Nairobi",
    visitLat: -1.268,
    visitLng: 36.808,
  };

  await createLinkedBooking({
    patientId: patient.id,
    caregiverId: nurse.id,
    category: "WOUND_CARE",
    services: ["wound-dressing", "vitals"],
    wantHtml: "<p>Daily dressing change for surgical site.</p>",
    careSummary: "Post-op wound dressing",
    ...kilimani,
    scheduledAt: weekdayOffset(-5, 10),
    durationMinutes: 90,
    rateKes: 4500,
    rateType: "VISIT",
    status: "COMPLETED",
    institutionId: knh.id,
    paymentStatus: "SUCCESS",
    mpesaPhone: "254712000101",
    review: {
      rating: 5,
      comment: "Jane was thorough and kind. Wound looks much better.",
    },
    visitNote:
      "Dressing changed; site clean, no infection signs. Vitals stable. Continue daily dressings.",
  });

  await createLinkedBooking({
    patientId: patient.id,
    caregiverId: nurse.id,
    category: "HOME_NURSING",
    services: ["home-nursing-visit", "medication", "vitals"],
    wantHtml: "<p>Follow-up nursing visit and meds check.</p>",
    careSummary: "Home nursing follow-up",
    ...kilimani,
    scheduledAt: weekdayOffset(2, 11),
    durationMinutes: 120,
    rateKes: 4500,
    rateType: "VISIT",
    status: "CONFIRMED",
    paymentStatus: "SUCCESS",
    mpesaPhone: "254712000101",
  });

  await createLinkedBooking({
    patientId: patient.id,
    caregiverId: nurse.id,
    category: "POST_HOSPITAL",
    services: ["post-hospitalization", "vitals"],
    wantHtml: "<p>Post-discharge check after clinic review.</p>",
    careSummary: "Post-hospital support",
    ...kilimani,
    scheduledAt: weekdayOffset(4, 9),
    durationMinutes: 90,
    rateKes: 4500,
    rateType: "VISIT",
    status: "PENDING_PAYMENT",
    institutionId: nairobiHospital.id,
  });

  await createLinkedBooking({
    patientId: patient.id,
    caregiverId: doctor.id,
    category: "HOME_NURSING",
    services: ["chronic-support", "home-nursing-visit"],
    wantHtml: "<p>GP home review for diabetes management.</p>",
    careSummary: "Chronic care review",
    ...kilimani,
    scheduledAt: weekdayOffset(6, 15),
    durationMinutes: 60,
    rateKes: 8000,
    rateType: "VISIT",
    status: "PENDING_PROVIDER",
  });

  const caregiverHours = 4;
  const caregiverGross = 800 * caregiverHours;
  await createLinkedBooking({
    patientId: family.id,
    caregiverId: caregiver.id,
    category: "ELDERLY_CARE",
    services: ["daytime", "mobility", "bathing"],
    wantHtml: "<p>Daytime care for elderly father — transfers and hygiene.</p>",
    careSummary: "Elderly daytime care",
    ...westlands,
    scheduledAt: weekdayOffset(-3, 9),
    durationMinutes: caregiverHours * 60,
    rateKes: caregiverGross,
    rateType: "HOURLY",
    status: "COMPLETED",
    paymentStatus: "SUCCESS",
    mpesaPhone: "254712000102",
    review: {
      rating: 4,
      comment: "Peter was patient with Dad. Would book again.",
    },
    visitNote:
      "Assisted with bathing and transfers. Appetite fair. Family briefed on fall precautions.",
  });

  await createLinkedBooking({
    patientId: family.id,
    caregiverId: caregiver.id,
    category: "CAREGIVER",
    services: ["companionship", "feeding", "daytime"],
    wantHtml: "<p>Companion daytime shift while family is at work.</p>",
    careSummary: "Daytime companionship",
    ...westlands,
    scheduledAt: weekdayOffset(1, 8),
    durationMinutes: 360,
    rateKes: 800 * 6,
    rateType: "HOURLY",
    status: "CONFIRMED",
    paymentStatus: "SUCCESS",
    mpesaPhone: "254712000102",
  });

  await createLinkedBooking({
    patientId: family.id,
    caregiverId: nurse.id,
    category: "HOME_NURSING",
    services: ["vitals", "medication"],
    wantHtml: "<p>Nurse vitals + meds for elderly father.</p>",
    careSummary: "Nursing vitals visit",
    ...westlands,
    scheduledAt: weekdayOffset(3, 14),
    durationMinutes: 60,
    rateKes: 4500,
    rateType: "VISIT",
    status: "PENDING_PROVIDER",
  });

  await prisma.complaint.create({
    data: {
      reporterId: family.id,
      caregiverId: caregiver.id,
      type: "SUPPORT",
      subject: "Question about overnight rates",
      body: "Can we book an overnight stay next month? (seed support ticket)",
      status: "OPEN",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: nurseUser.id,
        type: "BOOKING_REQUEST",
        title: "New booking request",
        body: "Amina Otieno requested a chronic-care review with Dr. Njeri — you have related visits this week.",
      },
      {
        userId: patient.id,
        type: "BOOKING_CONFIRMED",
        title: "Visit confirmed",
        body: "Jane Wanjiku confirmed your home nursing follow-up.",
      },
      {
        userId: caregiverUser.id,
        type: "BOOKING_CONFIRMED",
        title: "Visit confirmed",
        body: "Grace Mwangi paid for the daytime companionship visit.",
      },
    ],
  });

  const summary = {
    users: await prisma.user.count({
      where: { email: { in: [...DEMO_EMAILS] } },
    }),
    patients: await prisma.patientProfile.count(),
    givers: await prisma.caregiverProfile.count(),
    bookings: await prisma.booking.count(),
    payments: await prisma.payment.count({ where: { status: "SUCCESS" } }),
    institutions: await prisma.institution.count(),
    ambulances: await prisma.ambulanceProvider.count({
      where: { isActive: true },
    }),
    pendingVerification: await prisma.caregiverProfile.count({
      where: { verificationStatus: { in: ["PENDING", "UNDER_REVIEW"] } },
    }),
  };

  console.log("Demo seed complete.");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`
Demo logins (email + any name, matching portal):
  patient@gmail.com       → Patient   (bookings with nurse & doctor)
  family@gmail.com        → Patient   (elderly care with caregiver)
  nurse@gmail.com         → Caregiver (approved RN, Pro + Featured)
  caregiver@gmail.com     → Caregiver (approved caregiver)
  doctor@gmail.com        → Caregiver (approved GP)
  pending.nurse@gmail.com → Caregiver (under review — admin queue)
  admin@gmail.com         → Admin
`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
