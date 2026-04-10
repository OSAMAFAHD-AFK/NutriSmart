import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import {
  loadPatients, savePatients, type Patient,
  getDiagnosisColor, getPercentageColor, calcPercentageForPatient,
} from "@/lib/data";
import { AGE_GROUPS, type AgeGroupId, formatAge, loadSponsors, saveSponsor, getDefaultSponsorName } from "@/lib/ageGroups";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Plus, Search, AlertCircle, Users,
  BarChart3, TableIcon, Building2, TrendingUp, Skull, Heart, ArrowLeft,
  Pencil, Check, X as XIcon,
} from "lucide-react";
import PatientModal from "@/components/PatientModal";
import PatientDetailModal from "@/components/PatientDetailModal";
import WeeklyUpdateModal from "@/components/WeeklyUpdateModal";
import SymptomsModal from "@/components/SymptomsModal";

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
  const [govFilter, setGovFilter] = useState("All");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
  const [weeklyPatient, setWeeklyPatient] = useState<Patient | null>(null);
  const [symptomsPatient, setSymptomsPatient] = useState<Patient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
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

  const governorates = useMemo(() => ["All", ...Array.from(new Set(groupPatients.map((p) => p.governorate)))], [groupPatients]);

  const filtered = useMemo(() => {
    return groupPatients.filter((p) => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.governorate.toLowerCase().includes(search.toLowerCase());
      const matchDiag = diagnosisFilter === "All" || p.diagnosis === diagnosisFilter;
      const matchGov = govFilter === "All" || p.governorate === govFilter;
      return matchSearch && matchDiag && matchGov;
    });
  }, [groupPatients, search, diagnosisFilter, govFilter]);

  const stats = useMemo(() => ({
    total: groupPatients.length,
    sam: groupPatients.filter((p) => p.diagnosis === "SAM").length,
    mam: groupPatients.filter((p) => p.diagnosis === "MAM").length,
    recovered: groupPatients.filter((p) => p.diagnosis === "Recovered").length,
    normal: groupPatients.filter((p) => p.diagnosis === "Normal").length,
    deaths: groupPatients.filter((p) => p.isDeceased).length,
    edema: groupPatients.filter((p) => p.edema && !p.isDeceased).length,
    male: groupPatients.filter((p) => p.gender === "M").length,
    female: groupPatients.filter((p) => p.gender === "F").length,
  }), [groupPatients]);

  const govData = useMemo(() => {
    const map: Record<string, { name: string; SAM: number; MAM: number; Normal: number; Recovered: number }> = {};
    groupPatients.forEach((p) => {
      if (!map[p.governorate]) map[p.governorate] = { name: p.governorate, SAM: 0, MAM: 0, Normal: 0, Recovered: 0 };
      if (p.diagnosis === "SAM") map[p.governorate].SAM++;
      else if (p.diagnosis === "MAM") map[p.governorate].MAM++;
      else if (p.diagnosis === "Normal") map[p.governorate].Normal++;
      else if (p.diagnosis === "Recovered") map[p.governorate].Recovered++;
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

  function handleSave(patient: Patient) {
    const exists = patients.find((p) => p.id === patient.id);
    const updated = exists
      ? patients.map((p) => (p.id === patient.id ? patient : p))
      : [...patients, patient];
    savePatients(updated);
    setPatients(updated);
    setShowAddModal(false);
    setSelectedPatient(null);
  }

  function handleWeeklyUpdate(updated: Patient) {
    const list = patients.map((p) => (p.id === updated.id ? updated : p));
    savePatients(list);
    setPatients(list);
    setWeeklyPatient(null);
  }

  function handleSymptomsUpdate(updated: Patient) {
    const list = patients.map((p) => (p.id === updated.id ? updated : p));
    savePatients(list);
    setPatients(list);
    setSymptomsPatient(null);
  }

  const totalRutf = (p: Patient) => {
    if (p.edema) return 0;
    return parseFloat(((p.week1.rutf ?? 0) + (p.week2.rutf ?? 0) + (p.week3.rutf ?? 0) + (p.week4.rutf ?? 0)).toFixed(1));
  };

  const malnutritionRate = stats.total > 0 ? Math.round(((stats.sam + stats.mam) / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 h-full">

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
                placeholder="Search by name, ID, or location..."
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
            <select
              value={govFilter}
              onChange={(e) => setGovFilter(e.target.value)}
              className="text-sm rounded-lg border border-input bg-card text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-sm shrink-0"
            >
              <Plus size={14} /> Add Patient
            </button>
          </div>

          <p className="text-xs text-muted-foreground shrink-0">
            {filtered.length} of {groupPatients.length} patients shown — click any row to view details
          </p>

          {/* Edema Alert */}
          {stats.edema > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 shrink-0">
              <AlertCircle size={14} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="text-xs font-medium text-red-700 dark:text-red-400">
                <span className="font-bold">{stats.edema} patient(s) with Edema</span> — refer to hospital immediately.
              </div>
            </div>
          )}

          {/* Table */}
          <div className="flex-1 min-h-0 bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-auto h-full">
              <table className="w-full text-sm" style={{ minWidth: 1400 }}>
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted/60">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" colSpan={6}>Basic Info</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l border-border" colSpan={6}>Measurements</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l border-border" colSpan={1}>Diagnosis</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-blue-300 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20" colSpan={5}>Week 1</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-purple-300 dark:border-purple-800 bg-purple-50/60 dark:bg-purple-950/20" colSpan={5}>Week 2</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-orange-300 dark:border-orange-800 bg-orange-50/60 dark:bg-orange-950/20" colSpan={5}>Week 3</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-green-300 dark:border-green-800 bg-green-50/60 dark:bg-green-950/20" colSpan={5}>Week 4</th>
                    <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-border" colSpan={2}>Summary</th>
                  </tr>
                  <tr className="border-b border-border bg-card text-xs text-muted-foreground">
                    <th className="px-3 py-2 text-left font-medium">ID</th>
                    <th className="px-3 py-2 text-left font-medium">Name</th>
                    <th className="px-3 py-2 text-center font-medium">Gender</th>
                    <th className="px-3 py-2 text-center font-medium">Age</th>
                    <th className="px-3 py-2 text-left font-medium">Governorate</th>
                    <th className="px-3 py-2 text-left font-medium">District</th>
                    <th className="px-3 py-2 text-center font-medium border-l border-border">W (kg)</th>
                    <th className="px-3 py-2 text-center font-medium">H (cm)</th>
                    <th className="px-3 py-2 text-center font-medium">WFH</th>
                    <th className="px-3 py-2 text-center font-medium">MUAC</th>
                    <th className="px-3 py-2 text-center font-medium">Edema</th>
                    <th className="px-3 py-2 text-center font-medium">Symptoms</th>
                    <th className="px-3 py-2 text-left font-medium border-l border-border">Diagnosis</th>
                    <th className="px-2 py-2 text-center font-medium border-l-2 border-blue-300 dark:border-blue-800">W</th>
                    <th className="px-2 py-2 text-center font-medium">MUAC</th>
                    <th className="px-2 py-2 text-center font-medium">Edema</th>
                    <th className="px-2 py-2 text-center font-medium">RUTF</th>
                    <th className="px-2 py-2 text-center font-medium">Supp</th>
                    <th className="px-2 py-2 text-center font-medium border-l-2 border-purple-300 dark:border-purple-800">W</th>
                    <th className="px-2 py-2 text-center font-medium">MUAC</th>
                    <th className="px-2 py-2 text-center font-medium">Edema</th>
                    <th className="px-2 py-2 text-center font-medium">RUTF</th>
                    <th className="px-2 py-2 text-center font-medium">Supp</th>
                    <th className="px-2 py-2 text-center font-medium border-l-2 border-orange-300 dark:border-orange-800">W</th>
                    <th className="px-2 py-2 text-center font-medium">MUAC</th>
                    <th className="px-2 py-2 text-center font-medium">Edema</th>
                    <th className="px-2 py-2 text-center font-medium">RUTF</th>
                    <th className="px-2 py-2 text-center font-medium">Supp</th>
                    <th className="px-2 py-2 text-center font-medium border-l-2 border-green-300 dark:border-green-800">W</th>
                    <th className="px-2 py-2 text-center font-medium">MUAC</th>
                    <th className="px-2 py-2 text-center font-medium">Edema</th>
                    <th className="px-2 py-2 text-center font-medium">RUTF</th>
                    <th className="px-2 py-2 text-center font-medium">Supp</th>
                    <th className="px-2 py-2 text-center font-medium border-l-2 border-border">Total RUTF</th>
                    <th className="px-2 py-2 text-center font-medium">%</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p) => {
                    const isEdema = p.edema;
                    const perc = calcPercentageForPatient(p);
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setDetailPatient(p)}
                        className={`border-b border-border/60 hover:bg-muted/40 transition-colors cursor-pointer ${isEdema ? "bg-red-100/80 dark:bg-red-950/30" : ""} ${p.isDeceased ? "opacity-60" : ""}`}
                      >
                        <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{p.id}</td>
                        <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isEdema && !p.isDeceased && <AlertCircle size={12} className="text-red-500 shrink-0" />}
                            {p.name}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${p.gender === "M" ? "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" : "bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400"}`}>
                            {p.gender}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs font-medium">{formatAge(p.ageMonths, group.ageFormat)}</td>
                        <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{p.governorate}</td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{p.district}</td>
                        <td className="px-3 py-2.5 text-center text-xs border-l border-border">{p.weight}</td>
                        <td className="px-3 py-2.5 text-center text-xs">{p.height}</td>
                        <td className="px-3 py-2.5 text-center text-xs">{p.wfh}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-semibold">{p.muac}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${p.edema ? "text-red-700 bg-red-200 dark:text-red-400 dark:bg-red-950/60 font-bold" : "text-muted-foreground"}`}>
                            {p.edema ? "YES" : "No"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
                          {p.symptoms.length > 0 ? (
                            <button onClick={(e) => { e.stopPropagation(); setSymptomsPatient(p); }} className="text-primary underline text-xs hover:opacity-70">{p.symptoms.length}</button>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-2.5 border-l border-border">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getDiagnosisColor(p.diagnosis)}`}>{p.diagnosis}</span>
                        </td>
                        {isEdema ? (
                          <td className="px-2 py-2.5 text-center text-xs text-red-500 font-medium border-l-2 border-blue-300 dark:border-blue-800 bg-blue-50/20" colSpan={5}>Refer to hospital</td>
                        ) : (
                          <>
                            <td className="px-2 py-2.5 text-center text-xs border-l-2 border-blue-300 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/5">{p.week1.weight ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-blue-50/30 dark:bg-blue-950/5">{p.week1.muac ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-blue-50/30 dark:bg-blue-950/5">{p.week1.edema ? "Y" : "N"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-blue-50/30 dark:bg-blue-950/5">{p.week1.rutf ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-blue-50/30 dark:bg-blue-950/5">{p.week1.supplements ? "✓" : "—"}</td>
                          </>
                        )}
                        {isEdema ? <td className="border-l-2 border-purple-300 dark:border-purple-800" colSpan={5} /> : (
                          <>
                            <td className="px-2 py-2.5 text-center text-xs border-l-2 border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/5">{p.week2.weight ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-purple-50/30 dark:bg-purple-950/5">{p.week2.muac ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-purple-50/30 dark:bg-purple-950/5">{p.week2.edema ? "Y" : "N"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-purple-50/30 dark:bg-purple-950/5">{p.week2.rutf ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-purple-50/30 dark:bg-purple-950/5">{p.week2.supplements ? "✓" : "—"}</td>
                          </>
                        )}
                        {isEdema ? <td className="border-l-2 border-orange-300 dark:border-orange-800" colSpan={5} /> : (
                          <>
                            <td className="px-2 py-2.5 text-center text-xs border-l-2 border-orange-300 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-950/5">{p.week3.weight ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-orange-50/30 dark:bg-orange-950/5">{p.week3.muac ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-orange-50/30 dark:bg-orange-950/5">{p.week3.edema ? "Y" : "N"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-orange-50/30 dark:bg-orange-950/5">{p.week3.rutf ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-orange-50/30 dark:bg-orange-950/5">{p.week3.supplements ? "✓" : "—"}</td>
                          </>
                        )}
                        {isEdema ? <td className="border-l-2 border-green-300 dark:border-green-800" colSpan={5} /> : (
                          <>
                            <td className="px-2 py-2.5 text-center text-xs border-l-2 border-green-300 dark:border-green-800 bg-green-50/30 dark:bg-green-950/5">{p.week4.weight ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-green-50/30 dark:bg-green-950/5">{p.week4.muac ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-green-50/30 dark:bg-green-950/5">{p.week4.edema ? "Y" : "N"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-green-50/30 dark:bg-green-950/5">{p.week4.rutf ?? "—"}</td>
                            <td className="px-2 py-2.5 text-center text-xs bg-green-50/30 dark:bg-green-950/5">{p.week4.supplements ? "✓" : "—"}</td>
                          </>
                        )}
                        <td className="px-2 py-2.5 text-center text-xs font-semibold border-l-2 border-border">{isEdema ? "—" : totalRutf(p)}</td>
                        <td className="px-2 py-2.5 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${getPercentageColor(p.diagnosis)}`}>{perc}%</span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={35} className="px-6 py-16 text-center text-muted-foreground text-sm">
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
      {(showAddModal || selectedPatient) && (
        <PatientModal
          patient={selectedPatient}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setSelectedPatient(null); }}
        />
      )}
      {detailPatient && (
        <PatientDetailModal
          patient={detailPatient}
          onEdit={(p) => { setDetailPatient(null); setSelectedPatient(p); }}
          onEditWeeks={(p) => { setDetailPatient(null); setWeeklyPatient(p); }}
          onClose={() => setDetailPatient(null)}
        />
      )}
      {weeklyPatient && (
        <WeeklyUpdateModal
          patient={weeklyPatient}
          onSave={handleWeeklyUpdate}
          onClose={() => setWeeklyPatient(null)}
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
