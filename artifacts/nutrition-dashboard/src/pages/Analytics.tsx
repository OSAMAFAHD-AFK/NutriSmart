import { useState, useEffect, useMemo } from "react";
import { loadPatients, type Patient, GOVERNORATES, getPatientDerivedAnthropometry } from "@/lib/data";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis
} from "recharts";
import { TrendingUp, MapPin, Users, Activity, Skull, AlertCircle } from "lucide-react";

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

export default function Analytics() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedGov, setSelectedGov] = useState<string>("All");

  useEffect(() => {
    setPatients(loadPatients());
  }, []);

  const total = patients.length;
  const sam = patients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "SAM").length;
  const mam = patients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "MAM").length;
  const recovered = patients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "Recovered").length;
  const deceased = patients.filter((p) => p.isDeceased).length;
  const deathRate = total > 0 ? ((deceased / total) * 100).toFixed(1) : "0.0";
  const recoveryRate = total > 0 ? ((recovered / total) * 100).toFixed(1) : "0.0";
  const malnutRate = total > 0 ? (((sam + mam) / total) * 100).toFixed(1) : "0.0";

  // By region
  const regionData = useMemo(() => {
    const map: Record<string, { SAM: number; MAM: number; Normal: number; Recovered: number; Deceased: number; total: number }> = {};
    patients.forEach((p) => {
      if (!map[p.governorate]) map[p.governorate] = { SAM: 0, MAM: 0, Normal: 0, Recovered: 0, Deceased: 0, total: 0 };
      const d = getPatientDerivedAnthropometry(p).diagnosis;
      if (d === "SAM") map[p.governorate].SAM++;
      else if (d === "MAM") map[p.governorate].MAM++;
      else if (d === "Normal") map[p.governorate].Normal++;
      else if (d === "Recovered") map[p.governorate].Recovered++;
      else if (d === "Deceased") map[p.governorate].Deceased++;
      map[p.governorate].total++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, rate: total > 0 ? parseFloat(((v.SAM + v.MAM) / total * 100).toFixed(1)) : 0 }))
      .sort((a, b) => b.total - a.total);
  }, [patients]);

  // By district (filtered)
  const districtData = useMemo(() => {
    const source = selectedGov === "All" ? patients : patients.filter((p) => p.governorate === selectedGov);
    const map: Record<string, { SAM: number; MAM: number; Normal: number; Recovered: number; total: number }> = {};
    source.forEach((p) => {
      if (!map[p.district]) map[p.district] = { SAM: 0, MAM: 0, Normal: 0, Recovered: 0, total: 0 };
      const d = getPatientDerivedAnthropometry(p).diagnosis;
      if (d === "SAM") map[p.district].SAM++;
      else if (d === "MAM") map[p.district].MAM++;
      else if (d === "Normal") map[p.district].Normal++;
      else if (d === "Recovered") map[p.district].Recovered++;
      map[p.district].total++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [patients, selectedGov]);

  // Gender comparison
  const genderData = [
    { name: "Male", SAM: patients.filter((p) => p.gender === "M" && getPatientDerivedAnthropometry(p).diagnosis === "SAM").length, MAM: patients.filter((p) => p.gender === "M" && getPatientDerivedAnthropometry(p).diagnosis === "MAM").length, Recovered: patients.filter((p) => p.gender === "M" && getPatientDerivedAnthropometry(p).diagnosis === "Recovered").length },
    { name: "Female", SAM: patients.filter((p) => p.gender === "F" && getPatientDerivedAnthropometry(p).diagnosis === "SAM").length, MAM: patients.filter((p) => p.gender === "F" && getPatientDerivedAnthropometry(p).diagnosis === "MAM").length, Recovered: patients.filter((p) => p.gender === "F" && getPatientDerivedAnthropometry(p).diagnosis === "Recovered").length },
  ];

  // 12-week improvement
  const weeklyData = [
    { week: "Initial", avgMuac: patients.reduce((a, p) => a + getPatientDerivedAnthropometry(p).muac, 0) / (patients.length || 1) },
    ...Array.from({ length: 12 }, (_, index) => ({
      week: `Week ${index + 1}`,
      avgMuac:
        patients.reduce(
          (acc, patient) => acc + (patient.treatmentWeeks[index]?.muac ?? patient.muac),
          0,
        ) / (patients.length || 1),
    })),
  ].map((d) => ({ ...d, avgMuac: parseFloat(d.avgMuac.toFixed(2)) }));

  // Pie data
  const diagPie = [
    { name: "SAM", value: sam, color: "#ef4444" },
    { name: "MAM", value: mam, color: "#f59e0b" },
    { name: "Recovered", value: recovered, color: "#10b981" },
    { name: "Normal", value: patients.filter((p) => getPatientDerivedAnthropometry(p).diagnosis === "Normal").length, color: "#3b82f6" },
    { name: "Deceased", value: deceased, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  // Age distribution
  const ageBuckets = [
    { label: "<6 mo", count: patients.filter((p) => p.ageMonths < 6).length },
    { label: "6-12", count: patients.filter((p) => p.ageMonths >= 6 && p.ageMonths < 12).length },
    { label: "12-24", count: patients.filter((p) => p.ageMonths >= 12 && p.ageMonths < 24).length },
    { label: "24-60", count: patients.filter((p) => p.ageMonths >= 24 && p.ageMonths < 60).length },
    { label: "60+", count: patients.filter((p) => p.ageMonths >= 60).length },
  ];

  const governorateList = ["All", ...Object.keys(GOVERNORATES)];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Advanced Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Data-driven insights for targeted malnutrition intervention</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Total Patients", value: total, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/30", icon: <Users size={16} /> },
          { label: "SAM Cases", value: sam, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", icon: <AlertCircle size={16} /> },
          { label: "MAM Cases", value: mam, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-950/30", icon: <Activity size={16} /> },
          { label: "Malnutrition Rate", value: `${malnutRate}%`, color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-950/30", icon: <TrendingUp size={16} /> },
          { label: "Recovery Rate", value: `${recoveryRate}%`, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-950/30", icon: <TrendingUp size={16} /> },
          { label: "Death Rate", value: `${deathRate}%`, color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-100 dark:bg-gray-800/50", icon: <Skull size={16} /> },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-card-border rounded-xl p-4 shadow-sm">
            <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center ${s.color} mb-2`}>{s.icon}</div>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* District Filter */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <MapPin size={16} className="text-primary" />
              Malnutrition Rate by District
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Filter by governorate to see district-level breakdown</p>
          </div>
          <select
            value={selectedGov}
            onChange={(e) => setSelectedGov(e.target.value)}
            className="text-sm rounded-lg border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="select-governorate-filter"
          >
            {governorateList.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={districtData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="SAM" stackId="a" fill="#ef4444" />
              <Bar dataKey="MAM" stackId="a" fill="#f59e0b" />
              <Bar dataKey="Recovered" stackId="a" fill="#10b981" />
              <Bar dataKey="Normal" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {districtData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">No data for selected filter</div>
        )}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cases by Region */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Most Affected Governorates</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical" margin={{ top: 0, right: 10, left: 60, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {regionData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Diagnosis Pie */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Case Distribution by Diagnosis</h3>
          <div className="flex items-center gap-4">
            <div className="flex-1 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={diagPie} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {diagPie.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-2">
              {diagPie.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-sm" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-semibold text-foreground ml-auto pl-3">{d.value}</span>
                  <span className="text-xs text-muted-foreground">({total > 0 ? ((d.value / total) * 100).toFixed(0) : 0}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gender Comparison */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Gender Comparison by Diagnosis</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={genderData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="SAM" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="MAM" fill="#f59e0b" />
                <Bar dataKey="Recovered" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly MUAC Trend */}
        <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Weekly MUAC Improvement Trend</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weeklyData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(v) => [`${v} cm`, "Avg MUAC"]} />
                <Line type="monotone" dataKey="avgMuac" stroke="#10b981" strokeWidth={2.5} dot={{ r: 5, fill: "#10b981" }} name="Avg MUAC (cm)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Age Distribution */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-4">Age Distribution of Patients (Months)</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ageBuckets} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                {ageBuckets.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Region Table */}
      <div className="bg-card border border-card-border rounded-xl p-5 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-4">Governorate Summary Table</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Governorate</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Total</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-red-600 dark:text-red-400">SAM</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-orange-600 dark:text-orange-400">MAM</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-green-600 dark:text-green-400">Recovered</th>
                <th className="text-center py-2 px-3 text-xs font-semibold text-muted-foreground">Malnutrition Rate</th>
              </tr>
            </thead>
            <tbody>
              {regionData.map((r, i) => (
                <tr key={r.name} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-foreground">{r.name}</td>
                  <td className="py-2.5 px-3 text-center">{r.total}</td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-red-600 dark:text-red-400 font-semibold">{r.SAM}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-orange-600 dark:text-orange-400 font-semibold">{r.MAM}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <span className="text-green-600 dark:text-green-400 font-semibold">{r.Recovered}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="flex-1 max-w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${r.rate}%` }} />
                      </div>
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">{r.rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
