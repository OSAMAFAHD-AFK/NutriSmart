import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronRight,
  ExternalLink,
  Globe,
  HeartHandshake,
  HeartPulse,
  Menu,
  Play,
  Sparkles,
  Stethoscope,
  Users,
  Video,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { SYSTEM_PORTAL_META, SYSTEM_DEFINITIONS, type SystemType } from "@/lib/systemTypes";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const ENTRY_ORDER: SystemType[] = ["organization", "otc", "healthcare"];

/** Respectful stock imagery — replace with your own photography when available. */
const CHILD_STORIES: {
  key: string;
  src: string;
  anim: "recovery" | "treatment" | "urgent";
  badgeAr: string;
  badgeEn: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
}[] = [
  {
    key: "recovery",
    src: "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=900&h=1125&q=80",
    anim: "recovery",
    badgeAr: "تعافٍ",
    badgeEn: "Recovery",
    titleAr: "بعد التدخل والمتابعة",
    titleEn: "After care & weekly follow-up",
    bodyAr: "حركة خفيفة ترمز للطاقة والفرح عند تحسن الوزن والعودة للنشاط.",
    bodyEn: "A light bounce suggests energy returning as weight and play improve.",
  },
  {
    key: "treatment",
    src: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=900&h=1125&q=80",
    anim: "treatment",
    badgeAr: "تحت العلاج",
    badgeEn: "On treatment",
    titleAr: "في العيادة أو المركز الصحي",
    titleEn: "At the clinic or health centre",
    bodyAr: "نبض حول الصورة يرمز للمتابعة الطبية وبرامج RUTF والزيارات الدورية.",
    bodyEn: "A soft pulse ring represents nursing reviews, RUTF, and scheduled visits.",
  },
  {
    key: "urgent",
    src: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773f?auto=format&fit=crop&w=900&h=1125&q=80",
    anim: "urgent",
    badgeAr: "خطر وتدخل",
    badgeEn: "Risk & urgency",
    titleAr: "سوء تغذية حاد يحتاج إحالة سريعة",
    titleEn: "Severe acute malnutrition needs rapid referral",
    bodyAr: "تنفس بصري بطيء يذكّر بأن كل أسبوع تأخير يزيد الخطر — الاكتشاف المبكر ينقذ الأرواح.",
    bodyEn: "A slow visual “breath” reminds us that delay costs lives — early screening matters.",
  },
];

const ORG_ACHIEVEMENTS = [
  {
    org: "UNICEF",
    ar: "أكثر من مليون طفل تلقوا دعماً غذائياً في برامج 2026 (مثال للواجهة).",
    en: "Over 1M children reached with nutrition support in 2026 programmes (sample headline).",
  },
  {
    org: "WFP",
    ar: "شحنات جاهزة للاستهلاك ودعم الأسر في المناطق الأشد احتياجاً.",
    en: "Ready-to-use foods and household support in highest-need areas.",
  },
  {
    org: "WHO",
    ar: "تحديثات بروتوكولات التغذية العلاجية والمتابعة الميدانية.",
    en: "Updated therapeutic feeding protocols and field guidance.",
  },
  {
    org: "شريك محلي",
    ar: "مشاركة إنجازات الأسبوع على الصفحة العامة لزيادة الشفافية والتنافس الإيجابي.",
    en: "Weekly highlights on the public site for transparency and healthy competition.",
  },
] as const;

const STUDY_LINKS = [
  {
    title: "WHO — Nutrition",
    href: "https://www.who.int/health-topics/nutrition",
    body: "تعريفات SAM/MAM وربط التغذية بالنظام الصحي.",
  },
  {
    title: "UNICEF — Child nutrition",
    href: "https://www.unicef.org/nutrition",
    body: "أدلة البرامج وإدارة سوء التغذية الحاد في المجتمع.",
  },
  {
    title: "WHO eLENA",
    href: "https://www.who.int/teams/nutrition-and-food-safety/food-nutrition-actions",
    body: "بروتوكولات موصى بها للتكييف الوطني.",
  },
] as const;

