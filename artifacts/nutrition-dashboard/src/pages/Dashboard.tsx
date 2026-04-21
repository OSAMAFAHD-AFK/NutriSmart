import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import {
  loadPatients,
  type Patient,
  type FollowUpInterval,
  GOVERNORATES,
  patientHasClinicalEdema,
  getPatientDerivedAnthropometry,
} from "@/lib/data";
import {
  loadPrograms,
  savePrograms,
  createProgramConfig,
  PROGRAM_AGE_OPTIONS,
  type ProgramAgeBand,
  type AgeGroupConfig,
  formatAgeAuto,
  getProgramAgeBandLabelEnShort,
  getProgramsSortedForDisplay,
  formatProgramCreatedAtForUi,
} from "@/lib/ageGroups";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import {
  Users, AlertTriangle, TrendingUp, Heart, Skull, RefreshCw,
  Wifi, WifiOff, ArrowRight, Building2, Activity, MapPin, ChevronDown, Plus, X,
} from "lucide-react";

const WEEK_LABELS = Array.from({ length: 12 }, (_, index) => `Week ${index + 1}`);
const PIE_COLORS = ["#3b82f6", "#ec4899"];

function StatCard({ label, value, icon, color, sub }: {
  label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function AgeGroupCard({ group, patients, onClick }: {
  group: AgeGroupConfig; patients: Patient[]; onClick: () => void;
}) {
  const gPatients = patients.filter((p) => {
    if (p.programId) return p.programId === group.id;
    if (typeof group.minMonths === "number" && typeof group.maxMonths === "number") {
      return p.ageMonths >= group.minMonths && p.ageMonths < group.maxMonths;
    }
    return false;
  });
  const sam = gPatients.filter((p) => p.diagnosis === "SAM").length;
  const mam = gPatients.filter((p) => p.diagnosis === "MAM").length;
  const recovered = gPatients.filter((p) => p.diagnosis === "Recovered").length;
  const total = gPatients.length;
  const malnutRate = total > 0 ? Math.round(((sam + mam) / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`group relative flex w-full flex-col overflow-hidden rounded-xl border-2 text-left ${group.borderClass} ${group.bgClass} p-4 shadow-sm transition-all duration-200 hover:-translate-y-px hover:shadow-md`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-2xl leading-none ${group.textClass}`}>{group.emoji}</div>
          <h3 className={`mt-1.5 truncate text-base font-bold leading-tight ${group.textClass}`}>{group.label}</h3>
          <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">{group.description}</p>
          <p className="mt-1 text-[10px] leading-snug text-muted-foreground/90" title="Program creation date">
            <span className="font-medium text-foreground/75">Created:</span>{" "}
            {formatProgramCreatedAtForUi(group.createdAt)}
          </p>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${group.badgeBg} shadow-sm`}>
          <span className="text-sm font-bold text-white">{total}</span>
        </div>
      </div>

      {/* One full-width band (same width as stats row) — location + divider + age band */}
      <div className="mb-3 flex min-h-[2.75rem] w-full items-stretch overflow-hidden rounded-md bg-white/55 dark:bg-black/20">
        <div className="flex min-w-0 flex-1 items-start gap-1.5 px-2.5 py-2 text-left text-muted-foreground">
          <MapPin size={11} className="mt-0.5 shrink-0 text-foreground/65" />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[11px] font-semibold text-foreground">{group.governorate || "—"}</div>
            <div className="truncate text-[10px] text-muted-foreground">{group.district || "—"}</div>
          </div>
        </div>
        <div className="w-px shrink-0 self-stretch bg-border/50" aria-hidden />
        <div className="flex min-w-[4.5rem] max-w-[6rem] shrink-0 basis-[22%] flex-col items-center justify-center px-1.5 py-2 text-center sm:basis-[18%]">
          <span className="text-[9px] font-bold leading-tight tracking-tight text-foreground">
            {getProgramAgeBandLabelEnShort(group)}
          </span>
        </div>
      </div>

      <div className="mb-3 grid w-full grid-cols-3 gap-1.5">
        <div className="rounded-md bg-white/55 py-1.5 text-center dark:bg-black/20">
          <div className="text-sm font-bold text-red-600 dark:text-red-400">{sam}</div>
          <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">SAM</div>
        </div>
        <div className="rounded-md bg-white/55 py-1.5 text-center dark:bg-black/20">
          <div className="text-sm font-bold text-orange-600 dark:text-orange-400">{mam}</div>
          <div className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">MAM</div>
        </div>
        <div className="rounded-md bg-white/55 py-1.5 text-center dark:bg-black/20">
          <div className="text-sm font-bold text-green-600 dark:text-green-400">{recovered}</div>
          <div className="text-[8px] font-medium leading-tight text-muted-foreground">Recovered</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-0.5 flex justify-between text-[10px] text-muted-foreground">
          <span>Malnutrition</span>
          <span className={`font-semibold ${malnutRate > 50 ? "text-red-600" : malnutRate > 25 ? "text-orange-600" : "text-green-600"}`}>{malnutRate}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/50 dark:bg-black/25">
          <div
            className={`h-full rounded-full ${malnutRate > 50 ? "bg-red-500" : malnutRate > 25 ? "bg-orange-500" : "bg-green-500"}`}
            style={{ width: `${malnutRate}%` }}
          />
        </div>
      </div>

      <div className="mb-2 flex min-w-0 items-center gap-1.5">
        <Building2 size={11} className="shrink-0 text-muted-foreground" />
        <span className="truncate text-[10px] font-medium text-muted-foreground">{group.sponsor}</span>
      </div>

      <div className={`flex items-center justify-between border-t pt-2.5 ${group.borderClass}`}>
        <span className={`text-[11px] font-semibold ${group.textClass}`}>Open program</span>
        <div className={`flex h-7 w-7 items-center justify-center rounded-md ${group.badgeBg} transition-transform group-hover:translate-x-0.5`}>
          <ArrowRight size={12} className="text-white" />
        </div>
      </div>
    </button>
  );
}

function CriticalCasesFrame({ patients }: { patients: Patient[] }) {
  const edemaPatients = useMemo(
    () => patients.filter((p) => patientHasClinicalEdema(p) && !p.isDeceased),
    [patients],
  );
  const [govFilter, setGovFilter] = useState("All");

  const govs = useMemo(() => {
    const unique = Array.from(new Set(edemaPatients.map((p) => p.governorate))).sort();
    return ["All", ...unique];
  }, [edemaPatients]);

  const filtered = useMemo(
    () => govFilter === "All" ? edemaPatients : edemaPatients.filter((p) => p.governorate === govFilter),
    [edemaPatients, govFilter]
  );

  if (edemaPatients.length === 0) return null;

  function getAgeGroupLabel(ageMonths: number): { emoji: string; label: string } {
    if (ageMonths < 24) return { emoji: "👶", label: "0–2 Yrs (UNICEF)" };
    if (ageMonths < 60) return { emoji: "🧒", label: "2–5 Yrs (WHO)" };
    return { emoji: "👦", label: "5–18 Yrs (WFP)" };
  }

  return (
    <div className="rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-5 shrink-0">
      {/* Frame Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-sm">
            <AlertTriangle size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-800 dark:text-red-300">Critical Cases — Edema Patients</h3>
            <p className="text-xs text-red-600 dark:text-red-400">
              {filtered.length} patient{filtered.length !== 1 ? "s" : ""} require immediate hospital referral
            </p>
          </div>
          <span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
            {edemaPatients.length}
          </span>
        </div>

        {/* City Filter */}
        <div className="relative">
          <select
            value={govFilter}
            onChange={(e) => setGovFilter(e.target.value)}
            className="appearance-none text-sm rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-red-950/40 text-foreground px-3 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-red-400 font-medium cursor-pointer"
          >
            {govs.map((g) => <option key={g} value={g}>{g === "All" ? "All Cities" : g}</option>)}
          </select>
          <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        </div>
      </div>

      {/* Patient Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center text-red-500 text-sm py-6">No critical cases in {govFilter}.</div>
      ) : (
        <div className="max-h-[22rem] overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => {
            const ageLabel = getAgeGroupLabel(p.ageMonths);
            const displayAge = formatAgeAuto(p.ageMonths);
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-card border border-red-200 dark:border-red-900 rounded-xl p-3.5 shadow-sm flex flex-col gap-2"
              >
                {/* Name + ID */}
                <div>
                  <div className="text-sm font-bold text-foreground leading-tight">{p.name}</div>
                  <div className="text-xs font-mono text-muted-foreground mt-0.5">{p.id}</div>
                </div>

                {/* Location + Vitals */}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <MapPin size={10} className="shrink-0 text-red-500" />
                    <span className="font-medium text-foreground">{p.governorate}</span>
                    <span>—</span>
                    <span>{p.district}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>MUAC: <span className="font-semibold text-red-600 dark:text-red-400">{getPatientDerivedAnthropometry(p).muac} cm</span></span>
                    <span>Age: <span className="font-semibold text-foreground">{displayAge}</span></span>
                  </div>
                </div>

                {/* Age Group Label + REFER NOW */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground">
                    {ageLabel.emoji} {ageLabel.label}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white text-xs font-bold tracking-wide shadow-sm animate-pulse">
                    🚨 REFER NOW
                  </span>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [programs, setPrograms] = useState<AgeGroupConfig[]>([]);
  const [lastSync, setLastSync] = useState("Never");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [programForm, setProgramForm] = useState({
    label: "",
    sponsor: "",
    ageBand: "2-5" as ProgramAgeBand,
    governorate: Object.keys(GOVERNORATES)[0] ?? "",
    district: (GOVERNORATES[Object.keys(GOVERNORATES)[0] ?? ""] ?? [])[0] ?? "",
    followUpInterval: "weekly" as FollowUpInterval,
  });
  const [location, navigate] = useLocation();

  useEffect(() => {
    setPatients(loadPatients());
    setPrograms(loadPrograms());
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, [location]);

  const programsSorted = useMemo(
    () => getProgramsSortedForDisplay(programs, patients),
    [programs, patients],
  );

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync(new Date().toLocaleTimeString());
      setPrograms(loadPrograms());
    }, 1800);
  }

  function createProgram() {
    const label = programForm.label.trim();
    const sponsor = programForm.sponsor.trim();
    const governorate = programForm.governorate.trim();
    const district = programForm.district.trim();
    if (!label || !sponsor || !governorate || !district) {
      window.alert("Please complete all project fields.");
      return;
    }
    const nextProgram = createProgramConfig(
      {
        label,
        sponsor,
        ageBand: programForm.ageBand,
        governorate,
        district,
        followUpInterval: programForm.followUpInterval,
      },
      programs.length,
    );
    const nextPrograms = [...programs, nextProgram];
    savePrograms(nextPrograms);
    setPrograms(nextPrograms);
    setShowCreateProgram(false);
    setProgramForm({
      label: "",
      sponsor: "",
      ageBand: "2-5",
      governorate: Object.keys(GOVERNORATES)[0] ?? "",
      district: (GOVERNORATES[Object.keys(GOVERNORATES)[0] ?? ""] ?? [])[0] ?? "",
      followUpInterval: "weekly",
    });
    navigate(`/group/${nextProgram.id}`);
  }

  const sam = patients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "SAM").length;
  const mam = patients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "MAM").length;
  const recovered = patients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "Recovered").length;
  const deaths = patients.filter((p) => p.isDeceased).length;
  const recoveryRate = patients.length > 0 ? ((recovered / patients.length) * 100).toFixed(1) : "0";

  const govData = useMemo(() => {
    const map: Record<string, { name: string; SAM: number; MAM: number; Recovered: number; Normal: number }> = {};
    patients.forEach((p) => {
      if (!map[p.governorate]) map[p.governorate] = { name: p.governorate, SAM: 0, MAM: 0, Recovered: 0, Normal: 0 };
      const d = getPatientDerivedAnthropometry(p).diagnosis;
      if (d === "SAM") map[p.governorate].SAM++;
      else if (d === "MAM") map[p.governorate].MAM++;
      else if (d === "Recovered") map[p.governorate].Recovered++;
      else map[p.governorate].Normal++;
    });
    return Object.values(map);
  }, [patients]);

  const genderData = useMemo(() => [
    { name: "Male", value: patients.filter((p) => p.gender === "M").length },
    { name: "Female", value: patients.filter((p) => p.gender === "F").length },
  ], [patients]);

  const weeklyData = useMemo(() => WEEK_LABELS.map((label, wi) => {
    const muacs = patients
      .filter((p) => !patientHasClinicalEdema(p) && p.treatmentWeeks[wi]?.muac)
      .map((p) => p.treatmentWeeks[wi].muac as number);
    const avg = muacs.length ? parseFloat((muacs.reduce((a, b) => a + b, 0) / muacs.length).toFixed(2)) : 0;
    return { label, avgMuac: avg };
  }), [patients]);
  const districtOptions = GOVERNORATES[programForm.governorate] ?? [];

  return (
    <div className="flex flex-col gap-5 h-full overflow-auto pb-4">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">NutriSmart — Real-time malnutrition tracking across all age groups</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium border ${isOnline ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800" : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"}`}>
            {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
            {isOnline ? "Online" : "Offline"}
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity shadow-sm disabled:opacity-60"
          >
            <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing…" : "Sync Data"}
          </button>
          {lastSync !== "Never" && <span className="text-xs text-muted-foreground">Last: {lastSync}</span>}
        </div>
      </div>

      {/* ── Global KPI Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0">
        <StatCard label="Total Patients" value={patients.length} icon={<Users size={18} className="text-blue-600 dark:text-blue-400" />} color="bg-blue-100 dark:bg-blue-950/40" sub="+10 this month" />
        <StatCard label="SAM Cases" value={sam} icon={<AlertTriangle size={18} className="text-red-600 dark:text-red-400" />} color="bg-red-100 dark:bg-red-950/40" />
        <StatCard label="MAM Cases" value={mam} icon={<TrendingUp size={18} className="text-orange-600 dark:text-orange-400" />} color="bg-orange-100 dark:bg-orange-950/40" />
        <StatCard label="Recovered" value={recovered} icon={<Heart size={18} className="text-green-600 dark:text-green-400" />} color="bg-green-100 dark:bg-green-950/40" />
        <StatCard label="Deaths" value={deaths} icon={<Skull size={18} className="text-gray-600 dark:text-gray-400" />} color="bg-gray-100 dark:bg-gray-800" />
        <StatCard label="Recovery Rate" value={`${recoveryRate}%`} icon={<Activity size={18} className="text-primary" />} color="bg-primary/10" />
      </div>

      {/* ── Program Entry Cards ── */}
      <div className="shrink-0">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-foreground">Programs & Projects</h2>
          </div>
          <button
            onClick={() => setShowCreateProgram(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:opacity-90"
          >
            <Plus size={14} />
            Add New Program / Project
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {programsSorted.map((group) => (
            <AgeGroupCard
              key={group.id}
              group={group}
              patients={patients}
              onClick={() => navigate(`/group/${group.id}`)}
            />
          ))}
        </div>
      </div>

      {/* ── Critical Cases Frame ── */}
      <CriticalCasesFrame patients={patients} />

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Cases by Governorate</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={govData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="SAM" stackId="a" fill="#ef4444" />
              <Bar dataKey="MAM" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Normal" stackId="a" fill="#3b82f6" />
              <Bar dataKey="Recovered" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground mb-4">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {genderData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Weekly MUAC Trend ── */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm shrink-0">
        <h3 className="text-sm font-semibold text-foreground mb-4">Average MUAC Trend — Weekly progress (all age groups)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={weeklyData} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.08} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
            <Tooltip formatter={(v: number) => [`${v} cm`, "Avg MUAC"]} />
            <Line type="monotone" dataKey="avgMuac" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: "#10b981" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {showCreateProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-foreground">Create New Program / Project</h3>
              <button
                onClick={() => setShowCreateProgram(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Project name</label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={programForm.label}
                  onChange={(e) => setProgramForm((s) => ({ ...s, label: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Supporting organization / donor</label>
                <input
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={programForm.sponsor}
                  onChange={(e) => setProgramForm((s) => ({ ...s, sponsor: e.target.value }))}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Target age group</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={programForm.ageBand}
                  onChange={(e) => setProgramForm((s) => ({ ...s, ageBand: e.target.value as ProgramAgeBand }))}
                >
                  {PROGRAM_AGE_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Governorate</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={programForm.governorate}
                  onChange={(e) => {
                    const gov = e.target.value;
                    const firstDistrict = (GOVERNORATES[gov] ?? [])[0] ?? "";
                    setProgramForm((s) => ({ ...s, governorate: gov, district: firstDistrict }));
                  }}
                >
                  {Object.keys(GOVERNORATES).map((gov) => (
                    <option key={gov} value={gov}>
                      {gov}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">District</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={programForm.district}
                  onChange={(e) => setProgramForm((s) => ({ ...s, district: e.target.value }))}
                >
                  {districtOptions.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-muted-foreground">Follow-up cadence</label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={programForm.followUpInterval}
                  onChange={(e) =>
                    setProgramForm((s) => ({
                      ...s,
                      followUpInterval: e.target.value as FollowUpInterval,
                    }))
                  }
                >
                  <option value="daily">Daily (7-day baseline plan)</option>
                  <option value="weekly">Weekly (4-week baseline plan)</option>
                  <option value="biweekly">Every two weeks (4-slot baseline plan)</option>
                </select>
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCreateProgram(false)}
                className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={createProgram}
                className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
              >
                Create Program
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
