import { useState, useEffect, useMemo } from "react";
import { loadPatients, savePatients, type Patient, type Diagnosis, getDiagnosisColor, getPercentageColor, calcPercentageForPatient } from "@/lib/data";
import { Plus, Search, Eye, Edit, ChevronDown, AlertCircle, Users, Baby, CalendarCheck, Filter } from "lucide-react";
import PatientModal from "@/components/PatientModal";
import PatientDetailModal from "@/components/PatientDetailModal";
import WeeklyUpdateModal from "@/components/WeeklyUpdateModal";
import SymptomsModal from "@/components/SymptomsModal";

const AGE_FILTERS = [
  { label: "Under 2y", months: 24, icon: Baby },
  { label: "Under 5y", months: 60, icon: Users },
  { label: "Under 7y", months: 84, icon: CalendarCheck },
  { label: "Under 10y", months: 120, icon: CalendarCheck },
];

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [diagnosisFilter, setDiagnosisFilter] = useState<string>("All");
  const [govFilter, setGovFilter] = useState<string>("All");
  const [distFilter, setDistFilter] = useState<string>("All");
  const [ageFilter, setAgeFilter] = useState<number | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [detailPatient, setDetailPatient] = useState<Patient | null>(null);
  const [weeklyPatient, setWeeklyPatient] = useState<Patient | null>(null);
  const [symptomsPatient, setSymptomsPatient] = useState<Patient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    setPatients(loadPatients());
  }, []);

  const governorates = useMemo(() => ["All", ...Array.from(new Set(patients.map((p) => p.governorate)))], [patients]);
  const districts = useMemo(() => {
    if (govFilter === "All") return ["All"];
    return ["All", ...Array.from(new Set(patients.filter((p) => p.governorate === govFilter).map((p) => p.district)))];
  }, [patients, govFilter]);

  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().includes(search.toLowerCase()) ||
        p.governorate.toLowerCase().includes(search.toLowerCase());
      const matchDiagnosis = diagnosisFilter === "All" || p.diagnosis === diagnosisFilter;
      const matchGov = govFilter === "All" || p.governorate === govFilter;
      const matchDist = distFilter === "All" || p.district === distFilter;
      const matchAge = ageFilter === null || p.ageMonths < ageFilter;
      return matchSearch && matchDiagnosis && matchGov && matchDist && matchAge;
    });
  }, [patients, search, diagnosisFilter, govFilter, distFilter, ageFilter]);

  function handleSave(patient: Patient) {
    const exists = patients.find((p) => p.id === patient.id);
    let updated: Patient[];
    if (exists) {
      updated = patients.map((p) => (p.id === patient.id ? patient : p));
    } else {
      updated = [...patients, patient];
    }
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

  const WeekCell = ({ w, edema }: { w: Patient["week1"]; edema: boolean }) => {
    if (edema) return <td className="px-2 py-2 text-center text-xs text-muted-foreground" colSpan={1}>—</td>;
    return <td className="px-2 py-2 text-center text-xs text-foreground">{w.weight ?? "—"}</td>;
  };

  const totalRutf = (p: Patient) => {
    if (p.edema) return 0;
    return parseFloat(
      (
        (p.week1.rutf ?? 0) +
        (p.week2.rutf ?? 0) +
        (p.week3.rutf ?? 0) +
        (p.week4.rutf ?? 0)
      ).toFixed(1)
    );
  };

  const pct = (p: Patient) => calcPercentageForPatient(p);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Patient Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} of {patients.length} patients shown</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity shadow-sm"
          data-testid="button-add-patient"
        >
          <Plus size={16} />
          Add Patient
        </button>
      </div>

      {/* Age Filter Buttons */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Filter size={12} /> Age:</span>
        <button
          onClick={() => setAgeFilter(null)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${ageFilter === null ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"}`}
          data-testid="filter-age-all"
        >
          All Ages
        </button>
        {AGE_FILTERS.map((f) => (
          <button
            key={f.months}
            onClick={() => setAgeFilter(ageFilter === f.months ? null : f.months)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${ageFilter === f.months ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary"}`}
            data-testid={`filter-age-${f.months}`}
          >
            <f.icon size={10} />
            {f.label}
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, ID, or location..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            data-testid="input-search"
          />
        </div>
        <select
          value={diagnosisFilter}
          onChange={(e) => setDiagnosisFilter(e.target.value)}
          className="text-sm rounded-lg border border-input bg-card text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="filter-diagnosis"
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
          onChange={(e) => { setGovFilter(e.target.value); setDistFilter("All"); }}
          className="text-sm rounded-lg border border-input bg-card text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
          data-testid="filter-governorate"
        >
          {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={distFilter}
          onChange={(e) => setDistFilter(e.target.value)}
          disabled={govFilter === "All"}
          className="text-sm rounded-lg border border-input bg-card text-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          data-testid="filter-district"
        >
          {districts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-card-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm sticky-header" style={{ minWidth: 1600 }}>
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {/* Basic Info */}
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide" colSpan={6}>
                  Basic Info
                </th>
                {/* Measurements */}
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l border-border" colSpan={5}>
                  Measurements
                </th>
                {/* Diagnosis */}
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l border-border" colSpan={2}>
                  Diagnosis
                </th>
                {/* Treatment */}
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l border-border" colSpan={4}>
                  Treatment Plan
                </th>
                {/* Weeks */}
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-border bg-blue-50/50 dark:bg-blue-950/10" colSpan={5}>
                  Week 1
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-border bg-purple-50/50 dark:bg-purple-950/10" colSpan={5}>
                  Week 2
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-border bg-orange-50/50 dark:bg-orange-950/10" colSpan={5}>
                  Week 3
                </th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-border bg-green-50/50 dark:bg-green-950/10" colSpan={5}>
                  Week 4
                </th>
                {/* Total + Actions */}
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-l-2 border-border" colSpan={3}>
                  Summary
                </th>
              </tr>
              <tr className="border-b border-border bg-card text-xs text-muted-foreground">
                <th className="px-3 py-2 text-left font-medium">ID</th>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-center font-medium">Gender</th>
                <th className="px-3 py-2 text-center font-medium">Age (mo)</th>
                <th className="px-3 py-2 text-left font-medium">Governorate</th>
                <th className="px-3 py-2 text-left font-medium">District</th>
                {/* Measurements */}
                <th className="px-3 py-2 text-center font-medium border-l border-border">W (kg)</th>
                <th className="px-3 py-2 text-center font-medium">H (cm)</th>
                <th className="px-3 py-2 text-center font-medium">WFH</th>
                <th className="px-3 py-2 text-center font-medium">Z-Score</th>
                <th className="px-3 py-2 text-center font-medium">MUAC</th>
                {/* Diagnosis */}
                <th className="px-3 py-2 text-center font-medium border-l border-border">Edema</th>
                <th className="px-3 py-2 text-left font-medium">Diagnosis</th>
                {/* Treatment */}
                <th className="px-3 py-2 text-left font-medium border-l border-border">Milk</th>
                <th className="px-3 py-2 text-center font-medium">Dose</th>
                <th className="px-3 py-2 text-left font-medium">Medication</th>
                <th className="px-3 py-2 text-left font-medium">Symptoms</th>
                {/* Week 1 */}
                <th className="px-2 py-2 text-center font-medium border-l-2 border-border">W</th>
                <th className="px-2 py-2 text-center font-medium">MUAC</th>
                <th className="px-2 py-2 text-center font-medium">Edema</th>
                <th className="px-2 py-2 text-center font-medium">RUTF</th>
                <th className="px-2 py-2 text-center font-medium">Supp</th>
                {/* Week 2 */}
                <th className="px-2 py-2 text-center font-medium border-l-2 border-border">W</th>
                <th className="px-2 py-2 text-center font-medium">MUAC</th>
                <th className="px-2 py-2 text-center font-medium">Edema</th>
                <th className="px-2 py-2 text-center font-medium">RUTF</th>
                <th className="px-2 py-2 text-center font-medium">Supp</th>
                {/* Week 3 */}
                <th className="px-2 py-2 text-center font-medium border-l-2 border-border">W</th>
                <th className="px-2 py-2 text-center font-medium">MUAC</th>
                <th className="px-2 py-2 text-center font-medium">Edema</th>
                <th className="px-2 py-2 text-center font-medium">RUTF</th>
                <th className="px-2 py-2 text-center font-medium">Supp</th>
                {/* Week 4 */}
                <th className="px-2 py-2 text-center font-medium border-l-2 border-border">W</th>
                <th className="px-2 py-2 text-center font-medium">MUAC</th>
                <th className="px-2 py-2 text-center font-medium">Edema</th>
                <th className="px-2 py-2 text-center font-medium">RUTF</th>
                <th className="px-2 py-2 text-center font-medium">Supp</th>
                {/* Summary */}
                <th className="px-2 py-2 text-center font-medium border-l-2 border-border">Total RUTF</th>
                <th className="px-2 py-2 text-center font-medium">%</th>
                <th className="px-2 py-2 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isEdema = p.edema;
                const perc = pct(p);
                return (
                  <tr
                    key={p.id}
                    className={`border-b border-border/60 hover:bg-muted/30 transition-colors cursor-pointer ${isEdema ? "bg-red-50/60 dark:bg-red-950/15" : ""} ${p.isDeceased ? "opacity-70" : ""}`}
                    data-testid={`row-patient-${p.id}`}
                  >
                    <td className="px-3 py-2.5 text-xs font-mono text-muted-foreground whitespace-nowrap">{p.id}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isEdema && !p.isDeceased && <AlertCircle size={12} className="text-red-500 shrink-0" />}
                        {p.name}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${p.gender === "M" ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" : "bg-pink-50 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400"}`}>
                        {p.gender}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs">{p.ageMonths}</td>
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap">{p.governorate}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground whitespace-nowrap">{p.district}</td>
                    {/* Measurements */}
                    <td className="px-3 py-2.5 text-center text-xs border-l border-border">{p.weight}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{p.height}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{p.wfh}</td>
                    <td className="px-3 py-2.5 text-center text-xs">{p.zScore}</td>
                    <td className="px-3 py-2.5 text-center text-xs font-semibold">{p.muac}</td>
                    {/* Diagnosis */}
                    <td className="px-3 py-2.5 text-center border-l border-border">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${p.edema ? "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950/40" : "text-muted-foreground"}`}>
                        {p.edema ? "YES" : "No"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getDiagnosisColor(p.diagnosis)}`}>
                        {p.diagnosis}
                      </span>
                    </td>
                    {/* Treatment */}
                    <td className="px-3 py-2.5 text-xs text-foreground border-l border-border whitespace-nowrap">{p.milk}</td>
                    <td className="px-3 py-2.5 text-xs text-center text-muted-foreground whitespace-nowrap">{p.dose}</td>
                    <td className="px-3 py-2.5 text-xs text-foreground whitespace-nowrap max-w-24 truncate" title={p.medication}>{p.medication}</td>
                    <td className="px-3 py-2.5 text-xs">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSymptomsPatient(p); }}
                        className="text-primary underline text-xs hover:opacity-70 transition-opacity"
                        data-testid={`button-symptoms-${p.id}`}
                      >
                        {p.symptoms.length} symptoms
                      </button>
                    </td>
                    {/* Week 1 */}
                    {isEdema ? (
                      <>
                        <td className="px-2 py-2.5 text-center text-xs text-muted-foreground border-l-2 border-border" colSpan={5}>Edema — Refer to hospital</td>
                      </>
                    ) : (
                      <>
                        <td className="px-2 py-2.5 text-center text-xs border-l-2 border-border bg-blue-50/30 dark:bg-blue-950/5">{p.week1.weight ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-blue-50/30 dark:bg-blue-950/5">{p.week1.muac ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-blue-50/30 dark:bg-blue-950/5">{p.week1.edema ? "Y" : "N"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-blue-50/30 dark:bg-blue-950/5">{p.week1.rutf ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-blue-50/30 dark:bg-blue-950/5 max-w-12 truncate" title={p.week1.supplements}>{p.week1.supplements ? "✓" : "—"}</td>
                      </>
                    )}
                    {/* Week 2 */}
                    {!isEdema && (
                      <>
                        <td className="px-2 py-2.5 text-center text-xs border-l-2 border-border bg-purple-50/30 dark:bg-purple-950/5">{p.week2.weight ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-purple-50/30 dark:bg-purple-950/5">{p.week2.muac ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-purple-50/30 dark:bg-purple-950/5">{p.week2.edema ? "Y" : "N"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-purple-50/30 dark:bg-purple-950/5">{p.week2.rutf ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-purple-50/30 dark:bg-purple-950/5">{p.week2.supplements ? "✓" : "—"}</td>
                      </>
                    )}
                    {isEdema && (
                      <>
                        <td className="border-l-2 border-border" />
                        <td /><td /><td /><td />
                      </>
                    )}
                    {/* Week 3 */}
                    {!isEdema && (
                      <>
                        <td className="px-2 py-2.5 text-center text-xs border-l-2 border-border bg-orange-50/30 dark:bg-orange-950/5">{p.week3.weight ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-orange-50/30 dark:bg-orange-950/5">{p.week3.muac ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-orange-50/30 dark:bg-orange-950/5">{p.week3.edema ? "Y" : "N"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-orange-50/30 dark:bg-orange-950/5">{p.week3.rutf ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-orange-50/30 dark:bg-orange-950/5">{p.week3.supplements ? "✓" : "—"}</td>
                      </>
                    )}
                    {isEdema && (
                      <>
                        <td className="border-l-2 border-border" />
                        <td /><td /><td /><td />
                      </>
                    )}
                    {/* Week 4 */}
                    {!isEdema && (
                      <>
                        <td className="px-2 py-2.5 text-center text-xs border-l-2 border-border bg-green-50/30 dark:bg-green-950/5">{p.week4.weight ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-green-50/30 dark:bg-green-950/5">{p.week4.muac ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-green-50/30 dark:bg-green-950/5">{p.week4.edema ? "Y" : "N"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-green-50/30 dark:bg-green-950/5">{p.week4.rutf ?? "—"}</td>
                        <td className="px-2 py-2.5 text-center text-xs bg-green-50/30 dark:bg-green-950/5">{p.week4.supplements ? "✓" : "—"}</td>
                      </>
                    )}
                    {isEdema && (
                      <>
                        <td className="border-l-2 border-border" />
                        <td /><td /><td /><td />
                      </>
                    )}
                    {/* Summary */}
                    <td className="px-2 py-2.5 text-center text-xs font-semibold border-l-2 border-border">{isEdema ? "—" : totalRutf(p)}</td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-bold ${getPercentageColor(p.diagnosis)}`}>
                        {perc}%
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); setDetailPatient(p); }}
                          className="p-1 rounded hover:bg-primary/10 text-primary transition-colors"
                          title="View Details"
                          data-testid={`button-view-${p.id}`}
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setWeeklyPatient(p); }}
                          className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 transition-colors"
                          title="Update Weekly Data"
                          data-testid={`button-weekly-${p.id}`}
                        >
                          <CalendarCheck size={13} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); }}
                          className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
                          title="Edit Patient"
                          data-testid={`button-edit-${p.id}`}
                        >
                          <Edit size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={39} className="px-6 py-12 text-center text-muted-foreground text-sm">
                    No patients found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edema Alert Banner */}
      {filtered.some((p) => p.edema && !p.isDeceased) && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900">
          <AlertCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-700 dark:text-red-400">Critical Alert — Edema Cases Detected</div>
            <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
              {filtered.filter((p) => p.edema && !p.isDeceased).length} patient(s) with edema must be referred to hospital immediately. Weekly tracking is disabled for these cases.
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
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
