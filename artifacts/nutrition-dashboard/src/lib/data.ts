import {
  type PatientMedicalHistory,
  type ClinicalEdemaGrade,
  mergeMedicalHistory,
  type HealthCenterDistance,
} from "./patientMedicalProfile";

export type Diagnosis = "SAM" | "MAM" | "Normal" | "Recovered" | "Deceased";

/** Weekly follow-up disposition (12-week plan). */
export type FollowUpOutcome =
  | ""
  | "Continuing_treatment"
  | "Absent"
  | "Referred_hospital"
  | "Refused_case"
  | "Defaulted"
  | "Recovered"
  | "Death";

export const FOLLOW_UP_OUTCOME_OPTIONS: { value: FollowUpOutcome; label: string }[] = [
  { value: "", label: "—" },
  { value: "Continuing_treatment", label: "SP - Continuing treatment" },
  { value: "Absent", label: "AP - Absent" },
  { value: "Referred_hospital", label: "REF - Referred to hospital" },
  { value: "Refused_case", label: "RR - Refused case" },
  { value: "Defaulted", label: "DEF - Defaulted / lost follow-up" },
  { value: "Recovered", label: "C - Recovered" },
  { value: "Death", label: "D - Death" },
];

/** 12-week grid: height/length captured only on weeks 4, 8, and 12 (1-based). */
export const HEIGHT_CAPTURE_WEEK_INDEXES = [3, 7, 11] as const;

export function isHeightCaptureWeekIndex(weekIndex: number): boolean {
  return HEIGHT_CAPTURE_WEEK_INDEXES.includes(weekIndex as (typeof HEIGHT_CAPTURE_WEEK_INDEXES)[number]);
}

export const WEEKLY_EDEMA_OPTIONS: { value: ClinicalEdemaGrade; label: string }[] = [
  { value: "None", label: "لا" },
  { value: "+", label: "+" },
  { value: "++", label: "++" },
  { value: "+++", label: "+++" },
];

/** Same value as the weekly follow-up option `Death` — kept in sync with `isDeceased`. */
export const FOLLOW_UP_OUTCOME_DEATH: FollowUpOutcome = "Death";

/** Scanned treatment plans, labs, prescriptions, etc. (compressed data URLs). */
export type PatientRecordAttachment = {
  id: string;
  title: string;
  dataUrl: string;
  createdAt: string;
};

export type WeekData = {
  weight: number | null;
  muac: number | null;
  /** Weekly edema grade (same scale as medical history). Legacy stored `edema: boolean` maps to + / None on load. */
  edemaGrade: ClinicalEdemaGrade;
  rutf: number | null;
  height: number | null;
  /** Legacy field; no longer edited in UI — kept for stored JSON migration. */
  zScore: number | null;
  supplements: string;
  followUpOutcome: FollowUpOutcome;
};

export type WeightTrendVsPrior = "up" | "down" | "flat" | "none";

/** Compare current week weight to the previous week (week index 0 has no prior). */
export function weightTrendVsPriorWeek(
  weeks: Pick<WeekData, "weight">[],
  weekIndex: number,
  eps = 0.02,
): WeightTrendVsPrior {
  if (weekIndex < 1) return "none";
  const cur = weeks[weekIndex]?.weight;
  const prev = weeks[weekIndex - 1]?.weight;
  if (cur == null || prev == null) return "none";
  if (cur > prev + eps) return "up";
  if (cur < prev - eps) return "down";
  return "flat";
}

export type Patient = {
  id: string;
  name: string;
  fatherName: string;
  fatherPhone: string;
  /** Mother / caregiver name (profile). */
  motherName?: string;
  gender: "M" | "F";
  dateOfBirth: string;
  ageMonths: number;
  weight: number;
  height: number;
  wfh: number;
  edema: boolean;
  zScore: number;
  muac: number;
  diagnosis: Diagnosis;
  governorate: string;
  district: string;
  /** Nearest health center distance category. */
  healthCenterDistance?: HealthCenterDistance;
  familySize?: number | null;
  /** First clinical / program visit date (YYYY-MM-DD). */
  firstVisitDate?: string;
  /** EPI / routine immunization schedule complete. */
  immunizationsComplete?: boolean | null;
  symptoms: string[];
  milk: string;
  dose: string;
  medication: string;
  supplements: string;
  /** User-uploaded face photo (data URL). `null` = built-in default avatar by gender. */
  profilePhotoDataUrl: string | null;
  recordAttachments: PatientRecordAttachment[];
  lastVisitDate: string;
  createdAt: string;
  treatmentWeeks: WeekData[];
  isDeceased: boolean;
  /** Date of death (YYYY-MM-DD). Meaningful when `isDeceased` is true. */
  dateOfDeath?: string;
  medicalHistory?: PatientMedicalHistory;
};

