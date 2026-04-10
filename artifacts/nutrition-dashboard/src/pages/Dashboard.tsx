import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { loadPatients, type Patient } from "@/lib/data";
import { AGE_GROUP_LIST, type AgeGroupConfig, getAgeGroupId } from "@/lib/ageGroups";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
import {
  Users, AlertTriangle, TrendingUp, Heart, Skull, RefreshCw,
  Wifi, WifiOff, ArrowRight, Building2, Activity,
} from "lucide-react";

const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4"];
const PIE_COLORS = ["#3b82f6", "#ec4899"];
const GOV_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center mb-3`}>{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground/70 mt-0.5">{sub}</div>}
    </div>
  );
}

function AgeGroupCard({ group, patients, onClick }: { group: AgeGroupConfig; patients: Patient[]; onClick: () => void }) {
  const gPatients = patients.filter((p) => p.ageMonths >= group.minMonths && p.ageMonths < group.maxMonths);
  const sam = gPatients.filter((p) => p.diagnosis === "SAM").length;
  const mam = gPatients.filter((p) => p.diagnosis === "MAM").length;
  const recovered = gPatients.filter((p) => p.diagnosis === "Recovered").length;
  const total = gPatients.length;
  const malnutRate = total > 0 ? Math.round(((sam + mam) / total) * 100) : 0;

  return (
    <button
      onClick={onClick}
      className={`group relative flex flex-col text-left w-full rounded-2xl border-2 ${group.borderClass} ${group.bgClass} p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 overflow-hidden`}
    >
      {/* Background emoji watermark */}
      <div className="absolute -right-2 -top-2 text-7xl opacity-10 select-none pointer-events-none">{group.emoji}</div>

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className={`text-3xl font-black ${group.textClass}`}>{group.emoji}</div>
          <h3 className={`text-xl font-bold mt-1 ${group.textClass}`}>{group.label}</h3>
          <p className="text-sm text-muted-foreground">{group.description}</p>
        </div>
        <div className={`shrink-0 w-12 h-12 rounded-xl ${group.badgeBg} flex items-center justify-center shadow-sm`}>
          <span className="text-white text-lg font-bold">{total}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-red-600 dark:text-red-400">{sam}</div>
          <div className="text-xs text-muted-foreground">SAM</div>
        </div>
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-orange-600 dark:text-orange-400">{mam}</div>
          <div className="text-xs text-muted-foreground">MAM</div>
        </div>
        <div className="bg-white/60 dark:bg-black/20 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">{recovered}</div>
          <div className="text-xs text-muted-foreground">Recovered</div>
        </div>
      </div>

      {/* Malnutrition bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>Malnutrition Rate</span>
          <span className={`font-semibold ${malnutRate > 50 ? "text-red-600" : malnutRate > 25 ? "text-orange-600" : "text-green-600"}`}>{malnutRate}%</span>
        </div>
        <div className="h-2 bg-white/50 dark:bg-black/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${malnutRate > 50 ? "bg-red-500" : malnutRate > 25 ? "bg-orange-500" : "bg-green-500"}`}
            style={{ width: `${malnutRate}%` }}
          />
        </div>
      </div>

      {/* Sponsor */}
      <div className="flex items-center gap-2 mb-4">
        <Building2 size={12} className="text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground truncate">
          <span className="font-semibold">{group.sponsor}</span> — {group.sponsorSub}
        </span>
      </div>

      {/* CTA */}
      <div className={`flex items-center justify-between pt-3 border-t ${group.borderClass}`}>
        <span className={`text-sm font-semibold ${group.textClass}`}>View Patients & Analytics</span>
        <div className={`w-8 h-8 rounded-lg ${group.badgeBg} flex items-center justify-center group-hover:translate-x-1 transition-transform`}>
          <ArrowRight size={14} className="text-white" />
        </div>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [lastSync, setLastSync] = useState("Never");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [, navigate] = useLocation();

  useEffect(() => {
    setPatients(loadPatients());
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  function handleSync() {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync(new Date().toLocaleTimeString());
    }, 1800);
  }

  const sam = patients.filter((p) => p.diagnosis === "SAM").length;
  const mam = patients.filter((p) => p.diagnosis === "MAM").length;
  const recovered = patients.filter((p) => p.diagnosis === "Recovered").length;
  const normal = patients.filter((p) => p.diagnosis === "Normal").length;
  const deaths = patients.filter((p) => p.isDeceased).length;
  const recoveryRate = patients.length > 0 ? ((recovered / patients.length) * 100).toFixed(1) : "0";

  const govData = useMemo(() => {
    const map: Record<string, { name: string; SAM: number; MAM: number; Recovered: number; Normal: number }> = {};
    patients.forEach((p) => {
      if (!map[p.governorate]) map[p.governorate] = { name: p.governorate, SAM: 0, MAM: 0, Recovered: 0, Normal: 0 };
      if (p.diagnosis === "SAM") map[p.governorate].SAM++;
      else if (p.diagnosis === "MAM") map[p.governorate].MAM++;
      else if (p.diagnosis === "Recovered") map[p.governorate].Recovered++;
      else map[p.governorate].Normal++;
    });
    return Object.values(map);
  }, [patients]);

  const genderData = useMemo(() => [
    { name: "Male", value: patients.filter((p) => p.gender === "M").length },
    { name: "Female", value: patients.filter((p) => p.gender === "F").length },
  ], [patients]);

  const weeklyData = useMemo(() => WEEK_LABELS.map((label, wi) => {
    const key = `week${wi + 1}` as "week1" | "week2" | "week3" | "week4";
    const muacs = patients.filter((p) => !p.edema && p[key].muac).map((p) => p[key].muac as number);
    const avg = muacs.length ? parseFloat((muacs.reduce((a, b) => a + b, 0) / muacs.length).toFixed(2)) : 0;
    return { label, avgMuac: avg };
  }), [patients]);

  const edemaPatients = patients.filter((p) => p.edema && !p.isDeceased);

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

      {/* ── Age Group Entry Cards ── */}
      <div className="shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-foreground">Age Group Programs</h2>
          <span className="text-xs text-muted-foreground">Click a group to view patients & analytics</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {AGE_GROUP_LIST.map((group) => (
            <AgeGroupCard
              key={group.id}
              group={group}
              patients={patients}
              onClick={() => navigate(`/group/${group.id}`)}
            />
          ))}
        </div>

        {/* All Patients link */}
        <button
          onClick={() => navigate("/patients")}
          className="mt-3 w-full flex items-center justify-between px-5 py-4 rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors shadow-sm group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Users size={18} className="text-muted-foreground" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-foreground">All Patients</div>
              <div className="text-xs text-muted-foreground">Complete registry — {patients.length} patients across all age groups</div>
            </div>
          </div>
          <ArrowRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

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

      {/* Weekly MUAC Trend */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm shrink-0">
        <h3 className="text-sm font-semibold text-foreground mb-4">Average MUAC Trend — Weekly Progress (All Patients)</h3>
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

      {/* Edema Alert */}
      {edemaPatients.length > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 shrink-0">
          <AlertTriangle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-700 dark:text-red-400">Critical Alert — {edemaPatients.length} Edema Case(s) Require Immediate Hospital Referral</div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
              {edemaPatients.map((p) => (
                <span key={p.id} className="font-medium">{p.name} ({p.governorate})</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
