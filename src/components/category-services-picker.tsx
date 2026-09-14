"use client";

import { serviceChipClass } from "@/components/services-picker";
import { servicesForCategory } from "@/lib/services";
import type { CareCategory } from "@prisma/client";

export function CategoryServicesPicker({
  category,
  selected,
  onChange,
  disabled,
  compact = false,
}: {
  category: CareCategory;
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const available = servicesForCategory(category);

  function toggle(id: string) {
    if (disabled) return;
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap justify-center gap-x-2 gap-y-2">
        {available.map((service) => {
          const active = selected.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(service.id)}
              className={serviceChipClass(active, disabled)}
            >
              {service.shortLabel}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-ink/50">
        Optional — helps match you with the right professional.
      </p>
      <div className="mt-2 flex flex-wrap gap-x-2 gap-y-2">
        {available.map((service) => {
          const active = selected.includes(service.id);
          return (
            <button
              key={service.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(service.id)}
              className={serviceChipClass(active, disabled)}
            >
              {service.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
