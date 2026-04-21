export type HealthCenterDistance = "" | "Nearby" | "Medium" | "Far" | "Very Far";

/** First 6 months: exclusive breast milk vs diluted / mixed with water. */
export type FirstSixMonthsFeeding = "" | "Pure_milk" | "Mixed_with_water";

/** Appetite scale for history (Arabic-aligned labels in UI). */
export type AppetiteStatus = "" | "Excellent" | "Medium" | "None";

export type ClinicalEdemaGrade = "None" | "+" | "++" | "+++";

export type ConsciousnessLevel = "" | "Alert" | "Lethargic";

export type PallorLevel = "" | "Mild" | "Moderate" | "Severe";

export type PatientMedicalHistory = {
  breastfeeding: boolean | null;
  firstSixMonths: FirstSixMonthsFeeding;
  feedingFrequencyPerDay: number | null;
  vomitingOrRefusal: boolean | null;
  complementaryFeeding: boolean | null;
  appetiteStatus: AppetiteStatus;
  diarrhea: boolean;
  diarrheaDurationDays: number | null;
  vomiting: boolean;
  vomitingDurationDays: number | null;
  fever: boolean;
  feverDurationDays: number | null;
  cough: boolean;
  coughDurationDays: number | null;
  clinicalEdemaGrade: ClinicalEdemaGrade;
  /** Skin ulcers severity scale (same + / ++ / +++ scale). */
  skinUlcersGrade: ClinicalEdemaGrade;
  urinationPerDay: number | null;
  defecationPerDay: number | null;
  consciousness: ConsciousnessLevel;
  conjunctivitis: boolean | null;
  pallorLevel: PallorLevel;
};

export function defaultMedicalHistory(): PatientMedicalHistory {
  return {
    breastfeeding: null,
    firstSixMonths: "",
    feedingFrequencyPerDay: null,
    vomitingOrRefusal: null,
    complementaryFeeding: null,
    appetiteStatus: "",
    diarrhea: false,
    diarrheaDurationDays: null,
    vomiting: false,
    vomitingDurationDays: null,
    fever: false,
    feverDurationDays: null,
    cough: false,
    coughDurationDays: null,
    clinicalEdemaGrade: "None",
    skinUlcersGrade: "None",
    urinationPerDay: null,
    defecationPerDay: null,
    consciousness: "",
    conjunctivitis: null,
    pallorLevel: "",
  };
}

function migrateStoredMedicalHistory(h: PatientMedicalHistory): PatientMedicalHistory {
  let firstSixMonths = h.firstSixMonths as string;
  if (firstSixMonths === "Exclusive") firstSixMonths = "Pure_milk";
  if (firstSixMonths === "Mixed") firstSixMonths = "Mixed_with_water";

  let appetiteStatus = h.appetiteStatus as string;
  if (appetiteStatus === "Good") appetiteStatus = "Excellent";
  if (appetiteStatus === "Low") appetiteStatus = "Medium";

  return {
    ...h,
    firstSixMonths: firstSixMonths as FirstSixMonthsFeeding,
    appetiteStatus: appetiteStatus as AppetiteStatus,
  };
}

export function mergeMedicalHistory(
  partial?: Partial<PatientMedicalHistory> | null,
): PatientMedicalHistory {
  return migrateStoredMedicalHistory({ ...defaultMedicalHistory(), ...partial });
}

export type MedicalAlert = {
  id: string;
  severity: "critical" | "warning" | "success";
  title: string;
  message: string;
};

export function collectMedicalAlerts(
  mh: PatientMedicalHistory,
  legacyEdema: boolean,
): MedicalAlert[] {
  const alerts: MedicalAlert[] = [];

  if (mh.appetiteStatus === "None") {
    alerts.push({
      id: "appetite-none",
      severity: "critical",
      title: "Refer to hospital",
      message: "Appetite recorded as None — urgent clinical review and referral are recommended.",
    });
  } else if (mh.appetiteStatus === "Medium") {
    alerts.push({
      id: "appetite-medium",
      severity: "warning",
      title: "Moderate appetite",
      message: "Monitor intake closely and consider nutritional support per protocol.",
    });
  }

  if (mh.clinicalEdemaGrade !== "None") {
    alerts.push({
      id: "edema-grade",
      severity: "critical",
      title: "Edema present",
      message: `Kwashiorkor / edema (${mh.clinicalEdemaGrade}) — stop outpatient nutrition protocols where contraindicated; immediate hospital referral and stabilization.`,
    });
  } else if (legacyEdema) {
    alerts.push({
      id: "edema-legacy",
      severity: "critical",
      title: "Edema flag",
      message: "This record is flagged for edema — confirm grade in Medical History and refer immediately.",
    });
  }

  if (mh.consciousness === "Lethargic") {
    alerts.push({
      id: "lethargy",
      severity: "critical",
      title: "Emergency: altered consciousness",
      message: "Lethargy — consider hypoglycemia: give Glucose 10% per local guideline if indicated and refer urgently to hospital.",
    });
  }

  if (mh.pallorLevel === "Severe") {
    alerts.push({
      id: "pallor-severe",
      severity: "warning",
      title: "Severe pallor",
      message: "Evaluate for anemia and comorbidities; follow-up testing per facility SOP.",
    });
  }

  if (
    mh.diarrhea &&
    (mh.diarrheaDurationDays === null || mh.diarrheaDurationDays <= 0)
  ) {
    alerts.push({
      id: "diarrhea-duration",
      severity: "warning",
      title: "Incomplete data",
      message: "Diarrhea is Yes — enter duration in days for the chart.",
    });
  }

  return alerts;
}

export function validateMedicalHistory(mh: PatientMedicalHistory): string[] {
  const errs: string[] = [];
  if (
    mh.breastfeeding === true &&
    mh.firstSixMonths !== "Pure_milk" &&
    mh.firstSixMonths !== "Mixed_with_water"
  ) {
    errs.push(
      "When breastfeeding is Yes, record first 6 months as pure breast milk only or diluted / mixed with water.",
    );
  }
  const needDur = (active: boolean, days: number | null, label: string) => {
    if (active && (days === null || days === undefined || Number.isNaN(days) || days < 0)) {
      errs.push(`${label}: enter duration in days (0 = same day).`);
    }
  };
  needDur(mh.diarrhea, mh.diarrheaDurationDays, "Diarrhea");
  needDur(mh.vomiting, mh.vomitingDurationDays, "Vomiting");
  needDur(mh.fever, mh.feverDurationDays, "Fever");
  needDur(mh.cough, mh.coughDurationDays, "Cough");
  if (mh.feedingFrequencyPerDay !== null && mh.feedingFrequencyPerDay < 0) {
    errs.push("Breastfeeding episodes per day cannot be negative.");
  }
  if (mh.urinationPerDay !== null && mh.urinationPerDay < 0) {
    errs.push("Urination per day cannot be negative.");
  }
  if (mh.defecationPerDay !== null && mh.defecationPerDay < 0) {
    errs.push("Defecation per day cannot be negative.");
  }
  return errs;
}
