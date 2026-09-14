"use client";

import {
  SERVICE_GROUPS,
  servicesForGroup,
  type ServiceGroupId,
} from "@/lib/services";

const chipClass = (active: boolean, disabled?: boolean) =>
  [
    "inline-flex min-h-9 max-w-full items-center justify-center rounded-lg border px-3.5 text-center text-xs font-medium leading-tight transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/30",
    active
      ? "border-sage bg-sage text-white"
      : "border-mist bg-white text-ink/80 hover:border-sage/40",
    disabled ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

export function serviceChipClass(active: boolean, disabled?: boolean) {
  return chipClass(active, disabled);
}

export function ServicesPicker({
  professionGroup,
  selected,
  onChange,
  disabled,
  hideGroupLabels = false,
  showSelectionCount = true,
}: {
  professionGroup: ServiceGroupId | "both";
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  hideGroupLabels?: boolean;
  showSelectionCount?: boolean;
}) {
  const groups =
    professionGroup === "both"
      ? SERVICE_GROUPS
      : SERVICE_GROUPS.filter((g) => g.id === professionGroup);

  function toggle(id: string) {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  const compact = hideGroupLabels && !showSelectionCount;

  if (compact) {
    const services = groups.flatMap((group) => servicesForGroup(group.id));
    return (
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-2">
        {services.map((service) => {
          const active = selected.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(service.id)}
              className={chipClass(active, disabled)}
            >
              {service.shortLabel}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.id}>
          {hideGroupLabels ? null : (
            <p className="text-xs font-semibold uppercase tracking-wide text-ink/45">
              {group.label}
            </p>
          )}
          <div className={`flex flex-wrap gap-x-2 gap-y-2 ${hideGroupLabels ? "mt-0" : "mt-2"}`}>
            {servicesForGroup(group.id).map((service) => {
              const active = selected.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(service.id)}
                  className={chipClass(active, disabled)}
                >
                  {service.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {showSelectionCount ? (
        selected.length > 0 ? (
          <p className="text-xs text-ink/50">{selected.length} selected</p>
        ) : (
          <p className="text-xs text-ink/50">
            Select at least one service you offer.
          </p>
        )
      ) : null}
    </div>
  );
}
