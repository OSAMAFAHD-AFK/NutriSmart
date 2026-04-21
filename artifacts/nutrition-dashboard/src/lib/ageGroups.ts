import type { FollowUpInterval, Patient } from "@/lib/data";

export type AgeGroupId = string;
export type ProgramAgeBand = "0-2" | "2-5" | "5-18";

export type AgeGroupConfig = {
  id: AgeGroupId;
  label: string;
  description: string;
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
  governorate: string;
  district: string;
  followUpInterval: FollowUpInterval;
  minMonths?: number;
  maxMonths?: number;
  /** How often the program screen was opened (drives sort order). */
  openCount?: number;
  /** ISO timestamp of last open; tie-breaker for sort. */
  lastOpenedAt?: string;
  /** Local calendar date (YYYY-MM-DD) when the program was created — distinguishes duplicate names. */
  createdAt?: string;
};

const PROGRAMS_STORAGE_KEY = "yns_programs_v2";

/** Persisted display order: one snapshot per local calendar day (not every navigation). */
const PROGRAM_SORT_CACHE_KEY = "yns_program_display_order_v1";

type ProgramDisplayOrderCache = { date: string; programIds: string[] };

const USAGE_DEBOUNCE_MS = 1500;

const PROGRAM_THEMES = [
  {
    colorKey: "blue",
    bgClass: "bg-blue-50 dark:bg-blue-950/20",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-200 dark:border-blue-800",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
    emoji: "👶",
  },
  {
    colorKey: "emerald",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/20",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    emoji: "🧒",
  },
  {
    colorKey: "orange",
    bgClass: "bg-orange-50 dark:bg-orange-950/20",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-200 dark:border-orange-800",
    badgeBg: "bg-orange-500",
    badgeText: "text-white",
    emoji: "👦",
  },
  {
    colorKey: "violet",
    bgClass: "bg-violet-50 dark:bg-violet-950/20",
    textClass: "text-violet-700 dark:text-violet-300",
    borderClass: "border-violet-200 dark:border-violet-800",
    badgeBg: "bg-violet-600",
    badgeText: "text-white",
    emoji: "🏥",
  },
  {
    colorKey: "rose",
    bgClass: "bg-rose-50 dark:bg-rose-950/20",
    textClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-200 dark:border-rose-800",
    badgeBg: "bg-rose-600",
    badgeText: "text-white",
    emoji: "🩺",
  },
] as const;

function themeAt(index: number) {
  return PROGRAM_THEMES[index % PROGRAM_THEMES.length];
}

function coerceCreatedAt(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const head = raw.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  return undefined;
}

