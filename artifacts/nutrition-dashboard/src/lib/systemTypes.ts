import { Building2, HeartPulse, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type SystemType = "organization" | "otc" | "healthcare";

export type SystemDefinition = {
  id: SystemType;
  name: string;
  description: string;
  route: string;
  icon: LucideIcon;
};

/** Public portal labels (sidebar / bilingual entry). NGO = org hub, OTP = outpatient, TFC = inpatient. */
export const SYSTEM_PORTAL_META: Record<
  SystemType,
  { portalEn: string; portalAr: string; taglineAr: string }
> = {
  organization: {
    portalEn: "NGO",
    portalAr: "المنظمات",
    taglineAr: "إدارة المنظمات والمراكز والتقارير الموحّدة",
  },
  otc: {
    portalEn: "OTP",
    portalAr: "العيادات الخارجية",
    taglineAr: "سجلات المرضى والمتابعة في العيادات الخارجية",
  },
  healthcare: {
    portalEn: "TFC",
    portalAr: "الرعاية الداخلية",
    taglineAr: "الرعاية التغذوية داخل المنشأة (قيد التوسع)",
  },
};

export const SYSTEM_DEFINITIONS: Record<SystemType, SystemDefinition> = {
  organization: {
    id: "organization",
    name: "NGO — Organization management",
    description:
      "Centers and partners share achievements on the public homepage; manage multiple OTP sites, analytics, and donor-ready reports.",
    route: "/organization",
    icon: Building2,
  },
  otc: {
    id: "otc",
    name: "OTP — Outpatient therapeutic programme",
    description:
      "Daily clinic workflows: screening, RUTF, anthropometry, and 12-week plans — built for CMAM teams in the field.",
    route: "/otc",
    icon: Stethoscope,
  },
  healthcare: {
    id: "healthcare",
    name: "TFC — Therapeutic feeding (inpatient)",
    description:
      "Hospital-grade nutrition workflows and stabilization care — extended module (rolling release).",
    route: "/healthcare",
    icon: HeartPulse,
  },
};

export function isSystemType(value: string): value is SystemType {
  return value in SYSTEM_DEFINITIONS;
}
