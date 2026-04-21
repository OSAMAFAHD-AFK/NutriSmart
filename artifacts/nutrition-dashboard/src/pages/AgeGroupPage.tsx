import { useState, useEffect, useMemo } from "react";
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
} from "@/lib/data";
import {
  heightMeasureShortLabel,
  isInfantUnder6Months,
  stubWeightForHeightZ,
  stubWeightForAgeZ,
  classifyWazAsStuntingBand,
  classifyNutritionTypeBand,
} from "@/lib/patientTableAnthro";
import { AGE_GROUPS, type AgeGroupId, formatAge, loadSponsors, saveSponsor, getDefaultSponsorName } from "@/lib/ageGroups";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Plus, Search, AlertCircle, Users,
  BarChart3, TableIcon, Building2, TrendingUp, Skull, Heart, ArrowLeft,
  Pencil, Check, X as XIcon, FileSpreadsheet, FileText,
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
  const group = AGE_GROUPS[groupId];

  const [patients, setPatients] = useState<Patient[]>([]);
  const [activeTab, setActiveTab] = useState<"patients" | "analytics">("patients");
  const [search, setSearch] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState("All");
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
  const [detailIsNew, setDetailIsNew] = useState(false);
  const [symptomsPatient, setSymptomsPatient] = useState<Patient | null>(null);
  const [sponsorName, setSponsorName] = useState("");
  const [isEditingSponsor, setIsEditingSponsor] = useState(false);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    setPatients(loadPatients());
  }, []);

  useEffect(() => {
    if (groupId) {
      const sponsors = loadSponsors();
      setSponsorName(sponsors[groupId] ?? getDefaultSponsorName(groupId));
    }
  }, [groupId]);

  function handleSponsorEdit() {
    setEditValue(sponsorName);
    setIsEditingSponsor(true);
  }

  function handleSponsorSave() {
    const trimmed = editValue.trim() || getDefaultSponsorName(groupId);
    setSponsorName(trimmed);
    saveSponsor(groupId, trimmed);
    setIsEditingSponsor(false);
  }

  function handleSponsorCancel() {
    setIsEditingSponsor(false);
  }

  if (!group) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="text-4xl">❓</div>
        <div className="text-lg font-semibold text-foreground">Age group not found</div>
        <button onClick={() => navigate("/")} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          <ArrowLeft size={14} /> Back to Overview
        </button>
      </div>
    );
  }

  const groupPatients = useMemo(
    () => patients.filter((p) => p.ageMonths >= group.minMonths && p.ageMonths < group.maxMonths),
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
    const list = patients.map((p) => (p.id === updated.id ? updated : p));
    if (!savePatients(list)) {
      window.alert(STORAGE_SAVE_FAILED);
      return;
    }
    setPatients(list);
    setSymptomsPatient(null);
    setDetailPatient((cur) => (cur && cur.id === updated.id ? updated : cur));
  }

  function handlePatientChartSave(updated: Patient) {
    if (detailIsNew) {
      const next = [...patients, updated];
      if (!savePatients(next)) {
        window.alert(STORAGE_SAVE_FAILED);
        return;
      }
      setPatients(next);
      setDetailPatient(null);
      setDetailIsNew(false);
    } else {
      const list = patients.map((p) => (p.id === updated.id ? updated : p));
      if (!savePatients(list)) {
        window.alert(STORAGE_SAVE_FAILED);
        return;
      }
      setPatients(list);
      setDetailPatient(updated);
    }
  }

  function displayTotalRutf(p: Patient): string {
    if (patientHasClinicalEdema(p) || isInfantUnder6Months(p)) return "—";
    const n = totalProgramRutfSachets(p);
    return n > 0 ? String(n) : "0";
  }

  const heightColShort = group.id === "0-2" ? "L" : "H";

  const malnutritionRate = stats.total > 0 ? Math.round(((stats.sam + stats.mam) / stats.total) * 100) : 0;
  const exportRows = useMemo(
    () =>
      filtered.map((p) => {
        const d = getPatientDerivedAnthropometry(p);
        const whz = stubWeightForHeightZ({ ...p, weight: d.weight, height: d.height });
        const hasEdema = patientHasClinicalEdema(p);
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
        HAZ: stubWeightForAgeZ({ ...p, weight: d.weight }),
        HAZ_result: classifyWazAsStuntingBand(stubWeightForAgeZ({ ...p, weight: d.weight })),
        MUAC: isInfantUnder6Months(p) ? "" : d.muac,
        Edema: formatEdemaForTable(p),
        Diagnosis: d.diagnosis,
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
    <div className="flex h-full min-h-0 flex-col gap-4">

      {/* ── Page Header ── */}
      <div className="shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              title="Back to Overview"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <span className="text-2xl">{group.emoji}</span>
                {group.label}
                <span className="text-sm font-normal text-muted-foreground ml-1">— {group.description}</span>
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{stats.total} patients in this age group</p>
            </div>
          </div>

          {/* Donor/Sponsor Badge — editable */}
          <div className={`flex items-start gap-2.5 px-4 py-2.5 rounded-xl border ${group.bgClass} ${group.borderClass} shrink-0 max-w-xs`}>
            <Building2 size={14} className={`${group.textClass} shrink-0 mt-1`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground mb-0.5">Supported by</div>
              {isEditingSponsor ? (
                <div className="flex flex-col gap-1.5">
                  <input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSponsorSave(); if (e.key === "Escape") handleSponsorCancel(); }}
                    autoFocus
                    className="text-sm w-full rounded-md border border-border bg-card text-foreground px-2 py-1 focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Donor / organization name"
                  />
                  <div className="flex gap-1">
                    <button onClick={handleSponsorSave} className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-primary text-primary-foreground font-medium hover:opacity-90">
                      <Check size={11} /> Save
                    </button>
                    <button onClick={handleSponsorCancel} className="flex items-center gap-1 px-2 py-1 rounded text-xs border border-border text-muted-foreground hover:bg-muted">
                      <XIcon size={11} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1.5">
                  <div className={`text-sm font-bold ${group.textClass} break-words min-w-0`}>{sponsorName}</div>
                  <button
                    onClick={handleSponsorEdit}
                    className="shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors mt-0.5"
                    title="Edit donor name"
                  >
                    <Pencil size={11} className="text-muted-foreground" />
                  </button>
                </div>
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
        <div className="flex flex-col gap-3 flex-1 min-h-0">
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
                setDetailPatient(createDraftPatient(nextSequentialPatientId(patients)));
                setDetailIsNew(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-sm shrink-0"
            >
              <Plus size={14} /> Add Patient
            </button>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground shrink-0">
            <span>
              {filtered.length} of {groupPatients.length} patients shown — click any row to view details
            </span>
            {stats.edema > 0 && (
              <span className="inline-flex items-center gap-1.5 text-red-700 dark:text-red-400">
                <AlertCircle size={12} className="shrink-0" />
                <span>
                  <span className="font-semibold">{stats.edema} patient(s) with Edema</span> — refer to hospital immediately.
                </span>
              </span>
            )}
          </div>

          {/* Table */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-end gap-2 border-b border-border px-3 py-2 shrink-0 bg-card">
            <button
              type="button"
              onClick={() => exportRowsToExcel(`${group.id}-patients-export`, exportRows)}
              disabled={exportRows.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileSpreadsheet size={13} />
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
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText size={13} />
              Export PDF
            </button>
          </div>
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
                      title={group.id === "0-2" ? "Length (cm)" : "Height (cm)"}
                    >
                      {heightColShort}
                    </th>
                    <th className="min-w-[2.75rem] px-2 py-2.5 text-center font-medium">WHZ</th>
                    <th className="min-w-[2.75rem] px-2 py-2.5 text-center font-medium" title="Display stub">
                      HAZ
                    </th>
                    <th className="min-w-[7.75rem] px-2 py-2.5 text-left font-medium">HAZ result</th>
                    <th className="min-w-[3rem] px-2 py-2.5 text-center font-medium">MUAC</th>
                    <th className="min-w-[3.25rem] px-2 py-2.5 text-center font-medium">Edema</th>
                    <th className="min-w-[5.5rem] px-2 py-2.5 text-left font-medium" title="Nutrition diagnosis">Diagnosis</th>
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
                  {filtered.map((p) => {
                    const derived = getPatientDerivedAnthropometry(p);
                    const isEdema = patientHasClinicalEdema(p);
                    const edemaLabel = formatEdemaForTable(p);
                    const perc = calcPercentageForPatient(p);
                    const whzStub = stubWeightForHeightZ({ ...p, weight: derived.weight, height: derived.height });
                    const wazStub = stubWeightForAgeZ({ ...p, weight: derived.weight });
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
                        className={`border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer ${isEdema ? "bg-red-100/80 dark:bg-red-950/30" : ""} ${p.isDeceased ? "opacity-60" : ""}`}
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
                              wazBand.startsWith("🔴")
                                ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                                : wazBand.startsWith("🟠")
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
                      <td colSpan={17} className="px-6 py-16 text-center text-muted-foreground text-sm">
                        {groupPatients.length === 0
                          ? `No patients in the ${group.label} age range yet. Add patients with age between ${group.minMonths}–${group.maxMonths === 216 ? "216" : group.maxMonths} months.`
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
