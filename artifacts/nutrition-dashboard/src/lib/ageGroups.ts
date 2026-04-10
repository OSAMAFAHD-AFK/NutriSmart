export type AgeGroupId = "0-2" | "2-5" | "5-18";

export type AgeGroupConfig = {
  id: AgeGroupId;
  label: string;
  description: string;
  minMonths: number;
  maxMonths: number;
  ageFormat: "months" | "years";
  colorKey: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeBg: string;
  badgeText: string;
  sponsor: string;
  sponsorSub: string;
  emoji: string;
};

export const AGE_GROUPS: Record<AgeGroupId, AgeGroupConfig> = {
  "0-2": {
    id: "0-2",
    label: "0–2 Years",
    description: "Infants & Toddlers",
    minMonths: 0,
    maxMonths: 24,
    ageFormat: "months",
    colorKey: "blue",
    bgClass: "bg-blue-50 dark:bg-blue-950/20",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-200 dark:border-blue-800",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
    sponsor: "UNICEF",
    sponsorSub: "Children Under 2 Program",
    emoji: "👶",
  },
  "2-5": {
    id: "2-5",
    label: "2–5 Years",
    description: "Early Childhood",
    minMonths: 24,
    maxMonths: 60,
    ageFormat: "years",
    colorKey: "emerald",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    sponsor: "WHO",
    sponsorSub: "Early Childhood Nutrition Program",
    emoji: "🧒",
  },
  "5-18": {
    id: "5-18",
    label: "5–18 Years",
    description: "School-Age Children",
    minMonths: 60,
    maxMonths: 216,
    ageFormat: "years",
    colorKey: "orange",
    bgClass: "bg-orange-50 dark:bg-orange-950/20",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-200 dark:border-orange-800",
    badgeBg: "bg-orange-500",
    badgeText: "text-white",
    sponsor: "WFP",
    sponsorSub: "School-Age Nutrition Initiative",
    emoji: "👦",
  },
};

export const AGE_GROUP_LIST: AgeGroupConfig[] = Object.values(AGE_GROUPS);

export function formatAge(ageMonths: number, format: "months" | "years"): string {
  if (format === "months") {
    return `${ageMonths}M`;
  }
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
}

export function getAgeGroupId(ageMonths: number): AgeGroupId | null {
  if (ageMonths < 24) return "0-2";
  if (ageMonths < 60) return "2-5";
  if (ageMonths < 216) return "5-18";
  return null;
}

export function formatAgeAuto(ageMonths: number): string {
  if (ageMonths < 24) return `${ageMonths}M`;
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  return months === 0 ? `${years}y` : `${years}y ${months}m`;
}

const SPONSORS_STORAGE_KEY = "yns_sponsors_v1";

export function getDefaultSponsorName(groupId: AgeGroupId): string {
  const g = AGE_GROUPS[groupId];
  return `${g.sponsor} — ${g.sponsorSub}`;
}

export function loadSponsors(): Record<AgeGroupId, string> {
  try {
    const stored = localStorage.getItem(SPONSORS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        "0-2": parsed["0-2"] ?? getDefaultSponsorName("0-2"),
        "2-5": parsed["2-5"] ?? getDefaultSponsorName("2-5"),
        "5-18": parsed["5-18"] ?? getDefaultSponsorName("5-18"),
      };
    }
  } catch {}
  return {
    "0-2": getDefaultSponsorName("0-2"),
    "2-5": getDefaultSponsorName("2-5"),
    "5-18": getDefaultSponsorName("5-18"),
  };
}

export function saveSponsor(groupId: AgeGroupId, name: string): void {
  const current = loadSponsors();
  current[groupId] = name;
  localStorage.setItem(SPONSORS_STORAGE_KEY, JSON.stringify(current));
}
