import { useState } from "react";
import { X, Activity } from "lucide-react";
import { type Patient, SYMPTOMS_OPTIONS } from "@/lib/data";

type Props = {
  patient: Patient;
  onSave: (p: Patient) => void;
  onClose: () => void;
};

export default function SymptomsModal({ patient, onSave, onClose }: Props) {
  const [selected, setSelected] = useState<string[]>(patient.symptoms);

  function toggle(s: string) {
    setSelected((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  function handleSave() {
    const today = new Date().toISOString().split("T")[0];
    onSave({ ...patient, symptoms: selected, lastVisitDate: today });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Activity size={16} className="text-primary" />
              Manage Symptoms
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">{patient.name}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="button-close-symptoms">
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-muted-foreground">Select all symptoms that apply to this patient:</p>
          <div className="flex flex-col gap-2">
            {SYMPTOMS_OPTIONS.map((s) => (
              <label
                key={s}
                className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted/30 cursor-pointer transition-colors"
                data-testid={`symptom-option-${s.replace(/\s/g, "-")}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(s)}
                  onChange={() => toggle(s)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm text-foreground">{s}</span>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <span className="text-xs text-muted-foreground">{selected.length} symptom(s) selected</span>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleSave} className="px-5 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity shadow-sm" data-testid="button-save-symptoms">
                Save Symptoms
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
