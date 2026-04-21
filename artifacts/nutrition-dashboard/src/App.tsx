import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Analytics from "@/pages/Analytics";
import AgeGroupPage from "@/pages/AgeGroupPage";
import NotFound from "@/pages/not-found";
import PublicHomePage from "@/pages/PublicHomePage";
import SystemEntryPage from "@/pages/SystemEntryPage";
import SystemLoginPage from "@/pages/SystemLoginPage";
import OrganizationManagementPage from "@/pages/OrganizationManagementPage";
import HealthcareComingSoonPage from "@/pages/HealthcareComingSoonPage";
import { isSystemType } from "@/lib/systemTypes";

const queryClient = new QueryClient();

function OtcSystemRoutes({
  darkMode,
  onToggleDark,
}: {
  darkMode: boolean;
  onToggleDark: () => void;
}) {
  return (
    <Layout darkMode={darkMode} onToggleDark={onToggleDark}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/group/:groupId" component={AgeGroupPage} />
        <Route path="/analytics" component={Analytics} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("yns_dark_mode");
    return stored === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("yns_dark_mode", String(darkMode));
  }, [darkMode]);

  const toggleDark = () => setDarkMode((prev) => !prev);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            <Route path="/" component={PublicHomePage} />
            <Route path="/systems" component={SystemEntryPage} />
            <Route path="/login/:systemId">
              {(params) =>
                isSystemType(params.systemId) ? (
                  <SystemLoginPage systemId={params.systemId} />
                ) : (
                  <NotFound />
                )
              }
            </Route>
            <Route path="/organization" component={OrganizationManagementPage} />
            <Route path="/healthcare" component={HealthcareComingSoonPage} />
            <Route path="/otc" nest>
              <OtcSystemRoutes darkMode={darkMode} onToggleDark={toggleDark} />
            </Route>
            <Route component={NotFound} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
