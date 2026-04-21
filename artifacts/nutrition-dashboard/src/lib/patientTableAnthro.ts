import type { Patient } from "./data";

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

/** Linear interpolation helper for rough display-only Z-score stubs. */
function interpByAgeMonths(ageMonths: number, points: ReadonlyArray<readonly [number, number]>): number {
  if (ageMonths <= points[0][0]) return points[0][1];
  if (ageMonths >= points[points.length - 1][0]) return points[points.length - 1][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]!;
    const [x0, y0] = points[i - 1]!;
    if (ageMonths <= x1) {
      const t = (ageMonths - x0) / (x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return points[points.length - 1][1];
}

/**
 * Display-only WAZ approximation until WHO reference tables are integrated.
 * This is NOT for clinical decision support.
 */
export function stubWeightForAgeZ(p: Pick<Patient, "weight" | "ageMonths" | "gender">): number | null {
  if (!Number.isFinite(p.weight) || p.weight <= 0) return null;
  const malePoints = [
    [0, 3.3],
    [6, 7.9],
    [12, 9.6],
    [24, 12.2],
    [60, 18.3],
    [120, 31.0],
    [216, 57.0],
  ] as const;
  const femalePoints = [
    [0, 3.2],
    [6, 7.3],
    [12, 8.9],
    [24, 11.5],
    [60, 17.2],
    [120, 30.0],
    [216, 52.0],
  ] as const;
  const expected = interpByAgeMonths(p.ageMonths, p.gender === "M" ? malePoints : femalePoints);
  const sigma = Math.max(1, expected * 0.15);
  const z = (p.weight - expected) / sigma;
  const clamped = Math.max(-5, Math.min(5, z));
  return parseFloat(clamped.toFixed(1));
}

/**
 * Display-only WHZ approximation based on BMI-vs-age expectation.
 * This is a temporary UI helper until WHO standards are integrated.
 */
export function stubWeightForHeightZ(
  p: Pick<Patient, "weight" | "height" | "ageMonths" | "gender">,
): number | null {
  if (!Number.isFinite(p.weight) || p.weight <= 0) return null;
  if (!Number.isFinite(p.height) || p.height <= 0) return null;
  const bmi = p.weight / ((p.height / 100) ** 2);
  const maleBmiPoints = [
    [0, 17.5],
    [6, 17.0],
    [12, 16.5],
    [24, 16.1],
    [60, 15.4],
    [120, 17.0],
    [216, 19.8],
  ] as const;
  const femaleBmiPoints = [
    [0, 17.2],
    [6, 16.7],
    [12, 16.2],
    [24, 15.9],
    [60, 15.2],
    [120, 16.7],
    [216, 19.3],
  ] as const;
  const expected = interpByAgeMonths(p.ageMonths, p.gender === "M" ? maleBmiPoints : femaleBmiPoints);
  const sigma = 1.15;
  const z = (bmi - expected) / sigma;
  const clamped = Math.max(-5, Math.min(5, z));
  return parseFloat(clamped.toFixed(1));
}

/**
 * Requested display labels beside WAZ.
 * Note: labels use "stunting" wording per UI request, though metric shown is WAZ.
 */
export function classifyWazAsStuntingBand(waz: number | null): string {
  if (waz == null || Number.isNaN(waz)) return "—";
  if (waz <= -3) return "🔴Severe Stunting";
  if (waz <= -2) return "🟠 Moderate Stunting";
  return "🟢Normal";
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
