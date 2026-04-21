import { useState } from "react";
import { User, Phone, MapPin, Building2, CalendarDays, Syringe, Skull } from "lucide-react";
import type { Patient } from "@/lib/data";
import {
  GOVERNORATES,
  calcAgeMonthsFromDob,
  preferredDeathWeekIndex,
  withPatientDeathRecorded,
  withPatientDeathCleared,
} from "@/lib/data";
import type { HealthCenterDistance } from "@/lib/patientMedicalProfile";
import { mergeMedicalHistory } from "@/lib/patientMedicalProfile";
import ProfileCard from "./ProfileCard";

const inCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";

type Props = {
  patient: Patient;
  onChange: (next: Patient) => void;
  /** When true (edema protocol), only selected personal fields remain editable. */
  edemaRestricted?: boolean;
};

const HC_OPTIONS: { value: HealthCenterDistance; label: string }[] = [
  { value: "", label: "Select…" },
  { value: "Nearby", label: "Nearby" },
  { value: "Medium", label: "Medium" },
  { value: "Far", label: "Far" },
  { value: "Very Far", label: "Very Far" },
];

export default function PersonalInfoTab({ patient, onChange, edemaRestricted = false }: Props) {
  const districts = GOVERNORATES[patient.governorate] ?? [];
  const today = new Date().toISOString().split("T")[0];
  const vit = patient.isDeceased;
  const edemaLock = edemaRestricted && !vit;
  const [deathFlowOpen, setDeathFlowOpen] = useState(false);
  const [deathDateDraft, setDeathDateDraft] = useState(today);

  function set<K extends keyof Patient>(key: K, value: Patient[K]) {
    onChange({ ...patient, [key]: value });
  }

  function confirmRecordDeath() {
    const d = deathDateDraft || today;
    const wk = preferredDeathWeekIndex(patient);
    onChange(withPatientDeathRecorded(patient, d, wk));
    setDeathFlowOpen(false);
  }

  function confirmMarkAlive() {
    if (
      !window.confirm(
        "Remove the death record? Nutrition diagnosis will be recalculated from current MUAC and edema, and weekly outcomes set to Death will be cleared.",
      )
    ) {
      return;
    }
    onChange(withPatientDeathCleared(patient));
  }

  return (
    <div className="space-y-4">
      <ProfileCard title="Identity & guardians" icon={User}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Full name *</label>
            <input
              className={inCls}
              value={patient.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Gender *</label>
            <select
              className={inCls}
              disabled={vit || edemaLock}
              value={patient.gender}
              onChange={(e) => set("gender", e.target.value as "M" | "F")}
            >
              <option value="M">Male</option>
              <option value="F">Female</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Father&apos;s name</label>
            <input className={inCls} value={patient.fatherName} onChange={(e) => set("fatherName", e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Mother&apos;s name</label>
            <input className={inCls} value={patient.motherName ?? ""} onChange={(e) => set("motherName", e.target.value)} />
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Contact & household" icon={Phone}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Phone</label>
            <input className={inCls} value={patient.fatherPhone} onChange={(e) => set("fatherPhone", e.target.value)} placeholder="+967 …" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Date of birth *</label>
            <input
              type="date"
              className={inCls}
              disabled={vit || edemaLock}
              max={new Date().toISOString().split("T")[0]}
              value={patient.dateOfBirth}
              onChange={(e) => {
                const dob = e.target.value;
                onChange({
                  ...patient,
                  dateOfBirth: dob,
                  ageMonths: dob ? calcAgeMonthsFromDob(dob) : 0,
                });
              }}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Number of household members (including mother & father)
            </label>
            <input
              type="number"
              min={1}
              className={inCls}
              disabled={vit}
              value={patient.familySize ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                set("familySize", v === "" ? null : Math.max(1, parseInt(v, 10) || 1));
              }}
              placeholder="e.g. 6"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">Count all people living in the same household.</p>
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Visits" icon={CalendarDays}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">First visit date</label>
            <input
              type="date"
              className={inCls}
              disabled={vit || edemaLock}
              value={patient.firstVisitDate ?? ""}
              onChange={(e) => set("firstVisitDate", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Last visit date</label>
            <input
              type="date"
              className={inCls}
              disabled={vit || edemaLock}
              value={patient.lastVisitDate}
              onChange={(e) => set("lastVisitDate", e.target.value)}
            />
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Immunization record" icon={Syringe}>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Routine immunizations up to date?</label>
          <select
            className={inCls}
            disabled={vit || edemaLock}
            value={
              patient.immunizationsComplete === null || patient.immunizationsComplete === undefined
                ? ""
                : patient.immunizationsComplete
                  ? "yes"
                  : "no"
            }
            onChange={(e) => {
              const v = e.target.value;
              set(
                "immunizationsComplete",
                v === "" ? null : v === "yes",
              );
            }}
          >
            <option value="">Not recorded</option>
            <option value="yes">Complete</option>
            <option value="no">Incomplete</option>
          </select>
        </div>
      </ProfileCard>

      <ProfileCard title="Location & access" icon={MapPin}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Governorate *</label>
            <select
              className={inCls}
              disabled={vit || edemaLock}
              value={patient.governorate}
              onChange={(e) => {
                const gov = e.target.value;
                const d = GOVERNORATES[gov] ?? [];
                onChange({ ...patient, governorate: gov, district: d[0] ?? "" });
              }}
            >
              {Object.keys(GOVERNORATES).map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">District *</label>
            <select className={inCls} disabled={vit || edemaLock} value={patient.district} onChange={(e) => set("district", e.target.value)}>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Health system" icon={Building2}>
        <div className="space-y-3">
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nearest health center</label>
          <select
            className={inCls}
            disabled={vit || edemaLock}
            value={patient.healthCenterDistance ?? ""}
            onChange={(e) => set("healthCenterDistance", e.target.value as HealthCenterDistance)}
          >
            {HC_OPTIONS.map((o) => (
              <option key={o.label} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Edema (profile)</label>
            <select
              className={inCls}
              disabled={vit}
              value={patient.edema ? "yes" : "no"}
              onChange={(e) => {
                const hasEdema = e.target.value === "yes";
                const edemaGrade = hasEdema ? "+" : "None";
                const mh = mergeMedicalHistory(patient.medicalHistory);
                onChange({
                  ...patient,
                  edema: hasEdema,
                  medicalHistory: { ...mh, clinicalEdemaGrade: edemaGrade },
                  treatmentWeeks: patient.treatmentWeeks.map((w) => ({ ...w, edemaGrade })),
                });
              }}
            >
              <option value="no">No edema</option>
              <option value="yes">Yes (edema present)</option>
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Linked with treatment-week edema and clinical edema grade.
            </p>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">Distance category supports outreach and defaulter tracing.</p>
        </div>
      </ProfileCard>

      <ProfileCard title="Vital status" icon={Skull} accent="warn">
        {patient.isDeceased ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-gray-300 bg-muted/40 px-3 py-2 text-sm text-foreground dark:border-gray-600">
              <span className="font-semibold text-muted-foreground">Deceased</span>
              <span className="mx-2 text-muted-foreground">—</span>
              <span className="text-xs text-muted-foreground">Nutrition diagnosis is fixed to Deceased for reporting.</span>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date of death</label>
              <p className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm tabular-nums text-foreground">
                {patient.dateOfDeath ?? "—"}
              </p>
            </div>
            <button
              type="button"
              onClick={confirmMarkAlive}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
            >
              Incorrect — mark as alive (undo death record)
            </button>
          </div>
        ) : deathFlowOpen ? (
          <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 dark:bg-destructive/10">
            <p className="text-xs text-muted-foreground">
              Use only when death occurred during program follow-up. This sets diagnosis to <strong className="text-foreground">Deceased</strong>, locks the 12-week treatment tab, and sets the follow-up outcome to <strong className="text-foreground">Death</strong> on the last week that has data (or week 12).
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date of death</label>
              <input
                type="date"
                className={inCls}
                max={today}
                value={deathDateDraft}
                onChange={(e) => setDeathDateDraft(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDeathFlowOpen(false)}
                className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRecordDeath}
                className="rounded-lg bg-gray-800 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-900 dark:bg-gray-200 dark:text-gray-900 dark:hover:bg-white"
              >
                Confirm death
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Patient is currently recorded as <strong className="text-foreground">alive</strong>. If the child died during follow-up, record it here (or choose <strong className="text-foreground">Death</strong> in weekly follow-up outcome and click <strong className="text-foreground">Save week</strong>).
            </p>
            <button
              type="button"
              onClick={() => {
                setDeathDateDraft(today);
                setDeathFlowOpen(true);
              }}
              className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/15 dark:text-red-300"
            >
              Record death…
            </button>
          </div>
        )}
      </ProfileCard>
    </div>
  );
}
