# PVB HRMS — Settings Module Final Closure Audit

**Document type:** Audit & planning only (no implementation)  
**Date:** 2026-10-09  
**Scope:** Live routed/imported Admin HR Settings (`/hr/settings/**`)  
**Out of scope:** Accounts, non-HR modules, DB/API/Prisma, mobile native app, Requests, F&F build  

**Evidence basis:** Code inspection of `settings-catalog.ts`, Settings clients/data helpers, importers, and `npx tsc --noEmit`.  
**Browser runtime:** Not executed in this audit → marked **MANUAL USER CHECK REQUIRED** where applicable.

---

## 1. Executive summary

The Settings module is a **broad, mostly implemented localStorage configuration hub**. Organization, Attendance (Shift / Holiday / Policy), Leave, Payroll masters, Statutory, Tax, Travel Policy, Templates, and Notifications are **present in the live sidebar** and have **real operational readers** in many cases.

Settings is **not yet commercially closed**. Closing it requires fixing **source-of-truth breaks** (hardcoded dropdowns overriding org masters), resolving **Employment Status conflict with Offboarding**, removing **orphan Weekly Off**, simplifying **weak-consumer** pages (Welcome, Attendance Modes), and deciding **F&F rules vs transaction inputs** without inventing a Settings mega-module.

| Severity | Finding | Tag |
|----------|---------|-----|
| Critical | Employee Create/Master + several Attendance filters use `lib/hr/config.ts` hardcoded dept/designation/status options instead of org Settings stores | **NEEDS FIX** |
| Critical | Offboarding writes `"terminated"` / `"resigned"`; Employment Statuses master is separate and not the write path | **NEEDS BUSINESS DECISION** |
| High | Product logic hardcodes `"Optional Leave"` / `"Unpaid"` by display name | **NEEDS FIX** |
| High | Org / Holiday / Shift stores often **lack CustomEvent update broadcasts** → live pages may not refresh until remount | **NEEDS FIX** (connectivity) |
| Medium | Attendance Modes = config UI with **no punch-enforcement consumer** found | **KEEP BUT SIMPLIFY** |
| Medium | Welcome Workflow = demo/send history; email channel pending | **KEEP BUT SIMPLIFY / HIDE** |
| Low | Weekly Off standalone page exists off-catalog; Shift owns weekly offs | **SAFE TO DELETE LATER** |
| OK | Branch Manager / Dept Parent / Designation Level already off UI; Travel Policy does not Add Designation | **DO NOT CHANGE — already correct** |
| OK | Holiday Calendar single catalog placement (Attendance); Leave duplicate removed in Phase 1 | **DO NOT CHANGE — already correct** |
| Gap | No F&F Settings (encashment/notice recovery) — prefer transaction + existing Leave/Payroll | **NEEDS BUSINESS DECISION** for Phase 3 |

**Typecheck (this run):** `npx tsc --noEmit --pretty false --incremental false` → **exit 0**, **0 errors** (live HR / live non-HR / DESKTOP: none reported).

---

## FINAL CONCLUSION

**SETTINGS AUDIT COMPLETE — READY FOR BUSINESS REVIEW**

Blockers for *implementation* of Settings closure are identified and sequenced below; they do not block this audit document. No product code was changed.

---

## 2. Full Settings inventory

### 2.1 Canonical catalog (live sidebar)

Source: `app/(app)/hr/settings/_components/settings-catalog.ts`  
Sidebar builder: `buildSettingsSidebarLinks()` — only `status: "available"` items with `href` are shown.  
Coming-soon rows (Expense Categories, Declaration Categories, Form 16 Configuration, Issue Rules) were removed from catalog arrays in Phase 1 — **not visible**.

