import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Minus, X, CalendarCheck } from "lucide-react";
import type { ClinicalEdemaGrade } from "@/lib/patientMedicalProfile";
import {
  createEmptyWeekData,
  type Patient,
  calcRutfAmount,
  FOLLOW_UP_OUTCOME_OPTIONS,
  FOLLOW_UP_OUTCOME_DEATH,
  withPatientDeathRecorded,
  type FollowUpOutcome,
  patientHasClinicalEdema,
  isHeightCaptureWeekIndex,
  WEEKLY_EDEMA_OPTIONS,
  weightTrendVsPriorWeek,
  normalizePatientRecord,
  syncPatientAnthropometryFromTreatmentWeeks,
} from "@/lib/data";
import { heightMeasureFullLabel, isInfantUnder6Months } from "@/lib/patientTableAnthro";

type Props = {
  patient: Patient;
  onSave: (p: Patient) => void;
  onClose: () => void;
};

const WEEKLY_DISPOSITION_LABEL = "Weekly recovery disposition";
const WEEKLY_DISPOSITION_HINT = "متابعة التعافي الأسبوعية";

export default function WeeklyUpdateModal({ patient, onSave, onClose }: Props) {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const gridLen = patient.treatmentWeeks.length;
  const weekSlots = useMemo(
    () =>
      Array.from({ length: gridLen }, (_, index) => ({
        key: index,
        label: `Week ${index + 1}`,
      })),
    [gridLen],
  );
  const weekData = patient.treatmentWeeks[selectedWeek] ?? createEmptyWeekData();
  const infant = isInfantUnder6Months(patient);

  const [weight, setWeight] = useState(weekData.weight?.toString() ?? "");
  const [muac, setMuac] = useState(weekData.muac?.toString() ?? "");
  const [edemaGrade, setEdemaGrade] = useState<ClinicalEdemaGrade>(weekData.edemaGrade);
  const [height, setHeight] = useState(weekData.height?.toString() ?? "");
  const [supplements, setSupplements] = useState(weekData.supplements ?? "");
  const [followUpOutcome, setFollowUpOutcome] = useState<FollowUpOutcome>(weekData.followUpOutcome ?? "");

  const wNum = parseFloat(weight) || 0;
  const rutf = !infant && wNum ? calcRutfAmount(wNum) : weekData.rutf ?? 0;
  const showHeight = isHeightCaptureWeekIndex(selectedWeek, gridLen);
  const showDisposition = selectedWeek >= 1;
  const weightTrend =
    selectedWeek >= 1 ? weightTrendVsPriorWeek(patient.treatmentWeeks, selectedWeek) : "none";

  function handleWeekChange(wk: number) {
    setSelectedWeek(wk);
    const d = patient.treatmentWeeks[wk] ?? createEmptyWeekData();
    setWeight(d.weight?.toString() ?? "");
    setMuac(d.muac?.toString() ?? "");
    setEdemaGrade(d.edemaGrade);
    setHeight(d.height?.toString() ?? "");
    setSupplements(d.supplements ?? "");
    setFollowUpOutcome(d.followUpOutcome ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split("T")[0];
    const slot = patient.treatmentWeeks[selectedWeek] ?? createEmptyWeekData();
    const outcomeForSave: FollowUpOutcome =
      selectedWeek === 0 ? (slot.followUpOutcome ?? "") : followUpOutcome;
    const treatmentWeeks = patient.treatmentWeeks.map((week, index) =>
      index === selectedWeek
        ? {
            ...week,
            weight: parseFloat(weight) || null,
            muac: infant ? slot.muac : parseFloat(muac) || null,
            edemaGrade,
            rutf: infant ? null : wNum ? calcRutfAmount(wNum) : week.rutf,
            height: showHeight ? parseFloat(height) || null : week.height,
            zScore: null,
            supplements,
            followUpOutcome: outcomeForSave,
          }
        : week,
    );
    let updated: Patient = {
      ...patient,
      lastVisitDate: today,
      treatmentWeeks,
    };
    if (outcomeForSave === FOLLOW_UP_OUTCOME_DEATH) {
      updated = withPatientDeathRecorded(updated, today, selectedWeek);
    }
    onSave(syncPatientAnthropometryFromTreatmentWeeks(normalizePatientRecord(updated)));
  }

  const inputCls =
    "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  function weightTrendBadge() {
    const base =
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-muted-foreground";
    if (weightTrend === "up") {
      return (
        <div className={`${base} border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400`}>
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </div>
      );
    }
    if (weightTrend === "down") {
      return (
        <div className={`${base} border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400`}>
          <ArrowDown className="h-5 w-5" strokeWidth={2.5} />
        </div>
      );
    }
    if (weightTrend === "flat") {
      return (
        <div className={`${base} border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300`}>
          <Minus className="h-5 w-5" strokeWidth={2.5} />
        </div>
      );
    }
    return (
      <div className={`${base} border-border bg-muted/40`}>
        <span className="text-[10px] font-medium">—</span>
      </div>
    );
  }

  if (patientHasClinicalEdema(patient)) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-md p-6">
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center mx-auto">
              <X size={24} className="text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Weekly Update Disabled</h3>
            <p className="text-sm text-muted-foreground">
              This patient has edema and must be referred to hospital immediately. Weekly tracking is disabled for edema cases.
            </p>
            <button onClick={onClose} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CalendarCheck size={16} className="text-primary" />
              Update Weekly Data
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{patient.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Select Week</label>
            <div className="grid grid-cols-4 gap-2">
              {weekSlots.map((w) => (
                <button
                  key={w.key}
                  type="button"
                  onClick={() => handleWeekChange(w.key)}
                  className={`py-2 rounded-lg text-xs font-semibold border transition-all ${selectedWeek === w.key ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"}`}
                  data-testid={`btn-${w.key}`}
                >
                  {w.label}
                </button>
              ))}
            </div>
          </div>

          {infant && (
            <p className="text-xs text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-2 py-1.5">
              Under 6 months: MUAC and RUTF are not used outpatient — refer to hospital.
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Weight (kg)</label>
              <div className={`flex items-center ${selectedWeek >= 1 ? "gap-2" : ""}`}>
                <input
                  type="number"
                  step="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={selectedWeek >= 1 ? `${inputCls} min-w-0 flex-1` : inputCls}
                  placeholder="7.2"
                  data-testid="input-week-weight"
                />
                {selectedWeek >= 1 ? weightTrendBadge() : null}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">MUAC (cm)</label>
              <input type="number" step="0.1" value={muac} onChange={(e) => setMuac(e.target.value)} className={inputCls} placeholder="11.8" data-testid="input-week-muac" disabled={infant} />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Edema (this week)</label>
              <select
                className={inputCls}
                value={edemaGrade}
                onChange={(e) => setEdemaGrade(e.target.value as ClinicalEdemaGrade)}
              >
                {WEEKLY_EDEMA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            {showHeight && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {heightMeasureFullLabel(patient.ageMonths)} <span className="font-normal">(weeks 4, 8, 12)</span>
                </label>
                <input type="number" step="0.5" value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} placeholder="75" data-testid="input-week-height" />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Supplements</label>
              <input value={supplements} onChange={(e) => setSupplements(e.target.value)} className={inputCls} placeholder="Vit A + Zinc" data-testid="input-week-supplements" />
            </div>
            {showDisposition && (
              <div className="col-span-2">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  {WEEKLY_DISPOSITION_LABEL}
                  <span className="mt-0.5 block text-[10px] font-normal text-muted-foreground" dir="rtl">
                    {WEEKLY_DISPOSITION_HINT}
                  </span>
                </label>
                <select
                  className={inputCls}
                  value={followUpOutcome}
                  onChange={(e) => setFollowUpOutcome(e.target.value as FollowUpOutcome)}
                >
                  {FOLLOW_UP_OUTCOME_OPTIONS.map((o, i) => (
                    <option key={i} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {!infant && wNum > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              Auto-calculated RUTF: <strong className="text-foreground">{rutf} sachets/day</strong>
              <span className="ml-2 text-xs">(Formula: Weight × 200 / 500, rounded to nearest 0.5)</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm" data-testid="button-save-weekly">
              Update Week
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
