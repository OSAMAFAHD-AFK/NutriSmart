import { useState, useEffect, useLayoutEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import {
  loadPatients,
  savePatients,
  type Patient,
  getDiagnosisColor,
  getPercentageColor,
  calcPercentageForPatient,
  nextSequentialPatientId,
  createDraftPatient,
  totalProgramRutfSachets,
  patientHasClinicalEdema,
  formatEdemaForTable,
  getPatientDerivedAnthropometry,
  getLatestFollowUpOutcome,
  formatFollowUpOutcomeShort,
  formatFollowUpOutcomeFull,
  getPatientWeightGainRate,
} from "@/lib/data";
import {
  heightMeasureShortLabel,
  isInfantUnder6Months,
  stubWeightForHeightZ,
  stubWeightForAgeZ,
  classifyWazAsStuntingBand,
  classifyNutritionTypeBand,
} from "@/lib/patientTableAnthro";
import {
  loadPrograms,
  savePrograms,
  touchProgramUsage,
  type AgeGroupId,
  formatAge,
  getProgramAgeBandLabelEn,
  formatProgramCreatedAtForUi,
} from "@/lib/ageGroups";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Plus, Search, AlertCircle, Users,
  BarChart3, TableIcon, Building2, TrendingUp, Skull, Heart, ArrowLeft,
  FileSpreadsheet, FileText, Pencil, Trash2, Check, X,
} from "lucide-react";
import PatientDetailModal from "@/components/PatientDetailModal";
import { patientTableClass, patientTableScrollClass } from "@/lib/patientDirectoryTableClasses";
import SymptomsModal from "@/components/SymptomsModal";
import { exportRowsToExcel, exportRowsToPdf } from "@/lib/tableExport";

const DIAG_COLORS: Record<string, string> = {
  SAM: "#ef4444", MAM: "#f59e0b", Normal: "#3b82f6", Recovered: "#10b981", Deceased: "#6b7280",
};

