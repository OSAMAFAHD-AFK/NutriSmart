import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { MedicalAlert } from "@/lib/patientMedicalProfile";

export default function ClinicalAlerts({ alerts }: { alerts: MedicalAlert[] }) {
  if (alerts.length === 0) return null;
  return (
    <div className="space-y-2">
      {alerts.map((a) => (
        <div
          key={a.id}
          role="alert"
          className={`flex gap-3 rounded-xl border p-3 text-sm ${
            a.severity === "critical"
              ? "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
              : a.severity === "warning"
                ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
                : "border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/25 dark:text-emerald-100"
          }`}
        >
          {a.severity === "critical" ? (
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
          ) : a.severity === "warning" ? (
            <Info className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          ) : (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          )}
          <div className="min-w-0">
            <div className="font-semibold leading-tight">{a.title}</div>
            <p className="mt-1 text-xs opacity-95 leading-relaxed">{a.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