| Section | Label | Route | Primary client | Store / key | Update event | Classification |
|---------|-------|-------|----------------|-------------|--------------|----------------|
| Overview | Overview | `/hr/settings` | `SettingsLandingClient.tsx` | — | — | KEEP BUT SIMPLIFY |
| Organization | Company Profile | `/hr/settings/organization/company` | `CompanyProfileClient.tsx` | `ds_hr_org_company_v3` | **None found** (localStorage write only) | MUST KEEP |
| | Branches | `…/branches` | `BranchesClient.tsx` | `ds_hr_org_branches_v3` | None found | MUST KEEP |
| | Departments | `…/departments` | `DepartmentsClient.tsx` | `ds_hr_org_departments_v2` | None found | MUST KEEP |
| | Designations | `…/designations` | `DesignationsClient.tsx` | `ds_hr_org_designations_v2` | None found | MUST KEEP |
| | Employee Types | `…/employee-types` | `EmployeeTypesClient.tsx` | `ds_hr_org_employee_types_v3` | None found | MUST KEEP |
| | Employment Statuses | `…/employment-statuses` | `EmploymentStatusesClient.tsx` | `ds_hr_org_employment_statuses_v2` | None found | KEEP BUT SIMPLIFY / BUSINESS DECISION |
| Employee Setup | Mandatory Documents | `…/onboarding/mandatory-documents` | `DocumentRequirementsClient.tsx` | `ds_hr_onboarding_document_requirements_v1` | (onboarding-data) | KEEP BUT SIMPLIFY |
| | Joining Checklist | `…/joining-checklist` | `JoiningChecklistClient.tsx` | `ds_hr_onboarding_joining_checklist_v1` | | KEEP BUT SIMPLIFY |
| | Welcome Workflow | `…/welcome-workflow` | `WelcomeWorkflowClient.tsx` | `ds_hr_welcome_templates_v1`, `ds_hr_welcome_setup_v1`, `ds_hr_welcome_sent_history_v1` | | KEEP BUT SIMPLIFY / HIDE |
| | Mandatory Profile Sections | `…/mandatory-profile` | `MandatoryProfileSectionsClient.tsx` | `ds_hr_onboarding_mandatory_profile_v1` | Instant toggle | MUST KEEP |
| Attendance | Shift Setup | `…/attendance/shift-setup` | `ShiftSetupClient.tsx` | `ds_hr_shift_setup_v2` | None found | MUST KEEP |
| | Holiday Calendar | `…/holiday-calendar` | `HolidayCalendarClient.tsx` | `ds_hr_holiday_calendar_v2` | None found | MUST KEEP |
| | Attendance Policy | `…/attendance-policy` | policy clients | `ds_hr_attendance_policies_v3` | `hr-attendance-policy-updated` | MUST KEEP |
| | Attendance Modes | `…/attendance-modes` | `AttendanceModesClient.tsx` | `ds_hr_attendance_modes_v1` | `hr-attendance-modes-updated` | KEEP BUT SIMPLIFY |
| Leave | Leave Types | `…/leave/leave-types` | `LeaveTypesClient.tsx` | `ds_hr_leave_types_v1` | `hr-leave-types-updated` | MUST KEEP |
| | Leave Policies | `…/leave-policies` | `LeavePoliciesClient.tsx` | `ds_hr_leave_policies_v1` + `ds_hr_employee_leave_policy_v1` | `hr-leave-policies-updated` / `hr-employee-leave-policy-updated` | MUST KEEP |
| Payroll | Salary Components | `…/salary-components` | `SalaryComponentsClient.tsx` | `ds_hr_salary_components_v1` | `hr-salary-components-updated` | MUST KEEP |
| | Salary Structures | `…/salary-structures` | `SalaryStructuresClient.tsx` | `ds_hr_salary_structures_v1` + emp map | `hr-salary-structures-updated` | MUST KEEP |
| | Payroll Cycle | `…/payroll-cycle` | `PayrollCycleClient.tsx` | `ds_hr_payroll_cycles_v1` | `hr-payroll-cycles-updated` | MUST KEEP |
| | LOP Rules | `…/lop-rules` | `LopRulesClient.tsx` | `ds_hr_lop_settings_v1` | `hr-lop-settings-updated` | MUST KEEP |
| | Payslip Template | `/hr/settings/templates?type=payslip` | `TemplateManagementClient.tsx` | `ds_hr_templates_v1` | `hr-templates-updated` | MERGE (nav) |
| Travel | Travel Policy | `…/reimbursement/travel-policy` | list + `[id]` clients | `ds_hr_travel_policies_v1` | `hr-travel-policies-updated` | MUST KEEP |
| Statutory | PF / ESI / PT / LWF | `…/statutory/*` | respective clients | `ds_hr_pf_configurations_v1`, `ds_hr_esi_*`, `ds_hr_professional_tax_configs_v1`, `ds_hr_lwf_configurations_v1` | matching `hr-*-updated` events | MUST KEEP (if payroll on) |
| Tax | Tax Regime / TDS | `…/tax/*` | clients | `ds_hr_tax_regime_configurations_v1`, `ds_hr_tds_slab_configurations_v1` | `hr-tax-regime-configurations-updated`, `hr-tds-slab-configurations-updated` | MUST KEEP (if payroll on) |
| Letters | Template Management | `/hr/settings/templates` | `TemplateManagementClient.tsx` | `ds_hr_templates_v1` | `hr-templates-updated` | MUST KEEP |
| Notifications | HR Notifications | `/hr/settings/notifications` | `HrNotificationsSettingsClient.tsx` | `ds_hr_notification_settings_v1` | `hr-notification-settings-updated` | KEEP BUT SIMPLIFY |