/** Display date for program cards / sidebar (English month names by default). */
export function formatProgramCreatedAtForUi(createdAt: string | undefined, locale = "en-GB"): string {
  if (!createdAt) return "—";
  const d = new Date(`${createdAt}T12:00:00`);
  if (Number.isNaN(d.getTime())) return createdAt;
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export const PROGRAM_AGE_OPTIONS: Array<{
  id: ProgramAgeBand;
  label: string;
  description: string;
  minMonths: number;
  maxMonths: number;
  ageFormat: "months" | "years";
  emoji: string;
}> = [
  {
    id: "0-2",
    label: "0–2 Years",
    description: "Infants & Toddlers",
    minMonths: 0,
    maxMonths: 24,
    ageFormat: "months",
    emoji: "👶",
  },
  {
    id: "2-5",
    label: "2–5 Years",
    description: "Early Childhood",
    minMonths: 24,
    maxMonths: 60,
    ageFormat: "years",
    emoji: "🧒",
  },
  {
    id: "5-18",
    label: "5–18 Years",
    description: "School-Age Children",
    minMonths: 60,
    maxMonths: 216,
    ageFormat: "years",
    emoji: "👦",
  },
];

/** Fixed Arabic label for the program age band (never edited in UI). */
export function getProgramAgeBandLabelAr(group: Pick<AgeGroupConfig, "id" | "minMonths" | "maxMonths">): string {
  const { minMonths, maxMonths } = resolveProgramAgeMonths(group);
  if (minMonths === 0 && maxMonths === 24) return "0 إلى 2 سنة";
  if (minMonths === 24 && maxMonths === 60) return "2 إلى 5 سنوات";
  if (minMonths === 60 && maxMonths === 216) return "5 إلى 18 سنة";
  return "فئة عمرية غير محددة";
}

/** Fixed English label for the program age band (never edited in UI). */
export function getProgramAgeBandLabelEn(group: Pick<AgeGroupConfig, "id" | "minMonths" | "maxMonths">): string {
  const { minMonths, maxMonths } = resolveProgramAgeMonths(group);
  if (minMonths === 0 && maxMonths === 24) return "0–2 years";
  if (minMonths === 24 && maxMonths === 60) return "2–5 years";
  if (minMonths === 60 && maxMonths === 216) return "5–18 years";
  return "Age band —";
}

/** Short label for tight UI (single line, no wrap). */
export function getProgramAgeBandLabelEnShort(group: Pick<AgeGroupConfig, "id" | "minMonths" | "maxMonths">): string {
  const { minMonths, maxMonths } = resolveProgramAgeMonths(group);
  if (minMonths === 0 && maxMonths === 24) return "0–2 yrs";
  if (minMonths === 24 && maxMonths === 60) return "2–5 yrs";
  if (minMonths === 60 && maxMonths === 216) return "5–18 yrs";
  return "—";
}

function inferAgeMonthsFromLegacyProgramId(id: string): { minMonths: number; maxMonths: number } | null {
  if (id === "0-2") return { minMonths: 0, maxMonths: 24 };
  if (id === "2-5") return { minMonths: 24, maxMonths: 60 };
  if (id === "5-18") return { minMonths: 60, maxMonths: 216 };
  return null;
}

export function resolveProgramAgeMonths(
  group: Pick<AgeGroupConfig, "id" | "minMonths" | "maxMonths">,
): { minMonths: number; maxMonths: number } {
  if (typeof group.minMonths === "number" && typeof group.maxMonths === "number") {
    return { minMonths: group.minMonths, maxMonths: group.maxMonths };
  }
  const inferred = inferAgeMonthsFromLegacyProgramId(group.id);
  if (inferred) return inferred;
  return { minMonths: 24, maxMonths: 60 };
}

function countPatientsForProgram(program: AgeGroupConfig, patients: Patient[]): number {
  return patients.filter((p) => {
    if (p.programId) return p.programId === program.id;
    if (typeof program.minMonths === "number" && typeof program.maxMonths === "number") {
      return p.ageMonths >= program.minMonths && p.ageMonths < program.maxMonths;
    }
    return false;
  }).length;
}

/** Sort programs: most opened first, then most recently opened, then by active patient count. */
export function sortProgramsByUsage(programs: AgeGroupConfig[], patients: Patient[]): AgeGroupConfig[] {
  return [...programs].sort((a, b) => {
    const ac = a.openCount ?? 0;
    const bc = b.openCount ?? 0;
    if (bc !== ac) return bc - ac;
    const at = new Date(a.lastOpenedAt ?? 0).getTime();
    const bt = new Date(b.lastOpenedAt ?? 0).getTime();
    if (bt !== at) return bt - at;
    const pa = countPatientsForProgram(a, patients);
    const pb = countPatientsForProgram(b, patients);
    if (pb !== pa) return pb - pa;
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
  });
}

function localProgramSortDateKey(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Order used by dashboard + sidebar: recomputed when the roster changes or on a new local day.
 * Opening programs still updates `openCount` in storage but does not reshuffle the list until the next day.
 */
export function getProgramsSortedForDisplay(
  programs: AgeGroupConfig[],
  patients: Patient[],
): AgeGroupConfig[] {
  if (programs.length === 0) return programs;
  const today = localProgramSortDateKey();
  const sortedFresh = sortProgramsByUsage(programs, patients);
  const sortedIds = sortedFresh.map((p) => p.id);

  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PROGRAM_SORT_CACHE_KEY) : null;
    const cached = raw ? (JSON.parse(raw) as ProgramDisplayOrderCache) : null;
    const currentIds = new Set(programs.map((p) => p.id));
    const rosterMatches =
      cached != null &&
      cached.date === today &&
      cached.programIds.length === programs.length &&
      cached.programIds.every((id) => currentIds.has(id));

    if (rosterMatches) {
      const map = new Map(programs.map((p) => [p.id, p] as const));
      return cached.programIds.map((id) => map.get(id)).filter((x): x is AgeGroupConfig => Boolean(x));
    }
  } catch {
    /* ignore */
  }

  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(
        PROGRAM_SORT_CACHE_KEY,
        JSON.stringify({ date: today, programIds: sortedIds } satisfies ProgramDisplayOrderCache),
      );
    }
  } catch {
    /* ignore */
  }
  return sortedFresh;
}

