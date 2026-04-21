import { useEffect, useRef, useState } from "react";
import { Milk, Apple, Activity, Eye, Tags, FileImage, Plus, Trash2, ZoomIn } from "lucide-react";
import { SYMPTOMS_OPTIONS, type Patient, type PatientRecordAttachment } from "@/lib/data";
import type {
  AppetiteStatus,
  ClinicalEdemaGrade,
  ConsciousnessLevel,
  PallorLevel,
  PatientMedicalHistory,
} from "@/lib/patientMedicalProfile";
import { assertImageFileSize, fileToDisplayableDataUrl, newAttachmentId } from "@/lib/patientImages";
import ProfileCard from "./ProfileCard";
import ImageLightbox from "./ImageLightbox";

const inCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-ring";
const numCls = inCls + " max-w-[8rem]";

function SymptomBlock({
  label,
  active,
  days,
  onToggle,
  onDays,
}: {
  label: string;
  active: boolean;
  days: number | null;
  onToggle: (on: boolean) => void;
  onDays: (d: number | null) => void;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <label className="mb-2 flex items-center gap-2 text-xs font-medium text-foreground">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={active}
          onChange={(e) => onToggle(e.target.checked)}
        />
        {label}
      </label>
      {active && (
        <div className="mt-2">
          <label className="mb-1 block text-[11px] text-muted-foreground">Duration (days)</label>
          <input
            type="number"
            min={0}
            className={numCls}
            value={days ?? ""}
            onChange={(e) => onDays(e.target.value === "" ? null : parseInt(e.target.value, 10))}
          />
        </div>
      )}
    </div>
  );
}

function triBoolSelect(
  value: boolean | null,
  onChange: (v: boolean | null) => void,
) {
  return (
    <select
      className={inCls}
      value={value === null ? "" : value ? "yes" : "no"}
      onChange={(e) => {
        const x = e.target.value;
        onChange(x === "" ? null : x === "yes");
      }}
    >
      <option value="">Not recorded</option>
      <option value="yes">Yes</option>
      <option value="no">No</option>
    </select>
  );
}

type Props = {
  patient: Patient;
  onChange: (next: Patient) => void;
  /** Lock full tab when edema protocol restricts edits. */
  readOnly?: boolean;
};

