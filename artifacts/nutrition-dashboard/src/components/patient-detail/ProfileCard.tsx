import type { LucideIcon } from "lucide-react";

export default function ProfileCard({
  title,
  icon: Icon,
  children,
  accent = "default",
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  accent?: "default" | "ok" | "warn" | "danger";
}) {
  const border =
    accent === "danger"
      ? "border-red-200/80 dark:border-red-900/60"
      : accent === "warn"
        ? "border-amber-200/80 dark:border-amber-900/50"
        : accent === "ok"
          ? "border-emerald-200/80 dark:border-emerald-900/50"
          : "border-border";
  return (
    <div className={`rounded-xl border bg-card/80 p-4 shadow-sm backdrop-blur-sm ${border}`}>
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