export function buildDefaultPrograms(): AgeGroupConfig[] {
  return [
    {
      id: "0-2",
      label: "0–2 Years",
      description: "Infants & Toddlers",
      ageFormat: "months",
      sponsor: "UNICEF",
      sponsorSub: "Children Under 2 Program",
      governorate: "Sana'a",
      district: "Al-Thawrah",
      followUpInterval: "weekly",
      minMonths: 0,
      maxMonths: 24,
      openCount: 0,
      createdAt: "2020-01-01",
      ...themeAt(0),
    },
    {
      id: "2-5",
      label: "2–5 Years",
      description: "Early Childhood",
      ageFormat: "years",
      sponsor: "WHO",
      sponsorSub: "Early Childhood Nutrition Program",
      governorate: "Aden",
      district: "Al Mansoura",
      followUpInterval: "weekly",
      minMonths: 24,
      maxMonths: 60,
      openCount: 0,
      createdAt: "2020-01-02",
      ...themeAt(1),
    },
    {
      id: "5-18",
      label: "5–18 Years",
      description: "School-Age Children",
      ageFormat: "years",
      sponsor: "WFP",
      sponsorSub: "School-Age Nutrition Initiative",
      governorate: "Taiz",
      district: "Al Qahirah",
      followUpInterval: "weekly",
      minMonths: 60,
      maxMonths: 216,
      openCount: 0,
      createdAt: "2020-01-03",
      ...themeAt(2),
    },
  ];
}

function sanitizePrograms(input: unknown): AgeGroupConfig[] {
  if (!Array.isArray(input)) return [];
  const output: AgeGroupConfig[] = [];
  input.forEach((raw, index) => {
    if (!raw || typeof raw !== "object") return;
    const row = raw as Partial<AgeGroupConfig>;
    if (!row.id || !row.label) return;
    const theme = themeAt(index);
    const minRaw = typeof row.minMonths === "number" ? row.minMonths : undefined;
    const maxRaw = typeof row.maxMonths === "number" ? row.maxMonths : undefined;
    const resolved =
      minRaw != null && maxRaw != null
        ? { minMonths: minRaw, maxMonths: maxRaw }
        : inferAgeMonthsFromLegacyProgramId(String(row.id)) ?? { minMonths: 24, maxMonths: 60 };

    const storedEmoji = typeof row.emoji === "string" ? row.emoji : "";
    const legacyBandEmoji =
      resolved.minMonths === 0 && resolved.maxMonths === 24 && storedEmoji === "🍼"
        ? PROGRAM_THEMES[0].emoji
        : resolved.minMonths === 24 && resolved.maxMonths === 60 && storedEmoji === "🌱"
          ? PROGRAM_THEMES[1].emoji
          : resolved.minMonths === 60 && resolved.maxMonths === 216 && storedEmoji === "📚"
            ? PROGRAM_THEMES[2].emoji
            : null;

    output.push({
      id: String(row.id),
      label: String(row.label),
      description: String(row.description ?? "Nutrition program"),
      ageFormat: row.ageFormat === "months" ? "months" : "years",
      sponsor: String(row.sponsor ?? "Partner Organization"),
      sponsorSub: String(row.sponsorSub ?? "Nutrition support project"),
      governorate: String(row.governorate ?? ""),
      district: String(row.district ?? ""),
      followUpInterval:
        row.followUpInterval === "daily" || row.followUpInterval === "biweekly" ? row.followUpInterval : "weekly",
      minMonths: resolved.minMonths,
      maxMonths: resolved.maxMonths,
      colorKey: String(row.colorKey ?? theme.colorKey),
      bgClass: String(row.bgClass ?? theme.bgClass),
      textClass: String(row.textClass ?? theme.textClass),
      borderClass: String(row.borderClass ?? theme.borderClass),
      badgeBg: String(row.badgeBg ?? theme.badgeBg),
      badgeText: String(row.badgeText ?? theme.badgeText),
      emoji: legacyBandEmoji ?? String(row.emoji ?? theme.emoji),
      openCount: typeof row.openCount === "number" && row.openCount >= 0 ? Math.floor(row.openCount) : 0,
      lastOpenedAt: typeof row.lastOpenedAt === "string" ? row.lastOpenedAt : undefined,
      createdAt:
        coerceCreatedAt(row.createdAt) ??
        (typeof row.lastOpenedAt === "string" ? coerceCreatedAt(row.lastOpenedAt.slice(0, 10)) : undefined),
    });
  });
  return output;
}