Org data module: `app/(app)/hr/settings/organization-data.ts`.

### 2.2 Orphan / legacy Settings routes (not in catalog)

| Route | Client | Store | Consumers | Recommendation |
|-------|--------|-------|-----------|----------------|
| `/hr/settings/attendance/weekly-off` | `WeeklyOffClient.tsx` | `ds_hr_weekly_off_v1` | Self only (Shift owns weekly offs in resolve) | **HIDE / SAFE TO DELETE LATER** |
| `/hr/settings/attendance/mobile-face-attendance` | redirect → Attendance Modes | legacy keys merged | Redirect | KEEP stub or delete later |

### 2.3 Hidden / not in live sidebar (Phase 1)

Expense Categories (HR) · Declaration Categories · Form 16 Configuration · Issue Rules — **FUTURE / DO NOT BUILD** unless productized.

Expense Categories exist under **Accounts**, not HR Settings.

---

## 3. Field-level findings

### 3.1 Previously approved “not required” fields

| Field | Code reality | Tag |
|-------|--------------|-----|
| Branch Manager | Model fields `manager`, `managerEmployeeId` preserved; **not in UI** (`BranchesClient.tsx` comment) | **DO NOT CHANGE — already correct** |
| Department Parent / Description | On `DepartmentRecord`; **not in UI**; blanked on create | **DO NOT CHANGE — already correct** |
| Designation Level | On record + `DESIGNATION_LEVELS`; **not in UI** | **DO NOT CHANGE — already correct** |
| Employee Type Code | Auto via `autoUniqueOrgCode`; **not editable** | **DO NOT CHANGE — already correct** |

### 3.2 Company Profile (`CompanyProfileClient.tsx`)

**Present (KEEP):** Logo, Company Name*, Legal Name, Company Code (RO), Industry, Date of Incorporation, GSTIN, PAN, CIN, PF/ESI/PT/LWF registration numbers, Company Email/Phone, HR contacts, Registered Address*.

**Store-only / unused in UI:** `website` — seed only.

**MISSING (optional polish):** TAN, authorized signatory (useful for letters/Form 16).

**Necessity:** Letters, Form 16, Travel Policy UI, completeness helpers.

### 3.3 Branches

Name*, address, city, state, PIN, country, phone, email, Active switch.  
**Add Branch** valid (canonical owner).  
**Consumers:** employees, holiday scope, PT states, travel-request engine, attendance resolve.

### 3.4 Departments / Designations / Employee Types

Dept: Name*, Head picker, Active.  
Designation: Name*, Department*, Active — **Travel Policy loads `loadDesignations()`** (no Add Designation in Travel).  
Employee Type: Name*, Description (optional), Active.

### 3.5 Employment Statuses

Configurable list with Color + Active. Seed: Active, Probation, Notice Period, Exited, Terminated.  
**Conflict:** `offboarding-data.ts` `completeOffboarding` hard-sets employee status to `"terminated"` / `"resigned"` — **does not write through this master**.  
Create forms use `EMPLOYMENT_STATUS_OPTIONS` from `lib/hr/config.ts`.

