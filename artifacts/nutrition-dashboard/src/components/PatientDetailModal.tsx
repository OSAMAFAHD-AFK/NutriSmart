import { type Patient, getDiagnosisColor } from "@/lib/data";
import { X, Edit, Phone, MapPin, Calendar, Ruler, Scale, Activity, User, AlertTriangle, Heart } from "lucide-react";

type Props = {
  patient: Patient;
  onEdit: (p: Patient) => void;
  onClose: () => void;
};

function InfoRow({ label, value, className = "" }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex justify-between items-start py-2 border-b border-border/50 last:border-0 ${className}`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground text-right max-w-48">{value}</span>
    </div>
  );
}

function WeekCard({ week, data, edema }: { week: string; data: Patient["week1"]; edema: boolean }) {
  return (
    <div className="bg-muted/30 rounded-xl p-3 border border-border/50">
      <div className="text-xs font-semibold text-foreground mb-2">{week}</div>
      {edema ? (
        <p className="text-xs text-red-500">Edema — hospital referral required</p>
      ) : (
        <div className="space-y-1">
          <InfoRow label="Weight" value={data.weight ? `${data.weight} kg` : "—"} />
          <InfoRow label="MUAC" value={data.muac ? `${data.muac} cm` : "—"} />
          <InfoRow label="Edema" value={data.edema ? "Yes" : "No"} />
          <InfoRow label="RUTF" value={data.rutf ? `${data.rutf} sachets` : "—"} />
          <InfoRow label="Z-Score" value={data.zScore ?? "—"} />
          <InfoRow label="Supplements" value={data.supplements || "—"} />
        </div>
      )}
    </div>
  );
}

export default function PatientDetailModal({ patient: p, onEdit, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-card-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-card z-10">
          <h2 className="text-base font-bold text-foreground">Patient Profile</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(p)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
              data-testid="button-edit-patient"
            >
              <Edit size={12} /> Edit Patient
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted transition-colors" data-testid="button-close-detail">
              <X size={18} className="text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Profile Header */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-border bg-muted shrink-0">
              <img
                src={p.photoUrl}
                alt={p.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(p.name)}`;
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.id}</p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getDiagnosisColor(p.diagnosis)}`}>
                  {p.diagnosis}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.gender === "M" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" : "bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400"}`}>
                  {p.gender === "M" ? "Male" : "Female"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{p.ageMonths} months old</span>
                {p.edema && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 font-semibold flex items-center gap-1">
                    <AlertTriangle size={10} /> Edema
                  </span>
                )}
                {p.isDeceased && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 font-semibold">Deceased</span>
                )}
              </div>
            </div>
          </div>

          {/* Edema Alert */}
          {p.edema && !p.isDeceased && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <AlertTriangle size={16} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm font-medium text-red-700 dark:text-red-400">
                This case must be referred to hospital immediately — Edema present
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Guardian Info */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <User size={12} /> Guardian Information
              </div>
              <InfoRow label="Father's Name" value={p.fatherName || "Not provided"} />
              <InfoRow label="Phone" value={p.fatherPhone ? (
                <a href={`tel:${p.fatherPhone}`} className="text-primary hover:underline">{p.fatherPhone}</a>
              ) : "Not provided"} />
              <InfoRow label="Date of Birth" value={p.dateOfBirth} />
              <InfoRow label="Last Visit" value={p.lastVisitDate} />
            </div>

            {/* Location */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <MapPin size={12} /> Location
              </div>
              <InfoRow label="Governorate" value={p.governorate} />
              <InfoRow label="District" value={p.district} />
              <InfoRow label="Enrolled" value={p.createdAt} />
            </div>

            {/* Measurements */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <Scale size={12} /> Anthropometric Data
              </div>
              <InfoRow label="Weight" value={`${p.weight} kg`} />
              <InfoRow label="Height" value={`${p.height} cm`} />
              <InfoRow label="WFH" value={p.wfh} />
              <InfoRow label="MUAC" value={`${p.muac} cm`} />
              <InfoRow label="Z-Score" value={p.zScore} />
              <InfoRow label="Edema" value={p.edema ? "YES — Present" : "No"} />
            </div>

            {/* Treatment */}
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <Heart size={12} /> Treatment Plan
              </div>
              <InfoRow label="Milk" value={p.milk} />
              <InfoRow label="Dose" value={p.dose} />
              <InfoRow label="Medication" value={p.medication} />
              <InfoRow label="Supplements" value={p.supplements} />
            </div>
          </div>

          {/* Symptoms */}
          {p.symptoms.length > 0 && (
            <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                <Activity size={12} /> Symptoms
              </div>
              <div className="flex flex-wrap gap-2">
                {p.symptoms.map((s) => (
                  <span key={s} className="px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 text-xs font-medium border border-orange-200 dark:border-orange-900">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Data */}
          <div>
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Weekly Follow-up Data</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <WeekCard week="Week 1" data={p.week1} edema={p.edema} />
              <WeekCard week="Week 2" data={p.week2} edema={p.edema} />
              <WeekCard week="Week 3" data={p.week3} edema={p.edema} />
              <WeekCard week="Week 4" data={p.week4} edema={p.edema} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
