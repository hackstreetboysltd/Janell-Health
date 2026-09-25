"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AdminNextUp, AdminUnderlineTabs } from "@/components/admin-next-up";
import { RecordCard } from "@/components/record-card";
import { ModuleHeading } from "@/components/module-heading";
import {
  bookingStatusPresentation,
  verificationStatusPresentation,
} from "@/lib/booking-status-ui";
import { formatKes } from "@/lib/commission";

export type AdminGiverItem = {
  id: string;
  fullName: string;
  profession: string;
  verificationStatus: string;
};

export type AdminPatientItem = {
  id: string;
  name: string;
  ageBand: string;
  age: number;
  diagnosis: string;
  contact: string;
};

export type AdminPartnerItem = {
  id: string;
  name: string;
  detail: string;
  status: string;
};

export type AdminOverviewData = {
  pendingVerification: number;
  patientCount: number;
  liveBookings: number;
  bookingsThisWeek: number;
  paymentsSuccessWeek: number;
  paymentsFailedWeek: number;
  paymentsPending: number;
  system: {
    status: "ok" | "degraded";
    errorRatePct: number;
    requests: number;
  };
};

export type AdminBookingItem = {
  id: string;
  status: string;
  scheduledAt: string;
  grossAmount: number;
  caregiverName: string;
  patientName: string;
};

export type AdminDashboardData = {
  overview: AdminOverviewData;
  givers: AdminGiverItem[];
  patients: AdminPatientItem[];
  bookings: AdminBookingItem[];
  institutions: AdminPartnerItem[];
  ambulances: AdminPartnerItem[];
  referralCases: number;
};

type DeskId = "dashboard" | "patients" | "givers" | "partners";
type GiversLane = "nurses" | "caregivers";

function isNurseProfession(profession: string): boolean {
  return profession === "NURSE" || profession === "DOCTOR";
}

function isCaregiverProfession(profession: string): boolean {
  return profession === "CAREGIVER";
}

function pendingReviewCount(givers: AdminGiverItem[]): number {
  return givers.filter((q) =>
    ["PENDING", "UNDER_REVIEW"].includes(q.verificationStatus),
  ).length;
}

const DESKS: {
  id: DeskId;
  label: string;
  icon: (props: { active: boolean }) => ReactNode;
}[] = [
  { id: "dashboard", label: "Dashboard", icon: IconDashboard },
  { id: "patients", label: "Patients", icon: IconPatients },
  { id: "givers", label: "Healthcare givers", icon: IconGivers },
  { id: "partners", label: "Partners", icon: IconPartners },
];