type LegacyPatient = Omit<Patient, "treatmentWeeks" | "profilePhotoDataUrl" | "recordAttachments"> & {
  treatmentWeeks?: WeekData[];
  week1?: WeekData;
  week2?: WeekData;
  week3?: WeekData;
  week4?: WeekData;
  /** Removed: migrated away on load. */
  photoUrl?: string;
  profilePhotoDataUrl?: string | null;
  recordAttachments?: PatientRecordAttachment[];
};

/** Ensures new profile / medical fields exist (localStorage migration). */
export function normalizePatientRecord(p: Patient | LegacyPatient): Patient {
  const legacy = p as LegacyPatient;
  const { photoUrl: _legacyPhoto, ...rest } = legacy;
  void _legacyPhoto;

  const baseWeeks = normalizeTreatmentWeeks(legacy);
  const medicalHistory = mergeMedicalHistory(rest.medicalHistory);
  const clinicalForBootstrap = medicalHistory.clinicalEdemaGrade ?? "None";
  const hasAnyWeeklyEdema = baseWeeks.some((w) => w.edemaGrade !== "None");
  /** Copy clinical grade into every week when the grid had no edema yet (legacy / medical-only records). */
  const treatmentWeeks =
    !hasAnyWeeklyEdema && clinicalForBootstrap !== "None"
      ? baseWeeks.map((w) => ({ ...w, edemaGrade: clinicalForBootstrap }))
      : baseWeeks.map((w) => ({ ...w }));

  const merged: Patient = {
    ...(rest as Patient),
    treatmentWeeks,
    profilePhotoDataUrl:
      rest.profilePhotoDataUrl !== undefined && rest.profilePhotoDataUrl !== ""
        ? rest.profilePhotoDataUrl
        : null,
    recordAttachments: Array.isArray(rest.recordAttachments) ? rest.recordAttachments : [],
    motherName: rest.motherName ?? "",
    healthCenterDistance: rest.healthCenterDistance ?? "",
    familySize: rest.familySize ?? null,
    firstVisitDate: rest.firstVisitDate ?? rest.createdAt ?? "",
    immunizationsComplete: rest.immunizationsComplete ?? null,
    dateOfDeath: (rest as Patient).dateOfDeath,
    medicalHistory,
  };
  return syncPatientAnthropometryFromTreatmentWeeks(merged);
}

export const TREATMENT_WEEKS_COUNT = 12;

export const GOVERNORATES: Record<string, string[]> = {
  "Sana'a": ["Old City", "Shu'ub", "Bani Hashish", "Sanhan", "Hamdan", "Manakhah"],
  "Aden": ["Crater", "Mansoura", "Khormaksar", "Al Mualla", "Tawahi", "Dar Saad"],
  "Taiz": ["Al Mudhaffar", "Al Qahira", "Salh", "Mawiyah", "Al Maqbanah", "Shamsah"],
  "Hodeidah": ["Al Hali", "Ad Dahi", "Bajil", "Zabid", "Bait Al Faqih", "Al Mansuriyah"],
  "Ibb": ["Ibb City", "Yarim", "Dhamar", "Jibla", "Al Udayn", "Mudhaykhirah"],
  "Hajjah": ["Hajjah City", "Abs", "Haradh", "Midi", "Mustaba", "Kushar"],
  "Marib": ["Marib City", "Serwah", "Harib", "Raghwan", "Majzar", "Al Jubah"],
  "Al Hudaydah": ["As Salif", "At Tuhayta", "Al Khokha", "Hays", "Al Garrahi", "Bayt Al Faqih"],
  "Lahj": ["Al Hawtah", "Radfan", "Yafrus", "Al Milah", "Tuban", "Mudhaykhirah"],
  "Abyan": ["Zinjibar", "Ja'ar", "Lawdar", "Mudiyah", "Rassd", "Shuqrah"],
};

export const SYMPTOMS_OPTIONS = [
  "Pale face",
  "Swelling (Edema)",
  "Weakness / Fatigue",
  "Loss of appetite",
  "Diarrhea",
  "Vomiting",
  "Fever",
  "Dry skin",
  "Hair loss / discoloration",
  "Muscle wasting",
  "Irritability",
  "Developmental delay",
];

function calcAgeMonths(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12;
  months += now.getMonth() - birth.getMonth();
  if (now.getDate() < birth.getDate()) months--;
  return Math.max(0, months);
}

function calcWFH(weight: number, height: number): number {
  return parseFloat((weight / ((height / 100) ** 2)).toFixed(1));
}

function calcZScore(muac: number): number {
  if (muac < 11.5) return parseFloat((-3.2 - Math.random() * 0.5).toFixed(1));
  if (muac < 12.5) return parseFloat((-2.1 - Math.random() * 0.4).toFixed(1));
  return parseFloat((-1.0 + Math.random() * 0.5).toFixed(1));
}

function calcRutf(weight: number): number {
  const raw = (weight * 200) / 500;
  const roundedToHalf = Math.round(raw * 2) / 2;
  return parseFloat(roundedToHalf.toFixed(1));
}

