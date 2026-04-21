import { useState, useMemo, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, BarChart3, Menu, X, Moon, Sun, Languages, Settings, LogOut, ShieldCheck, Mail, Phone } from "lucide-react";
import {
  loadPrograms,
  getProgramAgeBandLabelEnShort,
  getProgramsSortedForDisplay,
  formatProgramCreatedAtForUi,
} from "@/lib/ageGroups";
import { loadPatients } from "@/lib/data";
import { loadUserProfile, USER_PROFILE_CHANGED_EVENT } from "@/lib/userProfile";

function NutriSmartLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#10b981" />
      <path d="M16 6C16 6 8 12 8 18C8 22.4183 11.5817 26 16 26C20.4183 26 24 22.4183 24 18C24 12 16 6 16 6Z" fill="white" fillOpacity="0.95" />
      <path d="M16 10C16 10 12 14 12 18C12 20.2091 13.7909 22 16 22C18.2091 22 20 20.2091 20 18C20 14 16 10 16 10Z" fill="#10b981" />
      <path d="M16 14C16 14 14 16 14 18C14 19.1046 14.8954 20 16 20C17.1046 20 18 19.1046 18 18C18 16 16 14 16 14Z" fill="white" fillOpacity="0.9" />
      <path d="M20 9L22 7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M22 12L25 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

type Props = {
  children: React.ReactNode;
  darkMode: boolean;
  onToggleDark: () => void;
};