**Recommendation:** Prefer **fixed system statuses** (or master as display labels only) with Offboarding as sole writer for exit states — **NEEDS BUSINESS DECISION**.

### 3.6 Employee Setup

| Page | Fields / actions | Operational consumer | Mobile |
|------|------------------|----------------------|--------|
| Mandatory Documents | Type, mandatory, active | Profile Documents / completion | No `/employee` import found |
| Joining Checklist | Items, mandatory, active | Profile Onboarding tab + completions store | No |
| Welcome Workflow | Templates, setup toggles, send history | Profile demo send | No (email pending) |
| Mandatory Profile | Fixed section toggles | `employee-display` completion % | No |

### 3.7 Attendance / Leave / Payroll / Travel (summary)

- **Shift:** hours, grace, break, **weeklySchedule** (owns weekly offs) — calendar resolve **CONNECTED**.  
- **Holiday:** year, company/state/branch scope, public/optional — leave + attendance **CONNECTED**.  
- **Attendance Policy:** late/early/half/absent/OT — enforce path **CONNECTED**.  
- **Attendance Modes:** GPS/geo/face — **DISCONNECTED / config-only** (no punch consumer found).  
- **Leave Types/Policies:** paid flag, entitlements, carry-forward fields — requests/balances **CONNECTED** with name hardcoding.  
- **Payroll masters:** components/structures/cycle/LOP — payroll-run **CONNECTED**.  
- **Travel Policy:** designation Own/Same-as, city class, entitlements, claim rules — employee claims/travel **CONNECTED**; internal `groupId` not shown as HR labels.

### 3.8 UX field issues

- Notification Settings exposes raw `{{placeholder}}` keys — technical for HR.  
- Travel Policy many tabs — dense for first-time HR.  
- Catalog Tax description still mentions “Form 16 configuration” while Form 16 Settings page is absent (ops under Payroll).  
- Employee Type **Description** optional — OK; not the forbidden Code.

---

## 4. Must Keep / Simplify / Merge / Remove / Missing / Future

### MUST KEEP
Company, Branches, Departments, Designations, Employee Types, Shift Setup, Holiday Calendar, Attendance Policy, Leave Types, Leave Policies, Salary Components, Salary Structures, Payroll Cycle, LOP Rules, Travel Policy, PF/ESI/PT/LWF, Tax Regime, TDS, Template Management, Mandatory Profile Sections, HR Notifications (simplified).

### KEEP BUT SIMPLIFY
Employment Statuses · Mandatory Documents · Joining Checklist · Welcome Workflow · Attendance Modes · Travel Policy tab IA · Notification field chips · Settings Home · Payslip Template nav label · Employee Type description copy.

### MERGE
Payslip Template sidebar entry → Template Management only (optional).  
Attendance Modes legacy mobile/face keys already merged into `ds_hr_attendance_modes_v1`.

### MOVE
Holiday conceptual home remains **Attendance Settings** (already). Do not re-add under Leave.

### HIDE
Welcome Workflow until email is real (optional).  
Weekly Off route (already off catalog).  
Unavailable notification events as “broken” config.

### REMOVE (later, after safety steps)
`WeeklyOffClient` + `weekly-off/page.tsx` + eventually `ds_hr_weekly_off_v1` if unused.  
Company `website` seed if never used.

### MISSING
| Item | Why | Priority |
|------|-----|----------|
| Wire Create/Master/Attendance filters to org stores | Settings is not source of truth today | **High** |
| Org/Holiday/Shift change events or reload contracts | Propagation gaps | **High** |
| Leave type identity for Optional/Unpaid (flag/id) | Name hardcoding | **High** |
| TAN / signatory on Company | Document polish | Low |
| F&F Settings pages | Prefer **not** missing if F&F is transactional | Business decision |

### FUTURE
Expense Categories (HR) · Issue Rules · Form 16 Configuration Settings · Declaration Categories · Email as live channel · Auto accrual engines.

---

## 5. Settings → operation dependency matrix

