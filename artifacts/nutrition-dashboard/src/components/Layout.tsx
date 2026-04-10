import { useState } from "react";
import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, BarChart3, Menu, X, Activity, Moon, Sun } from "lucide-react";
import { AGE_GROUP_LIST } from "@/lib/ageGroups";

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
  const isActive = (href: string) =>
    href === "/" ? location === "/" : location === href || location.startsWith(href + "/");

  return (
    <>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {/* Overview */}
        <Link
          href="/"
          onClick={onNav}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive("/") && !location.startsWith("/group") && !location.startsWith("/patients") && !location.startsWith("/analytics") ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
        >
          <LayoutDashboard size={16} />
          Overview
        </Link>

        {/* Age Groups Section */}
        <div className="pt-3 pb-1">
          <div className="px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider mb-1.5">Age Group Programs</div>
          {AGE_GROUP_LIST.map((group) => {
            const href = `/group/${group.id}`;
            const active = location === href || location.startsWith(href);
            return (
              <Link
                key={group.id}
                href={href}
                onClick={onNav}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${active ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
              >
                <span className="text-base leading-none">{group.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{group.label}</div>
                  <div className={`text-[10px] truncate ${active ? "text-sidebar-primary-foreground/70" : "text-sidebar-foreground/40"}`}>{group.sponsor}</div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-sidebar-border my-2" />

        {/* All Patients */}
        <Link
          href="/patients"
          onClick={onNav}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive("/patients") ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
        >
          <Users size={16} />
          All Patients
        </Link>

        {/* Analytics */}
        <Link
          href="/analytics"
          onClick={onNav}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${isActive("/analytics") ? "bg-sidebar-primary text-sidebar-primary-foreground" : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"}`}
        >
          <BarChart3 size={16} />
          Analytics
        </Link>
      </nav>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <div className="px-3 py-2">
          <div className="text-[10px] text-sidebar-foreground/40 uppercase tracking-wide mb-1">Organization</div>
          <div className="text-xs text-sidebar-foreground/70">WHO / WFP / UNICEF</div>
          <div className="text-xs text-sidebar-foreground/50 mt-0.5">Yemen Field Office</div>
        </div>
        <button
          onClick={onToggleDark}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all"
          data-testid="button-toggle-dark"
        >
          {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>
    </>
  );
}

export default function Layout({ children, darkMode, onToggleDark }: Props) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar — Desktop */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 bg-sidebar border-r border-sidebar-border h-full">
        <div className="p-4 border-b border-sidebar-border shrink-0">
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
          <aside className="fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-50 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
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
        {/* Top Bar */}
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 bg-card/50 backdrop-blur-sm shrink-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            data-testid="button-menu"
          >
            <Menu size={18} className="text-foreground" />
          </button>
          <div className="flex-1">
            <span className="text-sm font-semibold text-foreground hidden sm:block">NutriSmart — Yemen Nutrition Monitoring System</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              <Activity size={11} className="text-green-500" />
              <span>PWA Active</span>
            </div>
            <button
              onClick={onToggleDark}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground lg:hidden"
              data-testid="button-toggle-dark-mobile"
            >
              {darkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
              HW
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 md:p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