function SidebarContent({ location, onNav, darkMode, onToggleDark }: {
  location: string;
  onNav?: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
}) {
  const [showUserCard, setShowUserCard] = useState(false);
  const [profileEpoch, setProfileEpoch] = useState(0);
  useEffect(() => {
    const onProfileChanged = () => setProfileEpoch((n) => n + 1);
    window.addEventListener(USER_PROFILE_CHANGED_EVENT, onProfileChanged);
    return () => window.removeEventListener(USER_PROFILE_CHANGED_EVENT, onProfileChanged);
  }, []);
  const isArabicUi = useMemo(() => {
    if (typeof document === "undefined") return false;
    const lang = document.documentElement.lang.toLowerCase();
    const dir = document.documentElement.dir.toLowerCase();
    return lang.startsWith("ar") || dir === "rtl";
  }, []);
  const userProfile = useMemo(() => loadUserProfile(), [location, profileEpoch]);
  const currentUserName = useMemo(() => userProfile.displayName, [userProfile.displayName]);
  const userInitials = useMemo(() => {
    const parts = currentUserName.split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "U";
    const second = parts[1]?.[0] ?? "";
    return `${first}${second}`.toUpperCase();
  }, [currentUserName]);

  const programsSorted = useMemo(
    () => getProgramsSortedForDisplay(loadPrograms(), loadPatients()),
    [location],
  );
  const isActive = (href: string) =>
    href === "/" ? location === "/" : location === href || location.startsWith(href + "/");

  function confirmLogoutFromUserCard() {
    setShowUserCard(false);
    window.location.assign(import.meta.env.BASE_URL || "/");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 p-3 pb-2">
        <Link
          href="/"
          onClick={onNav}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive("/") && !location.startsWith("/group") && !location.startsWith("/analytics") ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
        >
          <LayoutDashboard size={16} />
          Overview
        </Link>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3">
        <div className="shrink-0 px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          Programs
        </div>
        <ul
          role="list"
          className="min-h-0 flex-1 list-none space-y-0.5 overflow-y-auto overscroll-y-contain py-0.5 pr-0.5 [-webkit-overflow-scrolling:touch]"
        >
          {programsSorted.map((group) => {
            const href = `/group/${group.id}`;
            const active = location === href || location.startsWith(href);
            return (
              <li key={group.id}>
                <Link
                  href={href}
                  onClick={onNav}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
                >
                  <span className="mt-0.5 self-start text-base leading-none">{group.emoji}</span>
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="text-[13px] font-semibold leading-tight break-words">{group.label}</div>
                    <div className={`text-[10px] leading-tight break-words ${active ? "text-sidebar-primary-foreground/80" : "text-sidebar-foreground/50"}`}>
                      {group.sponsor}
                    </div>
                    <div
                      className={`flex w-full items-center gap-1 overflow-hidden whitespace-nowrap text-[10px] font-semibold leading-tight ${active ? "text-sidebar-primary-foreground/85" : "text-sidebar-foreground/55"}`}
                      title="Program age band and creation date"
                    >
                      <span className="shrink-0">{getProgramAgeBandLabelEnShort(group)}</span>
                      <span className="shrink-0" aria-hidden>•</span>
                      <span className="truncate">Created {formatProgramCreatedAtForUi(group.createdAt)}</span>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="shrink-0 space-y-0.5 border-t border-sidebar-border p-3 pt-2">
        <Link
          href="/analytics"
          onClick={onNav}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive("/analytics") ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}
        >
          <BarChart3 size={16} />
          Global Analytics
        </Link>

        <button
          type="button"
          onClick={onToggleDark}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/60 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
          data-testid="button-toggle-dark"
        >
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>

        <button
          type="button"
          onClick={() => undefined}
          aria-label={isArabicUi ? "تحويل اللغة إلى الإنجليزية" : "Switch language to Arabic"}
          title={isArabicUi ? "تبديل اللغة" : "Language switch"}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-sidebar-foreground/60 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <Languages size={14} className="shrink-0 opacity-90" aria-hidden />
          <span className="truncate font-medium">{isArabicUi ? "العربية إلى الإنجليزية" : "English to Arabic"}</span>
        </button>

        <Link
          href="/settings"
          onClick={onNav}
          aria-label="Settings"
          title="Settings"
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 ${
            isActive("/settings")
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          }`}
        >
          <Settings size={16} className="shrink-0 opacity-90" aria-hidden />
          <span className="truncate font-medium">Settings</span>
        </Link>

        <button
          type="button"
          onClick={() => setShowUserCard(true)}
          className="group mt-1 flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border/75 bg-gradient-to-r from-sidebar-accent/40 via-sidebar-accent/15 to-transparent px-2.5 py-2.5 text-left shadow-[0_1px_0_rgba(255,255,255,0.03)_inset] transition-all duration-200 hover:-translate-y-0.5 hover:border-sidebar-border hover:from-sidebar-accent/65 hover:via-sidebar-accent/25 hover:shadow-[0_10px_24px_rgba(0,0,0,0.22)]"
        >
          {userProfile.avatarDataUrl ? (
            <img
              src={userProfile.avatarDataUrl}
              alt={currentUserName}
              className="h-9 w-9 shrink-0 rounded-full border border-sidebar-border/70 object-cover ring-1 ring-white/5"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[11px] font-bold text-sidebar-foreground">
              {userInitials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">{currentUserName}</div>
            <div className="flex items-center gap-1.5 text-[10px] text-sidebar-foreground/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/90" />
              <span className="truncate">Profile & Logout</span>
            </div>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-sidebar-border/70 bg-background/35 text-sidebar-foreground/70 transition-colors group-hover:text-sidebar-foreground">
            <LogOut size={14} />
          </div>
        </button>
      </div>

      {showUserCard && (
        <div className="fixed inset-0 z-[68] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base font-semibold text-foreground">User Profile</h3>
              <button
                type="button"
                onClick={() => setShowUserCard(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-3">
              {userProfile.avatarDataUrl ? (
                <img src={userProfile.avatarDataUrl} alt={currentUserName} className="h-14 w-14 rounded-full border object-cover" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full border bg-muted text-base font-bold text-foreground">
                  {userInitials}
                </div>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{currentUserName}</div>
                <div className="text-xs text-muted-foreground">Account profile</div>
              </div>
            </div>

            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Mail size={13} /> {userProfile.email || "No email saved"}</div>
              <div className="flex items-center gap-2"><Phone size={13} /> {userProfile.phone || "No phone saved"}</div>
              <div className="flex items-center gap-2"><ShieldCheck size={13} /> Permissions: Patients, Treatment, Reports, Settings</div>
            </div>

            <div className="mt-4 rounded-lg border border-destructive/35 bg-destructive/5 px-3 py-2 text-xs text-muted-foreground">
              Confirm logout: if you continue, you will return to the main screen.
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUserCard(false)}
                className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={confirmLogoutFromUserCard}
                className="inline-flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-semibold text-destructive-foreground transition-all duration-200 hover:-translate-y-0.5 hover:bg-destructive/90 hover:shadow-[0_8px_18px_rgba(220,38,38,0.35)] active:translate-y-0"
              >
                <LogOut size={14} />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children, darkMode, onToggleDark }: Props) {
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [lastMobileRouteBeforeSettings, setLastMobileRouteBeforeSettings] = useState("/");

  useEffect(() => {
    if (location !== "/settings") {
      setLastMobileRouteBeforeSettings(location);
    }
  }, [location]);

  function handleMobileSettingsToggle() {
    if (location === "/settings") {
      navigate(lastMobileRouteBeforeSettings || "/");
      return;
    }
    setLastMobileRouteBeforeSettings(location);
    navigate("/settings");
  }

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar — Desktop */}
      <aside className="hidden h-full min-h-0 w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:flex lg:flex-col">
        <div className="shrink-0 border-b border-sidebar-border p-4">
          <div className="flex items-center gap-2.5">
            <NutriSmartLogo />
            <div>
              <div className="text-sm font-bold text-sidebar-foreground leading-tight">NutriSmart</div>
              <div className="text-[10px] text-sidebar-foreground/60 leading-tight">Nutrition Monitoring</div>
            </div>
          </div>
        </div>
        <SidebarContent location={location} darkMode={darkMode} onToggleDark={onToggleDark} />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed top-0 left-0 z-50 flex h-full min-h-0 w-64 flex-col border-r border-sidebar-border bg-sidebar">
            <div className="flex shrink-0 items-center justify-between border-b border-sidebar-border p-4">
              <div className="flex items-center gap-2.5">
                <NutriSmartLogo />
                <div>
                  <div className="text-sm font-bold text-sidebar-foreground">NutriSmart</div>
                  <div className="text-[10px] text-sidebar-foreground/60">Nutrition Monitoring</div>
                </div>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-1 text-sidebar-foreground/60">
                <X size={18} />
              </button>
            </div>
            <SidebarContent
              location={location}
              onNav={() => setSidebarOpen(false)}
              darkMode={darkMode}
              onToggleDark={onToggleDark}
            />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <main className="relative flex-1 overflow-auto p-4 md:p-5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed top-3 left-3 z-30 lg:hidden p-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm hover:bg-muted transition-colors"
            data-testid="button-menu"
          >
            <Menu size={18} className="text-foreground" />
          </button>
          <button
            onClick={handleMobileSettingsToggle}
            className="fixed top-3 left-14 z-30 lg:hidden p-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm hover:bg-muted transition-colors text-muted-foreground"
            data-testid="button-settings-mobile"
          >
            <Settings size={16} />
          </button>
          <button
            onClick={onToggleDark}
            className="fixed top-3 left-[6.25rem] z-30 lg:hidden p-2 rounded-lg border border-border bg-card/80 backdrop-blur-sm hover:bg-muted transition-colors text-muted-foreground"
            data-testid="button-toggle-dark-mobile"
          >
            {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {children}
        </main>
      </div>
    </div>
  );
}
