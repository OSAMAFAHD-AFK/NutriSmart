import { useState, useEffect } from "react";
import { X, User, Phone, MapPin, Scale, Upload } from "lucide-react";
import {
  type Patient,
  type Diagnosis,
  GOVERNORATES,
  SYMPTOMS_OPTIONS,
  calcDiagnosisFromMuac,
  calcAgeMonthsFromDob,
  calcZScoreFromMuac,
  calcWFHValue,
  calcRutfAmount,
  getDiagnosisColor,
} from "@/lib/data";

type Props = {
  patient?: Patient | null;
  onSave: (p: Patient) => void;
  onClose: () => void;
};

function genId(): string {
  return `YNS-${Date.now().toString().slice(-6)}`;
}

function makeWeek(weight: number, muac: number, edema: boolean): Patient["week1"] {
  const rutf = calcRutfAmount(weight);
  return { weight, muac, edema, rutf, height: null, zScore: calcZScoreFromMuac(muac), supplements: "Vit A + Zinc" };
}

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function PatientModal({ patient, onSave, onClose }: Props) {
  const isEdit = !!patient;

  const [name, setName] = useState(patient?.name ?? "");
  const [fatherName, setFatherName] = useState(patient?.fatherName ?? "");
  const [fatherPhone, setFatherPhone] = useState(patient?.fatherPhone ?? "");
  const [gender, setGender] = useState<"M" | "F">(patient?.gender ?? "M");
  const [dob, setDob] = useState(patient?.dateOfBirth ?? "");
  const [weight, setWeight] = useState(patient?.weight?.toString() ?? "");
  const [height, setHeight] = useState(patient?.height?.toString() ?? "");
  const [muac, setMuac] = useState(patient?.muac?.toString() ?? "");
  const [edema, setEdema] = useState(patient?.edema ?? false);
  const [governorate, setGovernorate] = useState(patient?.governorate ?? "Sana'a");
  const [district, setDistrict] = useState(patient?.district ?? "");
  const [milk, setMilk] = useState(patient?.milk ?? "F75");
  const [dose, setDose] = useState(patient?.dose ?? "");
  const [medication, setMedication] = useState(patient?.medication ?? "Amoxicillin + Vit A");
  const [supplements, setSupplements] = useState(patient?.supplements ?? "Vit A + Zinc + Iron");
  const [photoUrl, setPhotoUrl] = useState(patient?.photoUrl ?? "");
  const [symptoms, setSymptoms] = useState<string[]>(patient?.symptoms ?? []);
  const [isDeceased, setIsDeceased] = useState(patient?.isDeceased ?? false);

  const districts = GOVERNORATES[governorate] ?? [];
  useEffect(() => {
    if (!districts.includes(district)) setDistrict(districts[0] ?? "");
  }, [governorate]);

  const ageMonths = dob ? calcAgeMonthsFromDob(dob) : 0;
  const wNum = parseFloat(weight) || 0;
  const hNum = parseFloat(height) || 0;
  const mNum = parseFloat(muac) || 0;
  const wfh = wNum && hNum ? calcWFHValue(wNum, hNum) : 0;
  const zScore = mNum ? calcZScoreFromMuac(mNum) : 0;
  const diagnosis = calcDiagnosisFromMuac(mNum, edema);
  const rutf = wNum ? calcRutfAmount(wNum) : 0;

  function toggleSymptom(s: string) {
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split("T")[0];
    const id = patient?.id ?? genId();
    const wk = makeWeek(wNum, mNum, edema);
    const saved: Patient = {
      id,
      name,
      fatherName,
      fatherPhone,
      gender,
      dateOfBirth: dob,
      ageMonths,
      weight: wNum,
      height: hNum,
      wfh,
      edema,
      zScore,
      muac: mNum,
      diagnosis: isDeceased ? "Deceased" : diagnosis,
      governorate,
      district,
      symptoms,
      milk,
      dose: dose || `${rutf} sachets/day`,
      medication,
      supplements,
      photoUrl: photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}&backgroundColor=b6e3f4,c0aede`,
      lastVisitDate: today,
      createdAt: patient?.createdAt ?? today,
      week1: patient?.week1 ?? wk,
      week2: patient?.week2 ?? wk,
      week3: patient?.week3 ?? wk,
      week4: patient?.week4 ?? wk,
      isDeceased,
    };
    onSave(saved);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-bold text-foreground">{isEdit ? "Edit Patient" : "Add New Patient"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Fill in patient information and medical data</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="button-close-modal">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit} className="p-5 space-y-6">
            {/* Auto-calculated */}
            {(mNum > 0 || edema) && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border flex-wrap">
                <div className="text-xs text-muted-foreground">Auto-calculated:</div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getDiagnosisColor(isDeceased ? "Deceased" : diagnosis)}`}>
                  {isDeceased ? "Deceased" : diagnosis}
                </span>
                {wfh > 0 && <span className="text-xs text-muted-foreground">WFH: <strong className="text-foreground">{wfh}</strong></span>}
                {zScore !== 0 && <span className="text-xs text-muted-foreground">Z-Score: <strong className="text-foreground">{zScore}</strong></span>}
                {rutf > 0 && <span className="text-xs text-muted-foreground">RUTF: <strong className="text-foreground">{rutf} sachets/day</strong></span>}
                {ageMonths > 0 && <span className="text-xs text-muted-foreground">Age: <strong className="text-foreground">{ageMonths} months</strong></span>}
                {edema && (
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                    ⚠ This case must be referred to hospital immediately
                  </div>
                )}
              </div>
            )}

            {/* Basic Info */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <User size={12} /> Basic Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name *">
                  <input required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} placeholder="Patient full name" data-testid="input-patient-name" />
                </Field>
                <Field label="Date of Birth *">
                  <input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} max={new Date().toISOString().split("T")[0]} data-testid="input-dob" />
                </Field>
                <Field label="Gender *">
                  <select value={gender} onChange={(e) => setGender(e.target.value as "M" | "F")} className={inputCls} data-testid="select-gender">
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                  </select>
                </Field>
                <Field label="Deceased">
                  <div className="flex items-center gap-3 py-2">
                    <input type="checkbox" id="deceased" checked={isDeceased} onChange={(e) => setIsDeceased(e.target.checked)} className="w-4 h-4" data-testid="checkbox-deceased" />
                    <label htmlFor="deceased" className="text-sm text-foreground">Mark as deceased</label>
                  </div>
                </Field>
              </div>
            </div>

            {/* Father Info */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <Phone size={12} /> Father / Guardian Information
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Father's Name">
                  <input value={fatherName} onChange={(e) => setFatherName(e.target.value)} className={inputCls} placeholder="Father's full name" data-testid="input-father-name" />
                </Field>
                <Field label="Father's Phone">
                  <input value={fatherPhone} onChange={(e) => setFatherPhone(e.target.value)} className={inputCls} placeholder="+967 7xx xxx xxx" data-testid="input-father-phone" />
                </Field>
              </div>
            </div>

            {/* Location */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <MapPin size={12} /> Location
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Governorate *">
                  <select value={governorate} onChange={(e) => setGovernorate(e.target.value)} className={inputCls} data-testid="select-governorate">
                    {Object.keys(GOVERNORATES).map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </Field>
                <Field label="District *">
                  <select value={district} onChange={(e) => setDistrict(e.target.value)} className={inputCls} data-testid="select-district">
                    {districts.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* Measurements */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <Scale size={12} /> Measurements
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Field label="Weight (kg) *">
                  <input required type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} placeholder="6.5" data-testid="input-weight" />
                </Field>
                <Field label="Height (cm) *">
                  <input required type="number" step="0.5" value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} placeholder="72" data-testid="input-height" />
                </Field>
                <Field label="MUAC (cm) *">
                  <input required type="number" step="0.1" value={muac} onChange={(e) => setMuac(e.target.value)} className={inputCls} placeholder="11.5" data-testid="input-muac" />
                </Field>
                <Field label="Edema">
                  <div className="flex items-center gap-3 py-2">
                    <input type="checkbox" id="edema" checked={edema} onChange={(e) => setEdema(e.target.checked)} className="w-4 h-4" data-testid="checkbox-edema" />
                    <label htmlFor="edema" className="text-sm text-foreground">Edema present</label>
                  </div>
                </Field>
              </div>
            </div>

            {/* Treatment */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Treatment Plan</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Milk Type">
                  <select value={milk} onChange={(e) => setMilk(e.target.value)} className={inputCls} data-testid="select-milk">
                    {["F75", "F100", "RUTF only", "F100 + RUTF", "F75 → F100"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Dose">
                  <input value={dose} onChange={(e) => setDose(e.target.value)} className={inputCls} placeholder="Auto-calculated from weight" data-testid="input-dose" />
                </Field>
                <Field label="Medication">
                  <select value={medication} onChange={(e) => setMedication(e.target.value)} className={inputCls} data-testid="select-medication">
                    {["Amoxicillin + Vit A", "Amoxicillin + Zinc", "Cotrimoxazole + Vit A", "Mebendazole + Vit A", "Amoxicillin only"].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
                <Field label="Supplements">
                  <input value={supplements} onChange={(e) => setSupplements(e.target.value)} className={inputCls} placeholder="Vit A + Zinc + Iron" data-testid="input-supplements" />
                </Field>
              </div>
            </div>

            {/* Photo */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <Upload size={12} /> Patient Photo (URL)
              </div>
              <input value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} className={inputCls} placeholder="https://... or leave blank for auto-generated" data-testid="input-photo" />
            </div>

            {/* Symptoms */}
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Symptoms</div>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSymptom(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${symptoms.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"}`}
                    data-testid={`symptom-${s.replace(/\s/g, "-")}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors" data-testid="button-cancel">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm" data-testid="button-save-patient">
                {isEdit ? "Save Changes" : "Add Patient"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