| Setting | Create/Update UI | Persist | Ops reader | Propagate | Mobile | Connection | Problem |
|---------|------------------|---------|------------|-----------|--------|------------|---------|
| Company | Yes | Yes | Letters, Form 16, Travel UI | Remount/local read | Indirect | **PARTIALLY CONNECTED** | No update event |
| Branch | Yes | Yes | Emp, holiday, PT, travel engine | Same | Travel yes | **PARTIALLY CONNECTED** | Create forms/filters use config fallbacks elsewhere |
| Department | Yes | Yes | Emp profile selects (partial) | Same | Weak | **PARTIALLY CONNECTED** | `DEPARTMENT_OPTIONS` in create + attendance dashboards |
| Designation | Yes | Yes | Travel Policy, profile | Same | Travel yes | **PARTIALLY CONNECTED** | `DESIGNATION_OPTIONS` / SF roles on create |
| Employee Type | Yes | Yes | Create/profile (mixed) | Same | Weak | **PARTIALLY CONNECTED** | |
| Employment Status | Yes | Yes | Profile options mixed | Offboarding bypasses | Weak | **DISCONNECTED / CONFLICT** | Hard writes + config options |
| Mandatory Docs | Yes | Yes | Profile | Local | No | **CONNECTED** (Admin) | |
| Joining Checklist | Yes | Yes | Profile | Completions store | No | **CONNECTED** (Admin) | |
| Welcome | Yes | Yes | Profile demo | Weak | No | **PARTIALLY CONNECTED** | Email pending |
| Mandatory Profile | Yes | Yes | Completion % | Instant | No | **CONNECTED** | |
| Shift | Yes | Yes | `attendance-calendar-resolve`, ops | No event | Desired | **PARTIALLY CONNECTED** | No broadcast |
| Holiday | Yes | Yes | Resolve + optional leave | No event | Desired | **PARTIALLY CONNECTED** | No broadcast |
| Att. Policy | Yes | Yes | `attendance-policy-enforce`, ops | Event | Desired | **CONNECTED** | |
| Att. Modes | Yes | Yes | UI only | Event | Intended | **DISCONNECTED** | No punch consumer |
| Leave Type/Policy | Yes | Yes | Requests, balances | Events | Desired | **PARTIALLY CONNECTED** | Name hardcoding |
| Components/Structures/Cycle/LOP | Yes | Yes | `payroll-run-data`, profile | Events | Payslip later | **CONNECTED** | Demo-grade |
| Travel Policy | Yes | Yes | Employee claims/requests | Event | **Yes** | **CONNECTED** | Claim Review “Entitlement Group” label (ops) |
| PF/ESI/PT/LWF | Yes | Yes | Payroll + profile | Events | — | **CONNECTED** | Not legal-certified |
| Tax/TDS | Yes | Yes | Payroll, Form 16 | Events | — | **CONNECTED** | |
| Templates | Yes | Yes | Letters, payslip preview | Event | — | **CONNECTED** | |
| Notifications | Yes | Yes | In-app engine | Event | Desired | **PARTIALLY CONNECTED** | Email/scheduler pending |
| Weekly Off page | Yes | Yes | Self only | — | No | **DISCONNECTED** | Superseded by Shift |

**Verified fact:** Import of a helper ≠ end-to-end browser verification. Runtime create→list→consume paths: **MANUAL USER CHECK REQUIRED**.

---

## 6. Employee Mobile dependencies

**Live web employee portal (`app/(app)/employee/**`):**

| Settings | Evidence | Need |
|----------|----------|------|
| Travel Policy | `travel-claim-engine.ts`, `travel-request-engine.ts`, approval helpers | **Required** for claims/travel |
| Branches | `travel-request-engine.ts` → `loadBranches` | **Required** |
| Designations (via policy mapping) | Resolver + org designations | **Required** |

**Not found as direct `/employee` Settings consumers:** Leave masters, Attendance Modes, Mandatory Docs, Welcome, Payroll masters (Admin-side today).

**Implication:** Closing Travel + Org Designations/Branches is first-class for mobile travel; leave/attendance mobile depends on Admin workflows until portal expands.

---

## 7. Duplicate masters / configuration

