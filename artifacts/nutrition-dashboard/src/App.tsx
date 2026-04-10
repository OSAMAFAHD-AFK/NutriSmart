import { useState, useEffect } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Patients from "@/pages/Patients";
import Analytics from "@/pages/Analytics";
import AgeGroupPage from "@/pages/AgeGroupPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router({ darkMode, onToggleDark }: { darkMode: boolean; onToggleDark: () => void }) {
  return (
    <Layout darkMode={darkMode} onToggleDark={onToggleDark}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/group/:groupId" component={AgeGroupPage} />
        <Route path="/patients" component={Patients} />
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
          <Router darkMode={darkMode} onToggleDark={toggleDark} />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