function calcDiagnosis(muac: number, edema: boolean, isDeceased: boolean): Diagnosis {
  if (isDeceased) return "Deceased";
  if (edema) return "SAM";
  if (muac < 11.5) return "SAM";
  if (muac < 12.5) return "MAM";
  if (muac >= 12.5 && muac < 13.5) return "Normal";
  return "Recovered";
}

function calcPercentage(muac: number, diagnosis: Diagnosis): number {
  if (diagnosis === "SAM") return Math.round(30 + Math.random() * 20);
  if (diagnosis === "MAM") return Math.round(55 + Math.random() * 15);
  if (diagnosis === "Recovered") return Math.round(80 + Math.random() * 15);
  if (diagnosis === "Deceased") return 0;
  return Math.round(70 + Math.random() * 20);
}

const BASE_DATA = [
  { name: "Ahmed Ali Hassan", father: "Ali Hassan Mohammed", phone: "+967 777 123 456", gender: "M" as const, dob: "2021-03-15", weight: 5.8, height: 72, muac: 10.2, gov: "Hajjah", dist: "Abs", edema: true, deceased: false },
  { name: "Fatima Mohammed Saleh", father: "Mohammed Saleh Ahmed", phone: "+967 712 234 567", gender: "F" as const, dob: "2022-06-20", weight: 6.4, height: 75, muac: 11.0, gov: "Hodeidah", dist: "Bajil", edema: false, deceased: false },
  { name: "Omar Yahya Al-Hamdi", father: "Yahya Omar Al-Hamdi", phone: "+967 733 345 678", gender: "M" as const, dob: "2023-01-10", weight: 7.1, height: 78, muac: 11.8, gov: "Taiz", dist: "Salh", edema: false, deceased: false },
  { name: "Maryam Ibrahim Al-Zubaydi", father: "Ibrahim Qasim Al-Zubaydi", phone: "+967 777 456 789", gender: "F" as const, dob: "2020-11-05", weight: 9.2, height: 84, muac: 12.1, gov: "Ibb", dist: "Ibb City", edema: false, deceased: false },
  { name: "Hassan Khalid Al-Sabri", father: "Khalid Nasser Al-Sabri", phone: "+967 711 567 890", gender: "M" as const, dob: "2021-08-25", weight: 8.5, height: 81, muac: 12.9, gov: "Sana'a", dist: "Sanhan", edema: false, deceased: false },
  { name: "Aisha Nasser Al-Dhubiani", father: "Nasser Ahmed Al-Dhubiani", phone: "+967 733 678 901", gender: "F" as const, dob: "2022-02-14", weight: 5.2, height: 68, muac: 9.8, gov: "Hajjah", dist: "Haradh", edema: true, deceased: false },
  { name: "Abdullah Saeed Al-Rashidi", father: "Saeed Ali Al-Rashidi", phone: "+967 777 789 012", gender: "M" as const, dob: "2023-04-30", weight: 7.8, height: 79, muac: 13.2, gov: "Aden", dist: "Crater", edema: false, deceased: false },
  { name: "Zaynab Hamid Al-Qa'idi", father: "Hamid Yahya Al-Qa'idi", phone: "+967 712 890 123", gender: "F" as const, dob: "2021-12-01", weight: 6.0, height: 73, muac: 10.5, gov: "Marib", dist: "Serwah", edema: false, deceased: false },
  { name: "Yusuf Omar Al-Matari", father: "Omar Ali Al-Matari", phone: "+967 733 901 234", gender: "M" as const, dob: "2020-07-18", weight: 10.1, height: 88, muac: 13.8, gov: "Hodeidah", dist: "Al Hali", edema: false, deceased: false },
  { name: "Khadija Ali Al-Shaibani", father: "Ali Mohammed Al-Shaibani", phone: "+967 777 012 345", gender: "F" as const, dob: "2022-09-22", weight: 5.5, height: 70, muac: 10.9, gov: "Taiz", dist: "Al Mudhaffar", edema: false, deceased: false },
  { name: "Ibrahim Salem Al-Aghbari", father: "Salem Qasim Al-Aghbari", phone: "+967 711 123 456", gender: "M" as const, dob: "2021-05-08", weight: 7.3, height: 76, muac: 11.3, gov: "Hajjah", dist: "Midi", edema: false, deceased: false },
  { name: "Rania Mohammed Al-Jabri", father: "Mohammed Hassan Al-Jabri", phone: "+967 733 234 567", gender: "F" as const, dob: "2023-07-14", weight: 6.8, height: 76, muac: 12.3, gov: "Ibb", dist: "Yarim", edema: false, deceased: false },
  { name: "Tariq Ahmed Al-Mutahar", father: "Ahmed Ali Al-Mutahar", phone: "+967 777 345 678", gender: "M" as const, dob: "2022-03-28", weight: 5.1, height: 67, muac: 9.5, gov: "Aden", dist: "Mansoura", edema: true, deceased: false },
  { name: "Salma Saeed Al-Kuhali", father: "Saeed Omar Al-Kuhali", phone: "+967 712 456 789", gender: "F" as const, dob: "2020-10-15", weight: 11.2, height: 92, muac: 14.1, gov: "Sana'a", dist: "Hamdan", edema: false, deceased: false },
  { name: "Walid Qasim Al-Yamani", father: "Qasim Ahmed Al-Yamani", phone: "+967 733 567 890", gender: "M" as const, dob: "2021-01-20", weight: 4.9, height: 65, muac: 9.1, gov: "Hodeidah", dist: "Zabid", edema: true, deceased: true },
  { name: "Nour Hassan Al-Zubairi", father: "Hassan Yahya Al-Zubairi", phone: "+967 777 678 901", gender: "F" as const, dob: "2023-02-11", weight: 6.2, height: 74, muac: 10.8, gov: "Marib", dist: "Harib", edema: false, deceased: false },
  { name: "Khalid Yahya Al-Himyari", father: "Yahya Ali Al-Himyari", phone: "+967 711 789 012", gender: "M" as const, dob: "2022-08-05", weight: 7.5, height: 78, muac: 12.6, gov: "Lahj", dist: "Al Hawtah", edema: false, deceased: false },
  { name: "Hana Ibrahim Al-Badawi", father: "Ibrahim Salem Al-Badawi", phone: "+967 733 890 123", gender: "F" as const, dob: "2021-04-17", weight: 8.8, height: 83, muac: 13.4, gov: "Abyan", dist: "Zinjibar", edema: false, deceased: false },
  { name: "Mohammed Ali Al-Ansi", father: "Ali Mohammed Al-Ansi", phone: "+967 777 901 234", gender: "M" as const, dob: "2020-12-30", weight: 5.6, height: 71, muac: 11.1, gov: "Taiz", dist: "Mawiyah", edema: false, deceased: false },
  { name: "Amira Nasser Al-Dhahri", father: "Nasser Omar Al-Dhahri", phone: "+967 712 012 345", gender: "F" as const, dob: "2023-05-22", weight: 5.9, height: 73, muac: 10.3, gov: "Hajjah", dist: "Mustaba", edema: false, deceased: false },
  { name: "Sara Hamid Al-Qahtani", father: "Hamid Ali Al-Qahtani", phone: "+967 777 111 222", gender: "F" as const, dob: "2025-01-15", weight: 4.2, height: 60, muac: 10.5, gov: "Hajjah", dist: "Abs", edema: false, deceased: false },
  { name: "Anas Mohammed Al-Ruqaishi", father: "Mohammed Anas Al-Ruqaishi", phone: "+967 711 222 333", gender: "M" as const, dob: "2024-08-20", weight: 5.1, height: 65, muac: 9.8, gov: "Hodeidah", dist: "Bajil", edema: true, deceased: false },
  { name: "Lina Omar Al-Shahari", father: "Omar Said Al-Shahari", phone: "+967 733 333 444", gender: "F" as const, dob: "2024-11-10", weight: 3.8, height: 57, muac: 11.2, gov: "Taiz", dist: "Al Mudhaffar", edema: false, deceased: false },
  { name: "Rami Saeed Al-Mahrami", father: "Saeed Rami Al-Mahrami", phone: "+967 777 444 555", gender: "M" as const, dob: "2025-03-05", weight: 3.5, height: 54, muac: 10.8, gov: "Aden", dist: "Mansoura", edema: false, deceased: false },
  { name: "Jana Ibrahim Al-Humaiqani", father: "Ibrahim Salim Al-Humaiqani", phone: "+967 712 555 666", gender: "F" as const, dob: "2024-06-18", weight: 5.8, height: 68, muac: 11.4, gov: "Ibb", dist: "Ibb City", edema: false, deceased: false },
  { name: "Zaid Khalil Al-Dawsari", father: "Khalil Ahmed Al-Dawsari", phone: "+967 733 666 777", gender: "M" as const, dob: "2024-09-30", weight: 4.5, height: 62, muac: 10.1, gov: "Sana'a", dist: "Hamdan", edema: true, deceased: false },
  { name: "Nada Yusuf Al-Raymi", father: "Yusuf Mohammed Al-Raymi", phone: "+967 777 777 888", gender: "F" as const, dob: "2025-02-08", weight: 3.2, height: 52, muac: 9.5, gov: "Marib", dist: "Serwah", edema: false, deceased: false },
  { name: "Faris Ali Al-Dhahabi", father: "Ali Faris Al-Dhahabi", phone: "+967 711 888 999", gender: "M" as const, dob: "2018-03-12", weight: 18.5, height: 112, muac: 14.2, gov: "Hajjah", dist: "Haradh", edema: false, deceased: false },
  { name: "Marwa Hassan Al-Sabri", father: "Hassan Marwa Al-Sabri", phone: "+967 733 999 000", gender: "F" as const, dob: "2016-07-25", weight: 22.1, height: 125, muac: 13.8, gov: "Hodeidah", dist: "Al Hali", edema: false, deceased: false },
  { name: "Qasim Ahmed Al-Saqaf", father: "Ahmed Qasim Al-Saqaf", phone: "+967 777 000 111", gender: "M" as const, dob: "2017-11-14", weight: 16.8, height: 108, muac: 12.1, gov: "Taiz", dist: "Salh", edema: false, deceased: false },
];