| Topic | Canonical owner | Duplicate / conflict | Decision |
|-------|-----------------|----------------------|----------|
| Holiday Calendar | Attendance Settings + `ds_hr_holiday_calendar_v2` | Leave duplicate removed Phase 1; SF holidays migrated | **KEEP** Attendance |
| Weekly Off | Shift Setup `weeklySchedule` | Orphan `/weekly-off` + `ds_hr_weekly_off_v1` | **REMOVE later** orphan |
| Designation | Org Designations | Travel internal groups; SF Role Policy Mapping page | Travel UI designation-first **OK**; SF Policy not Settings |
| Payslip Template | Template Management | Catalog deep-link | **MERGE** nav |
| Employment Status | Unclear | Offboarding hard strings + config options + statuses master | **BUSINESS DECISION** |
| Form 16 | Payroll `/hr/payroll/form-16` | No Tax Settings Form 16 page | **DO NOT** add Settings Form 16 |
| Expense Categories | Accounts (if any) | Not HR Settings | **DO NOT BUILD** HR duplicate until Other Expense final |
| Notifications | Settings = config; `/hr/notifications` = inbox | Dual entry OK | Settings config + bell |

---

## 8. Hardcoded rules

### DEMO SEED (acceptable)
Org seeds, leave seeds, travel policy seed rates, employee demos, statutory seed slabs.

### PRODUCT LOGIC HARDCODING (**NEEDS FIX**)

| Location | What |
|----------|------|
| `lib/hr/config.ts` | `DEPARTMENT_OPTIONS`, `DESIGNATION_OPTIONS`/`SF_ROLE_OPTIONS`, `EMPLOYMENT_STATUS_OPTIONS`, `BRANCH_OPTIONS` |
| `EmployeeCreateForm.tsx`, `EmployeeMasterForm.tsx` | Uses config designation/dept/status |
| `AttendanceDashboardPageClient.tsx`, `CompanyRosterPageClient.tsx`, daily/employees filters | Config dept/status options |
| `leave-balance-data.ts` / `requests-data.ts` | `OPTIONAL_LEAVE_TYPE_NAME = "Optional Leave"`, `"Unpaid"` |
| `offboarding-data.ts` | Status strings `"terminated"` / `"resigned"` |
| Statutory resolvers | Component name string coupling (e.g. Employee PF) |
| Travel seed | Designation regex NSM/ASM (assistive) |

---

## 9. UX issues

- Parent Settings vs page hierarchy was improved in Phase 1C for HR modules; Settings catalog remains flat list — OK.  
- Travel Policy: ~16 tabs — dense (**SIMPLIFY** later).  
- Notification `{{tokens}}` — developer-facing.  
- Settings Home: cleaned of API-sync copy in Phase 1; still progress-oriented — OK for HR.  
- Double nav historically reduced (top Settings = Home only).  
- Active/Inactive switches generally consistent on org masters.  
- Save: Create/Update + Cancel pattern prevalent — aligned.  
- Dead/coming-soon: not in live sidebar.  
- Orphan Weekly Off reachable by URL only.

---

## 10. Unused / legacy code candidates

| Candidate | Evidence | Class |
|-----------|----------|-------|
| `app/(app)/hr/settings/attendance/weekly-off/**` + `weekly-off-data.ts` | Not in catalog; consumers = self | **SAFE TO DELETE LATER** |
| `mobile-face-attendance/page.tsx` | Redirect to modes | **HIDE ONLY / delete stub later** |
| Company `website` field | Seeded, not UI | **KEEP FOR COMPATIBILITY** |
| Dept parent/description, designation level, branch manager fields | Off UI, preserved | **KEEP FOR COMPATIBILITY** |
| Travel `groups` / `groupId` | Internal entitlement inheritance | **MUST KEEP** |
| SF attendance/holiday stores | Migration + some attendance paths | **KEEP FOR COMPATIBILITY** |
| `coming_soon` type in catalog | Filter exists; no items use it | **KEEP INTERNAL** |
| DESKTOP under `hr/` | None found in prior audits | N/A |

**Cleanup sequence (future):** remove nav (done for Weekly Off) → confirm imports → migrate consumers → delete → tsc → regression.

---

## 11. F&F dependencies

