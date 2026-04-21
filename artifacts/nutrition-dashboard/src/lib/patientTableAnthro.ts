import type { Patient } from "./data";
import {
  WHO_WHZ_BOYS0TO2,
  WHO_WHZ_BOYS2TO5,
  WHO_WHZ_GIRLS0TO2,
  WHO_WHZ_GIRLS2TO5,
  type WhoLmsRow,
} from "./whoWHzTables";
import {
  WHO_HAZ_BOYS_0_TO_24,
  WHO_HAZ_BOYS_24_TO_60,
  WHO_HAZ_GIRLS_0_TO_24,
  WHO_HAZ_GIRLS_24_TO_60,
  type WhoHazLmsRow,
} from "./whoHazTables";

/** Under 24 months: recumbent length (L); otherwise standing height (H). */
export function heightMeasureShortLabel(ageMonths: number): "L" | "H" {
  return ageMonths < 24 ? "L" : "H";
}

export function heightMeasureFullLabel(ageMonths: number): string {
  return ageMonths < 24 ? "Length (cm)" : "Height (cm)";
}

export function isInfantUnder6Months(p: Pick<Patient, "ageMonths">): boolean {
  return p.ageMonths < 6;
}

function interpolateHazLmsByMonth(ageMonths: number, rows: readonly WhoHazLmsRow[]): WhoHazLmsRow | null {
  if (!rows.length) return null;
  if (ageMonths < rows[0][0] || ageMonths > rows[rows.length - 1][0]) return null;
  if (ageMonths === rows[0][0]) return rows[0];
  if (ageMonths === rows[rows.length - 1][0]) return rows[rows.length - 1];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!;
    const next = rows[i]!;
    if (ageMonths === next[0]) return next;
    if (ageMonths < next[0]) {
      const t = (ageMonths - prev[0]) / (next[0] - prev[0]);
      const l = prev[1] + t * (next[1] - prev[1]);
      const m = prev[2] + t * (next[2] - prev[2]);
      const s = prev[3] + t * (next[3] - prev[3]);
      return [ageMonths, l, m, s];
    }
  }
  return null;
}

function whoHazRowsForPatient(p: Pick<Patient, "ageMonths" | "gender">): readonly WhoHazLmsRow[] {
  if (p.ageMonths <= 24) {
    return p.gender === "M" ? WHO_HAZ_BOYS_0_TO_24 : WHO_HAZ_GIRLS_0_TO_24;
  }
  return p.gender === "M" ? WHO_HAZ_BOYS_24_TO_60 : WHO_HAZ_GIRLS_24_TO_60;
}

/** WHO HAZ/LAZ using LMS age-based tables (LFA 0-2y, HFA 2-5y). */
export function stubWeightForAgeZ(p: Pick<Patient, "height" | "ageMonths" | "gender">): number | null {
  if (!Number.isFinite(p.height) || p.height <= 0) return null;
  if (p.ageMonths > 60) return null;
  const rows = whoHazRowsForPatient(p);
  const lms = interpolateHazLmsByMonth(p.ageMonths, rows);
  if (!lms) return null;
  const l = lms[1];
  const m = lms[2];
  const s = lms[3];
  if (!Number.isFinite(l) || !Number.isFinite(m) || !Number.isFinite(s) || m <= 0 || s <= 0) return null;
  const z =
    l === 0
      ? Math.log(p.height / m) / s
      : (Math.pow(p.height / m, l) - 1) / (l * s);
  const clamped = Math.max(-5, Math.min(5, z));
  return parseFloat(clamped.toFixed(1));
}

function interpolateLmsByHeight(heightCm: number, rows: readonly WhoLmsRow[]): WhoLmsRow | null {
  if (!rows.length) return null;
  if (heightCm < rows[0][0] || heightCm > rows[rows.length - 1][0]) return null;
  if (heightCm === rows[0][0]) return rows[0];
  if (heightCm === rows[rows.length - 1][0]) return rows[rows.length - 1];
  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1]!;
    const next = rows[i]!;
    if (heightCm === next[0]) return next;
    if (heightCm < next[0]) {
      const t = (heightCm - prev[0]) / (next[0] - prev[0]);
      const l = prev[1] + t * (next[1] - prev[1]);
      const m = prev[2] + t * (next[2] - prev[2]);
      const s = prev[3] + t * (next[3] - prev[3]);
      return [heightCm, l, m, s];
    }
  }
  return null;
}

function whoWHzRowsForPatient(p: Pick<Patient, "ageMonths" | "gender">): readonly WhoLmsRow[] {
  if (p.ageMonths < 24) {
    return p.gender === "M" ? WHO_WHZ_BOYS0TO2 : WHO_WHZ_GIRLS0TO2;
  }
  return p.gender === "M" ? WHO_WHZ_BOYS2TO5 : WHO_WHZ_GIRLS2TO5;
}

/** WHO WHZ/WLZ using LMS tables (WFL 0-2y, WFH 2-5y). */
export function stubWeightForHeightZ(
  p: Pick<Patient, "weight" | "height" | "ageMonths" | "gender">,
): number | null {
  if (!Number.isFinite(p.weight) || p.weight <= 0) return null;
  if (!Number.isFinite(p.height) || p.height <= 0) return null;
  if (p.ageMonths > 60) return null;
  const rows = whoWHzRowsForPatient(p);
  const lms = interpolateLmsByHeight(p.height, rows);
  if (!lms) return null;
  const l = lms[1];
  const m = lms[2];
  const s = lms[3];
  if (!Number.isFinite(l) || !Number.isFinite(m) || !Number.isFinite(s) || m <= 0 || s <= 0) return null;
  const z =
    l === 0
      ? Math.log(p.weight / m) / s
      : (Math.pow(p.weight / m, l) - 1) / (l * s);
  const clamped = Math.max(-5, Math.min(5, z));
  return parseFloat(clamped.toFixed(1));
}

/**
 * Requested display labels beside WAZ.
 * Note: labels use "stunting" wording per UI request, though metric shown is WAZ.
 */
export function classifyWazAsStuntingBand(waz: number | null): string {
  if (waz == null || Number.isNaN(waz)) return "—";
  if (waz <= -3) return "Severe Stunting";
  if (waz <= -2) return "Moderate Stunting";
  return "Normal";
}

export type NutritionTypeBand =
  | "Kwashiorkor"
  | "Marasmus"
  | "Marasmic-Kwashiorkor"
  | "—";

/** Requested type logic for table classification. */
export function classifyNutritionTypeBand(v: {
  edema: boolean;
  whz: number | null;
  muac: number | null;
}): NutritionTypeBand {
  const whzLow = v.whz != null && !Number.isNaN(v.whz) && v.whz < -3;
  if (v.edema && whzLow) return "Marasmic-Kwashiorkor";
  if (v.edema) return "Kwashiorkor";
  if (!v.edema && whzLow && v.muac != null && !Number.isNaN(v.muac) && v.muac < 11.5) return "Marasmus";
  return "—";
}
