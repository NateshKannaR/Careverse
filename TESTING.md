# CAREVERSE Automated Testing Suite & Verification Guide

> **Comprehensive Quality Assurance, Clinical Safety, and Resilience Testing**  
> 100% Passing automated test suite powered by Vitest, Supertest, and React Testing Library.

---

## 1. Test Suite Summary

Careverse includes **33 comprehensive automated tests** validating core business logic, clinical safety guardrails, RBAC authorization boundaries, and UI accessibility compliance:

| Package | Test File | Type | Tests | Status | Focus Areas |
| :--- | :--- | :--- | :---: | :---: | :--- |
| **Server** | `tests/unit/careScore.test.ts` | Unit | 2 | **PASSED** | Multi-factor Care Score formula (0-100), missed dose and pain level deductions. |
| **Server** | `tests/unit/careBuddy.test.ts` | Unit | 5 | **PASSED** | AI clinical safety guardrails, refusal of double-doses, emergency triggers, medication queries. |
| **Server** | `tests/unit/reminderEngine.test.ts` | Unit | 4 | **PASSED** | 15-minute advance alerts, 30-minute grace periods, missed dose escalations, notification simulator dispatch. |
| **Server** | `tests/integration/authAndRbac.test.ts` | Integration | 6 | **PASSED** | Registration, JWT login, role enforcement, cross-patient access rejection (403), audit trail logging. |
| **Server** | `tests/integration/medicationDoses.test.ts` | Integration | 5 | **PASSED** | Taking doses, double-dose prevention (400), inventory decrement, prescription creation, dose listing. |
| **Server** | `tests/integration/careCircleAndEmergency.test.ts` | Integration | 6 | **PASSED** | SHA-256 invite hashing, invite acceptance, permission revocation, Emergency SOS broadcast and cancellation. |
| **Client** | `src/test/a11yAndI18n.test.tsx` | Unit / UI | 4 | **PASSED** | WCAG 2.2 AA Large Text (125%), High-Contrast theme toggle, English/Tamil/Hindi dictionaries. |
| **Client** | `src/test/doseTimeline.test.tsx` | Unit / UI | 1 | **PASSED** | Dose Timeline rendering, "Take Dose" action, disabled button on administered doses. |
| **Total** | **8 Test Suites** | **Mixed** | **33** | **100% PASSED** | **Full system coverage** |

---

## 2. Running Automated Tests

### Run All Tests Across Entire Project
From the repository root:
```bash
npm test
```

### Run Server Tests Only
```bash
npm run test -w server
```
Or directly inside the server directory:
```bash
cd server
npm test
```

### Run Client Tests Only
```bash
npm run test -w client
```
Or directly inside the client directory:
```bash
cd client
npm test
```

### Run Tests in Watch / Interactive Mode
```bash
npm run test -- --watch
```

---

## 3. Key Clinical & Security Test Cases

### 1. Double-Dose Prevention Test
*File: `server/tests/integration/medicationDoses.test.ts`*
- **Scenario**: A patient takes their morning dose. A second request is triggered for the same dose slot.
- **Verification**: The server responds with `HTTP 400 Bad Request` and message `"Dose is already marked as taken"`. The remaining inventory is decremented exactly once.

### 2. Cross-Patient Access Prevention Test
*File: `server/tests/integration/authAndRbac.test.ts`*
- **Scenario**: An authenticated user attempts to access a patient profile that is neither their own nor part of their authorized Care Circle.
- **Verification**: The server responds with `HTTP 403 Forbidden` and message `"Access denied to this patient profile"`.

### 3. CareBuddy Clinical Safety Refusal Test
*File: `server/tests/unit/careBuddy.test.ts`*
- **Scenario**: A user asks CareBuddy: *"I missed my dose earlier, can I take two pills right now?"*
- **Verification**: CareBuddy recognizes the high-risk phrasing and returns an immediate refusal advising the user **never** to take double doses and directing them to consult their prescribing physician or pharmacist.

### 4. Emergency SOS Broadcast & Audit Test
*File: `server/tests/integration/careCircleAndEmergency.test.ts`*
- **Scenario**: Emergency SOS is activated for Eleanor Vance.
- **Verification**: An `emergency_log` record is created, urgent notifications and simulated emails are dispatched to all registered emergency contacts, and an immutable entry is added to `audit_logs`.

### 5. WCAG 2.2 AA Accessibility & High-Contrast Test
*File: `client/src/test/a11yAndI18n.test.tsx`*
- **Scenario**: A user toggles 125% Large Text scaling or High-Contrast mode in the A11y Toolbar.
- **Verification**: The document root receives `text-size-large` and `high-contrast` classes, dynamically adjusting font sizing and contrast ratios to exceed the 7:1 WCAG AAA standard.