| Need | Exists in Settings? | Recommendation |
|------|---------------------|----------------|
| Leave encashment rate/rules | No dedicated setting | Prefer Leave Type paid + balance + salary rate at **F&F transaction**; optional later policy flag |
| Notice pay / recovery | Offboarding tracks notice days | **Transaction** / Offboarding fields — not new Settings |
| Salary to LWD | Payroll Cycle + attendance | Existing |
| Recoveries / net / payment | Offboarding `fnfStatus` placeholder only | F&F Phase 3 UI |
| New F&F Settings module | — | **Avoid** unless client mandates company-wide formulas |

**Do not build F&F or F&F Settings in Settings closure.**

---

## 12. Final Settings sidebar recommendation

```
Overview
Organization Setup
  Company Profile
  Branches
  Departments
  Designations
  Employee Types
  Employment Statuses          ← or rename to “System Statuses” after decision
Employee Setup                 ← rename from “Onboarding”
  Mandatory Documents
  Joining Checklist
  Mandatory Profile Sections
  [Welcome Workflow — HIDE until email]
Attendance Settings
  Shift Setup                  ← weekly offs live here
  Holiday Calendar
  Attendance Policy
  Attendance Modes             ← simplify / clarify “mobile prep”
Leave Settings
  Leave Types
  Leave Policies
Payroll Settings
  Salary Components
  Salary Structures
  Payroll Cycle
  LOP Rules
  → Templates (payslip)        ← optional separate link
Travel & Expense Settings
  Travel Policy
Statutory Compliance
  PF · ESI · Professional Tax · LWF
Tax Settings
  Tax Regime · TDS
HR Letter Settings
  Template Management
Notification Settings
  HR Notifications
```

### A. Required for every company
Org masters · Shift · Holiday · Leave Types/Policies · (Employee Setup lite) · Notifications (basic)

### B. Required only when feature enabled
Payroll masters + Statutory + Tax · Travel Policy · Templates · Attendance Modes (when mobile punch live)

### C. Optional / future
Welcome · Expense Categories · Issue Rules · Form 16 Settings · Declaration Categories · F&F formula Settings

---

## 13. Section-wise closure plan (implementation later)

### Phase S0 — Business decisions (no code)
1. Employment Statuses: editable master vs fixed system list.  
2. Welcome: keep or hide for commercial MVP.  
3. F&F: transaction-only vs any company Settings.  
4. Attendance Modes: ship as “mobile prep” or hide until punch enforces.

### Phase S1 — Source of truth (**highest**)
**Files:** `EmployeeCreateForm.tsx`, `EmployeeMasterForm.tsx`, Attendance dashboard/roster/daily/employees filters, `employee-display.ts`, `lib/hr/config.ts` (stop using as product lists).  
**Change:** Read Branches/Departments/Designations/Types/Statuses from `organization-data`.  
**Must not change:** Store keys, Soft delete patterns, Travel Policy model.  
**Tests:** Create employee with Settings designation; filter attendance by org dept.  
**Risk:** Medium (form regressions).

### Phase S2 — Propagation
**Files:** `organization-data.ts`, `holiday-calendar-data.ts`, `shift-setup-data.ts` (+ listeners in consumers).  
**Change:** Emit update events (or document remount-only contract consistently).  
**Risk:** Low–medium.

### Phase S3 — Leave identity
**Files:** `leave-balance-data.ts`, `requests-data.ts`, Leave Types model (optional flag `isOptional`).  
**Change:** Stop matching Optional/Unpaid by English name only.  
**Risk:** Medium (leave balances).

### Phase S4 — Status / Offboarding alignment
**Files:** `offboarding-data.ts`, Employment Statuses UX.  
**Change:** Per S0 decision.  
**Risk:** High if wrong — do carefully.

### Phase S5 — Dead Settings cleanup
**Files:** Weekly Off page/data; optional Welcome hide.  
**Steps:** Confirm imports → delete/hide → tsc.  
**Risk:** Low.

### Phase S6 — Simplify
Attendance Modes copy · Notification placeholders · Travel tab grouping · Settings Home checklist · Payslip nav merge.  
**Risk:** Low.

### Phase S7 — Module-gated polish
Statutory/Tax/Travel commercial QA (no legal certification claim).

**Do not:** giant rewrite; Requests; F&F; Accounts.

---

## 14. Tests and acceptance criteria