const MEDICATIONS = ["Amoxicillin + Vit A", "Amoxicillin + Zinc", "Cotrimoxazole + Vit A", "Mebendazole + Vit A", "Amoxicillin only"];
const MILKS = ["F75", "F100", "RUTF only", "F100 + RUTF", "F75 → F100"];
const SYMPTOM_SETS = [
  ["Pale face", "Weakness / Fatigue", "Loss of appetite"],
  ["Swelling (Edema)", "Weakness / Fatigue", "Diarrhea"],
  ["Muscle wasting", "Dry skin", "Hair loss / discoloration"],
  ["Loss of appetite", "Irritability", "Fever"],
  ["Pale face", "Diarrhea", "Vomiting"],
];

function makeWeek(
  weight: number,
  lengthHeightCm: number,
  muac: number,
  edema: boolean,
  weekIndex: number,
): WeekData {
  const wAdj = weight + weekIndex * (0.1 + Math.random() * 0.15);
  const mAdj = muac + weekIndex * (0.05 + Math.random() * 0.1);
  const rutf = calcRutf(wAdj);
  return {
    weight: parseFloat(wAdj.toFixed(1)),
    muac: parseFloat(mAdj.toFixed(1)),
    edemaGrade: weekIndex <= 1 && edema ? "+" : "None",
    rutf,
    height: isHeightCaptureWeekIndex(weekIndex)
      ? Math.round(lengthHeightCm + weekIndex * 0.2)
      : null,
    zScore: null,
    supplements: "Vit A + Zinc",
    followUpOutcome: weekIndex >= 1 ? "Continuing_treatment" : "",
  };
}

