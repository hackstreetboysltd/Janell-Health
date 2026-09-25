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
import { ModuleHeading } from "@/components/module-heading";

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
        <div className="flex items-end justify-between gap-3">
          <ModuleHeading
            wrapperClassName="min-w-0 flex-1"
            className="truncate font-display text-[1.65rem] leading-none tracking-tight text-ink"
            backHref="/"
          >
            {deskTitle(desk)}
          </ModuleHeading>
          <LiveClock />
        </div>
        {desk === "dashboard" ? (
          <DashboardHeader overview={data.overview} />
        ) : (
          <p className="mt-1.5 truncate text-xs text-ink/50">
            {deskSubtitle(desk, data)}
          </p>
        )}
      </header>

      <section
        role="tabpanel"
        id={`${baseId}-panel-${active.id}`}
        aria-labelledby={`${baseId}-tab-${active.id}`}
        className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden"
        key={desk}
      >
        <div className="flex min-h-0 flex-1 flex-col animate-fade-up">
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
    <div className="mt-2 flex items-center justify-between gap-2">
      <p className="truncate text-xs text-ink/50">Tap a card. Jump in.</p>
      <span
        title={
          overview.system.requests === 0
            ? "No instrumented API samples in the last 15 minutes"
            : `API error rate ${overview.system.errorRatePct}% over ${overview.system.requests} requests (15m)`
        }
        className={[
          "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
          systemWarn
            ? "border-alert/40 bg-alert/10 text-alert"
            : "border-sage/30 bg-sage/10 text-sage",
        ].join(" ")}
      >
        {systemWarn ? "Degraded" : "Live"}
      </span>
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
    <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 overflow-hidden">
      {cards.map((card, i) => {
        const interactive = Boolean(card.desk || card.openBookings);
        const className = [
          "group relative flex min-h-0 flex-col justify-between overflow-hidden rounded-2xl border p-3.5 text-left transition-all duration-200 animate-fade-up",
          card.hot
            ? "border-alert/25 bg-white hover:border-alert/40 dark:bg-white/[0.04]"
            : "border-mist bg-white hover:border-sage/35 dark:bg-white/[0.04]",
          interactive ? "active:scale-[0.97]" : "",
        ].join(" ");

        const body = (
          <>
            <div className="flex items-start justify-between gap-2">
              <span
                className={[
                  "text-[11px] font-bold uppercase tracking-[0.08em]",
                  card.hot ? "text-alert" : "text-ink/45",
                ].join(" ")}
              >
                {card.label}
              </span>
              {card.hot ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ops-pulse rounded-full bg-alert opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-alert" />
                </span>
              ) : null}
            </div>

            <div className="mt-auto">
              <p
                className={[
                  "font-display text-[2.35rem] leading-none tracking-tight tabular-nums transition-transform duration-200 group-hover:scale-[1.01]",
                  card.hot && card.value > 0 ? "text-alert" : "text-ink",
                ].join(" ")}
              >
                {card.value}
              </p>
              <p className="mt-1.5 truncate text-[11px] font-medium text-ink/40">
                {card.hint}
              </p>
            </div>
          </>
        );

        if (!interactive) {
          return (
            <div
              key={card.id}
              style={{ animationDelay: `${i * 60}ms` }}
              className={className}
            >
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
            style={{ animationDelay: `${i * 60}ms` }}
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

function queueStatusShort(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pending";
    case "UNDER_REVIEW":
      return "Under review";
    case "APPROVED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
    case "SUSPENDED":
      return "Suspended";
    default:
      return status.replaceAll("_", " ");
  }
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
      ctaLabel="Open review"
      items={ordered.map((p) => ({
        id: p.id,
        title: p.fullName,
        subtitle: queueStatusShort(p.verificationStatus),
        meta: queueStatusShort(p.verificationStatus),
        href: `/admin/verification/${p.id}`,
      }))}
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
      ctaLabel="Open booking"
      items={ordered.map((b) => {
        const when = new Date(b.scheduledAt).toLocaleString("en-KE", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        return {
          id: b.id,
          title: b.patientName,
          subtitle: `${b.caregiverName} · ${when}`,
          meta: b.status.replaceAll("_", " "),
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
        subtitle: [
          p.ageBand.replaceAll("_", " "),
          p.age > 0 ? `${p.age}y` : null,
          p.diagnosis || null,
        ]
          .filter(Boolean)
          .join(" · "),
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
        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {pool.map((item) => {
            const phone = item.detail.split(" · ")[0] ?? "";
            return (
              <li key={item.id}>
                <div className="rounded-2xl border border-sage/30 bg-sage/[0.07] p-3.5 dark:bg-sage/[0.08]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-bold text-white">
                      {item.name
                        .trim()
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((p) => p[0]?.toUpperCase() ?? "")
                        .join("") || "?"}
                    </span>
                    <div className="min-w-0 flex-1 pt-0.5">
                      <p className="truncate font-display text-xl leading-tight tracking-tight text-ink">
                        {item.name}
                      </p>
                      <p
                        className={[
                          "mt-1 text-[11px] font-medium",
                          lane === "ambulance"
                            ? "font-mono text-sage"
                            : "text-ink/50",
                        ].join(" ")}
                      >
                        {item.detail}
                      </p>
                    </div>
                  </div>
                  {lane === "hospitals" ? (
                    <button
                      type="button"
                      onClick={() => copyReferral(item.detail, item.id)}
                      className="mt-3.5 flex min-h-11 w-full items-center justify-center rounded-xl bg-sage text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                    >
                      {copiedId === item.id
                        ? "Copied referral path"
                        : "Copy referral path"}
                    </button>
                  ) : (
                    <a
                      href={`tel:${phone.replace(/\s+/g, "")}`}
                      className="mt-3.5 flex min-h-11 w-full items-center justify-center rounded-xl bg-sage text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.98]"
                    >
                      Call {phone}
                    </a>
                  )}
                </div>
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
      className="shrink-0 rounded-lg border border-mist bg-white/70 px-2 py-1 font-mono text-[11px] tabular-nums text-ink/60 dark:bg-white/[0.04]"
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