### Automated (this audit)
- [x] `npx tsc --noEmit --pretty false --incremental false` → exit 0, 0 errors

### Browser — **MANUAL USER CHECK REQUIRED** (not executed here)

| ID | Check |
|----|-------|
| B1 | Settings sidebar lists only intended available pages |
| B2 | Company Update persists after refresh |
| B3 | Add Designation appears in Travel Policy applicability |
| B4 | Create Employee uses Settings designation (today: **fails SOT** until S1) |
| B5 | Shift weekly off reflected on Attendance calendar |
| B6 | Holiday optional leaves available where expected |
| B7 | Leave policy assignment affects balances |
| B8 | Payroll run uses structure/cycle/LOP |
| B9 | Travel claim respects policy |
| B10 | `/hr/settings/attendance/weekly-off` not linked from sidebar |
| B11 | Accounts routes unchanged |

### Acceptance for “Settings closed”
1. Org Settings are sole source for create/edit dropdowns.  
2. No conflicting employment status writers.  
3. Optional Leave not name-hardcoded.  
4. Orphan Weekly Off gone or unreachable.  
5. Weak pages simplified or hidden.  
6. Travel Policy designation-driven without Add Designation.  
7. tsc clean; B1–B11 pass.

---

## 15. Open business decisions

1. **Employment Statuses** — configurable master vs fixed system statuses.  
2. **Welcome Workflow** — keep demo or hide until email.  
3. **Attendance Modes** — visible prep vs hide until enforcement.  
4. **F&F** — any Settings formulas vs pure transaction.  
5. **Employee Type Description** — keep optional text? (Code already correct.)  
6. **Payslip** — keep Payroll Settings deep-link or Templates only.

---

## 16. Risks and compatibility

| Risk | Mitigation |
|------|------------|
| Swapping create forms to org stores breaks SF-named seeds | Map/migrate seed designations; keep inactive legacy names |
| Deleting Weekly Off store early | Confirm zero imports first |
| Changing Offboarding status strings | Coordinate with employmentStatus consumers |
| Travel groupId removal | **Forbidden** — breaks Same-as entitlements |
| Event storms on org writes | Debounce / targeted listeners |

**Must keep:** Travel policy store/resolver · holiday v2 · shift v2 · leave/payroll stores · org v2/v3 keys · notification settings key.

---

## 17. Demo readiness

| Area | Demo OK? |
|------|----------|
| Org CRUD + Travel Policy + Leave + Payroll settings UI | Yes |
| End-to-end “change Settings → create employee sees it” | **No** (hardcoded create) |
| Attendance Modes / Welcome as finished product | No |
| Statutory/Tax as legally correct | No (demo calc only) |

---

## 18. Production readiness

**Not production-ready as closed Settings** until S1–S4 land.  
Architecture and most masters are **directionally correct** for a commercial HRMS after source-of-truth and status alignment.

---

## Appendix A — Key evidence paths

- Catalog: `app/(app)/hr/settings/_components/settings-catalog.ts`  
- Org store: `app/(app)/hr/settings/organization-data.ts`  
- Hardcoded options: `lib/hr/config.ts`  
- Create form: `app/(app)/hr/employees/components/EmployeeCreateForm.tsx`  
- Travel policy: `app/(app)/hr/settings/reimbursement/travel-policy/`  
- Optional leave constant: `app/(app)/hr/leave/leave-balance-data.ts`  
- Offboarding F&F placeholder: `app/(app)/hr/offboarding/offboarding-data.ts`  
- Employee travel consumer: `app/(app)/employee/claims/travel-claim-engine.ts`

## Appendix B — Tag legend

| Tag | Meaning |
|-----|---------|
| DO NOT CHANGE — already correct | Leave as-is |
| NEEDS FIX | Closure blocker / high priority |
| NEEDS BUSINESS DECISION | Product choice before code |
| SAFE TO REMOVE LATER | After import/dependency checklist |
| KEEP FOR COMPATIBILITY | Fields/stores retained silently |
| MUST KEEP / KEEP BUT SIMPLIFY / etc. | Classification |

---

*End of audit. No Settings fixes, Requests, F&F, or Accounts work performed.*
