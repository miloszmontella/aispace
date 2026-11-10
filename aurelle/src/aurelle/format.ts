import type { Filters, Profile, SortKey, Tier, TierFilter } from "@/aurelle/types";
import { DEFAULT_FILTERS, TIERS } from "@/aurelle/types";

const TIER_RANK: Record<Tier, number> = { S: 0, A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };

export function ageLabel(age: number): string {
  return age === 1 ? "1 year" : `${age} years`;
}

export function heightLabel(height: number): string {
  return height > 0 ? `${height} cm` : "—";
}

export function filtersActive(filters: Filters): boolean {
  return (
    filters.ageMin !== DEFAULT_FILTERS.ageMin ||
    filters.ageMax !== DEFAULT_FILTERS.ageMax ||
    filters.city !== "" ||
    filters.telegram
  );
}

export function matches(profile: Profile, query: string, filters: Filters): boolean {
  if (profile.age < filters.ageMin || profile.age > filters.ageMax) return false;
  if (filters.city && profile.city !== filters.city) return false;
  if (filters.telegram && !profile.telegram.trim()) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [profile.name, profile.city, profile.telegram, profile.notes, profile.height ? String(profile.height) : ""]
    .join("\n")
    .toLowerCase();
  return hay.includes(q);
}

export function sortProfiles(list: Profile[], sort: SortKey): Profile[] {
  const next = list.slice();
  next.sort((a, b) => {
    switch (sort) {
      case "old":
        return a.createdAt - b.createdAt;
      case "name-asc":
        return a.name.localeCompare(b.name, "en");
      case "name-desc":
        return b.name.localeCompare(a.name, "en");
      case "age-asc":
        return a.age - b.age || a.name.localeCompare(b.name, "en");
      case "age-desc":
        return b.age - a.age || a.name.localeCompare(b.name, "en");
      case "city":
        return a.city.localeCompare(b.city, "en") || a.name.localeCompare(b.name, "en");
      case "tier":
        return TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.name.localeCompare(b.name, "en");
      case "new":
      default:
        return b.createdAt - a.createdAt;
    }
  });
  return next;
}

export function countTiers(list: Profile[]): Record<TierFilter, number> {
  const counts: Record<TierFilter, number> = {
    ALL: list.length,
    S: 0,
    A: 0,
    B: 0,
    C: 0,
    D: 0,
    E: 0,
    F: 0,
  };
  for (const profile of list) counts[profile.tier] += 1;
  return counts;
}

export const SORT_OPTIONS: { id: SortKey; label: string }[] = [
  { id: "new", label: "Newest first" },
  { id: "old", label: "Oldest first" },
  { id: "name-asc", label: "Name (A–Z)" },
  { id: "name-desc", label: "Name (Z–A)" },
  { id: "age-asc", label: "Age ↑" },
  { id: "age-desc", label: "Age ↓" },
  { id: "city", label: "By city" },
  { id: "tier", label: "By tier" },
];

export function sortLabel(sort: SortKey): string {
  return SORT_OPTIONS.find((item) => item.id === sort)?.label ?? "Newest first";
}

export function telegramHandle(value: string): string {
  return value.trim().replace(/^@+/, "");
}

export function telegramHref(handle: string, demo?: boolean): string | null {
  if (demo) return null;
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(handle)) return null;
  return `https://t.me/${handle}`;
}

export function citiesFrom(profiles: Profile[]): string[] {
  return [...new Set(profiles.map((profile) => profile.city.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "en"),
  );
}

export function tap(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* haptic is optional */
  }
}

export { TIERS };
