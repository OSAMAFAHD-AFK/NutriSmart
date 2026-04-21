import { Scale, Ruler } from "lucide-react";
import type { Patient } from "@/lib/data";
import {
  calcDiagnosisFromMuac,
  calcWFHValue,
  calcZScoreFromMuac,
  getDiagnosisColor,
  patientHasClinicalEdema,
} from "@/lib/data";
import { heightMeasureFullLabel, isInfantUnder6Months } from "@/lib/patientTableAnthro";
import ProfileCard from "./ProfileCard";

const inCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

type Props = {
  patient: Patient;
  onChange: (next: Patient) => void;
  /** Lock this tab while edema protocol is active. */
  readOnly?: boolean;
};

export default function AnthropometricTab({ patient, onChange, readOnly = false }: Props) {
  const w = patient.weight;
  const h = patient.height;
  const m = patient.muac;
  const wfh = w && h ? calcWFHValue(w, h) : patient.wfh;
  const infant = isInfantUnder6Months(patient);

  function applyAnthro(next: Partial<Pick<Patient, "weight" | "height" | "muac" | "wfh" | "zScore" | "diagnosis">>) {
    const weight = next.weight ?? patient.weight;
    const height = next.height ?? patient.height;
    const muac = infant ? patient.muac : next.muac ?? patient.muac;
    const edemaForDx = patientHasClinicalEdema(patient);
    const nextWfh = weight && height ? calcWFHValue(weight, height) : patient.wfh;
    const nextZ = !infant && muac ? calcZScoreFromMuac(muac) : patient.zScore;
    const nextDx = patient.isDeceased
      ? patient.diagnosis
      : edemaForDx
        ? calcDiagnosisFromMuac(muac, true)
        : infant
          ? patient.diagnosis
          : calcDiagnosisFromMuac(muac, false);
    onChange({
      ...patient,
      weight,
      height,
      muac,
      wfh: nextWfh,
      zScore: nextZ,
      diagnosis: patient.isDeceased ? patient.diagnosis : nextDx,
    });
  }

  return (
    <fieldset disabled={patient.isDeceased || readOnly} className="min-w-0 space-y-4 border-0 p-0">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2">
        <span className="text-xs text-muted-foreground">Current classification</span>
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getDiagnosisColor(patient.diagnosis)}`}>
          {patient.diagnosis}
        </span>
        {!patient.isDeceased && !infant && (
          <span className="text-[11px] text-muted-foreground">(updates from MUAC; edema from Medical history)</span>
        )}
        {infant && (
          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
            Under 6 months — refer to hospital; outpatient MUAC not used here.
          </span>
        )}
      </div>

      <ProfileCard title="Measurements" icon={Scale}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Weight (kg) *</label>
            <input
              type="number"
              step="0.1"
              className={inCls}
              value={w || ""}
              onChange={(e) => applyAnthro({ weight: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{heightMeasureFullLabel(patient.ageMonths)} *</label>
            <input
              type="number"
              step="0.5"
              className={inCls}
              value={h || ""}
              onChange={(e) => applyAnthro({ height: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">MUAC (cm) *</label>
            <input
              type="number"
              step="0.1"
              className={`${inCls} disabled:cursor-not-allowed disabled:opacity-60`}
              value={m || ""}
              disabled={infant}
              title={infant ? "Disabled: age under 6 months — refer to hospital." : ""}
              onChange={(e) => applyAnthro({ muac: parseFloat(e.target.value) || 0 })}
            />
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Derived indices" icon={Ruler}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">WHZ (auto)</label>
            <input readOnly className={`${inCls} bg-muted/50`} value={wfh || "—"} />
          </div>
        </div>
      </ProfileCard>
    </fieldset>
  );
}
