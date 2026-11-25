# 🧪 CAREVERSE Automated Testing Suite & Verification Guide

> **Comprehensive Quality Assurance, Clinical Safety, Cryptography, and Resilience Testing**  
> 100% Passing automated test suite (124 Tests across 20 Suites) powered by Vitest, Supertest, and React Testing Library.

---

## 1. Test Suite Summary

CAREVERSE includes **124 comprehensive automated tests** across 20 test suites validating core business logic, clinical safety guardrails, RBAC authorization boundaries, BOLA isolation, cryptographic passcodes, RFC 5545 calendar formatting, timezone resilience, and UI accessibility compliance:

### Server Test Suites (16 Suites, 109 Tests)
| Package | Test File | Type | Tests | Status | Focus Areas |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Server** | `tests/integration/securityIsolation.test.ts` | Integration | 8 | **PASSED** | BOLA/IDOR prevention, cross-patient 403 blocks across appointments, wellbeing, SOS, audit. |
| **Server** | `tests/integration/passcodeCircleFlow.test.ts` | Integration | 5 | **PASSED** | Passcode generation, `CARE-2026` joining, elder approval workflow, 5-strike 429 lockout. |
| **Server** | `tests/integration/carePlanWorkflows.test.ts` | Integration | 11 | **PASSED** | Full daily care plan workflows: new Rx, pause/resume, as-needed exclusion, refill note sharing. |
| **Server** | `tests/integration/careCircleAndEmergency.test.ts` | Integration | 6 | **PASSED** | Circle invitations, member acceptance, Emergency SOS broadcast, and 5s cancellation. |
| **Server** | `tests/integration/authAndRbac.test.ts` | Integration | 6 | **PASSED** | Registration, JWT login, role enforcement, patient auto-provisioning, 401 unauth rejections. |
| **Server** | `tests/integration/medicationDoses.test.ts` | Integration | 5 | **PASSED** | Taking doses, double-dose prevention (400), inventory decrement, prescription creation, dose listing. |
| **Server** | `tests/integration/adherenceReport.test.ts` | Integration | 3 | **PASSED** | Reporting API agreement, invalid calendar date rejection, authenticated private CSV exports. |
| **Server** | `tests/unit/adherenceAccuracy.test.ts` | Unit | 15 | **PASSED** | Synthetic adherence scenarios, 7/14/30 day windows, zero outcome handling, coverage metrics. |
| **Server** | `tests/unit/careEvidenceAccuracy.test.ts` | Unit | 11 | **PASSED** | Dose evidence calculations, skipped doses, future slot masking, local midnight resets. |
| **Server** | `tests/unit/patientSchedule.test.ts` | Unit | 9 | **PASSED** | Patient-local schedules, DST spring-forward/fall-back transitions, leap days, India/Nepal timezones. |
| **Server** | `tests/unit/careBuddySchedule.test.ts` | Unit | 7 | **PASSED** | Local dose question answering, upcoming vs unrecorded pill resolution, natural language recap. |
| **Server** | `tests/unit/passcodeAndRateLimit.test.ts` | Unit | 6 | **PASSED** | Bcrypt hashing, constant-time compare, brute force rate limiter sliding window. |
| **Server** | `tests/unit/refillAndAdherencePatterns.test.ts` | Unit | 6 | **PASSED** | Days-to-depletion forecast, urgent refill alert, UTC slot classification, habit cues. |
| **Server** | `tests/unit/careBuddy.test.ts` | Unit | 5 | **PASSED** | AI clinical safety guardrails, refusal of double-doses, emergency triggers, medication queries. |
| **Server** | `tests/unit/reminderEngine.test.ts` | Unit | 4 | **PASSED** | 15-minute advance alerts, 30-minute grace periods, missed dose escalations, simulator dispatch. |
| **Server** | `tests/unit/careScore.test.ts` | Unit | 2 | **PASSED** | Transparent daily care score calculation without penalizing future doses. |

