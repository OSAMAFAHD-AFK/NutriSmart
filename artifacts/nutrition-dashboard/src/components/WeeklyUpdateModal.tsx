import { useState } from "react";
import { X, CalendarCheck } from "lucide-react";
import { type Patient, calcRutfAmount } from "@/lib/data";

type Props = {
  patient: Patient;
  onSave: (p: Patient) => void;
  onClose: () => void;
};

type WeekKey = "week1" | "week2" | "week3" | "week4";
const WEEKS: { key: WeekKey; label: string }[] = [
  { key: "week1", label: "Week 1" },
  { key: "week2", label: "Week 2" },
  { key: "week3", label: "Week 3" },
  { key: "week4", label: "Week 4" },
];

export default function WeeklyUpdateModal({ patient, onSave, onClose }: Props) {
  const [selectedWeek, setSelectedWeek] = useState<WeekKey>("week1");
  const weekData = patient[selectedWeek];

  const [weight, setWeight] = useState(weekData.weight?.toString() ?? "");
  const [muac, setMuac] = useState(weekData.muac?.toString() ?? "");
  const [edema, setEdema] = useState(weekData.edema);
  const [height, setHeight] = useState(weekData.height?.toString() ?? "");
  const [zScore, setZScore] = useState(weekData.zScore?.toString() ?? "");
  const [supplements, setSupplements] = useState(weekData.supplements ?? "");

  const wNum = parseFloat(weight) || 0;
  const rutf = wNum ? calcRutfAmount(wNum) : weekData.rutf ?? 0;

  function handleWeekChange(wk: WeekKey) {
    setSelectedWeek(wk);
    const d = patient[wk];
    setWeight(d.weight?.toString() ?? "");
    setMuac(d.muac?.toString() ?? "");
    setEdema(d.edema);
    setHeight(d.height?.toString() ?? "");
    setZScore(d.zScore?.toString() ?? "");
    setSupplements(d.supplements ?? "");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const today = new Date().toISOString().split("T")[0];
    const updated: Patient = {
      ...patient,
      lastVisitDate: today,
      [selectedWeek]: {
        weight: parseFloat(weight) || null,
        muac: parseFloat(muac) || null,
        edema,
        rutf,
        height: parseFloat(height) || null,
        zScore: parseFloat(zScore) || null,
        supplements,
      },
    };
    onSave(updated);
  }

  const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring";

  if (patient.edema) {
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
          {/* Week Selector */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Select Week</label>
            <div className="grid grid-cols-4 gap-2">
              {WEEKS.map((w) => (
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

          {/* Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Weight (kg)</label>
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} placeholder="7.2" data-testid="input-week-weight" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">MUAC (cm)</label>
              <input type="number" step="0.1" value={muac} onChange={(e) => setMuac(e.target.value)} className={inputCls} placeholder="11.8" data-testid="input-week-muac" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Height (cm)</label>
              <input type="number" step="0.5" value={height} onChange={(e) => setHeight(e.target.value)} className={inputCls} placeholder="75" data-testid="input-week-height" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Z-Score</label>
              <input type="number" step="0.1" value={zScore} onChange={(e) => setZScore(e.target.value)} className={inputCls} placeholder="-2.1" data-testid="input-week-zscore" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-muted-foreground mb-1">Supplements</label>
              <input value={supplements} onChange={(e) => setSupplements(e.target.value)} className={inputCls} placeholder="Vit A + Zinc" data-testid="input-week-supplements" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="wk-edema" checked={edema} onChange={(e) => setEdema(e.target.checked)} className="w-4 h-4" data-testid="checkbox-week-edema" />
            <label htmlFor="wk-edema" className="text-sm text-foreground">Edema present this week</label>
          </div>

          {wNum > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              Auto-calculated RUTF: <strong className="text-foreground">{rutf} sachets/day</strong>
              <span className="ml-2 text-xs">(Formula: Weight × 200 / 500)</span>
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
