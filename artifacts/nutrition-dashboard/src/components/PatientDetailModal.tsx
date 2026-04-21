import { useEffect, useMemo, useRef, useState } from "react";
import {
  type Patient,
  getDiagnosisColor,
  normalizePatientRecord,
  FOLLOW_UP_OUTCOME_DEATH,
  withPatientDeathRecorded,
  patientHasClinicalEdema,
  patientHasWeeklyEdemaPlus,
  syncPatientAnthropometryFromTreatmentWeeks,
} from "@/lib/data";
import { assertImageFileSize, fileToDisplayableDataUrl, getPatientAvatarUrl } from "@/lib/patientImages";
import {
  collectMedicalAlerts,
  validateMedicalHistory,
  type MedicalAlert,
} from "@/lib/patientMedicalProfile";
import {
  X,
  User,
  FileText,
  Ruler,
  CalendarCheck,
  AlertTriangle,
  Save,
  Upload,
  Trash2,
} from "lucide-react";
import ClinicalAlerts from "./patient-detail/ClinicalAlerts";
import PersonalInfoTab from "./patient-detail/PersonalInfoTab";
import MedicalHistoryTab from "./patient-detail/MedicalHistoryTab";
import AnthropometricTab from "./patient-detail/AnthropometricTab";
import TreatmentPlanTab from "./patient-detail/TreatmentPlanTab";

type Props = {
  patient: Patient;
  /** When true, parent should append this record on save instead of merging by id. */
  isNew?: boolean;
  onSave: (p: Patient) => void;
  onClose: () => void;
};

type ProfileTab = "personal" | "medical" | "anthropometric" | "treatment";

const tabs: { id: ProfileTab; label: string; icon: typeof User }[] = [
  { id: "personal", label: "Personal", icon: User },
  { id: "medical", label: "Medical history", icon: FileText },
  { id: "anthropometric", label: "Anthropometric", icon: Ruler },
  { id: "treatment", label: "Treatment (12 wk)", icon: CalendarCheck },
];