function MiniStatCard({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 shadow-sm">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-foreground">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

export default function AgeGroupPage() {
  const params = useParams<{ groupId: string }>();
  const [, navigate] = useLocation();
  const groupId = params.groupId as AgeGroupId;

  const [patients, setPatients] = useState<Patient[]>([]);
  const [programs, setPrograms] = useState(() => loadPrograms());
  const [activeTab, setActiveTab] = useState<"patients" | "analytics">("patients");
  const [search, setSearch] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("All");
  const [tableView, setTableView] = useState<"recent" | "monthly">("recent");
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
  const [detailIsNew, setDetailIsNew] = useState(false);
  const [symptomsPatient, setSymptomsPatient] = useState<Patient | null>(null);
  const [isEditingProgram, setIsEditingProgram] = useState(false);
  const [programEdit, setProgramEdit] = useState({ label: "", sponsor: "" });
  const group = programs.find((p) => p.id === groupId);

  useEffect(() => {
    setPatients(loadPatients());
    setPrograms(loadPrograms());
  }, []);

  useLayoutEffect(() => {
    if (!groupId) return;
    const exists = loadPrograms().some((p) => p.id === groupId);
    if (!exists) return;
    touchProgramUsage(groupId);
  }, [groupId]);

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
      <div className="text-4xl">❓</div>
      <div className="text-lg font-semibold text-foreground">Program not found</div>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <ArrowLeft size={14} /> Back to Overview
        </button>
      </div>
    );
  }

  const groupPatients = useMemo(
    () => {
      if (!group) return [];
      return patients.filter((p) => p.programId === group.id);
    },
    [patients, group]
  );

  const filtered = useMemo(() => {
    return groupPatients.filter((p) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase());
      const matchDiag =
        diagnosisFilter === "All" || getPatientDerivedAnthropometry(p).diagnosis === diagnosisFilter;
      return matchSearch && matchDiag;
    });
  }, [groupPatients, search, diagnosisFilter]);

  function getTimeMs(v: string | undefined): number {
    if (!v) return 0;
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
  }

  const tableRows = useMemo(() => {
    if (tableView === "recent") {
      return [...filtered]
        .sort((a, b) => {
          const ta = getTimeMs(a.updatedAt) || getTimeMs(a.lastVisitDate) || getTimeMs(a.createdAt);
          const tb = getTimeMs(b.updatedAt) || getTimeMs(b.lastVisitDate) || getTimeMs(b.createdAt);
          return tb - ta;
        })
        .map((p) => ({ kind: "patient" as const, patient: p }));
    }

    const sortedByCreated = [...filtered].sort((a, b) => getTimeMs(b.createdAt) - getTimeMs(a.createdAt));
    const rows: Array<{ kind: "month"; key: string; label: string } | { kind: "patient"; patient: Patient }> = [];
    let lastMonthKey = "";

    for (const p of sortedByCreated) {
      const d = p.createdAt ? new Date(p.createdAt) : new Date(0);
      const monthKey = Number.isNaN(d.getTime())
        ? "unknown"
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (monthKey !== lastMonthKey) {
        const monthLabel = Number.isNaN(d.getTime())
          ? "Unknown month"
          : d.toLocaleString("en-GB", { month: "short", year: "numeric" });
        rows.push({ kind: "month", key: monthKey, label: monthLabel });
        lastMonthKey = monthKey;
      }
      rows.push({ kind: "patient", patient: p });
    }
    return rows;
  }, [filtered, tableView]);

  const stats = useMemo(() => ({
    total: groupPatients.length,
    sam: groupPatients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "SAM").length,
    mam: groupPatients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "MAM").length,
    recovered: groupPatients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "Recovered").length,
    normal: groupPatients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "Normal").length,
    deaths: groupPatients.filter((p) => p.isDeceased).length,
    edema: groupPatients.filter((p) => patientHasClinicalEdema(p) && !p.isDeceased).length,
    male: groupPatients.filter((p) => p.gender === "M").length,
    female: groupPatients.filter((p) => p.gender === "F").length,
  }), [groupPatients]);

  const govData = useMemo(() => {
    const map: Record<string, { name: string; SAM: number; MAM: number; Normal: number; Recovered: number }> = {};
    groupPatients.forEach((p) => {
      if (!map[p.governorate]) map[p.governorate] = { name: p.governorate, SAM: 0, MAM: 0, Normal: 0, Recovered: 0 };
      const d = getPatientDerivedAnthropometry(p).diagnosis;
      if (d === "SAM") map[p.governorate].SAM++;
      else if (d === "MAM") map[p.governorate].MAM++;
      else if (d === "Normal") map[p.governorate].Normal++;
      else if (d === "Recovered") map[p.governorate].Recovered++;
    });
    return Object.values(map).sort((a, b) => (b.SAM + b.MAM) - (a.SAM + a.MAM));
  }, [groupPatients]);

  const diagData = useMemo(() => [
    { name: "SAM", value: stats.sam },
    { name: "MAM", value: stats.mam },
    { name: "Normal", value: stats.normal },
    { name: "Recovered", value: stats.recovered },
  ].filter((d) => d.value > 0), [stats]);

  const genderData = useMemo(() => [
    { name: "Male", value: stats.male },
    { name: "Female", value: stats.female },
  ], [stats]);

  const STORAGE_SAVE_FAILED =
    "Could not save data (browser storage may be full). Try removing some document photos from patients, then save again.";

  function handleSymptomsUpdate(updated: Patient) {
    const stamped: Patient = { ...updated, updatedAt: new Date().toISOString() };
    const list = patients.map((p) => (p.id === stamped.id ? stamped : p));
    if (!savePatients(list)) {
      window.alert(STORAGE_SAVE_FAILED);
      return;
    }
    setPatients(list);
    setSymptomsPatient(null);
    setDetailPatient((cur) => (cur && cur.id === stamped.id ? stamped : cur));
  }

  function handlePatientChartSave(updated: Patient) {
    const stamped: Patient = { ...updated, updatedAt: new Date().toISOString() };
    if (detailIsNew) {
      const next = [...patients, stamped];
      if (!savePatients(next)) {
        window.alert(STORAGE_SAVE_FAILED);
        return;
      }
      setPatients(next);
      setDetailPatient(null);
      setDetailIsNew(false);
    } else {
      const list = patients.map((p) => (p.id === stamped.id ? stamped : p));
      if (!savePatients(list)) {
        window.alert(STORAGE_SAVE_FAILED);
        return;
      }
      setPatients(list);
      setDetailPatient(stamped);
    }
  }

  function startProgramEdit() {
    if (!group) return;
    setProgramEdit({ label: group.label, sponsor: group.sponsor });
    setIsEditingProgram(true);
  }

  function saveProgramEdit() {
    if (!group) return;
    const label = programEdit.label.trim();
    const sponsor = programEdit.sponsor.trim();
    if (!label || !sponsor) {
      window.alert("Program name and donor are required.");
      return;
    }
    const nextPrograms = programs.map((p) => (p.id === group.id ? { ...p, label, sponsor } : p));
    savePrograms(nextPrograms);
    setPrograms(nextPrograms);
    setIsEditingProgram(false);
  }

  function deleteProgram() {
    if (!group) return;
    const linkedCount = patients.filter((p) => p.programId === group.id).length;
    const ok = window.confirm(
      `Delete "${group.label}" completely?\n\nThis will also delete ${linkedCount} linked patient record(s). This action cannot be undone.`,
    );
    if (!ok) return;
    const nextPrograms = programs.filter((p) => p.id !== group.id);
    const nextPatients = patients.filter((p) => p.programId !== group.id);
    savePrograms(nextPrograms);
    if (!savePatients(nextPatients)) {
      window.alert(STORAGE_SAVE_FAILED);
      return;
    }
    setPrograms(nextPrograms);
    setPatients(nextPatients);
    navigate("/");
  }

  function displayTotalRutf(p: Patient): string {
    if (patientHasClinicalEdema(p) || isInfantUnder6Months(p)) return "—";
    const n = totalProgramRutfSachets(p);
    return n > 0 ? String(n) : "0";
  }

  const heightColShort = group.minMonths === 0 ? "L" : "H";

  const malnutritionRate = stats.total > 0 ? Math.round(((stats.sam + stats.mam) / stats.total) * 100) : 0;
  const exportRows = useMemo(
    () =>
      filtered.map((p) => {
        const d = getPatientDerivedAnthropometry(p);
        const whz = stubWeightForHeightZ({ ...p, weight: d.weight, height: d.height });
        const hasEdema = patientHasClinicalEdema(p);
        const wg = getPatientWeightGainRate(p);
        const nutritionType = classifyNutritionTypeBand({
          edema: hasEdema,
          whz,
          muac: isInfantUnder6Months(p) ? null : d.muac,
        });
        return {
        ID: p.id,
        Name: p.name,
        Gender: p.gender,
        Age: formatAge(p.ageMonths, group.ageFormat),
        FirstVisit: p.firstVisitDate ?? "",
        WeightKg: d.weight,
        HeightCm: d.height,
        WHZ: whz,
        HAZ: stubWeightForAgeZ({ ...p, height: d.height }),
        HAZ_result: classifyWazAsStuntingBand(stubWeightForAgeZ({ ...p, height: d.height })),
        MUAC: isInfantUnder6Months(p) ? "" : d.muac,
        Edema: formatEdemaForTable(p),
        Diagnosis: d.diagnosis,
        FollowUp_Outcome: formatFollowUpOutcomeShort(getLatestFollowUpOutcome(p)),
        WeightGainRate_gkgday: wg.rate ?? "",
        RecoveryPace: wg.status,
        Type: nutritionType,
        SymptomsCount: p.symptoms.length,
        TotalRUTF_weeklySum: displayTotalRutf(p),
        ScorePercent: `${calcPercentageForPatient(p)}%`,
        LastVisit: p.lastVisitDate,
      };
      }),
    [filtered, group.ageFormat],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">

      {/* ── Page Header ── */}
      <div className="shrink-0">
        <div className={`rounded-xl border p-4 shadow-sm ${group.bgClass} ${group.borderClass}`}>
          <div className="flex items-start gap-2.5">
              <span className="text-2xl leading-none">{group.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => navigate("/")}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border/70 bg-background/70 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="Back to Overview"
                  >
                    <ArrowLeft size={13} />
                    Back
                  </button>
                  <h1 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-bold text-foreground">
                    <span className="break-words">{group.label}</span>
                    <span className="text-sm font-normal text-muted-foreground">— {group.description}</span>
                  </h1>
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{stats.total} patients in this program</p>

                {isEditingProgram ? (
                  <div className="mt-3 space-y-2 rounded-lg border border-border/70 bg-background/75 p-3">
                    <input
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                      value={programEdit.label}
                      onChange={(e) => setProgramEdit((s) => ({ ...s, label: e.target.value }))}
                      placeholder="Program name"
                    />
                    <input
                      className="w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-xs text-foreground"
                      value={programEdit.sponsor}
                      onChange={(e) => setProgramEdit((s) => ({ ...s, sponsor: e.target.value }))}
                      placeholder="Donor / organization"
                    />
                    <div className="flex items-center gap-1">
                      <button
                        onClick={saveProgramEdit}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-semibold text-primary-foreground"
                      >
                        <Check size={11} />
                        Save
                      </button>
                      <button
                        onClick={() => setIsEditingProgram(false)}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground"
                      >
                        <X size={11} />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px]">
                      <span className={`inline-flex items-center rounded-md border px-2 py-1 font-semibold ${group.textClass} bg-background/70`}>
                        <Building2 size={12} className="mr-1" />
                        {group.sponsor}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-border bg-background/70 px-2 py-1 text-muted-foreground">
                        Target age: {getProgramAgeBandLabelEn(group)}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-border bg-background/70 px-2 py-1 text-muted-foreground">
                        {group.governorate} — {group.district}
                      </span>
                      <span className="inline-flex items-center rounded-md border border-border bg-background/70 px-2 py-1 text-muted-foreground">
                        Created: {formatProgramCreatedAtForUi(group.createdAt)}
                      </span>
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          onClick={startProgramEdit}
                          className="inline-flex items-center gap-1 rounded-md border border-blue-200/80 bg-blue-50/70 px-2 py-1 text-[11px] font-semibold text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900/70 dark:bg-blue-950/40 dark:text-blue-300 dark:hover:bg-blue-900/40"
                        >
                          <Pencil size={11} />
                          Edit
                        </button>
                        <button
                          onClick={deleteProgram}
                          className="inline-flex items-center gap-1 rounded-md border border-red-300 bg-red-50/75 px-2 py-1 text-[11px] font-semibold text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/35 dark:text-red-300 dark:hover:bg-red-900/35"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

        {/* ── Mini Stats Row ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4">
          <MiniStatCard label="Total Patients" value={stats.total} color="bg-blue-100 dark:bg-blue-950/40" icon={<Users size={18} className="text-blue-600 dark:text-blue-400" />} />
          <MiniStatCard label="SAM Cases" value={stats.sam} color="bg-red-100 dark:bg-red-950/40" icon={<AlertCircle size={18} className="text-red-600 dark:text-red-400" />} />
          <MiniStatCard label="MAM Cases" value={stats.mam} color="bg-orange-100 dark:bg-orange-950/40" icon={<TrendingUp size={18} className="text-orange-600 dark:text-orange-400" />} />
          <MiniStatCard label="Normal" value={stats.normal} color="bg-blue-100 dark:bg-blue-950/40" icon={<Heart size={18} className="text-blue-600 dark:text-blue-400" />} />
          <MiniStatCard label="Recovered" value={stats.recovered} color="bg-green-100 dark:bg-green-950/40" icon={<Heart size={18} className="text-green-600 dark:text-green-400" />} />
          <MiniStatCard label="Deaths" value={stats.deaths} color="bg-gray-100 dark:bg-gray-800" icon={<Skull size={18} className="text-gray-600 dark:text-gray-400" />} />
          <MiniStatCard label="Malnutrition" value={`${malnutritionRate}%`} color={`${group.bgClass}`} icon={<BarChart3 size={18} className={group.textClass} />} />
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex items-center gap-1 border-b border-border shrink-0">
        <button
          onClick={() => setActiveTab("patients")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === "patients" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <TableIcon size={14} /> Patients Table
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${activeTab === "analytics" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          <BarChart3 size={14} /> Analytics
        </button>
      </div>

      {/* ── Patients Tab ── */}
      {activeTab === "patients" && (
        <div className="flex flex-col gap-2.5 flex-1 min-h-0">
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or ID..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <select
              value={diagnosisFilter}
              onChange={(e) => setDiagnosisFilter(e.target.value)}
              className="text-sm rounded-lg border border-input bg-card text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="All">All Diagnoses</option>
              <option value="SAM">SAM</option>
              <option value="MAM">MAM</option>
              <option value="Normal">Normal</option>
              <option value="Recovered">Recovered</option>
              <option value="Deceased">Deceased</option>
            </select>
            <button
              onClick={() => {
                setDetailPatient(
                  createDraftPatient(nextSequentialPatientId(patients), {
                    programId: group.id,
                    followUpInterval: group.followUpInterval,
                  }),
                );
                setDetailIsNew(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-sm shrink-0"
            >
              <Plus size={14} /> Add Patient
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1 text-xs text-muted-foreground shrink-0">
            <span className="shrink-0">
              {filtered.length} of {groupPatients.length} patients shown — click any row to view details
            </span>
            {stats.edema > 0 && (
              <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400 shrink-0">
                <AlertCircle size={12} className="shrink-0" />
                <span>
                  <span className="font-semibold">{stats.edema} patient(s) with Edema</span> — refer to hospital immediately.
                </span>
              </span>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setTableView("recent")}
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                  tableView === "recent"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                Recently Updated
              </button>
              <button
                type="button"
                onClick={() => setTableView("monthly")}
                className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-medium transition-colors ${
                  tableView === "monthly"
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-foreground hover:bg-muted"
                }`}
              >
                New by Month
              </button>
              <button
                type="button"
                onClick={() => exportRowsToExcel(`${group.id}-patients-export`, exportRows)}
                disabled={exportRows.length === 0}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileSpreadsheet size={12} />
                Export Excel
              </button>
              <button
                type="button"
                onClick={() =>
                  exportRowsToPdf(
                    `${group.id}-patients-export`,
                    `${group.label} Patients Export`,
                    exportRows,
                  )
                }
                disabled={exportRows.length === 0}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileText size={12} />
                Export PDF
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className={patientTableScrollClass}>
              <table className={patientTableClass}>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-card text-xs text-muted-foreground">
                    <th className="min-w-[2.75rem] px-2 py-2.5 text-center font-medium" title="Patient ID">ID</th>
                    <th className="min-w-[10rem] max-w-[16rem] px-2 py-2.5 text-left font-medium" title="Full name">Name</th>
                    <th className="min-w-[4.5rem] px-2 py-2.5 text-center font-medium" title="Male / Female (M or F in cell)">
                      Gender
                    </th>
                    <th className="min-w-[3.25rem] px-2 py-2.5 text-center font-medium" title="Age in group format">Age</th>
                    <th className="min-w-[6.5rem] px-2 py-2.5 text-left font-medium" title="First program visit">1st visit</th>
                    <th className="min-w-[2.75rem] px-2 py-2.5 text-center font-medium" title="Weight (kg)">W</th>
                    <th
                      className="min-w-[2.75rem] px-2 py-2.5 text-center font-medium"
                      title={group.minMonths === 0 ? "Length (cm)" : "Height (cm)"}
                    >
                      {heightColShort}
                    </th>
                    <th className="min-w-[2.75rem] px-2 py-2.5 text-center font-medium">WHZ</th>
                    <th className="min-w-[2.75rem] px-2 py-2.5 text-center font-medium" title="Display stub">
                      HAZ
                    </th>
                    <th className="min-w-[7.75rem] px-2 py-2.5 text-left font-medium">HAZ Result</th>
                    <th className="min-w-[3rem] px-2 py-2.5 text-center font-medium">MUAC</th>
                    <th className="min-w-[3.25rem] px-2 py-2.5 text-center font-medium">Edema</th>
                    <th className="min-w-[5.5rem] px-2 py-2.5 text-left font-medium" title="Nutrition diagnosis">Diagnosis</th>
                    <th
                      className="min-w-[4.5rem] px-2 py-2.5 text-center font-medium"
                      title="Latest weekly recovery disposition abbreviation"
                    >
                      Follow-up
                    </th>
                    <th
                      className="min-w-[6rem] px-2 py-2.5 text-center font-medium"
                      title="Weight Gain Rate interpretation (Good / Moderate / Poor)"
                    >
                      Recovery Pace
                    </th>
                    <th className="min-w-[8.5rem] px-2 py-2.5 text-left font-medium">Type</th>
                    <th className="min-w-[5.5rem] px-2 py-2.5 text-center font-medium" title="Count of selected program symptoms — click cell to edit">
                      Symptoms
                    </th>
                    <th
                      className="min-w-[4rem] px-2 py-2.5 text-center font-medium"
                      title="Sum of RUTF (sachets/day) for each week that has a value — empty weeks are not counted"
                    >
                      RUTF
                    </th>
                    <th className="min-w-[2.75rem] px-2 py-2.5 text-center font-medium" title="Score %">%</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => {
                    if (row.kind === "month") {
                      return (
                        <tr key={`month-${row.key}`}>
                          <td colSpan={19} className="px-2 py-2 bg-muted/25">
                            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <span className="h-px flex-1 bg-border/60" />
                              <span>{row.label}</span>
                              <span className="h-px flex-1 bg-border/60" />
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    const p = row.patient;
                    const derived = getPatientDerivedAnthropometry(p);
                    const isEdema = patientHasClinicalEdema(p);
                    const edemaLabel = formatEdemaForTable(p);
                    const perc = calcPercentageForPatient(p);
                    const whzStub = stubWeightForHeightZ({ ...p, weight: derived.weight, height: derived.height });
                    const wazStub = stubWeightForAgeZ({ ...p, height: derived.height });
                    const wazBand = classifyWazAsStuntingBand(wazStub);
                    const typeBand = classifyNutritionTypeBand({
                      edema: isEdema,
                      whz: whzStub,
                      muac: isInfantUnder6Months(p) ? null : derived.muac,
                    });
                    return (
                      <tr
                        key={p.id}
                        onClick={() => {
                          setDetailPatient(p);
                          setDetailIsNew(false);
                        }}
                        className={`group/row cursor-pointer border-b border-border/60 transition-colors duration-150 ${isEdema ? "bg-red-100/80 dark:bg-red-950/30" : ""} ${p.isDeceased ? "opacity-60" : ""} hover:[&>td]:bg-primary/[0.07] dark:hover:[&>td]:bg-primary/[0.14] hover:[&>td:first-child]:shadow-[inset_2px_0_0_0_rgba(59,130,246,0.65)] hover:[&>td:last-child]:shadow-[inset_-2px_0_0_0_rgba(59,130,246,0.45)]`}
                      >
                        <td className="min-w-[2.75rem] px-2 py-2.5 text-center tabular-nums font-mono text-muted-foreground whitespace-nowrap">{p.id}</td>
                        <td className="min-w-[10rem] max-w-[16rem] px-2 py-2.5 align-top font-medium text-foreground">
                          <div className="flex min-w-0 items-center gap-1.5">
                            {isEdema && !p.isDeceased && <AlertCircle size={14} className="shrink-0 text-red-500" />}
                            <span className="min-w-0 truncate" title={p.name}>{p.name}</span>
                          </div>
                        </td>
                        <td className="min-w-[2.5rem] px-2 py-2.5 text-center whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${p.gender === "M" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" : "bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400"}`}>
                            {p.gender}
                          </span>
                        </td>
                        <td className="min-w-[3.25rem] px-2 py-2.5 text-center text-xs font-medium tabular-nums whitespace-nowrap">{formatAge(p.ageMonths, group.ageFormat)}</td>
                        <td className="min-w-[6.5rem] max-w-[7rem] px-2 py-2.5 whitespace-nowrap text-xs text-muted-foreground" title={p.firstVisitDate ?? ""}>
                          {p.firstVisitDate || "—"}
                        </td>
                        <td className="min-w-[2.75rem] px-2 py-2.5 text-center tabular-nums whitespace-nowrap">{derived.weight}</td>
                        <td className="min-w-[2.75rem] px-2 py-2.5 text-center tabular-nums whitespace-nowrap" title={heightMeasureShortLabel(p.ageMonths) === "L" ? "Length (cm)" : "Height (cm)"}>
                          {derived.height}
                        </td>
                        <td className="min-w-[2.75rem] px-2 py-2.5 text-center tabular-nums whitespace-nowrap">
                          {whzStub == null ? "—" : whzStub}
                        </td>
                        <td className="min-w-[2.75rem] px-2 py-2.5 text-center tabular-nums text-muted-foreground whitespace-nowrap">
                          {wazStub == null ? "—" : wazStub}
                        </td>
                        <td className="min-w-[7.75rem] px-2 py-2.5 text-left whitespace-nowrap">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              wazBand.startsWith("Severe")
                                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                : wazBand.startsWith("Moderate")
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                            }`}
                          >
                            {wazBand}
                          </span>
                        </td>
                        <td
                          className="min-w-[3rem] px-2 py-2.5 text-center tabular-nums font-semibold whitespace-nowrap"
                          title={isInfantUnder6Months(p) ? "Under 6 months — refer to hospital." : ""}
                        >
                          {isInfantUnder6Months(p) ? "—" : derived.muac}
                        </td>
                        <td className="min-w-[3.25rem] px-2 py-2.5 text-center whitespace-nowrap">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${isEdema ? "text-red-700 bg-red-200 dark:text-red-400 dark:bg-red-950/60 font-bold" : "text-muted-foreground"}`}>
                            {edemaLabel}
                          </span>
                        </td>
                        <td className="min-w-[5.5rem] max-w-[8rem] px-2 py-2.5 align-top">
                          <span className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getDiagnosisColor(derived.diagnosis)}`} title={derived.diagnosis}>{derived.diagnosis}</span>
                        </td>
                        <td className="min-w-[4.5rem] px-2 py-2.5 text-center whitespace-nowrap">
                          {(() => {
                            const latestOutcome = getLatestFollowUpOutcome(p);
                            const shortOutcome = formatFollowUpOutcomeShort(latestOutcome);
                            const fullOutcome = formatFollowUpOutcomeFull(latestOutcome);
                            const outcomeColor =
                              shortOutcome === "C"
                                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                                : shortOutcome === "D"
                                  ? "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                                  : shortOutcome === "REF" || shortOutcome === "RR"
                                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                                    : shortOutcome === "DEF" || shortOutcome === "AP"
                                      ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                      : "bg-muted text-muted-foreground";
                            return (
                              <span
                                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${outcomeColor}`}
                                title={fullOutcome}
                              >
                                {shortOutcome}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="min-w-[6rem] px-2 py-2.5 text-center whitespace-nowrap">
                          {(() => {
                            const wg = getPatientWeightGainRate(p);
                            const paceColor =
                              wg.status === "Good"
                                ? "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                                : wg.status === "Moderate"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                                  : wg.status === "Poor"
                                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                    : "bg-muted text-muted-foreground";
                            const rateTitle =
                              wg.rate != null
                                ? `Weight Gain Rate: ${wg.rate} g/kg/day`
                                : "Weight Gain Rate not available yet";
                            return (
                              <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${paceColor}`} title={rateTitle}>
                                {wg.status}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="min-w-[8.5rem] px-2 py-2.5 align-top">
                          <span
                            className={`inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              typeBand === "Marasmic-Kwashiorkor"
                                ? "bg-red-200 text-red-900 border-red-300 dark:bg-red-950/70 dark:text-red-300 dark:border-red-900"
                                : typeBand === "Kwashiorkor"
                                  ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900"
                                  : typeBand === "Marasmus"
                                    ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-900"
                                    : "bg-muted text-muted-foreground border-border"
                            }`}
                            title={typeBand}
                          >
                            {typeBand}
                          </span>
                        </td>
                        <td className="min-w-[2.5rem] px-2 py-2.5 text-center text-muted-foreground whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSymptomsPatient(p);
                            }}
                            className="text-primary underline text-xs hover:opacity-70"
                          >
                            {p.symptoms.length}
                          </button>
                        </td>
                        <td className="min-w-[3.25rem] px-2 py-2.5 text-center tabular-nums font-semibold whitespace-nowrap">{displayTotalRutf(p)}</td>
                        <td className="min-w-[2.75rem] px-2 py-2.5 text-center whitespace-nowrap">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${getPercentageColor(derived.diagnosis)}`}>{perc}%</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={19} className="px-6 py-16 text-center text-muted-foreground text-sm">
                        {groupPatients.length === 0
                          ? `No patients enrolled in ${group.label} yet. Use Add Patient to register the first case.`
                          : "No patients match the current filters."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics Tab ── */}
      {activeTab === "analytics" && (
        <div className="flex-1 min-h-0 overflow-auto">
          {groupPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="text-4xl">{group.emoji}</div>
              <div className="text-muted-foreground text-sm">No data to analyze yet for this age group.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-4">
              {/* Cases by Governorate */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm lg:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-4">Cases by Governorate</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={govData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="SAM" stackId="a" fill="#ef4444" />
                    <Bar dataKey="MAM" stackId="a" fill="#f59e0b" />
                    <Bar dataKey="Normal" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="Recovered" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Diagnosis Distribution */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-4">Diagnosis Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={diagData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {diagData.map((entry) => (
                        <Cell key={entry.name} fill={DIAG_COLORS[entry.name] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Gender Distribution */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
                <h3 className="text-sm font-semibold text-foreground mb-4">Gender Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                      <Cell fill="#3b82f6" />
                      <Cell fill="#ec4899" />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Summary Table */}
              <div className="bg-card border border-border rounded-xl p-4 shadow-sm lg:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-4">Regional Summary</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs text-muted-foreground">
                        <th className="text-left py-2 font-medium">Governorate</th>
                        <th className="text-center py-2 font-medium">Total</th>
                        <th className="text-center py-2 font-medium">SAM</th>
                        <th className="text-center py-2 font-medium">MAM</th>
                        <th className="text-center py-2 font-medium">Normal</th>
                        <th className="text-center py-2 font-medium">Recovered</th>
                        <th className="text-center py-2 font-medium">Malnut. Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {govData.map((g) => {
                        const total = g.SAM + g.MAM + g.Normal + g.Recovered;
                        const rate = total > 0 ? Math.round(((g.SAM + g.MAM) / total) * 100) : 0;
                        return (
                          <tr key={g.name} className="border-b border-border/50 hover:bg-muted/30">
                            <td className="py-2 font-medium text-foreground">{g.name}</td>
                            <td className="py-2 text-center text-foreground">{total}</td>
                            <td className="py-2 text-center"><span className="text-red-600 dark:text-red-400 font-semibold">{g.SAM}</span></td>
                            <td className="py-2 text-center"><span className="text-orange-600 dark:text-orange-400 font-semibold">{g.MAM}</span></td>
                            <td className="py-2 text-center"><span className="text-blue-600 dark:text-blue-400">{g.Normal}</span></td>
                            <td className="py-2 text-center"><span className="text-green-600 dark:text-green-400">{g.Recovered}</span></td>
                            <td className="py-2 text-center">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-bold ${rate > 50 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : rate > 25 ? "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400" : "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400"}`}>
                                {rate}%
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {detailPatient && (
        <PatientDetailModal
          patient={detailPatient}
          isNew={detailIsNew}
          onSave={handlePatientChartSave}
          onClose={() => {
            setDetailPatient(null);
            setDetailIsNew(false);
          }}
        />
      )}
      {symptomsPatient && (
        <SymptomsModal
          patient={symptomsPatient}
          onSave={handleSymptomsUpdate}
          onClose={() => setSymptomsPatient(null)}
        />
      )}
    </div>
  );
}
