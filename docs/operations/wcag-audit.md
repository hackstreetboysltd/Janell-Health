# WCAG 2.2 AA audit — patient & giver flows

**Date:** 2026-09-01  
**Scope:** Landing, onboarding, patient case/find/book/pay, giver dashboard/earnings/profile  
**Method:** Manual keyboard walk-through, screen-reader label review, axe DevTools spot checks, code review against WCAG 2.2 AA criteria.

---

## Summary

| Area | Result | Notes |
| --- | --- | --- |
| Skip navigation | Pass | Global skip link → `#main-content` |
| Focus visible | Pass | `btn-primary`, `btn-pay`, `btn-secondary`, form inputs use `:focus-visible` |
| Touch targets (primary) | Pass | Primary actions ≥ 44×44px (`min-height: 2.75rem`) |
| Color contrast | Pass | Sage on canvas/white meets AA for body text; alert button on white |
| Form labels | Pass | Pay/book inputs labelled; OTP/sign-in fields labelled |
| Live regions | Pass | Map loading `aria-live="polite"`; empty states `role="status"` |
| Listbox (find map) | Pass | `role="listbox"` / `role="option"` + `aria-selected` on caregiver list |
| Combobox (location/sign-in) | Pass | Phase 1 `aria-selected` on suggestion options |
| Badges (SR) | Pass | Verified/Pro/Featured badges expose `aria-label` |
| Map markers (keyboard) | Partial | Leaflet markers are mouse-first; list panel is fully keyboard operable |
| Motion | Pass | `prefers-reduced-motion` disables fade animations |

---

## Flows checked

### Landing & sign-in
- Tab order: skip link → theme toggle → portal dock → sign-in fields → submit
- Headings: single `h1`, sign-in `h2`
- Google/OTP buttons reachable and labelled

### Patient onboarding → case → find → book → pay
- Onboarding form fields associated with labels
- Find map: list items selectable via keyboard; selected state announced via `aria-selected`
- Book/pay sticky CTAs meet 44px touch target; pay countdown status visible

### Giver dashboard → earnings → profile
- Section headings (`h2`) for pending/confirmed/earnings lists
- Empty states expose title + guidance (not colour-only)
- Mobile nav: `aria-current="page"` on active tab

---

## Fixes applied (Phase 3)

1. Skip link in root layout
2. `#main-content` landmark on primary pages
3. `CaregiverBadgeRow` — consistent verified/plan badges with screen-reader labels
4. Find map listbox semantics + `aria-selected`
5. `EmptyState` component with `role="status"` on bookings/earnings/find
6. Map loading state: `aria-live="polite"` + `aria-busy`
7. Shared `btn-primary` / `btn-pay` (44px min height) on book, pay, map CTA

---

## Known gaps (defer / monitor)

| Issue | WCAG | Mitigation |
| --- | --- | --- |
| Leaflet map pan/zoom not keyboard-native | 2.1.1 | Caregiver list is full alternative; document in support |
| Inline theme script | 4.1.2 | Nonce-permitted inline script only |
| Style `unsafe-inline` (Tailwind) | Best practice | Script-src tightened; style nonce deferred |

---

## Re-test before release

```bash
npm run lint
npm run typecheck
```

Manual: Tab through `/`, `/patient`, `/patient/find?caseId=…`, `/giver`, pay flow — confirm focus ring visible and skip link works.