export function AdminDashboardTabs({ data }: { data: AdminDashboardData }) {
  const [desk, setDesk] = useState<DeskId>("dashboard");
  const [giversLane, setGiversLane] = useState<GiversLane>("nurses");
  const baseId = useId();

  const jumpTo = useCallback((next: DeskId, lane?: GiversLane) => {
    if (next === "givers" && lane) setGiversLane(lane);
    setDesk(next);
  }, []);

  const badges = useMemo(
    () => ({
      givers: pendingReviewCount(data.givers),
      patients: data.patients.length,
    }),
    [data.givers, data.patients],
  );

  const onDockKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const idx = DESKS.findIndex((d) => d.id === desk);
      if (idx < 0) return;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setDesk(DESKS[(idx + 1) % DESKS.length]!.id);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setDesk(DESKS[(idx - 1 + DESKS.length) % DESKS.length]!.id);
      } else if (event.key === "Home") {
        event.preventDefault();
        setDesk(DESKS[0]!.id);
      } else if (event.key === "End") {
        event.preventDefault();
        setDesk(DESKS[DESKS.length - 1]!.id);
      }
    },
    [desk],
  );

  const active = DESKS.find((d) => d.id === desk) ?? DESKS[0]!;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 pt-3">
        <ModuleHeading
          wrapperClassName="min-w-0"
          className="truncate font-display text-[1.65rem] leading-none tracking-tight text-ink"
          backHref="/"
          showBack={desk !== "dashboard"}
          trailing={desk === "dashboard" ? undefined : <LiveClock />}
        >
          {deskTitle(desk)}
        </ModuleHeading>
        {desk === "dashboard" ? (
          <DashboardHeader overview={data.overview} />
        ) : (
          <p className="mt-1.5 truncate text-center text-xs text-ink/50">
            {deskSubtitle(desk, data)}
          </p>
        )}
      </header>

      <section
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        className={[
          "mt-3 flex min-h-0 flex-1 flex-col overflow-hidden",
          desk === "dashboard" ? "justify-start" : "",
        ].join(" ")}
        key={desk}
      >
        <div
          className={[
            "flex min-h-0 flex-col animate-fade-up",
            desk === "dashboard" ? "w-full shrink-0" : "flex-1",
          ].join(" ")}
        >
          {desk === "dashboard" ? (
            <DashboardDesk
              overview={data.overview}
              givers={data.givers}
              bookings={data.bookings}
              onJump={jumpTo}
            />
          ) : null}
          {desk === "patients" ? <PatientsDesk items={data.patients} /> : null}
          {desk === "givers" ? (
            <GiversDesk
              givers={data.givers}
              lane={giversLane}
              onLaneChange={setGiversLane}
            />
          ) : null}
          {desk === "partners" ? (
            <PartnersDesk
              institutions={data.institutions}
              ambulances={data.ambulances}
              referralCases={data.referralCases}
            />
          ) : null}
        </div>
      </section>

      <nav
        role="tablist"
        aria-label="Ops desks"
        onKeyDown={onDockKeyDown}
        className="mt-1.5 shrink-0 border-t border-mist/80 pt-1.5 pb-[max(0.35rem,env(safe-area-inset-bottom))]"
      >
        <div className="grid grid-cols-4 gap-0.5">
          {DESKS.map((d) => {
            const selected = d.id === desk;
            const count = badges[d.id as keyof typeof badges];
            return (
              <button
                key={d.id}
                type="button"
                role="tab"
                id={`${baseId}-tab-${d.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${d.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setDesk(d.id)}
                className={[
                  "relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold transition",
                  selected
                    ? "bg-sage/15 text-sage"
                    : "text-ink/45 hover:bg-mist/35 hover:text-ink",
                ].join(" ")}
              >
                {d.icon({ active: selected })}
                <span className="max-w-full truncate px-0.5 text-center leading-tight">
                  {d.label}
                </span>
                {typeof count === "number" && count > 0 ? (
                  <span
                    className={[
                      "absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-alert px-0.5 text-[8px] font-bold text-white",
                      selected ? "" : "animate-ops-pulse",
                    ].join(" ")}
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function deskTitle(desk: DeskId): string {
  switch (desk) {
    case "dashboard":
      return "Dashboard";
    case "patients":
      return "Patients";
    case "givers":
      return "Healthcare givers";
    case "partners":
      return "Partners";
  }
}

function deskSubtitle(desk: DeskId, data: AdminDashboardData): string {
  switch (desk) {
    case "dashboard":
      return "Ops health and open work";
    case "patients":
      return data.patients.length === 0
        ? "No patient profiles yet"
        : `${data.patients.length} patient${data.patients.length === 1 ? "" : "s"}`;
    case "givers":
      return data.givers.length === 0
        ? "No givers yet"
        : `${data.givers.length} · ${pendingReviewCount(data.givers)} waiting`;
    case "partners":
      return `${data.referralCases} referral care request${data.referralCases === 1 ? "" : "s"}`;
  }
}

function DashboardHeader({ overview }: { overview: AdminOverviewData }) {
  const systemWarn = overview.system.status === "degraded";

  return (
    <div className="mt-1.5 flex flex-col items-center gap-1 text-center">
      <div className="flex items-center gap-2">
        <LiveClock />
        <span
          title={
            overview.system.requests === 0
              ? "No instrumented API samples in the last 15 minutes"
              : `API error rate ${overview.system.errorRatePct}% over ${overview.system.requests} requests (15m)`
          }
          className={[
            "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
            systemWarn
              ? "border-alert/40 bg-alert/10 text-alert"
              : "border-sage/30 bg-sage/10 text-sage",
          ].join(" ")}
        >
          {systemWarn ? "Degraded" : "Live"}
        </span>
      </div>
      <p className="text-xs text-ink/50">Tap a card. Jump in.</p>
    </div>
  );
}

type StandingCardId = "pending" | "patients" | "bookings" | "payments";

type StandingCard = {
  id: StandingCardId;
  label: string;
  value: number;
  hint: string;
  hot: boolean;
  desk?: DeskId;
  lane?: GiversLane;
  openBookings?: boolean;
};

function DashboardDesk({
  overview,
  givers,
  bookings,
  onJump,
}: {
  overview: AdminOverviewData;
  givers: AdminGiverItem[];
  bookings: AdminBookingItem[];
  onJump: (desk: DeskId, lane?: GiversLane) => void;
}) {
  const [showBookings, setShowBookings] = useState(false);

  const pendingNurses = pendingReviewCount(
    givers.filter((g) => isNurseProfession(g.profession)),
  );
  const pendingCaregivers = pendingReviewCount(
    givers.filter((g) => isCaregiverProfession(g.profession)),
  );
  const pendingLane: GiversLane =
    pendingNurses > 0 || pendingCaregivers === 0 ? "nurses" : "caregivers";

  const cards: StandingCard[] = [
    {
      id: "pending",
      label: "Pending",
      value: overview.pendingVerification,
      hint:
        overview.pendingVerification === 0
          ? "All clear"
          : "Needs a look",
      hot: overview.pendingVerification > 0,
      desk: "givers",
      lane: pendingLane,
    },
    {
      id: "patients",
      label: "Patients",
      value: overview.patientCount,
      hint:
        overview.patientCount === 0
          ? "None onboarded"
          : "On the platform",
      hot: false,
      desk: "patients",
    },
    {
      id: "bookings",
      label: "Bookings",
      value: overview.liveBookings,
      hint:
        overview.bookingsThisWeek === 0
          ? "No new this week"
          : `${overview.bookingsThisWeek} this week`,
      hot: false,
      openBookings: true,
    },
    {
      id: "payments",
      label: "Payments",
      value: overview.paymentsSuccessWeek,
      hint:
        overview.paymentsFailedWeek > 0 || overview.paymentsPending > 0
          ? `${overview.paymentsFailedWeek} failed · ${overview.paymentsPending} pending`
          : "Paid this week",
      hot: overview.paymentsFailedWeek > 0 || overview.paymentsPending > 2,
    },
  ];

  if (showBookings) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden animate-fade-up">
        <button
          type="button"
          onClick={() => setShowBookings(false)}
          className="mb-1 shrink-0 self-start rounded-lg px-1 py-1 text-xs font-semibold text-sage hover:bg-sage/10"
        >
          ← Dashboard
        </button>
        <BookingsLane items={bookings} />
      </div>
    );
  }

  return (
    <div className="admin-stat-grid">
      {cards.map((card) => {
        const interactive = Boolean(card.desk || card.openBookings);
        const className = [
          "admin-stat",
          card.hot ? "hot" : "",
          interactive ? "" : "admin-stat-static",
        ]
          .filter(Boolean)
          .join(" ");

        const body = (
          <>
            <span className="admin-stat-label">{card.label}</span>
            <span className="admin-stat-value tabular-nums">{card.value}</span>
            <span className="admin-stat-hint">{card.hint}</span>
          </>
        );

        if (!interactive) {
          return (
            <div key={card.id} className={className}>
              {body}
            </div>
          );
        }

        return (
          <button
            key={card.id}
            type="button"
            onClick={() => {
              if (card.desk) {
                onJump(card.desk, card.lane);
                return;
              }
              if (card.openBookings) setShowBookings(true);
            }}
            className={className}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

function GiversDesk({
  givers,
  lane,
  onLaneChange,
}: {
  givers: AdminGiverItem[];
  lane: GiversLane;
  onLaneChange: (lane: GiversLane) => void;
}) {
  const nurses = givers.filter((g) => isNurseProfession(g.profession));
  const caregivers = givers.filter((g) => isCaregiverProfession(g.profession));
  const active = lane === "nurses" ? nurses : caregivers;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <AdminUnderlineTabs
        label="Profession"
        value={lane}
        onChange={onLaneChange}
        tabs={[
          {
            id: "nurses",
            label: "Nurses",
            count: nurses.length,
            hint:
              pendingReviewCount(nurses) > 0
                ? `· ${pendingReviewCount(nurses)} waiting`
                : "· clear",
          },
          {
            id: "caregivers",
            label: "Caregivers",
            count: caregivers.length,
            hint:
              pendingReviewCount(caregivers) > 0
                ? `· ${pendingReviewCount(caregivers)} waiting`
                : "· clear",
          },
        ]}
      />
      <GiverRecords
        key={lane}
        items={active}
        emptyMessage={
          lane === "nurses" ? "No nurses yet." : "No caregivers yet."
        }
      />
    </div>
  );
}

function giverRank(status: string): number {
  if (status === "UNDER_REVIEW") return 0;
  if (status === "PENDING") return 1;
  if (status === "APPROVED") return 2;
  if (status === "REJECTED") return 3;
  return 4;
}


function GiverRecords({
  items,
  emptyMessage,
}: {
  items: AdminGiverItem[];
  emptyMessage: string;
}) {
  const ordered = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          giverRank(a.verificationStatus) - giverRank(b.verificationStatus),
      ),
    [items],
  );

  return (
    <AdminNextUp
      emptyMessage={emptyMessage}
      items={ordered.map((p) => {
        const status = verificationStatusPresentation(p.verificationStatus);
        return {
          id: p.id,
          title: p.fullName,
          eyebrow: p.profession.replaceAll("_", " "),
          status: status.label,
          tone: status.tone,
          ctaLabel: status.cta,
          href: `/admin/verification/${p.id}`,
        };
      })}
    />
  );
}

function BookingsLane({ items }: { items: AdminBookingItem[] }) {
  const ordered = useMemo(() => {
    const live = new Set([
      "PENDING_PROVIDER",
      "PENDING_PAYMENT",
      "CONFIRMED",
    ]);
    return [...items].sort((a, b) => {
      const aLive = live.has(a.status) ? 0 : 1;
      const bLive = live.has(b.status) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return (
        new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
      );
    });
  }, [items]);

  return (
    <AdminNextUp
      emptyMessage="No bookings yet."
      items={ordered.map((b) => {
        const status = bookingStatusPresentation(b.status, "admin");
        const when = new Date(b.scheduledAt).toLocaleString("en-KE", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        return {
          id: b.id,
          title: b.patientName,
          eyebrow: "Booking",
          status: status.label,
          tone: status.tone,
          ctaLabel: status.cta,
          meta: [
            { icon: "person" as const, label: "Professional", text: b.caregiverName },
            { icon: "calendar" as const, label: "When", text: when },
          ],
          footerLeft: (
            <span className="font-mono text-sage">{formatKes(b.grossAmount)}</span>
          ),
          href: `/admin/bookings/${b.id}`,
        };
      })}
    />
  );
}

function PatientsDesk({ items }: { items: AdminPatientItem[] }) {
  return (
    <AdminNextUp
      emptyMessage="No patients yet."
      ctaLabel="Open patient"
      items={items.map((p) => ({
        id: p.id,
        title: p.name,
        eyebrow: [
          p.ageBand.replaceAll("_", " "),
          p.age > 0 ? `${p.age}y` : null,
        ]
          .filter(Boolean)
          .join(" · "),
        tone: "sage" as const,
        meta: [
          {
            icon: "person" as const,
            label: "Contact",
            text: p.contact,
          },
        ],
        tags: p.diagnosis ? [p.diagnosis] : undefined,
        href: `/admin/patients/${p.id}`,
      }))}
    />
  );
}

function PartnersDesk({
  institutions,
  ambulances,
  referralCases,
}: {
  institutions: AdminPartnerItem[];
  ambulances: AdminPartnerItem[];
  referralCases: number;
}) {
  const [lane, setLane] = useState<"hospitals" | "ambulance">("hospitals");
  const pool = lane === "hospitals" ? institutions : ambulances;
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyReferral(detail: string, id: string) {
    try {
      await navigator.clipboard.writeText(detail);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setCopiedId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <AdminUnderlineTabs
        label="Partners"
        value={lane}
        onChange={setLane}
        tabs={[
          {
            id: "hospitals",
            label: "Hospitals",
            count: institutions.length,
            hint: `· ${institutions.length}`,
          },
          {
            id: "ambulance",
            label: "Ambulance",
            count: ambulances.length,
            hint: `· ${ambulances.length}`,
          },
        ]}
      />

      <p className="shrink-0 text-[11px] text-ink/45">
        {referralCases} care request{referralCases === 1 ? "" : "s"} via hospital
        links
      </p>

      {pool.length === 0 ? (
        <div className="flex min-h-0 flex-1 items-center justify-center px-4">
          <p className="text-center text-sm text-ink/45">
            {lane === "hospitals"
              ? "No institutions linked."
              : "No ambulance listings."}
          </p>
        </div>
      ) : (
        <ul className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
          {pool.map((item, index) => {
            const phone = item.detail.split(" · ")[0] ?? "";
            const isHospital = lane === "hospitals";
            return (
              <li key={item.id}>
                <RecordCard
                  index={index}
                  eyebrow={isHospital ? "Hospital" : "Ambulance"}
                  title={item.name}
                  status={item.status}
                  tone={item.status === "Active" || item.status === "Live" ? "sage" : "muted"}
                  meta={
                    isHospital
                      ? [{ label: "Referral path", text: item.detail }]
                      : [
                          {
                            icon: "phone",
                            label: "Contact",
                            text: item.detail,
                          },
                        ]
                  }
                  footerLeft={
                    isHospital && copiedId === item.id ? (
                      <span className="text-sage">Copied</span>
                    ) : undefined
                  }
                  cta={
                    isHospital
                      ? copiedId === item.id
                        ? "Copied"
                        : "Copy referral path"
                      : `Call ${phone}`
                  }
                  href={isHospital ? null : `tel:${phone.replace(/\s+/g, "")}`}
                  onActivate={
                    isHospital
                      ? () => copyReferral(item.detail, item.id)
                      : undefined
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const start = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 30_000);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(id);
    };
  }, []);

  const label = now
    ? now.toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "--:--";

  return (
    <time
      dateTime={now?.toISOString()}
      suppressHydrationWarning
      className="font-mono text-[11px] tabular-nums text-ink/60"
    >
      {label}
    </time>
  );
}

function IconDashboard({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 4h7v7H4V4Zm9 0h7v5h-7V4ZM4 13h7v7H4v-7Zm9 7v-9h7v9h-7Z"
        stroke={active ? "var(--sage)" : "currentColor"}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconPatients({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 20a8 8 0 0 1 16 0"
        stroke={active ? "var(--sage)" : "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconGivers({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM4.5 19a3.5 3.5 0 0 1 7 0M12.5 19a3.5 3.5 0 0 1 7 0"
        stroke={active ? "var(--sage)" : "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPartners({ active }: { active: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 21V8.5L12 3l9 5.5V21M9 21v-6h6v6"
        stroke={active ? "var(--sage)" : "currentColor"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