export function loadPrograms(): AgeGroupConfig[] {
  try {
    const stored = localStorage.getItem(PROGRAMS_STORAGE_KEY);
    if (!stored) return buildDefaultPrograms();
    const parsed = sanitizePrograms(JSON.parse(stored));
    return parsed.length > 0 ? parsed : buildDefaultPrograms();
  } catch {
    return buildDefaultPrograms();
  }
}

export function savePrograms(programs: AgeGroupConfig[]): void {
  localStorage.setItem(PROGRAMS_STORAGE_KEY, JSON.stringify(programs));
}

/**
 * Call when user opens a program page — persists usage stats in localStorage.
 * List order in the UI is refreshed once per calendar day via `getProgramsSortedForDisplay`, not on every open.
 */
export function touchProgramUsage(programId: string): void {
  const programs = loadPrograms();
  const idx = programs.findIndex((p) => p.id === programId);
  if (idx < 0) return;
  const cur = programs[idx];
  const now = Date.now();
  const last = cur.lastOpenedAt ? new Date(cur.lastOpenedAt).getTime() : 0;
  const bumpCount = now - last >= USAGE_DEBOUNCE_MS;
  const next: AgeGroupConfig = {
    ...cur,
    openCount: (cur.openCount ?? 0) + (bumpCount ? 1 : 0),
    lastOpenedAt: new Date().toISOString(),
    createdAt: cur.createdAt,
  };
  const copy = [...programs];
  copy[idx] = next;
  savePrograms(copy);
}

export function createProgramId(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${base || "program"}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createProgramConfig(
  input: Pick<AgeGroupConfig, "label" | "sponsor" | "governorate" | "district" | "followUpInterval"> & {
    ageBand: ProgramAgeBand;
  },
  index: number,
): AgeGroupConfig {
  const ageBand = PROGRAM_AGE_OPTIONS.find((x) => x.id === input.ageBand) ?? PROGRAM_AGE_OPTIONS[1];
  const theme = input.ageBand === "0-2" ? themeAt(0) : input.ageBand === "2-5" ? themeAt(1) : themeAt(2);
  void index;
  return {
    id: createProgramId(input.label),
    label: input.label,
    description: ageBand.description,
    ageFormat: ageBand.ageFormat,
    sponsor: input.sponsor,
    sponsorSub: "Donor-funded program",
    governorate: input.governorate,
    district: input.district,
    followUpInterval: input.followUpInterval,
    minMonths: ageBand.minMonths,
    maxMonths: ageBand.maxMonths,
    openCount: 0,
    lastOpenedAt: undefined,
    createdAt: new Date().toISOString().split("T")[0],
    ...theme,
  };
}

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