export default function PatientDetailModal({ patient: p, isNew = false, onSave, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("personal");
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [localPatient, setLocalPatient] = useState<Patient>(() => normalizePatientRecord(p));
  const [formError, setFormError] = useState<string | null>(null);
  const [profileUploadErr, setProfileUploadErr] = useState<string | null>(null);
  const profilePhotoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalPatient(normalizePatientRecord(p));
    setFormError(null);
    setProfileUploadErr(null);
  }, [p.id, isNew]);

  async function onHeaderProfilePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const sizeErr = assertImageFileSize(file);
    if (sizeErr) {
      setProfileUploadErr(sizeErr);
      return;
    }
    try {
      const dataUrl = await fileToDisplayableDataUrl(file, {
        maxDimension: 480,
        quality: 0.82,
      });
      setLocalPatient((prev) => ({ ...prev, profilePhotoDataUrl: dataUrl }));
      setProfileUploadErr(null);
    } catch {
      setProfileUploadErr("Could not read this file.");
    }
  }

  const alerts = useMemo(() => {
    const base = collectMedicalAlerts(localPatient.medicalHistory!, localPatient.edema);
    const weeklyEdema = patientHasWeeklyEdemaPlus(localPatient);
    const hasMedicalEdemaAlert = base.some((a) => a.id === "edema-grade" || a.id === "edema-legacy");
    const extra: MedicalAlert[] = [];
    if (weeklyEdema && !hasMedicalEdemaAlert) {
      extra.push({
        id: "edema-weekly-12w",
        severity: "critical",
        title: "Edema on weekly follow-up",
        message:
          "Graded edema (+ / ++ / +++) recorded in the 12-week plan — stop outpatient nutrition where contraindicated; refer for inpatient stabilization per protocol.",
      });
    }
    return [...extra, ...base];
  }, [localPatient.medicalHistory, localPatient.edema, localPatient.treatmentWeeks]);

  const hasCriticalAlert = alerts.some((a) => a.severity === "critical");

  function validateMinimal(): string | null {
    if (!localPatient.name.trim()) return "Full name is required.";
    return null;
  }

  function validateForProfileTabs(): string | null {
    const m = validateMinimal();
    if (m) return m;
    if (localPatient.isDeceased) return null;
    const mhErrs = validateMedicalHistory(localPatient.medicalHistory!);
    if (mhErrs.length) return mhErrs[0] ?? null;
    return null;
  }

  function handleSaveProfileTabs() {
    const err = validateForProfileTabs();
    if (err) {
      setFormError(err);
      return;
    }
    setFormError(null);
    onSave(normalizePatientRecord(localPatient));
    onClose();
  }

  /** Allow correcting weekly edema anytime; lock treatment only for deceased records. */
  const isTreatmentReadOnly = localPatient.isDeceased;
  /** Protocol lock while edema exists: only specific personal fields + edema fields remain editable. */
  const edemaProtocolLock = patientHasClinicalEdema(localPatient) && !localPatient.isDeceased;

  function handleSaveTreatmentWeek() {
    const err = validateMinimal();
    if (err) {
      setFormError(err);
      return;
    }
    let toSave = syncPatientAnthropometryFromTreatmentWeeks(normalizePatientRecord(localPatient));
    let lastDeathIdx = -1;
    for (let i = 0; i < toSave.treatmentWeeks.length; i++) {
      if (toSave.treatmentWeeks[i].followUpOutcome === FOLLOW_UP_OUTCOME_DEATH) {
        lastDeathIdx = i;
      }
    }
    if (lastDeathIdx >= 0 && !toSave.isDeceased) {
      const deathDate = new Date().toISOString().split("T")[0];
      toSave = withPatientDeathRecorded(toSave, deathDate, lastDeathIdx);
    }
    setFormError(null);
    onSave(toSave);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:p-5">
          <div className="flex min-w-0 flex-1 flex-wrap items-start gap-3 sm:gap-4">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-border bg-muted sm:h-[4.5rem] sm:w-[4.5rem]">
                <img
                  key={localPatient.profilePhotoDataUrl ?? `def-${localPatient.gender}`}
                  src={getPatientAvatarUrl(localPatient)}
                  alt={localPatient.name || "Patient"}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = getPatientAvatarUrl({
                      ...localPatient,
                      profilePhotoDataUrl: null,
                    });
                  }}
                />
              </div>
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onHeaderProfilePhotoChange}
              />
              <div className="flex flex-wrap justify-center gap-1.5">
                <button
                  type="button"
                  disabled={localPatient.isDeceased}
                  onClick={() => profilePhotoInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
                >
                  <Upload size={12} className="shrink-0 opacity-80" />
                  Upload
                </button>
                {localPatient.profilePhotoDataUrl ? (
                  <button
                    type="button"
                    disabled={localPatient.isDeceased}
                    onClick={() => {
                      setLocalPatient((prev) => ({ ...prev, profilePhotoDataUrl: null }));
                      setProfileUploadErr(null);
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-medium text-destructive shadow-sm hover:bg-destructive/10 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 sm:text-xs"
                  >
                    <Trash2 size={12} className="shrink-0 opacity-80" />
                    Remove
                  </button>
                ) : null}
              </div>
              {profileUploadErr ? (
                <p className="max-w-[9rem] text-center text-[10px] leading-tight text-destructive">{profileUploadErr}</p>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                {isNew ? "New patient chart" : "Patient chart"}
              </h2>
              <p className="truncate text-sm font-semibold text-foreground">
                {localPatient.name.trim() || (isNew ? "— Enter name in Personal tab" : "—")}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">ID {localPatient.id}</span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getDiagnosisColor(localPatient.diagnosis)}`}
                >
                  {localPatient.diagnosis}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 hover:bg-muted"
            data-testid="button-close-detail"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="shrink-0 border-b border-border bg-muted/20 px-2 py-2 sm:px-4">
          <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => {
              const Icon = t.icon;
              const on = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(t.id);
                    setFormError(null);
                  }}
                  className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                    on
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-transparent bg-card/80 text-muted-foreground hover:border-border hover:text-foreground"
                  }`}
                >
                  <Icon size={14} className="shrink-0 opacity-90" />
                  <span className="whitespace-nowrap">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          {hasCriticalAlert && (
            <div className="mb-4">
              <ClinicalAlerts alerts={alerts.filter((a) => a.severity === "critical")} />
            </div>
          )}

          {activeTab === "medical" && alerts.some((a) => a.severity === "warning") && (
            <div className="mb-4">
              <ClinicalAlerts alerts={alerts.filter((a) => a.severity === "warning")} />
            </div>
          )}

          {activeTab === "personal" && localPatient.isDeceased && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-gray-300 bg-gray-100 p-3 text-sm text-gray-800 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Patient is recorded as <strong className="text-foreground">deceased</strong>. You can only edit full
                name, father&apos;s and mother&apos;s names, and phone; use <strong className="text-foreground">Vital status</strong>{" "}
                to undo death. All other fields, tabs, and the photo are locked.
              </span>
            </div>
          )}

          {activeTab === "personal" && patientHasClinicalEdema(localPatient) && !localPatient.isDeceased && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Edema recorded — outpatient treatment tab may be restricted per protocol.</span>
            </div>
          )}

          {formError && (
            <div className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          {localPatient.isDeceased && activeTab !== "personal" && (
            <div className="mb-4 rounded-lg border border-gray-300 bg-muted/50 px-3 py-2 text-xs text-muted-foreground dark:border-gray-600">
              Deceased record — this tab is read-only.
            </div>
          )}

          {activeTab === "personal" && (
            <PersonalInfoTab
              patient={localPatient}
              onChange={setLocalPatient}
              edemaRestricted={edemaProtocolLock}
            />
          )}
          {activeTab === "medical" && (
            <MedicalHistoryTab
              patient={localPatient}
              onChange={setLocalPatient}
              readOnly={edemaProtocolLock}
            />
          )}
          {activeTab === "anthropometric" && (
            <AnthropometricTab patient={localPatient} onChange={setLocalPatient} readOnly={edemaProtocolLock} />
          )}
          {activeTab === "treatment" && (
            <TreatmentPlanTab
              patient={localPatient}
              selectedWeek={selectedWeek}
              onSelectWeek={setSelectedWeek}
              formReadOnly={isTreatmentReadOnly}
              edemaRestricted={edemaProtocolLock}
              onChange={(next) =>
                setLocalPatient(syncPatientAnthropometryFromTreatmentWeeks(normalizePatientRecord(next)))
              }
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border bg-card/95 p-3 sm:gap-3 sm:p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Close
          </button>
          {activeTab === "treatment" && !isTreatmentReadOnly && (
            <button
              type="button"
              onClick={handleSaveTreatmentWeek}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
              data-testid="button-save-treatment"
            >
              <CalendarCheck size={14} />
              {isNew ? "Save week & register" : "Save week"}
            </button>
          )}
          {activeTab !== "treatment" && (
            <button
              type="button"
              onClick={handleSaveProfileTabs}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              <Save size={14} />
              {isNew
                ? `Save & register (${activeTab})`
                : `Save ${activeTab === "personal" ? "personal" : activeTab === "medical" ? "medical" : "anthropometric"}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
