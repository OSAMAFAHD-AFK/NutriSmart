export type Diagnosis = "SAM" | "MAM" | "Normal" | "Recovered" | "Deceased";

export type WeekData = {
  weight: number | null;
  muac: number | null;
  edema: boolean;
  rutf: number | null;
  height: number | null;
  zScore: number | null;
  supplements: string;
};

export type Patient = {
  id: string;
  name: string;
  fatherName: string;
  fatherPhone: string;
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
  symptoms: string[];
  milk: string;
  dose: string;
  medication: string;
  supplements: string;
  photoUrl: string;
  lastVisitDate: string;
  createdAt: string;
  week1: WeekData;
  week2: WeekData;
  week3: WeekData;
  week4: WeekData;
  isDeceased: boolean;
};

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
  return parseFloat(((weight * 200) / 500).toFixed(1));
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

export function calcPercentageForPatient(patient: Patient): number {
  return calcPercentage(patient.muac, patient.diagnosis);
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

function makeWeek(weight: number, muac: number, edema: boolean, week: number): WeekData {
  const wAdj = weight + week * (0.1 + Math.random() * 0.15);
  const mAdj = muac + week * (0.05 + Math.random() * 0.1);
  const rutf = calcRutf(wAdj);
  return {
    weight: parseFloat(wAdj.toFixed(1)),
    muac: parseFloat(mAdj.toFixed(1)),
    edema: week <= 1 ? edema : false,
    rutf,
    height: week === 4 ? null : null,
    zScore: calcZScore(mAdj),
    supplements: "Vit A + Zinc",
  };
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

    return {
      id: `YNS-${2024100 + i}`,
      name: d.name,
      fatherName: d.father,
      fatherPhone: d.phone,
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
      photoUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(d.name)}&backgroundColor=b6e3f4,c0aede,d1d4f9`,
      lastVisitDate: lastVisit.toISOString().split("T")[0],
      createdAt: created.toISOString().split("T")[0],
      week1: makeWeek(d.weight, d.muac, d.edema, 0),
      week2: makeWeek(d.weight, d.muac, d.edema, 1),
      week3: makeWeek(d.weight, d.muac, d.edema, 2),
      week4: makeWeek(d.weight, d.muac, d.edema, 3),
      isDeceased: d.deceased,
    };
  });
}

const STORAGE_KEY = "yns_patients_v2";

export function loadPatients(): Patient[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  const initial = generatePatients();
  savePatients(initial);
  return initial;
}

export function savePatients(patients: Patient[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
}

export function calcDiagnosisFromMuac(muac: number, edema: boolean): Diagnosis {
  if (edema) return "SAM";
  if (muac < 11.5) return "SAM";
  if (muac < 12.5) return "MAM";
  return "Normal";
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