const ARTICLES = [
  {
    titleAr: "لماذا يهم MUAC في OTP؟",
    titleEn: "Why MUAC matters in OTP",
    excerptAr: "قياس بسيط يحدد الحاجة للتدخل السريع.",
    excerptEn: "A simple tape measure flags children who need rapid care.",
  },
  {
    titleAr: "الوذمة المدرّجة والإحالة",
    titleEn: "Graded edema & referral",
    excerptAr: "+/++/+++ تتطلب تقييماً طبياً وفق CMAM.",
    excerptEn: "Graded edema triggers inpatient stabilization per protocol.",
  },
  {
    titleAr: "بيانات للمانحين",
    titleEn: "Data for donors",
    excerptAr: "لوحات وتصديرات بدون تعريض للخصوصية عند الربط الصحيح.",
    excerptEn: "Dashboards and exports with proper anonymisation.",
  },
] as const;

const DONATION_TARGETS = [
  { id: "unicef", labelAr: "اليونيسف", labelEn: "UNICEF" },
  { id: "wfp", labelAr: "برنامج الأغذية العالمي", labelEn: "World Food Programme" },
  { id: "partner", labelAr: "منظمة شريكة في اليمن", labelEn: "Partner NGO in Yemen" },
  { id: "nutrismart", labelAr: "دعم منصة NutriSmart", labelEn: "Support NutriSmart" },
] as const;

function DonationDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [target, setTarget] = useState<string>(DONATION_TARGETS[0]!.id);
  const [card, setCard] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");

  const selectedLabel = useMemo(() => {
    const row = DONATION_TARGETS.find((t) => t.id === target);
    return row ? `${row.labelAr} — ${row.labelEn}` : "";
  }, [target]);

  function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast({
      title: "عرض توضيحي",
      description: `لا يوجد دفع حقيقي. المستفيد: ${selectedLabel}`,
    });
    onOpenChange(false);
    setCard("");
    setExpiry("");
    setCvc("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle dir="rtl">تبرّع (واجهة تجريبية)</DialogTitle>
          <DialogDescription>
            اختر الجهة ثم الحقول أدناه للعرض فقط. <strong>لا تُدخل بطاقة حقيقية.</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleDemoSubmit} className="space-y-4">
          <RadioGroup value={target} onValueChange={setTarget} className="gap-2">
            {DONATION_TARGETS.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <RadioGroupItem value={t.id} id={`d-${t.id}`} />
                <Label htmlFor={`d-${t.id}`} className="flex-1 cursor-pointer text-sm">
                  <span dir="rtl" className="font-medium">
                    {t.labelAr}
                  </span>
                  <span className="block text-xs text-muted-foreground">{t.labelEn}</span>
                </Label>
              </div>
            ))}
          </RadioGroup>
          <Separator />
          <Input placeholder="Card (demo)" value={card} onChange={(e) => setCard(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="MM/YY" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            <Input placeholder="CVC" value={cvc} onChange={(e) => setCvc(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit">إنهاء العرض</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ChildCard({
  story,
}: {
  story: (typeof CHILD_STORIES)[number];
}) {
  const animClass =
    story.anim === "recovery"
      ? "ns-home-child-recovery"
      : story.anim === "treatment"
        ? "ns-home-child-treatment"
        : "ns-home-child-urgent";

  return (
    <article className="group flex flex-col">
      <div
        className={cn(
          "relative overflow-hidden rounded-3xl border border-border/60 bg-muted shadow-lg ring-1 ring-black/5 dark:ring-white/10",
          animClass,
        )}
      >
        <div className="aspect-[4/5] w-full overflow-hidden">
          <img
            src={story.src}
            alt=""
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
          <span className="inline-flex rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm">
            {story.badgeEn} · <span dir="rtl">{story.badgeAr}</span>
          </span>
          <h3 className="mt-2 text-lg font-bold leading-snug sm:text-xl" dir="rtl">
            {story.titleAr}
          </h3>
          <p className="mt-0.5 text-sm text-white/90">{story.titleEn}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-muted-foreground" dir="rtl">
        {story.bodyAr}
      </p>
      <p className="mt-1 text-xs text-muted-foreground/90">{story.bodyEn}</p>
    </article>
  );
}

export default function PublicHomePage() {
  const [, setLocation] = useLocation();
  const [donateOpen, setDonateOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const nav = (
    <>
      <a href="#about" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
        من نحن
      </a>
      <a href="#children" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
        القصص
      </a>
      <a href="#impact" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
        الأثر
      </a>
      <a href="#orgs" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
        الإنجازات
      </a>
      <a href="#studies" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
        الدراسات
      </a>
      <a href="#learn" className="rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-muted hover:text-foreground">
        التثقيف
      </a>
    </>
  );

  return (
    <div className="min-h-screen bg-[hsl(210_40%_98%)] text-foreground dark:bg-zinc-950">
      <DonationDialog open={donateOpen} onOpenChange={setDonateOpen} />

      {/* Critical: this is NOT the clinical app */}
      <div className="border-b border-sky-900/20 bg-gradient-to-r from-sky-700 via-sky-600 to-teal-600 px-4 py-2.5 text-center text-[13px] font-medium text-white shadow-sm sm:text-sm">
        <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <Globe className="hidden h-4 w-4 opacity-90 sm:inline" aria-hidden />
          <span dir="rtl">
            أنت على <strong className="font-bold">الموقع العام</strong> للمعلومات والتبرّع والتوعية — هذا ليس نظام
            تشغيل العيادات.
          </span>
          <span className="text-white/85">|</span>
          <span>
            You are on the <strong>public website</strong> — not the staff clinical system.
          </span>
        </span>
      </div>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-white/85 shadow-sm backdrop-blur-xl dark:bg-zinc-950/90">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-[4.25rem] sm:px-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center gap-2 text-start"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-600 text-lg font-black text-white shadow-md">
              N
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight sm:text-lg">NutriSmart</span>
              <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">Public site · موقع عام</span>
            </span>
          </button>

          <nav className="hidden items-center gap-0.5 lg:flex">{nav}</nav>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              aria-label="القائمة"
              onClick={() => setMobileNav((v) => !v)}
            >
              {mobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button variant="outline" size="sm" className="hidden sm:inline-flex rounded-full" onClick={() => setDonateOpen(true)}>
              <HeartHandshake className="me-1.5 h-4 w-4" />
              تبرّع
            </Button>
            <Button
              size="sm"
              className="rounded-full bg-zinc-900 px-4 text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              onClick={() => setLocation("/systems")}
            >
              دخول الفريق
              <ChevronRight className="ms-0.5 h-4 w-4 opacity-80" />
            </Button>
          </div>
        </div>
        {mobileNav && (
          <div className="border-t border-border bg-white px-4 py-4 dark:bg-zinc-950 lg:hidden">
            <nav className="flex flex-col gap-1" onClick={() => setMobileNav(false)}>
              {nav}
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* Hero — marketing site, not dashboard */}
        <section className="relative overflow-hidden border-b border-border/40">
          <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl dark:bg-teal-500/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl dark:bg-sky-600/10" />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 sm:pb-28 sm:pt-20">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.35em] text-teal-600 dark:text-teal-400">
              Yemen · Nutrition · Partnership
            </p>
            <h1
              className="mx-auto mt-5 max-w-4xl text-center text-4xl font-extrabold leading-[1.12] tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl md:text-6xl"
              dir="rtl"
            >
              معاً ضد سوء التغذية
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-center text-lg text-muted-foreground sm:text-xl">
              موقع عام للتوعية، الأدلة، وإبراز إنجاز الشركاء —{" "}
              <span className="font-medium text-foreground">أنظمة OTP و TFC وNGO</span> تفتح فقط من زر{" "}
              <span className="whitespace-nowrap font-semibold text-teal-700 dark:text-teal-400">«دخول الفريق»</span>.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" className="h-12 rounded-full px-8 text-base shadow-lg shadow-teal-600/25" asChild>
                <a href="#about">
                  من نحن؟
                  <ArrowRight className="ms-2 h-5 w-5 rtl:rotate-180" />
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-12 rounded-full px-8 text-base" asChild>
                <a href="#children">القصص الثلاث</a>
              </Button>
              <Button size="lg" variant="secondary" className="h-12 rounded-full px-8 text-base" onClick={() => setDonateOpen(true)}>
                تبرّع الآن
              </Button>
            </div>
          </div>
        </section>

        {/* Three children + distinct motion per state */}
        <section id="children" className="scroll-mt-24 bg-white py-16 dark:bg-zinc-950 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl" dir="rtl">
                ثلاث حالات — ثلاث حركات
              </h2>
              <p className="mt-3 text-muted-foreground sm:text-lg" dir="rtl">
                صور حقيقية من مكتبة Unsplash كعيّنة بصرية؛ استبدلها بصوركم المعتمدة. كل عمود يتحرك بطريقة مختلفة
                حسب الحالة (تعافٍ، علاج، خطر).
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Each column uses a different motion: float, care pulse, or slow “breathing” emphasis.
              </p>
            </div>
            <div className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
              {CHILD_STORIES.map((s) => (
                <ChildCard key={s.key} story={s} />
              ))}
            </div>
          </div>
        </section>

        {/* Who we are — prominent */}
        <section id="about" className="scroll-mt-24 border-y border-border/60 bg-zinc-50 py-16 dark:bg-zinc-900/50 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-teal-600 dark:text-teal-400">من نحن</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl" dir="rtl">
                NutriSmart ليست «الشاشة الطبية» التي تراها الآن
              </h2>
              <p className="mt-5 text-base leading-relaxed text-muted-foreground" dir="rtl">
                هذه الصفحة مخصصة للجمهور: مانحون، إعلام، متطوعون، وشركاء. نعرض إنجازات المنظمات، روابط WHO/UNICEF،
                مقالات تثقيفية، وقناة تبرّع (تجريبية). أما <strong className="text-foreground">سجلات المرضى والعيادات</strong> فتوجد
                خلف تسجيل دخول المنظمة وبيانات المستخدم — من زر <strong className="text-foreground">دخول الفريق</strong> فقط.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                NutriSmart builds digital tools for CMAM-style programmes in Yemen. This marketing layer stays separate
                from PHI — clinical work happens only after organisation code + staff credentials.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button className="rounded-full" onClick={() => setLocation("/systems")}>
                  الانتقال لبوابة الأنظمة
                  <ChevronRight className="ms-1 h-4 w-4" />
                </Button>
                <Button variant="outline" className="rounded-full" asChild>
                  <a href="#impact">أرقام الأثر</a>
                </Button>
              </div>
            </div>
            <div className="relative rounded-3xl border border-border bg-gradient-to-br from-teal-500/10 via-white to-sky-500/10 p-8 shadow-inner dark:from-teal-500/5 dark:via-zinc-950 dark:to-sky-500/5">
              <Users className="h-10 w-10 text-teal-600 dark:text-teal-400" />
              <h3 className="mt-4 text-xl font-bold" dir="rtl">
                ماذا نقدّم؟
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-2" dir="rtl">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <span>بوابة NGO لإدارة المراكز والتقارير (تتطور حسب خارطة الطريق).</span>
                </li>
                <li className="flex gap-2" dir="rtl">
                  <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <span>نظام OTP للعيادات الخارجية — السجلات والمتابعة 12 أسبوعاً.</span>
                </li>
                <li className="flex gap-2" dir="rtl">
                  <HeartPulse className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                  <span>مسار TFC / الرعاية الداخلية — قيد التوسع.</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Impact */}
        <section id="impact" className="scroll-mt-24 bg-white py-16 dark:bg-zinc-950 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center text-3xl font-bold sm:text-4xl" dir="rtl">
              أرقام توضيحية للأثر
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-sm text-muted-foreground">
              عيّنة للتصميم — استبدلها ببيانات معتمدة عند الربط بقاعدة البيانات.
            </p>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                { n: "2.4M+", ar: "أطفال معرضون لسوء التغذية الحاد عالمياً (تقريب)", en: "Children under five at risk of acute malnutrition (global)." },
                { n: "120k+", ar: "حالة SAM يمكن رصدها رقمياً عبر الشبكة (هدف)", en: "SAM cases trackable digitally (platform goal)." },
                { n: "48h", ar: "تقارير جاهزة للمانح بعد ربط المراكز", en: "Donor-ready reporting after centres connect." },
              ].map((x) => (
                <div
                  key={x.n}
                  className="rounded-2xl border border-border bg-gradient-to-b from-muted/40 to-card p-8 text-center shadow-sm"
                >
                  <p className="text-4xl font-black tabular-nums text-teal-600 dark:text-teal-400 sm:text-5xl">{x.n}</p>
                  <p className="mt-4 text-sm font-medium text-foreground" dir="rtl">
                    {x.ar}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{x.en}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Org wall */}
        <section id="orgs" className="scroll-mt-24 border-t border-border bg-zinc-50 py-16 dark:bg-zinc-900/40 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-3xl font-bold sm:text-4xl" dir="rtl">
                  إنجازات الشركاء
                </h2>
                <p className="mt-2 max-w-xl text-muted-foreground" dir="rtl">
                  جدار شفافية — كل منظمة تشارك ما يُسمح به علناً لتحفيز الدعم والتنافس الإيجابي.
                </p>
              </div>
              <Building2 className="hidden h-12 w-12 text-muted-foreground/30 sm:block" />
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {ORG_ACHIEVEMENTS.map((o) => (
                <div
                  key={o.org}
                  className="rounded-2xl border border-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:bg-zinc-950"
                >
                  <p className="text-xs font-bold uppercase tracking-wider text-teal-600">{o.org}</p>
                  <p className="mt-3 text-sm leading-relaxed" dir="rtl">
                    {o.ar}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{o.en}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Studies */}
        <section id="studies" className="scroll-mt-24 bg-white py-16 dark:bg-zinc-950 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl" dir="rtl">
              أحدث المراجع
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {STUDY_LINKS.map((s) => (
                <a
                  key={s.href}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-teal-500/40 hover:shadow-lg"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-teal-600" />
                  <p className="mt-3 font-semibold">{s.title}</p>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground" dir="rtl">
                    {s.body}
                  </p>
                  <span className="mt-4 text-xs font-medium text-teal-600">فتح الرابط →</span>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Learn + media */}
        <section id="learn" className="scroll-mt-24 border-t border-border bg-zinc-50 py-16 dark:bg-zinc-900/40 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold sm:text-4xl" dir="rtl">
              تثقيف ووسائط
            </h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {ARTICLES.map((a) => (
                <article key={a.titleEn} className="rounded-2xl border border-border bg-white p-6 dark:bg-zinc-950">
                  <BookOpen className="h-8 w-8 text-teal-600" />
                  <h3 className="mt-4 font-bold" dir="rtl">
                    {a.titleAr}
                  </h3>
                  <p className="text-xs text-muted-foreground">{a.titleEn}</p>
                  <p className="mt-3 text-sm text-muted-foreground" dir="rtl">
                    {a.excerptAr}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex aspect-video flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white/80 dark:bg-zinc-950/80"
                >
                  <Video className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-xs text-muted-foreground">فيديو توعوي #{i}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-border bg-white p-6 dark:bg-zinc-950">
                <Play className="h-12 w-12 text-teal-600 opacity-90" />
                <p className="mt-3 text-center text-sm font-medium" dir="rtl">
                  قصة قبل / بعد (قريباً)
                </p>
              </div>
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-border bg-white p-6 dark:bg-zinc-950">
                <Play className="h-12 w-12 text-teal-600 opacity-90" />
                <p className="mt-3 text-center text-sm font-medium" dir="rtl">
                  شهادة فريق ميداني (قريباً)
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-teal-900 py-16 text-white sm:py-20">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 text-center sm:px-6">
            <h2 className="max-w-2xl text-3xl font-bold sm:text-4xl" dir="rtl">
              ادعم الأطفال أو المنصة
            </h2>
            <p className="max-w-xl text-sm text-white/80">
              واجهة تبرّع تجريبية — الإنتاج يتطلب بوابة دفع معتمدة وامتثال PCI.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" className="rounded-full bg-white text-zinc-900 hover:bg-zinc-100" onClick={() => setDonateOpen(true)}>
                تبرّع
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                onClick={() => setLocation("/systems")}
              >
                دخول الفريق
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white py-12 dark:bg-zinc-950">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          <div>
            <p className="text-lg font-bold">NutriSmart</p>
            <p className="mt-2 text-sm text-muted-foreground" dir="rtl">
              موقع عام منفصل عن أنظمة التشغيل الطبية.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">روابط</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#about" className="text-teal-700 hover:underline dark:text-teal-400">
                  من نحن
                </a>
              </li>
              <li>
                <a href="#children" className="text-teal-700 hover:underline dark:text-teal-400">
                  القصص الثلاث
                </a>
              </li>
              <li>
                <a href="#studies" className="text-teal-700 hover:underline dark:text-teal-400">
                  الدراسات
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">للمختصين</p>
            <ul className="mt-3 space-y-2 text-sm">
              {ENTRY_ORDER.map((id) => {
                const m = SYSTEM_PORTAL_META[id];
                const d = SYSTEM_DEFINITIONS[id];
                return (
                  <li key={id}>
                    <button type="button" className="text-start text-teal-700 hover:underline dark:text-teal-400" onClick={() => setLocation(`/login/${id}`)}>
                      {m.portalEn} / {m.portalAr} — {d.name.split("—")[0]?.trim()}
                    </button>
                  </li>
                );
              })}
              <li>
                <button type="button" className="text-teal-700 hover:underline dark:text-teal-400" onClick={() => setLocation("/systems")}>
                  كل الأنظمة (بوابة)
                </button>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">© {new Date().getFullYear()}</p>
            <p className="mt-2 text-xs text-muted-foreground">NutriSmart — Yemen nutrition platform. Demo content.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