### Client Test Suites (4 Suites, 15 Tests)
| Package | Test File | Type | Tests | Status | Focus Areas |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Client** | `src/test/icsCalendar.test.ts` | Unit | 5 | **PASSED** | RFC 5545 format, dual VALARM (-PT24H & -PT2H), UTC timestamps, character sanitization. |
| **Client** | `src/test/refillAndAdherenceUtils.test.ts` | Unit | 5 | **PASSED** | Supply forecasting, low stock flags, morning habit cue matching, safety disclaimer. |
| **Client** | `src/test/a11yAndI18n.test.tsx` | Unit / UI | 4 | **PASSED** | WCAG 2.2 AA Large Text (125%), High-Contrast theme toggle, English/Tamil/Hindi dictionaries. |
| **Client** | `src/test/doseTimeline.test.tsx` | Unit / UI | 1 | **PASSED** | Dose Timeline rendering, "Take Dose" action, disabled button on administered doses. |
| **Total** | **20 Test Suites** | **Mixed** | **124** | **100% PASSED** | **Full system coverage (Exit Code: 0)** |

---

## 2. Running Automated Tests

### Run All Tests Across Entire Project (124 Tests)
From the repository root:
```bash
npm test
```

### Run Server Tests Only (109 Tests)
```bash
npm run test:server
```

### Run Client Tests Only (15 Tests)
```bash
npm run test:client
```

### Run Specific Test Suites
```bash
# Security BOLA isolation suite
npm exec --workspace=server -- vitest run tests/integration/securityIsolation.test.ts

# Timezone and DST schedule suite
npm exec --workspace=server -- vitest run tests/unit/patientSchedule.test.ts

# RFC 5545 calendar export suite
npm exec --workspace=client -- vitest run src/test/icsCalendar.test.ts
```

---

## 3. Test Categories & Verification Scope

### 1. Security Isolation & BOLA Defense (8 Tests)
- Verifies that any unassigned user attempting to read, update, or delete an elderly patient's prescriptions, appointments, wellbeing check-ins, or audit logs receives an immediate `HTTP 403 Forbidden`.
- Confirms that unauthorized tokens cannot view care circle members or post care notes.

### 2. Passcode Care Circle & Brute-Force Rate Limiting (11 Tests across 2 files)
- Tests 6-character entropy passcode generation and constant-time bcrypt verification.
- Enforces sliding-window rate limiting: after 5 failed passcode attempts, the caller is locked out with `HTTP 429 Too Many Requests`.
- Validates the pre-seeded demo passcode `CARE-2026`.
- Confirms the Elder Sovereignty Gate: new connections remain in `pending` status until explicit patient approval.

### 3. Patient-Local Schedules & Timezone Edge Cases (9 Tests)
- Tests schedule generation across different standard and non-standard time zones (`America/New_York`, `Asia/Kolkata` UTC+5:30, `Asia/Kathmandu` UTC+5:45).
- Tests Daylight Saving Time (DST) spring-forward (non-existent 02:30 hour rejection) and fall-back (repeated hour disambiguation).
- Validates leap-day dose scheduling (February 29).

### 4. Medication Dose Idempotency & Adherence Accuracy (36 Tests across 4 files)
- Enforces strict state transitions: `scheduled` ➔ `taken` / `missed` / `skipped`.
- Rejects repeat dose administration attempts with `HTTP 400`.
- Validates that future doses scheduled for later in the day do not penalize current daily adherence.
- Tests multi-day adherence windows (7-day, 14-day, 30-day).

### 5. CareBuddy AI Clinical Safety Guardrails (12 Tests across 2 files)
- Verifies deterministic safety refusals when prompted with queries regarding double dosing, missing doses, or prescription changes.
- Verifies contextual answering of local-time pill schedule queries (*"What pills do I have left today?"*).
- Tests appointment question preparation and medical terminology explanations.

### 6. Accessibility & Localization (5 Tests across 2 files)
- Tests WCAG 2.2 AA Large Text (125% scaling) and High-Contrast (7:1+) CSS theme application.
- Tests trilingual localization dictionaries (English, Tamil, Hindi) ensuring 100% key parity across translations.
- Tests screen reader live announcements (`aria-live="polite"`).

---

## 4. Continuous Integration (CI) Verification

All 124 tests are automatically executed on every push and pull request to `main` via the GitHub Actions workflow in [`.github/workflows/ci.yml`](.github/workflows/ci.yml):
- Matrix builds across **Node.js 20.x** and **Node.js 22.x**
- Strict TypeScript verification (`tsc --noEmit`)
- Complete Vitest test execution (`npm test`)
- Full production build verification (`npm run build`)