function sanitizeWeekFromStorage(raw: Partial<WeekData> & { edema?: boolean }): WeekData {
  const g = raw.edemaGrade;
  let edemaGrade: ClinicalEdemaGrade = "None";
  if (g === "+" || g === "++" || g === "+++" || g === "None") edemaGrade = g;
  else if (raw.edema === true) edemaGrade = "+";
  return {
    weight: raw.weight ?? null,
    muac: raw.muac ?? null,
    edemaGrade,
    rutf: raw.rutf ?? null,
    height: raw.height ?? null,
    zScore: raw.zScore ?? null,
    supplements: raw.supplements ?? "",
    followUpOutcome: (raw.followUpOutcome ?? "") as FollowUpOutcome,
  };
}

export function createEmptyWeekData(): WeekData {
  return {
    weight: null,
    muac: null,
    edemaGrade: "None",
    rutf: null,
    height: null,
    zScore: null,
    supplements: "",
    followUpOutcome: "",
  };
}

/** True if a treatment week has any entered follow-up or anthropometry data. */
export function weekHasMeaningfulData(week: WeekData): boolean {
  return (
    week.weight !== null ||
    week.muac !== null ||
    week.height !== null ||
    week.supplements.trim().length > 0 ||
    (week.followUpOutcome ?? "") !== "" ||
    week.edemaGrade !== "None"
  );
}

function latestNumericWeekValue(weeks: WeekData[], pick: (w: WeekData) => number | null): number | null {
  for (let i = weeks.length - 1; i >= 0; i--) {
    const v = pick(weeks[i]!);
    if (v != null && !Number.isNaN(v)) return v;
  }
  return null;
}

const EDEMA_GRADE_RANK: Record<ClinicalEdemaGrade, number> = {
  None: 0,
  "+": 1,
  "++": 2,
  "+++": 3,
};

/** Strongest edema grade recorded across the 12-week grid. */
export function worstWeeklyEdemaGrade(weeks: WeekData[]): ClinicalEdemaGrade {
  let worst: ClinicalEdemaGrade = "None";
  for (const w of weeks) {
    if (EDEMA_GRADE_RANK[w.edemaGrade] > EDEMA_GRADE_RANK[worst]) worst = w.edemaGrade;
  }
  return worst;
}

/** Aligns `medicalHistory.clinicalEdemaGrade` (and legacy `edema`) with the worst grade in treatment weeks. */
export function applyWeeklyEdemaToMedicalHistory(patient: Patient): Patient {
  const worstWeekly = worstWeeklyEdemaGrade(patient.treatmentWeeks ?? []);
  const mh = mergeMedicalHistory(patient.medicalHistory);
  // One-way sync rule: weekly edema can promote medical edema, but medical edits do not rewrite weekly slots.
  const resolved: ClinicalEdemaGrade = worstWeekly !== "None" ? worstWeekly : mh.clinicalEdemaGrade;
  return {
    ...patient,
    medicalHistory: { ...mh, clinicalEdemaGrade: resolved },
    edema: resolved !== "None",
  };
}

