# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Yemen Nutrition Monitoring System (`artifacts/nutrition-dashboard`)
- **Type**: React + Vite (frontend-only PWA)
- **Preview Path**: `/`
- **Description**: Professional medical dashboard for tracking malnutrition cases in Yemen
- **Features**:
  - Dashboard with KPI cards (Total Patients, SAM, MAM, Recovered, Deaths, Recovery Rate)
  - Charts: Cases by Governorate (stacked bar), Gender Distribution (pie), Weekly Trend (line), Diagnosis Split
  - Patient Management Table: 40+ columns covering basic info, measurements, diagnosis, treatment, weekly tracking (weeks 1-4 with separators)
  - Add/Edit Patient modal with: basic info, DOB-based age calculation, father/guardian info, hierarchical location (Governorate → District), medical measurements, auto-calculated MUAC/WFH/Z-score/RUTF, treatment plan, symptoms, photo upload
  - Patient Detail View modal with full profile including guardian info, all medical data, weekly history
  - Weekly Update modal: select week (1-4), update weight/MUAC/height/Z-score/RUTF/supplements
  - Symptoms modal with checklist
  - Edema logic: if edema=YES → alert + disable weekly inputs + highlight row red
  - RUTF formula: Weight × 200 / 500
  - Age filters: Under 2y, 5y, 7y, 10y
  - Search and multi-level filter (Diagnosis, Governorate, District)
  - Analytics page: malnutrition rates by district (filterable by governorate), death rate, recovery rate, gender comparison, weekly MUAC trend, age distribution, region summary table
  - Dark/Light mode toggle
  - PWA manifest
  - Data persisted in localStorage
  - Sync Data button (simulated)
- **Data**: 20 pre-seeded mock patients across Yemen governorates
- **Key files**:
  - `src/lib/data.ts` — data types, mock data, localStorage, calculation functions
  - `src/pages/Dashboard.tsx` — main dashboard with KPIs and charts
  - `src/pages/Patients.tsx` — patient table with all features
  - `src/pages/Analytics.tsx` — advanced analytics with district breakdown
  - `src/components/Layout.tsx` — sidebar navigation layout
  - `src/components/PatientModal.tsx` — add/edit patient form modal
  - `src/components/PatientDetailModal.tsx` — full patient profile view
  - `src/components/WeeklyUpdateModal.tsx` — weekly data update modal
  - `src/components/SymptomsModal.tsx` — symptoms checklist modal
