import { useMemo } from "react";
import { ArrowDown, ArrowUp, CalendarCheck, Minus } from "lucide-react";
import type { Patient } from "@/lib/data";
import type { ClinicalEdemaGrade } from "@/lib/patientMedicalProfile";
import {
  calcRutfAmount,
  FOLLOW_UP_OUTCOME_OPTIONS,
  isHeightCaptureWeekIndex,
  patientHasClinicalEdema,
  WEEKLY_EDEMA_OPTIONS,
  weekHasMeaningfulData,
  weightTrendVsPriorWeek,
  type FollowUpOutcome,
} from "@/lib/data";
import { heightMeasureFullLabel, isInfantUnder6Months } from "@/lib/patientTableAnthro";

const inCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

/** Field shown from week 2 onward (week index ≥ 1). */
const WEEKLY_DISPOSITION_LABEL = "Weekly recovery disposition";

type Props = {
  patient: Patient;
  selectedWeek: number;
  onSelectWeek: (i: number) => void;
  onChange: (next: Patient) => void;
  /** Passed from PatientDetailModal so weekly edema can be saved once before lock. */
  formReadOnly: boolean;
  /** When true, only edema in weekly grid remains editable. */
  edemaRestricted?: boolean;
};

export default function TreatmentPlanTab({
  patient,
  selectedWeek,
  onSelectWeek,
  onChange,
  formReadOnly,
  edemaRestricted = false,
}: Props) {
  const weekData = patient.treatmentWeeks[selectedWeek];
  const wNum = weekData?.weight ?? 0;
  const isTreatmentReadOnly = formReadOnly;
  const restrictNonEdema = edemaRestricted && !isTreatmentReadOnly;
  const infantLock = isInfantUnder6Months(patient);
  const muacDisabled = isTreatmentReadOnly || infantLock || restrictNonEdema;
  const showHeightField = isHeightCaptureWeekIndex(selectedWeek);
  const showDisposition = selectedWeek >= 1;
  const weightTrend =
    selectedWeek >= 1 ? weightTrendVsPriorWeek(patient.treatmentWeeks, selectedWeek) : "none";

  const completedWeeks = useMemo(
    () => patient.treatmentWeeks.filter(weekHasMeaningfulData).length,
    [patient.treatmentWeeks],
  );

  function updateCurrentWeek<K extends keyof Patient["treatmentWeeks"][number]>(
    key: K,
    value: Patient["treatmentWeeks"][number][K],
  ) {
    let nextWeeks = [...patient.treatmentWeeks];
    const slot = {
      ...nextWeeks[selectedWeek],
      [key]: value,
    };
    if (key === "weight" && typeof value === "number" && value > 0 && !infantLock) {
      slot.rutf = calcRutfAmount(value);
    }
    if (key === "weight" && infantLock) {
      slot.rutf = null;
    }
    if (key === "edemaGrade") {
      // Edema is synchronized globally with medical history; keep all weeks identical.
      const edemaGrade = value as Patient["treatmentWeeks"][number]["edemaGrade"];
      nextWeeks = nextWeeks.map((w) => ({ ...w, edemaGrade }));
      const nextMedicalHistory = patient.medicalHistory
        ? { ...patient.medicalHistory, clinicalEdemaGrade: edemaGrade }
        : patient.medicalHistory;
      onChange({
        ...patient,
        treatmentWeeks: nextWeeks,
        medicalHistory: nextMedicalHistory,
        edema: edemaGrade !== "None",
      });
      return;
    } else {
      nextWeeks[selectedWeek] = slot;
    }
    onChange({ ...patient, treatmentWeeks: nextWeeks });
  }

  function weightTrendBadge() {
    const base =
      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-muted-foreground";
    if (weightTrend === "up") {
      return (
        <div
          className={`${base} border-green-300 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-400`}
          title="Weight up vs previous week"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </div>
      );
    }
    if (weightTrend === "down") {
      return (
        <div
          className={`${base} border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400`}
          title="Weight down vs previous week"
        >
          <ArrowDown className="h-5 w-5" strokeWidth={2.5} />
        </div>
      );
    }
    if (weightTrend === "flat") {
      return (
        <div
          className={`${base} border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300`}
          title="Same weight as previous week (within 0.02 kg)"
        >
          <Minus className="h-5 w-5" strokeWidth={2.5} />
        </div>
      );
    }
    return (
      <div
        className={`${base} border-border bg-muted/40`}
        title="Enter this week and previous week weights to compare"
      >
        <span className="text-[10px] font-medium leading-tight text-center px-0.5">—</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs sm:grid-cols-2">
        <div>
          <span className="text-muted-foreground">Milk</span>
          <div className="font-medium text-foreground">{patient.milk}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Dose</span>
          <div className="font-medium text-foreground">{patient.dose}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Medication</span>
          <div className="font-medium text-foreground">{patient.medication}</div>
        </div>
        <div>
          <span className="text-muted-foreground">Supplements</span>
          <div className="font-medium text-foreground">{patient.supplements}</div>
        </div>
      </div>

      {infantLock && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Age is under 6 months — outpatient MUAC and RUTF are not used; refer the case to hospital care per protocol.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarCheck size={16} className="shrink-0 text-primary" />
          12-week treatment plan
        </div>
        <div className="text-xs text-muted-foreground">{completedWeeks} / 12 weeks with data</div>
      </div>

      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {patient.treatmentWeeks.map((week, index) => {
          const hasData = weekHasMeaningfulData(week);
          return (
            <button
              key={index}
              type="button"
              onClick={() => onSelectWeek(index)}
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                selectedWeek === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : hasData
                    ? "border-primary/40 bg-card text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              W{index + 1}
            </button>
          );
        })}
      </div>

      {patient.isDeceased && (
        <div className="rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-xs text-gray-800 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200">
          Patient is recorded as <strong className="text-foreground">deceased</strong> — weekly treatment fields are
          read-only. Use <strong className="text-foreground">Personal</strong> → <strong className="text-foreground">Vital status</strong> to set or correct the death record.
        </div>
      )}

      {!patient.isDeceased && isTreatmentReadOnly && patientHasClinicalEdema(patient) && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          Weekly treatment editing is paused while edema requires inpatient stabilization — align with national CMAM/SAM
          protocol.
        </div>
      )}
      {restrictNonEdema && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          Edema protocol active: only weekly edema field is editable in this tab.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight (kg)</label>
          <div className={`flex items-center ${selectedWeek >= 1 ? "gap-2" : ""}`}>
            <input
              type="number"
              step="0.1"
              value={weekData.weight ?? ""}
              disabled={isTreatmentReadOnly || restrictNonEdema}
              onChange={(e) => updateCurrentWeek("weight", parseFloat(e.target.value) || null)}
              className={selectedWeek >= 1 ? `${inCls} min-w-0 flex-1` : inCls}
            />
            {selectedWeek >= 1 ? weightTrendBadge() : null}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">MUAC (cm)</label>
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
            <input
              type="number"
              step="0.1"
              value={weekData.muac ?? ""}
              disabled={muacDisabled}
              onChange={(e) => updateCurrentWeek("muac", parseFloat(e.target.value) || null)}
              className={`${inCls} shrink-0 sm:max-w-[11rem] ${
                infantLock
                  ? "border-red-500/80 bg-red-50 text-muted-foreground dark:border-red-700 dark:bg-red-950/40"
                  : ""
              }`}
            />
            {infantLock && (
              <span className="text-[11px] leading-snug text-red-700 dark:text-red-300" dir="rtl">
                لا يُسجَّل MUAC لأقل من 6 أشهر — الإحالة للمستشفى حسب البروتوكول.
              </span>
            )}
          </div>
        </div>
        {showHeightField && (
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              {heightMeasureFullLabel(patient.ageMonths)}{" "}
              <span className="font-normal text-muted-foreground/80">(weeks 4, 8, 12 only)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={weekData.height ?? ""}
              disabled={isTreatmentReadOnly || restrictNonEdema}
              onChange={(e) => updateCurrentWeek("height", parseFloat(e.target.value) || null)}
              className={inCls}
            />
          </div>
        )}
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Edema <span className="font-normal text-muted-foreground/80">(this week)</span>
          </label>
          <select
            className={inCls}
            disabled={isTreatmentReadOnly}
            value={weekData.edemaGrade}
            onChange={(e) => updateCurrentWeek("edemaGrade", e.target.value as ClinicalEdemaGrade)}
          >
            {WEEKLY_EDEMA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Supplements / notes</label>
          <input
            value={weekData.supplements}
            disabled={isTreatmentReadOnly || restrictNonEdema}
            onChange={(e) => updateCurrentWeek("supplements", e.target.value)}
            className={inCls}
          />
        </div>
      </div>

      {showDisposition && (
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{WEEKLY_DISPOSITION_LABEL}</label>
          <select
            className={inCls}
            disabled={isTreatmentReadOnly || restrictNonEdema}
            value={weekData.followUpOutcome ?? ""}
            onChange={(e) => updateCurrentWeek("followUpOutcome", e.target.value as FollowUpOutcome)}
          >
            {FOLLOW_UP_OUTCOME_OPTIONS.map((o, i) => (
              <option key={i} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!infantLock && (
        <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          Auto RUTF (this week):{" "}
          <span className="font-semibold text-foreground">{wNum > 0 ? calcRutfAmount(wNum) : weekData.rutf ?? 0}</span>{" "}
          sachets/day
        </div>
      )}
    </div>
  );
}