/** Medical history graded edema or legacy admission `edema` flag (not the 12-week grid). */
export function patientHasAdmissionEdemaOnly(
  p: Pick<Patient, "medicalHistory" | "edema">,
): boolean {
  const g = p.medicalHistory?.clinicalEdemaGrade ?? "None";
  if (g !== "None") return true;
  return p.edema;
}

/** Any treatment week has clinical edema + / ++ / +++. */
export function patientHasWeeklyEdemaPlus(p: Pick<Patient, "treatmentWeeks">): boolean {
  const weeks = p.treatmentWeeks;
  if (!weeks?.length) return false;
  return weeks.some((w) => w.edemaGrade === "+" || w.edemaGrade === "++" || w.edemaGrade === "+++");
}

/** Stable key for syncing modal state when persisted weekly edema grades change. */
export function weeklyEdemaGradesKey(p: Pick<Patient, "treatmentWeeks">): string {
  return (p.treatmentWeeks ?? []).map((w) => w.edemaGrade).join("\t");
}

/** Medical history, weekly grid, or legacy admission flag — any + / ++ / +++ stops outpatient flow. */
export function patientHasClinicalEdema(
  p: Pick<Patient, "medicalHistory" | "edema" | "treatmentWeeks">,
): boolean {
  return patientHasAdmissionEdemaOnly(p) || patientHasWeeklyEdemaPlus(p);
}

/** Directory / export: worst weekly grade, else medical history grade, else legacy boolean as "+"/لا. */
export function formatEdemaForTable(
  p: Pick<Patient, "medicalHistory" | "edema" | "treatmentWeeks">,
): string {
  const ww = p.treatmentWeeks?.length ? worstWeeklyEdemaGrade(p.treatmentWeeks) : ("None" as ClinicalEdemaGrade);
  if (ww !== "None") return ww;
  const g = p.medicalHistory?.clinicalEdemaGrade ?? "None";
  if (g !== "None") return g;
  return p.edema ? "+" : "لا";
}

/** Weight / height / MUAC from the latest week that recorded each value; falls back to profile fields. */
export function getPatientDerivedAnthropometry(patient: Patient): {
  weight: number;
  height: number;
  muac: number;
  wfh: number;
  zScore: number;
  diagnosis: Diagnosis;
} {
  if (patient.isDeceased) {
    return {
      weight: patient.weight,
      height: patient.height,
      muac: patient.muac,
      wfh: patient.wfh,
      zScore: patient.zScore,
      diagnosis: patient.diagnosis,
    };
  }
  const weeks = patient.treatmentWeeks ?? [];
  const wFrom = latestNumericWeekValue(weeks, (w) => w.weight);
  const hFrom = latestNumericWeekValue(weeks, (w) => w.height);
  const mFrom = latestNumericWeekValue(weeks, (w) => w.muac);
  const weight = wFrom ?? patient.weight;
  const height = hFrom ?? patient.height;
  const muac = mFrom ?? patient.muac;
  const wfh =
    weight > 0 && height > 0 ? calcWFHValue(weight, height) : patient.wfh;
  const zScore =
    patient.ageMonths >= 6 && muac > 0 ? calcZScoreFromMuac(muac) : patient.zScore;
  const diagnosis = calcDiagnosisFromMuac(muac, patientHasClinicalEdema(patient));
  return { weight, height, muac, wfh, zScore, diagnosis };
}

/** Copies latest weekly vitals onto the patient profile so charts, exports, and tabs stay aligned. */
export function syncPatientAnthropometryFromTreatmentWeeks(patient: Patient): Patient {
  if (patient.isDeceased) return patient;
  const withMh = applyWeeklyEdemaToMedicalHistory(patient);
  const d = getPatientDerivedAnthropometry(withMh);
  return {
    ...withMh,
    weight: d.weight,
    height: d.height,
    muac: d.muac,
    wfh: d.wfh,
    zScore: d.zScore,
    diagnosis: d.diagnosis,
  };
}

export function calcPercentageForPatient(patient: Patient): number {
  const d = getPatientDerivedAnthropometry(patient);
  return calcPercentage(d.muac, d.diagnosis);
}

/** Last week index (1–12) that already has follow-up data; else week 12 index. */
export function preferredDeathWeekIndex(patient: Pick<Patient, "treatmentWeeks">): number {
  const weeks = patient.treatmentWeeks;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (weekHasMeaningfulData(weeks[i]!)) return i;
  }
  return Math.max(0, weeks.length - 1);
}

/** Sets vital death flags and marks the given week’s follow-up outcome as Death. */
export function withPatientDeathRecorded(
  patient: Patient,
  deathDate: string,
  weekIndex: number,
): Patient {
  const idx = Math.max(0, Math.min(patient.treatmentWeeks.length - 1, weekIndex));
  const treatmentWeeks = patient.treatmentWeeks.map((w, i) =>
    i === idx ? { ...w, followUpOutcome: FOLLOW_UP_OUTCOME_DEATH } : w,
  );
  return {
    ...patient,
    isDeceased: true,
    diagnosis: "Deceased",
    dateOfDeath: deathDate,
    lastVisitDate: deathDate,
    treatmentWeeks,
  };
}

