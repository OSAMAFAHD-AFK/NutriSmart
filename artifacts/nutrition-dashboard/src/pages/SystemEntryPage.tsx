import { ArrowLeft, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SYSTEM_DEFINITIONS, SYSTEM_PORTAL_META, type SystemType } from "@/lib/systemTypes";

const ENTRY_ORDER: SystemType[] = ["organization", "otc", "healthcare"];

export default function SystemEntryPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 px-4 py-8 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <Button
          type="button"
          variant="ghost"
          className="mb-6 -ms-2"
          onClick={() => setLocation("/")}
        >
          <ArrowLeft size={16} />
          <span className="ms-1">الصفحة الرئيسية / Home</span>
        </Button>

        <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-4 text-sm sm:px-6">
          <p className="font-semibold text-foreground" dir="rtl">
            مشاركة الإحصائيات
          </p>
          <p className="mt-1 text-muted-foreground" dir="rtl">
            يمكن لكل منظمة أو مركز لاحقاً دفع ملخصات أسبوعية (بدون بيانات شخصية) إلى الصفحة الرئيسية العامة، أو إلى
            لوحات الجهات المانحة ووزارة الصحة — يحفّز التنافس الإيجابي ويزيد دعم البرامج.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Roadmap: authenticated “publish to public homepage / donor API / MoH dashboard” from each system after
            sign-in. Requires internet as today.
          </p>
        </div>

        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
            NutriSmart — Staff portal
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-5xl">
            Choose your system
          </h1>
          <p className="mt-2 text-lg font-medium text-foreground" dir="rtl">
            NGO — OTP — TFC
          </p>
          <p className="mt-4 text-base text-muted-foreground sm:text-lg">
            Organization code + username + password. Multiple staff can share the same organisation code with their
            own credentials.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {ENTRY_ORDER.map((systemId) => {
            const system = SYSTEM_DEFINITIONS[systemId];
            const portal = SYSTEM_PORTAL_META[systemId];
            const Icon = system.icon;

            return (
              <button
                key={system.id}
                type="button"
                onClick={() => setLocation(`/login/${system.id}`)}
                className="group text-left"
                data-testid={`card-system-${system.id}`}
              >
                <Card className="h-full rounded-2xl border-border/70 bg-card/90 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/50 hover:shadow-xl">
                  <CardContent className="flex h-full flex-col p-7">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Icon size={24} />
                    </div>
                    <p className="mt-4 text-xs font-bold uppercase tracking-wide text-primary">
                      {portal.portalEn}
                      <span className="mx-1 text-muted-foreground">·</span>
                      <span dir="rtl">{portal.portalAr}</span>
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">
                      {system.name}
                    </h2>
                    <p className="mt-1 text-xs text-muted-foreground" dir="rtl">
                      {portal.taglineAr}
                    </p>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {system.description}
                    </p>
                    <div className="mt-6">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-between rounded-xl py-5 text-sm"
                      >
                        Continue
                        <ArrowRight size={16} />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
