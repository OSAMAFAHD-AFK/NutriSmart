import { useMemo } from "react";
import { ArrowDown, ArrowUp, CalendarCheck, Minus, Trash2 } from "lucide-react";
import type { Patient } from "@/lib/data";
import type { ClinicalEdemaGrade } from "@/lib/patientMedicalProfile";
import {
  calcRutfAmount,
  createEmptyWeekData,
  createDefaultTreatmentInterventions,
  DEFAULT_SLOTS_BY_INTERVAL,
  FOLLOW_UP_OUTCOME_OPTIONS,
  formatFollowUpOutcomeFull,
  getPatientWeightGainRate,
  isHeightCaptureWeekIndex,
  normalizeFollowUpInterval,
  patientHasClinicalEdema,
  type TreatmentInterventionRow,
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

const INTERVENTION_FREQUENCY_OPTIONS = [
  "",
  "Once",
  "Twice daily",
  "Daily",
  "Weekly",
  "As prescribed",
] as const;

const INTERVENTION_DURATION_OPTIONS = [
  "",
  "Single dose",
  "5-7 days",
  "10-14 days",
  "Throughout program",
  "By condition",
  "As prescribed",
] as const;

function isPostStabilizationDewormer(intervention: string): boolean {
  const norm = intervention.trim().toLowerCase();
  return norm.includes("mebendazole") || norm.includes("albendazole");
}

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
  const gridLen = patient.treatmentWeeks.length;
  const effectiveWeekIndex =
    gridLen === 0 ? 0 : Math.min(Math.max(0, selectedWeek), gridLen - 1);
  const weekData = patient.treatmentWeeks[effectiveWeekIndex] ?? createEmptyWeekData();
  const wNum = weekData.weight ?? 0;
  const isTreatmentReadOnly = formReadOnly;
  const recoveredAtIndex = patient.treatmentWeeks.findIndex((w) => w.followUpOutcome === "Recovered");
  const hasRecoveredOutcome = recoveredAtIndex >= 0;
  const isAfterRecoverySlot = hasRecoveredOutcome && effectiveWeekIndex > recoveredAtIndex;
  const weekReadOnly = isTreatmentReadOnly || isAfterRecoverySlot;
  const restrictNonEdema = edemaRestricted && !isTreatmentReadOnly;
  const infantLock = isInfantUnder6Months(patient);
  const muacDisabled = weekReadOnly || infantLock || restrictNonEdema;
  const showHeightField = isHeightCaptureWeekIndex(effectiveWeekIndex, gridLen);
  const showDisposition = effectiveWeekIndex >= 1;
  const weightTrend =
    effectiveWeekIndex >= 1
      ? weightTrendVsPriorWeek(patient.treatmentWeeks, effectiveWeekIndex)
      : "none";
  const weightGainRate = useMemo(() => getPatientWeightGainRate(patient), [patient]);

  const completedWeeks = useMemo(
    () => patient.treatmentWeeks.filter(weekHasMeaningfulData).length,
    [patient.treatmentWeeks],
  );
  const followUpInterval = normalizeFollowUpInterval(patient.followUpInterval);
  const slotWord =
    followUpInterval === "daily" ? "day" : followUpInterval === "biweekly" ? "2-week slot" : "week";
  const slotShort = followUpInterval === "daily" ? "D" : followUpInterval === "biweekly" ? "B" : "W";

  function appendFollowUpSlot() {
    if (isTreatmentReadOnly || hasRecoveredOutcome) return;
    const nextWeeks = [...patient.treatmentWeeks, createEmptyWeekData()];
    const newIndex = nextWeeks.length - 1;
    onChange({ ...patient, treatmentWeeks: nextWeeks });
    queueMicrotask(() => onSelectWeek(newIndex));
  }

  function updateCurrentWeek<K extends keyof Patient["treatmentWeeks"][number]>(
    key: K,
    value: Patient["treatmentWeeks"][number][K],
  ) {
    let nextWeeks = [...patient.treatmentWeeks];
    const slot = {
      ...nextWeeks[effectiveWeekIndex],
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
      nextWeeks[effectiveWeekIndex] = slot;
    }
    onChange({ ...patient, treatmentWeeks: nextWeeks });
  }

  function updateInterventionRow(
    rowIdx: number,
    key: keyof TreatmentInterventionRow,
    value: string,
  ) {
    const baseRows = weekData.interventions ?? createDefaultTreatmentInterventions();
    const nextRows = baseRows.map((row, i) => (i === rowIdx ? { ...row, [key]: value } : row));
    updateCurrentWeek("interventions", nextRows);
  }

  function addInterventionRow() {
    if (weekReadOnly || restrictNonEdema) return;
    const baseRows = weekData.interventions ?? createDefaultTreatmentInterventions();
    const nextRows = [
      ...baseRows,
      { intervention: "", dose: "", frequency: "", duration: "", notes: "" },
    ];
    updateCurrentWeek("interventions", nextRows);
  }

  function removeInterventionRow(rowIdx: number) {
    if (weekReadOnly || restrictNonEdema) return;
    const baseRows = weekData.interventions ?? createDefaultTreatmentInterventions();
    const nextRows = baseRows.filter((_, i) => i !== rowIdx);
    updateCurrentWeek("interventions", nextRows);
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
          Treatment plan ({followUpInterval})
        </div>
        <div className="text-xs text-muted-foreground">
          {completedWeeks} / {patient.treatmentWeeks.length} {slotWord}s with data
        </div>
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
                effectiveWeekIndex === index
                  ? "border-primary bg-primary text-primary-foreground"
                  : hasData
                    ? "border-primary/40 bg-card text-foreground"
                    : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {slotShort}{index + 1}
            </button>
          );
        })}
      </div>
      {!isTreatmentReadOnly && (
        <button
          type="button"
          onClick={appendFollowUpSlot}
          disabled={hasRecoveredOutcome}
          className="rounded-lg border border-dashed border-primary/40 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5"
        >
          + Add {slotWord}
        </button>
      )}

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
      {hasRecoveredOutcome && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          Patient marked as <strong className="text-foreground">Recovered</strong> at {slotShort}
          {recoveredAtIndex + 1}. All follow-up {slotWord}s after recovery are locked.
        </div>
      )}
      {isAfterRecoverySlot && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
          This {slotWord} is after the recovery point, so treatment plan fields are read-only.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight (kg)</label>
          <div className={`flex items-center ${effectiveWeekIndex >= 1 ? "gap-2" : ""}`}>
            <input
              type="number"
              step="0.1"
              value={weekData.weight ?? ""}
              disabled={weekReadOnly || restrictNonEdema}
              onChange={(e) => updateCurrentWeek("weight", parseFloat(e.target.value) || null)}
              className={effectiveWeekIndex >= 1 ? `${inCls} min-w-0 flex-1` : inCls}
            />
            {effectiveWeekIndex >= 1 ? weightTrendBadge() : null}
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
              <span className="font-normal text-muted-foreground/80">(captured at milestone slots)</span>
            </label>
            <input
              type="number"
              step="0.5"
              value={weekData.height ?? ""}
              disabled={weekReadOnly || restrictNonEdema}
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
            disabled={weekReadOnly}
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
            disabled={weekReadOnly || restrictNonEdema}
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
            disabled={weekReadOnly || restrictNonEdema}
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

      <div className="rounded-lg border border-border/70 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            Weight Gain Rate:{" "}
            <span className="font-semibold text-foreground">
              {weightGainRate.rate != null ? `${weightGainRate.rate} g/kg/day` : "—"}
            </span>
          </span>
          <span>
            Status:{" "}
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                weightGainRate.status === "Good"
                  ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                  : weightGainRate.status === "Moderate"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    : weightGainRate.status === "Poor"
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "bg-muted text-muted-foreground"
              }`}
            >
              {weightGainRate.status}
            </span>
          </span>
          <span>
            Outcome:{" "}
            <span className="font-medium text-foreground">{formatFollowUpOutcomeFull(weightGainRate.outcome)}</span>
          </span>
          <span>
            Days: <span className="font-medium text-foreground">{weightGainRate.days}</span>
          </span>
        </div>
        {(weightGainRate.reason === "insufficient_days" || weightGainRate.noWeightGain) && (
          <div className="mt-1.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
            {weightGainRate.reason === "insufficient_days"
              ? "Calculation needs at least 3 days between admission and end date."
              : "Current weight is not higher than admission weight (rate is low/negative)."}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-foreground">Treatment interventions (editable per week)</h4>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            Week {effectiveWeekIndex + 1}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[58rem] w-full text-xs">
            <thead className="bg-muted/25 text-muted-foreground">
              <tr className="border-y border-border/70">
                <th className="px-2 py-2 text-left font-medium">Intervention</th>
                <th className="px-2 py-2 text-left font-medium">Dose</th>
                <th className="px-2 py-2 text-left font-medium">Frequency</th>
                <th className="px-2 py-2 text-left font-medium">Duration</th>
                <th className="px-2 py-2 text-left font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {(weekData.interventions ?? createDefaultTreatmentInterventions()).map((row, idx) => (
                <tr key={`${idx}-${row.intervention}`} className="border-b border-border/60 align-top">
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        value={row.intervention}
                        disabled={weekReadOnly || restrictNonEdema}
                        onChange={(e) => updateInterventionRow(idx, "intervention", e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs font-medium text-foreground"
                        placeholder="Intervention..."
                      />
                      <button
                        type="button"
                        disabled={weekReadOnly || restrictNonEdema}
                        onClick={() => removeInterventionRow(idx)}
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-red-300 text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/30"
                        title="Delete row"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {isPostStabilizationDewormer(row.intervention) && (
                      <div className="mt-1 text-[11px] font-semibold text-red-700 dark:text-red-300">
                        Dispense after stabilization
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.dose}
                      disabled={weekReadOnly || restrictNonEdema}
                      onChange={(e) => updateInterventionRow(idx, "dose", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                      placeholder="Enter dose..."
                    />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.frequency}
                      disabled={weekReadOnly || restrictNonEdema}
                      onChange={(e) => updateInterventionRow(idx, "frequency", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                    >
                      {INTERVENTION_FREQUENCY_OPTIONS.map((opt) => (
                        <option key={opt || "empty"} value={opt}>
                          {opt || "Select..."}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={row.duration}
                      disabled={weekReadOnly || restrictNonEdema}
                      onChange={(e) => updateInterventionRow(idx, "duration", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                    >
                      {INTERVENTION_DURATION_OPTIONS.map((opt) => (
                        <option key={opt || "empty"} value={opt}>
                          {opt || "Select..."}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      value={row.notes}
                      disabled={weekReadOnly || restrictNonEdema}
                      onChange={(e) => updateInterventionRow(idx, "notes", e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs text-foreground"
                      placeholder="Clinical notes..."
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={addInterventionRow}
            disabled={weekReadOnly || restrictNonEdema}
            className="rounded-md border border-dashed border-primary/50 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add intervention row
          </button>
        </div>
      </div>
    </div>
  );
}