/**
 * Sum of weekly RUTF (sachets/day) across the 12-week grid — only weeks where `rutf` is recorded count;
 * empty weeks are skipped. Used for table totals / export / statistics.
 * Returns 0 when clinical edema is present or age is under 6 months (outpatient RUTF not used).
 */
export function totalProgramRutfSachets(
  patient: Pick<Patient, "edema" | "ageMonths" | "treatmentWeeks" | "medicalHistory">,
): number {
  if (patientHasClinicalEdema(patient) || patient.ageMonths < 6) return 0;
  let lastUsedWeekIdx = -1;
  for (let i = patient.treatmentWeeks.length - 1; i >= 0; i--) {
    const w = patient.treatmentWeeks[i]!;
    if ((w.weight ?? 0) > 0) {
      lastUsedWeekIdx = i;
      break;
    }
  }
  if (lastUsedWeekIdx < 0) return 0;
  let sum = 0;
  for (let i = 0; i <= lastUsedWeekIdx; i++) {
    const week = patient.treatmentWeeks[i]!;
    const wkWeight = week.weight ?? 0;
    if (wkWeight <= 0) continue;
    // Keep table total consistent with weekly card formula/rounding.
    sum += calcRutfAmount(wkWeight);
  }
  return parseFloat(sum.toFixed(1));
}

function normalizeTreatmentWeeks(patient: LegacyPatient): WeekData[] {
  if (Array.isArray(patient.treatmentWeeks)) {
    const normalized = patient.treatmentWeeks
      .slice(0, TREATMENT_WEEKS_COUNT)
      .map((week) =>
        sanitizeWeekFromStorage({ ...createEmptyWeekData(), ...(week as Partial<WeekData> & { edema?: boolean }) }),
      );

    while (normalized.length < TREATMENT_WEEKS_COUNT) {
      normalized.push(createEmptyWeekData());
    }
    return normalized;
  }

  const legacyWeeks = [patient.week1, patient.week2, patient.week3, patient.week4]
    .filter(Boolean)
    .map((week) =>
      sanitizeWeekFromStorage({ ...createEmptyWeekData(), ...(week as Partial<WeekData> & { edema?: boolean }) }),
    );

  while (legacyWeeks.length < TREATMENT_WEEKS_COUNT) {
    legacyWeeks.push(createEmptyWeekData());
  }

  return legacyWeeks;
}

/** Short numeric id for tables (1 … 99999). */
function isSequentialNumericPatientId(id: string): boolean {
  return /^\d{1,5}$/.test(id);
}

function patientIdsNeedRenumber(patients: Patient[]): boolean {
  const seen = new Set<string>();
  for (const p of patients) {
    if (!isSequentialNumericPatientId(p.id)) return true;
    if (seen.has(p.id)) return true;
    seen.add(p.id);
  }
  return false;
}

function assignSequentialPatientIds(patients: Patient[]): Patient[] {
  return patients.map((p, i) => ({ ...p, id: String(i + 1) }));
}

