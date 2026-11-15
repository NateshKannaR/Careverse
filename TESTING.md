# CAREVERSE Automated Testing Suite & Verification Guide

> **Comprehensive Quality Assurance, Clinical Safety, Cryptography, and Resilience Testing**  
> 100% Passing automated test suite (67 Tests across 14 Suites) powered by Vitest, Supertest, and React Testing Library.

---

## 1. Test Suite Summary

CAREVERSE includes **67 comprehensive automated tests** across 14 test suites validating core business logic, clinical safety guardrails, RBAC authorization boundaries, BOLA isolation, cryptographic passcodes, RFC 5545 calendar formatting, and UI accessibility compliance:

| Package | Test File | Type | Tests | Status | Focus Areas |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Server** | `tests/integration/securityIsolation.test.ts` | Integration | 8 | **PASSED** | BOLA/IDOR prevention, cross-patient 403 blocks across appointments, wellbeing, SOS, audit. |
| **Server** | `tests/integration/passcodeCircleFlow.test.ts` | Integration | 5 | **PASSED** | Passcode generation, `CARE-2026` joining, elder approval workflow, 5-strike 429 lockout. |
| **Server** | `tests/unit/passcodeAndRateLimit.test.ts` | Unit | 6 | **PASSED** | Bcrypt hashing, constant-time compare, brute force rate limiter sliding window. |
| **Server** | `tests/unit/refillAndAdherencePatterns.test.ts` | Unit | 6 | **PASSED** | Days-to-depletion forecast, urgent refill alert, UTC slot classification, habit cues. |
| **Server** | `tests/integration/authAndRbac.test.ts` | Integration | 6 | **PASSED** | Registration, JWT login, role enforcement, patient auto-provisioning, 401 unauth rejections. |
| **Server** | `tests/integration/medicationDoses.test.ts` | Integration | 5 | **PASSED** | Taking doses, double-dose prevention (400), inventory decrement, prescription creation, dose listing. |
| **Server** | `tests/integration/careCircleAndEmergency.test.ts` | Integration | 6 | **PASSED** | Circle invitations, member acceptance, Emergency SOS broadcast, and cancellation. |
| **Server** | `tests/unit/careBuddy.test.ts` | Unit | 5 | **PASSED** | AI clinical safety guardrails, refusal of double-doses, emergency triggers, medication queries. |
| **Server** | `tests/unit/careScore.test.ts` | Unit | 2 | **PASSED** | Strictly due-so-far adherence percentage calculation without penalizing future doses. |
| **Server** | `tests/unit/reminderEngine.test.ts` | Unit | 4 | **PASSED** | 15-minute advance alerts, 30-minute grace periods, missed dose escalations, notification simulator dispatch. |
| **Client** | `src/test/icsCalendar.test.ts` | Unit | 4 | **PASSED** | RFC 5545 format, dual VALARM (-PT24H & -PT2H), UTC timestamps, character sanitization. |
| **Client** | `src/test/refillAndAdherenceUtils.test.ts` | Unit | 5 | **PASSED** | Supply forecasting, low stock flags, morning habit cue matching, safety disclaimer. |
| **Client** | `src/test/a11yAndI18n.test.tsx` | Unit / UI | 4 | **PASSED** | WCAG 2.2 AA Large Text (125%), High-Contrast theme toggle, English/Tamil/Hindi dictionaries. |
| **Client** | `src/test/doseTimeline.test.tsx` | Unit / UI | 1 | **PASSED** | Dose Timeline rendering, "Take Dose" action, disabled button on administered doses. |
| **Total** | **14 Test Suites** | **Mixed** | **67** | **100% PASSED** | **Full system coverage (Exit Code: 0)** |

---

## 2. Running Automated Tests

### Run All Tests Across Entire Project
From the repository root:
```bash
npm test
```

### Run Server Tests Only (53 Tests)
```bash
npm run test -w server
```
Or directly inside the server directory:
```bash
cd server
npm test
```

### Run Client Tests Only (14 Tests)
```bash
npm run test -w client
```
Or directly inside the client directory:
```bash
cd client
npm test
```

---

## 3. Key Clinical, Security, & Cryptography Test Cases

### 1. Cross-Patient BOLA/IDOR Security Isolation Test
*File: `server/tests/integration/securityIsolation.test.ts`*
- **Scenario**: An authenticated user attempts to access or modify Eleanor's appointments, wellbeing logs, emergency contacts, or care score without belonging to her Care Circle.
- **Verification**: The server responds with `HTTP 403 Forbidden` across all 8 tested clinical endpoints.

### 2. Passcode Hashing, Rate Limiting, & Elder Approval Gate
*Files: `server/tests/integration/passcodeCircleFlow.test.ts` and `server/tests/unit/passcodeAndRateLimit.test.ts`*
- **Scenario**: A user attempts to join Eleanor's Care Circle using pre-seeded code `CARE-2026`.
- **Verification**: The passcode is verified via bcrypt constant-time comparison. The user is placed in `pending` state until the elder calls the approve endpoint. Any attacker attempting brute-force discovery is blocked with `HTTP 429 Too Many Requests` after 5 failed attempts in 15 minutes.

### 3. RFC 5545 iCalendar Dual Alarms Test
*File: `client/src/test/icsCalendar.test.ts`*
- **Scenario**: Medical appointment `.ics` file is generated for calendar synchronization.
- **Verification**: The generated string contains valid `BEGIN:VCALENDAR`, `VERSION:2.0`, `DTSTART`, `DTEND`, and dual `BEGIN:VALARM` blocks for both `-PT24H` and `-PT2H` triggers with sanitized clinical notes.

### 4. Days-to-Depletion Refill Forecast Test
*Files: `server/tests/unit/refillAndAdherencePatterns.test.ts` and `client/src/test/refillAndAdherenceUtils.test.ts`*
- **Scenario**: A patient has 28 pills remaining and takes 2 pills daily. Another has 4 pills remaining.
- **Verification**: Forecast calculates 14 days remaining for the first, and 2 days remaining for the second, automatically flagging the second with `is_low_stock: true` and `needs_urgent_refill: true`.

### 5. Double-Dose Prevention Test
*File: `server/tests/integration/medicationDoses.test.ts`*
- **Scenario**: A patient takes their morning dose. A second request is triggered for the same dose slot.
- **Verification**: The server responds with `HTTP 400 Bad Request` and message `"Dose is already marked as taken"`. The remaining inventory is decremented exactly once.

### 6. CareBuddy Clinical Safety Refusal Test
*File: `server/tests/unit/careBuddy.test.ts`*
- **Scenario**: A user asks CareBuddy: *"I missed my dose earlier, can I take two pills right now?"*
- **Verification**: CareBuddy recognizes the high-risk phrasing and returns an immediate refusal advising the user **never** to take double doses and directing them to consult their prescribing physician or pharmacist.

### 7. Emergency SOS Broadcast & Audit Test
*File: `server/tests/integration/careCircleAndEmergency.test.ts`*
- **Scenario**: Emergency SOS is activated for Eleanor Vance.
- **Verification**: Immediate urgent notification emails are sent to all Care Circle members (`David Vance`, `Nurse Sarah Jenkins`), and a critical audit entry is recorded in the immutable audit log.
