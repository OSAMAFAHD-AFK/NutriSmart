import { useState, useEffect } from "react";
import { loadPatients, type Patient, type Diagnosis } from "@/lib/data";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Users, AlertTriangle, Activity, TrendingUp, TrendingDown, Heart, RefreshCw, Wifi, WifiOff, Skull } from "lucide-react";

type StatCardProps = {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  change?: string;
  changeType?: "up" | "down";
};

function StatCard({ title, value, icon, color, bgColor, change, changeType }: StatCardProps) {
  return (
    <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg ${bgColor} flex items-center justify-center`}>
          <div className={color}>{icon}</div>
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-medium ${changeType === "up" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {changeType === "up" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {change}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{title}</div>
    </div>
  );
}

const REGION_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

const WEEK_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4"];

export default function Dashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [lastSync, setLastSync] = useState<string>("Never");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setPatients(loadPatients());
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const total = patients.length;
  const sam = patients.filter((p) => p.diagnosis === "SAM").length;
  const mam = patients.filter((p) => p.diagnosis === "MAM").length;
  const recovered = patients.filter((p) => p.diagnosis === "Recovered").length;
  const deceased = patients.filter((p) => p.isDeceased).length;
  const normal = patients.filter((p) => p.diagnosis === "Normal").length;
  const deathRate = total > 0 ? ((deceased / total) * 100).toFixed(1) : "0.0";
  const recoveryRate = total > 0 ? ((recovered / total) * 100).toFixed(1) : "0.0";

  const regionMap: Record<string, { SAM: number; MAM: number; Normal: number; Recovered: number; Deceased: number }> = {};
  patients.forEach((p) => {
    if (!regionMap[p.governorate]) regionMap[p.governorate] = { SAM: 0, MAM: 0, Normal: 0, Recovered: 0, Deceased: 0 };
    const d = p.diagnosis as keyof typeof regionMap[string];
    if (d in regionMap[p.governorate]) regionMap[p.governorate][d]++;
  });
  const regionData = Object.entries(regionMap)
    .map(([name, v]) => ({ name, ...v, total: v.SAM + v.MAM + v.Normal + v.Recovered + v.Deceased }))
    .sort((a, b) => b.total - a.total);

  const genderData = [
    { name: "Male", value: patients.filter((p) => p.gender === "M").length, color: "#3b82f6" },
    { name: "Female", value: patients.filter((p) => p.gender === "F").length, color: "#ec4899" },
  ];

  const diagnosisData = [
    { name: "SAM", value: sam, color: "#ef4444" },
    { name: "MAM", value: mam, color: "#f59e0b" },
    { name: "Recovered", value: recovered, color: "#10b981" },
    { name: "Normal", value: normal, color: "#3b82f6" },
    { name: "Deceased", value: deceased, color: "#6b7280" },
  ];

  const weeklyTrend = WEEK_LABELS.map((label, wi) => {
    const weightSum = patients.reduce((acc, p) => {
      const w = [p.week1, p.week2, p.week3, p.week4][wi];
      return acc + (w.weight ?? 0);
    }, 0);
    const muacSum = patients.reduce((acc, p) => {
      const w = [p.week1, p.week2, p.week3, p.week4][wi];
      return acc + (w.muac ?? 0);
    }, 0);
    return {
      label,
      avgWeight: patients.length ? parseFloat((weightSum / patients.length).toFixed(2)) : 0,
      avgMuac: patients.length ? parseFloat((muacSum / patients.length).toFixed(2)) : 0,
    };
  });

  const handleSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setLastSync(new Date().toLocaleTimeString());
    }, 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Yemen Nutrition Monitoring System — Real-time malnutrition tracking</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full border ${isOnline ? "text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950/30 dark:border-green-900" : "text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/30 dark:border-red-900"}`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? "Online" : "Offline Mode"}
          </div>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-60"
            data-testid="button-sync"
          >
            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
            {isSyncing ? "Syncing..." : "Sync Data"}
          </button>
          {lastSync !== "Never" && (
            <span className="text-xs text-muted-foreground">Last sync: {lastSync}</span>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <StatCard title="Total Patients" value={total} icon={<Users size={18} />} color="text-blue-600 dark:text-blue-400" bgColor="bg-blue-50 dark:bg-blue-950/30" change="+3 this week" changeType="up" />
        <StatCard title="SAM Cases" value={sam} icon={<AlertTriangle size={18} />} color="text-red-600 dark:text-red-400" bgColor="bg-red-50 dark:bg-red-950/30" change={`${((sam/total)*100).toFixed(0)}%`} changeType="down" />
        <StatCard title="MAM Cases" value={mam} icon={<Activity size={18} />} color="text-orange-600 dark:text-orange-400" bgColor="bg-orange-50 dark:bg-orange-950/30" change={`${((mam/total)*100).toFixed(0)}%`} changeType="down" />
        <StatCard title="Recovered" value={recovered} icon={<TrendingUp size={18} />} color="text-green-600 dark:text-green-400" bgColor="bg-green-50 dark:bg-green-950/30" change={`${recoveryRate}%`} changeType="up" />
        <StatCard title="Normal" value={normal} icon={<Heart size={18} />} color="text-primary dark:text-primary" bgColor="bg-accent dark:bg-accent" />
        <StatCard title="Deaths" value={deceased} icon={<Skull size={18} />} color="text-gray-600 dark:text-gray-400" bgColor="bg-gray-100 dark:bg-gray-800/50" change={`${deathRate}%`} changeType="down" />
        <StatCard title="Recovery Rate" value={`${recoveryRate}%`} icon={<TrendingUp size={18} />} color="text-primary dark:text-primary" bgColor="bg-accent dark:bg-accent" change="+2.1% vs last month" changeType="up" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cases by Region */}
        <div className="lg:col-span-2 bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Cases by Governorate</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" opacity={0.5} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 32% 91%)", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="SAM" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="MAM" stackId="a" fill="#f59e0b" />
                <Bar dataKey="Recovered" stackId="a" fill="#10b981" />
                <Bar dataKey="Normal" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gender & Diagnosis */}
        <div className="flex flex-col gap-4">
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex-1">
            <h3 className="text-base font-semibold text-foreground mb-3">Gender Distribution</h3>
            <div className="flex items-center gap-4">
              <div className="w-28 h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={genderData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={50}>
                      {genderData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2">
                {genderData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                    <span className="text-muted-foreground">{d.name}:</span>
                    <span className="font-semibold text-foreground">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm flex-1">
            <h3 className="text-base font-semibold text-foreground mb-3">Diagnosis Split</h3>
            <div className="space-y-2">
              {diagnosisData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                  <span className="text-xs text-muted-foreground w-20">{d.name}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${total > 0 ? (d.value / total) * 100 : 0}%`, background: d.color }} />
                  </div>
                  <span className="text-xs font-semibold text-foreground w-6 text-right">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Trend */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-4">Weekly Progress Trend (Average Weight & MUAC)</h3>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={weeklyTrend} margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214 32% 91%)" opacity={0.5} />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(214 32% 91%)", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="avgWeight" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Avg Weight (kg)" />
              <Line type="monotone" dataKey="avgMuac" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Avg MUAC (cm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Critical */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-4">Critical Cases — Edema Patients</h3>
        <div className="space-y-2">
          {patients.filter((p) => p.edema && !p.isDeceased).map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">{p.name}</div>
                <div className="text-xs text-muted-foreground">{p.governorate} — {p.district} · MUAC: {p.muac} cm · Age: {p.ageMonths} months</div>
              </div>
              <div className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-800">
                REFER NOW
              </div>
            </div>
          ))}
          {patients.filter((p) => p.edema && !p.isDeceased).length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No critical edema cases at this time.</p>
          )}
        </div>
      </div>
    </div>
  );
}