export default function MedicalHistoryTab({ patient, onChange, readOnly = false }: Props) {
  const mh = patient.medicalHistory!;
  const attachInputRef = useRef<HTMLInputElement>(null);
  const patientRef = useRef(patient);
  const [attachErr, setAttachErr] = useState<string | null>(null);
  const [attachBusy, setAttachBusy] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; title: string } | null>(null);
  const attachments = patient.recordAttachments ?? [];

  useEffect(() => {
    patientRef.current = patient;
  }, [patient]);

  /** Always merge from latest ref so edits never wipe `recordAttachments` during async photo import. */
  function patch(partial: Partial<PatientMedicalHistory>) {
    const prev = patientRef.current;
    const baseMh = prev.medicalHistory!;
    const nextMh = { ...baseMh, ...partial };
    const gradeActive = nextMh.clinicalEdemaGrade !== "None";
    onChange({
      ...prev,
      medicalHistory: nextMh,
      edema: gradeActive,
    });
  }

  function flushAdded(added: PatientRecordAttachment[]) {
    if (!added.length) return;
    const prev = patientRef.current;
    onChange({
      ...prev,
      recordAttachments: [...(prev.recordAttachments ?? []), ...added],
    });
  }

  function removeAttachmentById(id: string, extraBlobToRevoke?: string) {
    if (extraBlobToRevoke?.startsWith("blob:")) URL.revokeObjectURL(extraBlobToRevoke);
    const prev = patientRef.current;
    const atts = prev.recordAttachments ?? [];
    const victim = atts.find((a) => a.id === id);
    if (victim?.dataUrl.startsWith("blob:")) URL.revokeObjectURL(victim.dataUrl);
    onChange({
      ...prev,
      recordAttachments: atts.filter((a) => a.id !== id),
    });
  }

  function replaceAttachmentDataUrl(id: string, dataUrl: string, revokeOldBlob?: string) {
    if (revokeOldBlob?.startsWith("blob:")) URL.revokeObjectURL(revokeOldBlob);
    const prev = patientRef.current;
    const nextAtts = (prev.recordAttachments ?? []).map((a) => (a.id === id ? { ...a, dataUrl } : a));
    onChange({ ...prev, recordAttachments: nextAtts });
  }

  /**
   * Show a thumbnail immediately via blob: URL (always paintable), then swap to compressed data URL.
   * Prevents “blank thumbnails” while decoding and avoids losing rows if another field updates mid-await.
   */
  async function onAddAttachments(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length || attachBusy) return;
    setAttachBusy(true);
    try {
      for (const file of Array.from(files)) {
        const sizeErr = assertImageFileSize(file);
        if (sizeErr) {
          setAttachErr(sizeErr);
          return;
        }
        const id = newAttachmentId();
        const base = file.name.replace(/\.[^.]+$/i, "").trim() || "Document";
        const title = base.slice(0, 120);
        const blobUrl = URL.createObjectURL(file);
        flushAdded([{ id, title, dataUrl: blobUrl, createdAt: new Date().toISOString() }]);

        try {
          const dataUrl = await fileToDisplayableDataUrl(file, {
            maxDimension: 960,
            quality: 0.72,
            mime: "image/jpeg",
          });
          if (!dataUrl.startsWith("data:image")) {
            setAttachErr("This file is not a supported image format.");
            removeAttachmentById(id, blobUrl);
            continue;
          }
          const head = dataUrl.slice(0, 90).toLowerCase();
          if (head.includes("image/heic") || head.includes("image/heif")) {
            setAttachErr("HEIC/HEIF is not supported here — export the photo as JPEG from your phone, then add it.");
            removeAttachmentById(id, blobUrl);
            continue;
          }
          replaceAttachmentDataUrl(id, dataUrl, blobUrl);
          setAttachErr(null);
        } catch {
          setAttachErr("Could not read one of the images.");
          removeAttachmentById(id, blobUrl);
        }
      }
    } finally {
      setAttachBusy(false);
    }
  }

  function setAttachmentTitle(id: string, title: string) {
    const prev = patientRef.current;
    const atts = prev.recordAttachments ?? [];
    onChange({
      ...prev,
      recordAttachments: atts.map((a) => (a.id === id ? { ...a, title } : a)),
    });
  }

  function removeAttachment(id: string) {
    const prev = patientRef.current;
    const atts = prev.recordAttachments ?? [];
    const victim = atts.find((a) => a.id === id);
    if (victim?.dataUrl.startsWith("blob:")) URL.revokeObjectURL(victim.dataUrl);
    onChange({
      ...prev,
      recordAttachments: atts.filter((a) => a.id !== id),
    });
  }

  return (
    <>
    <ProfileCard title="Clinical signs" icon={Eye} accent="warn">
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Edema (clinical grade)</label>
          <select
            className={inCls}
            disabled={patient.isDeceased}
            value={mh.clinicalEdemaGrade}
            onChange={(e) => patch({ clinicalEdemaGrade: e.target.value as ClinicalEdemaGrade })}
          >
            <option value="None">None</option>
            <option value="+">+</option>
            <option value="++">++</option>
            <option value="+++">+++</option>
          </select>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Weekly edema changes update this value; editing here does not overwrite weekly slots.
          </p>
        </div>
      </div>
    </ProfileCard>
    <fieldset disabled={patient.isDeceased || readOnly} className="min-w-0 space-y-4 border-0 p-0">
      <ProfileCard title="Feeding" icon={Milk}>
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-x-6 sm:gap-y-2">
            <div className="w-full shrink-0 sm:max-w-[11rem]">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Breastfeeding</label>
              {triBoolSelect(mh.breastfeeding, (v) =>
                patch({
                  breastfeeding: v,
                  firstSixMonths: v === true ? mh.firstSixMonths : "",
                }),
              )}
            </div>
            {mh.breastfeeding === true && (
              <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-border/60 bg-muted/15 px-3 py-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-x-4 sm:gap-y-1">
                <span className="text-[11px] font-medium text-muted-foreground sm:mr-1">First 6 months</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground sm:text-sm">
                  <input
                    type="radio"
                    name={`first-six-${patient.id}`}
                    className="h-3.5 w-3.5 shrink-0 border-input text-primary"
                    checked={mh.firstSixMonths === "Pure_milk"}
                    onChange={() => patch({ firstSixMonths: "Pure_milk" })}
                  />
                  <span className="leading-tight">Pure milk</span>
                </label>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground sm:text-sm">
                  <input
                    type="radio"
                    name={`first-six-${patient.id}`}
                    className="h-3.5 w-3.5 shrink-0 border-input text-primary"
                    checked={mh.firstSixMonths === "Mixed_with_water"}
                    onChange={() => patch({ firstSixMonths: "Mixed_with_water" })}
                  />
                  <span className="leading-tight">Mixed with water</span>
                </label>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Number of breastfeeding times per day
              </label>
              <input
                type="number"
                min={0}
                className={inCls}
                value={mh.feedingFrequencyPerDay ?? ""}
                onChange={(e) =>
                  patch({
                    feedingFrequencyPerDay: e.target.value === "" ? null : parseInt(e.target.value, 10),
                  })
                }
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Vomiting or refusal</label>
              {triBoolSelect(mh.vomitingOrRefusal, (v) => patch({ vomitingOrRefusal: v }))}
            </div>
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Nutrition & appetite" icon={Apple}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Complementary feeding</label>
            {triBoolSelect(mh.complementaryFeeding, (v) => patch({ complementaryFeeding: v }))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Appetite</label>
            <select
              className={inCls}
              value={mh.appetiteStatus}
              onChange={(e) => patch({ appetiteStatus: e.target.value as AppetiteStatus })}
            >
              <option value="">Not recorded</option>
              <option value="Excellent">Excellent</option>
              <option value="Medium">Medium</option>
              <option value="None">Absent (no appetite)</option>
            </select>
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Symptoms (with duration)" icon={Activity}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SymptomBlock
            label="Diarrhea"
            active={mh.diarrhea}
            days={mh.diarrheaDurationDays}
            onToggle={(on) => patch({ diarrhea: on, diarrheaDurationDays: on ? mh.diarrheaDurationDays : null })}
            onDays={(d) => patch({ diarrheaDurationDays: d })}
          />
          <SymptomBlock
            label="Vomiting"
            active={mh.vomiting}
            days={mh.vomitingDurationDays}
            onToggle={(on) => patch({ vomiting: on, vomitingDurationDays: on ? mh.vomitingDurationDays : null })}
            onDays={(d) => patch({ vomitingDurationDays: d })}
          />
          <SymptomBlock
            label="Fever"
            active={mh.fever}
            days={mh.feverDurationDays}
            onToggle={(on) => patch({ fever: on, feverDurationDays: on ? mh.feverDurationDays : null })}
            onDays={(d) => patch({ feverDurationDays: d })}
          />
          <SymptomBlock
            label="Cough"
            active={mh.cough}
            days={mh.coughDurationDays}
            onToggle={(on) => patch({ cough: on, coughDurationDays: on ? mh.coughDurationDays : null })}
            onDays={(d) => patch({ coughDurationDays: d })}
          />
        </div>
      </ProfileCard>

      <ProfileCard title="Program symptoms checklist" icon={Tags}>
        <p className="mb-3 text-xs text-muted-foreground">
          Same list as the table &quot;Symptoms&quot; column (click the count in the table to open the same picker). Edits
          apply when you save the patient chart.
        </p>
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-2">
          {SYMPTOMS_OPTIONS.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/30"
            >
              <input
                type="checkbox"
                className="h-4 w-4 shrink-0 rounded accent-primary"
                checked={patient.symptoms.includes(s)}
                onChange={() => {
                  const prev = patientRef.current;
                  const next = prev.symptoms.includes(s)
                    ? prev.symptoms.filter((x) => x !== s)
                    : [...prev.symptoms, s];
                  onChange({ ...prev, symptoms: next });
                }}
              />
              <span className="text-sm text-foreground">{s}</span>
            </label>
          ))}
        </div>
      </ProfileCard>

      <ProfileCard title="Other clinical signs" icon={Eye} accent="warn">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Skin ulcers</label>
            <select
              className={inCls}
              value={mh.skinUlcersGrade}
              onChange={(e) => patch({ skinUlcersGrade: e.target.value as ClinicalEdemaGrade })}
            >
              <option value="None">None</option>
              <option value="+">+ Mild</option>
              <option value="++">++ Moderate</option>
              <option value="+++">+++ Severe</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Urination / day</label>
            <input
              type="number"
              min={0}
              className={numCls}
              value={mh.urinationPerDay ?? ""}
              onChange={(e) =>
                patch({ urinationPerDay: e.target.value === "" ? null : parseInt(e.target.value, 10) })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Defecation / day</label>
            <input
              type="number"
              min={0}
              className={numCls}
              value={mh.defecationPerDay ?? ""}
              onChange={(e) =>
                patch({ defecationPerDay: e.target.value === "" ? null : parseInt(e.target.value, 10) })
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Consciousness (level of alertness)</label>
            <select
              className={inCls}
              value={mh.consciousness}
              onChange={(e) => patch({ consciousness: e.target.value as ConsciousnessLevel })}
            >
              <option value="">Not recorded</option>
              <option value="Alert">Alert — fully conscious (good)</option>
              <option value="Lethargic">Lethargic — drowsy / reduced responsiveness</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Inflammation of the eye conjunctiva
            </label>
            {triBoolSelect(mh.conjunctivitis, (v) => patch({ conjunctivitis: v }))}
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Pallor level</label>
            <select
              className={inCls}
              value={mh.pallorLevel}
              onChange={(e) => patch({ pallorLevel: e.target.value as PallorLevel })}
            >
              <option value="">Not recorded</option>
              <option value="Mild">Mild</option>
              <option value="Moderate">Moderate</option>
              <option value="Severe">Severe</option>
            </select>
          </div>
        </div>
      </ProfileCard>

      <ProfileCard title="Records & document photos" icon={FileImage}>
        <p className="mb-3 text-xs text-muted-foreground">
          Add image scans (JPEG/PNG/WebP). Thumbnails appear below; tap to view full screen. You must click{" "}
          <strong className="text-foreground">Save</strong> at the bottom of the chart window so photos are written to
          storage — if the browser storage is full, saving will fail (remove old attachments or export data).
        </p>
        <input
          ref={attachInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onAddAttachments}
        />
        <button
          type="button"
          disabled={attachBusy}
          onClick={() => attachInputRef.current?.click()}
          className="mb-4 inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} />
          {attachBusy ? "Processing…" : "Add photos"}
        </button>
        {attachErr ? <p className="mb-3 text-xs text-destructive">{attachErr}</p> : null}

        {attachments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/80 bg-muted/20 py-6 text-center text-xs text-muted-foreground">
            No document photos yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-4">
            {attachments.map((a) => (
              <div key={a.id} className="w-[132px] shrink-0">
                <div className="relative">
                  <button
                    type="button"
                    className="relative block h-[132px] w-full overflow-hidden rounded-xl border-2 border-border bg-muted shadow-sm outline-none ring-offset-2 transition hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setLightbox({ src: a.dataUrl, title: a.title })}
                    aria-label={`Open preview: ${a.title}`}
                  >
                    <img
                      src={a.dataUrl}
                      alt=""
                      width={132}
                      height={132}
                      className="block h-[132px] w-full object-cover"
                      decoding="async"
                    />
                    <span className="pointer-events-none absolute bottom-1.5 right-1.5 rounded-md bg-black/65 p-1 text-white shadow-sm">
                      <ZoomIn size={14} aria-hidden />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-white/30 bg-black/70 text-white shadow-md hover:bg-black/90"
                    aria-label="Delete attachment"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <input
                  className={`${inCls} mt-2 text-xs`}
                  value={a.title}
                  onChange={(e) => setAttachmentTitle(a.id, e.target.value)}
                  placeholder="Label"
                />
              </div>
            ))}
          </div>
        )}
      </ProfileCard>
    </fieldset>
    <ImageLightbox
      open={!!lightbox}
      src={lightbox?.src ?? null}
      alt={lightbox?.title ?? ""}
      onClose={() => setLightbox(null)}
    />
    </>
  );
}