/** Next free id = max(existing numeric id) + 1 (supports up to 99 999). */
export function nextSequentialPatientId(patients: Patient[]): string {
  let max = 0;
  for (const p of patients) {
    if (/^\d+$/.test(p.id)) {
      const n = parseInt(p.id, 10);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  }
  return String(max + 1);
}

/** Blank patient row for the 4-tab chart (add flow). Caller supplies `id` from `nextSequentialPatientId`. */
export function createDraftPatient(id: string): Patient {
  const today = new Date().toISOString().split("T")[0];
  const defaultGov = "Sana'a";
  const defaultDist = GOVERNORATES[defaultGov][0];
  const weight = 7;
  const height = 72;
  const muac = 12.8;
  const dob = "2023-01-01";
  const wfh = calcWFHValue(weight, height);
  const zScore = calcZScoreFromMuac(muac);
  const diagnosis = calcDiagnosisFromMuac(muac, false);
  const doseVal = calcRutfAmount(weight);

  return normalizePatientRecord({
    id,
    name: "",
    fatherName: "",
    fatherPhone: "",
    motherName: "",
    gender: "M",
    dateOfBirth: dob,
    ageMonths: calcAgeMonthsFromDob(dob),
    weight,
    height,
    wfh,
    edema: false,
    zScore,
    muac,
    diagnosis,
    governorate: defaultGov,
    district: defaultDist,
    symptoms: [],
    milk: "F75",
    dose: `${doseVal} sachets/day`,
    medication: "Amoxicillin + Vit A",
    supplements: "Vit A + Zinc + Iron",
    profilePhotoDataUrl: null,
    recordAttachments: [],
    lastVisitDate: today,
    createdAt: today,
    treatmentWeeks: Array.from({ length: TREATMENT_WEEKS_COUNT }, () => createEmptyWeekData()),
    isDeceased: false,
  });
}

function generatePatients(): Patient[] {
  return BASE_DATA.map((d, i) => {
    const age = calcAgeMonths(d.dob);
    const wfh = calcWFH(d.weight, d.height);
    const zScore = calcZScore(d.muac);
    const diagnosis = calcDiagnosis(d.muac, d.edema, d.deceased);
    const now = new Date();
    const created = new Date(now.getTime() - (i * 3 + Math.random() * 30) * 24 * 60 * 60 * 1000);
    const lastVisit = new Date(created.getTime() + Math.random() * 14 * 24 * 60 * 60 * 1000);
    const rutf = calcRutf(d.weight);

    return normalizePatientRecord({
      id: String(i + 1),
      name: d.name,
      fatherName: d.father,
      fatherPhone: d.phone,
      motherName: "",
      gender: d.gender,
      dateOfBirth: d.dob,
      ageMonths: age,
      weight: d.weight,
      height: d.height,
      wfh,
      edema: d.edema,
      zScore,
      muac: d.muac,
      diagnosis,
      governorate: d.gov,
      district: d.dist,
      symptoms: SYMPTOM_SETS[i % SYMPTOM_SETS.length],
      milk: MILKS[i % MILKS.length],
      dose: `${rutf} sachets/day`,
      medication: MEDICATIONS[i % MEDICATIONS.length],
      supplements: "Vit A + Zinc + Iron",
      profilePhotoDataUrl: null,
      recordAttachments: [],
      lastVisitDate: lastVisit.toISOString().split("T")[0],
      createdAt: created.toISOString().split("T")[0],
      treatmentWeeks: [
        makeWeek(d.weight, d.height, d.muac, d.edema, 0),
        makeWeek(d.weight, d.height, d.muac, d.edema, 1),
        makeWeek(d.weight, d.height, d.muac, d.edema, 2),
        makeWeek(d.weight, d.height, d.muac, d.edema, 3),
        ...Array.from({ length: TREATMENT_WEEKS_COUNT - 4 }, () =>
          createEmptyWeekData(),
        ),
      ],
      isDeceased: d.deceased,
      dateOfDeath: d.deceased ? lastVisit.toISOString().split("T")[0] : undefined,
    });
  });
}

const STORAGE_KEY = "yns_patients_v3";

export function loadPatients(): Patient[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as LegacyPatient[];
      let migrated = parsed.map((patient) => {
        const normalizedWeeks = normalizeTreatmentWeeks(patient);
        const { week1, week2, week3, week4, ...rest } = patient;
        return normalizePatientRecord({
          ...rest,
          treatmentWeeks: normalizedWeeks,
        } as Patient);
      });

      if (patientIdsNeedRenumber(migrated)) {
        migrated = assignSequentialPatientIds(migrated);
      }

      savePatients(migrated);
      return migrated;
    }
  } catch {}
  const initial = generatePatients();
  void savePatients(initial);
  return initial;
}

/** Persists to localStorage. Returns false if quota exceeded or another write error. */
export function savePatients(patients: Patient[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
    return true;
  } catch (e) {
    console.error("savePatients failed", e);
    return false;
  }
}

export function calcDiagnosisFromMuac(muac: number, edema: boolean): Diagnosis {
  if (edema) return "SAM";
  if (muac < 11.5) return "SAM";
  if (muac < 12.5) return "MAM";
  return "Normal";
}

/** Clears death vital flags and removes Death from all weekly outcome fields. */
export function withPatientDeathCleared(patient: Patient): Patient {
  const treatmentWeeks = patient.treatmentWeeks.map((w) =>
    w.followUpOutcome === FOLLOW_UP_OUTCOME_DEATH ? { ...w, followUpOutcome: "" as FollowUpOutcome } : w,
  );
  return {
    ...patient,
    isDeceased: false,
    dateOfDeath: undefined,
    diagnosis: calcDiagnosisFromMuac(patient.muac, patientHasClinicalEdema(patient)),
    treatmentWeeks,
  };
}

export function calcAgeMonthsFromDob(dob: string): number {
  return calcAgeMonths(dob);
}

export function calcRutfAmount(weight: number): number {
  return calcRutf(weight);
}

export function calcZScoreFromMuac(muac: number): number {
  return calcZScore(muac);
}

export function calcWFHValue(weight: number, height: number): number {
  return calcWFH(weight, height);
}

export function getPercentageColor(diagnosis: Diagnosis): string {
  if (diagnosis === "SAM") return "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/30";
  if (diagnosis === "MAM") return "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-950/30";
  if (diagnosis === "Recovered") return "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950/30";
  if (diagnosis === "Deceased") return "text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800/50";
  return "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30";
}

export function getDiagnosisColor(diagnosis: Diagnosis): string {
  if (diagnosis === "SAM") return "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900";
  if (diagnosis === "MAM") return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900";
  if (diagnosis === "Recovered") return "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-900";
  if (diagnosis === "Deceased") return "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700";
  return "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900";
}
