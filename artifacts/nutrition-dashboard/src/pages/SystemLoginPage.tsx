import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SYSTEM_DEFINITIONS, type SystemType } from "@/lib/systemTypes";
import {
  ensureLoginDefaults,
  LOGIN_STORAGE,
  readLoginField,
} from "@/lib/loginDefaults";

type Props = {
  systemId: SystemType;
};

export default function SystemLoginPage({ systemId }: Props) {
  const [, setLocation] = useLocation();
  const system = SYSTEM_DEFINITIONS[systemId];

  const [orgCode, setOrgCode] = useState<string>(() => readLoginField("org"));
  const [username, setUsername] = useState<string>(() => readLoginField("user"));
  const [password, setPassword] = useState<string>(() => readLoginField("pass"));

  useEffect(() => {
    ensureLoginDefaults();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LOGIN_STORAGE.org, orgCode);
      localStorage.setItem(LOGIN_STORAGE.user, username);
      localStorage.setItem(LOGIN_STORAGE.pass, password);
    } catch {
      /* ignore */
    }
  }, [orgCode, username, password]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocation(system.route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8 sm:py-14">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button type="button" variant="ghost" className="-ml-2" onClick={() => setLocation("/")}>
            <ArrowLeft size={16} />
            Public home
          </Button>
          <Button type="button" variant="ghost" onClick={() => setLocation("/systems")}>
            Staff portal
          </Button>
        </div>

        <Card className="rounded-2xl border-border/70 shadow-lg">
          <CardHeader className="space-y-6 pb-2">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ShieldCheck size={26} />
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tracking-tight text-foreground">
                NutriSmart
              </p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {system.name}
              </p>
            </div>
            <CardTitle className="text-center text-lg font-semibold">
              Secure Login
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-4">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label htmlFor="organization-code">Organization Code</Label>
                <Input
                  id="organization-code"
                  required
                  value={orgCode}
                  onChange={(e) => setOrgCode(e.target.value)}
                  placeholder="0000"
                  autoComplete="organization"
                  data-testid="input-organization-code"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="OSAMA"
                  autoComplete="username"
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                  autoComplete="current-password"
                  data-testid="input-password"
                />
              </div>

              <Button type="submit" className="mt-2 w-full">
                Login
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
