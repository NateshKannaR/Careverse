# 📋 Official Hackathon Problem Statement & Requirements Specification

> **Event:** PromptWars x Echo Engineer's AI VIBEATHON 2026  
> **Platform:** Hack2Skill  
> **Challenge Track:** Intelligent Elderly Healthcare Management Ecosystem & Agentic Life Assistance  
> **Project Name:** CAREVERSE  

---

## 1. Official Challenge Background & Problem Context

Globally, the population aged 60 and older is accelerating rapidly and is projected to reach **1.4 billion by 2030** and **2.1 billion by 2050**. As life expectancy expands, the prevalence of chronic multi-morbidity (hypertension, diabetes, cardiovascular disease, arthritis, mild cognitive impairment) has surged.

Senior citizens managing complex chronic conditions face high-consequence daily healthcare hazards:

### The 5 Core Critical Challenges:

1. **Polypharmacy Confusion & The Medication Non-Adherence Crisis**:
   - Over **50% of elderly patients fail to adhere** to their prescribed medication schedules.
   - Elderly patients routinely manage 5 to 10 distinct prescriptions with different dosages, meal constraints, and times of day.
   - Cognitive decline, memory lapses, and confusing prescription bottles cause missed doses and accidental duplications.
   - Non-adherence leads to **over $100 billion in avoidable acute hospital admissions** and emergency room visits annually.

2. **Accidental Double-Dosing & Toxicity Risks**:
   - When a senior cannot remember whether they took their morning dose, the risk of taking a second dose is catastrophic (e.g., severe hypoglycemia from extra insulin/metformin or hypotension and falls from duplicate blood pressure medication).
   - Conventional applications lack transactional idempotency and state protection against duplicate administrations.

3. **Caregiver Burnout & Communication Breakdown**:
   - Family members and clinical caregivers lack non-intrusive, real-time visibility into whether their loved one has taken their daily medications, attended appointments, or logged abnormal symptoms.
   - This causes constant anxiety, repetitive intrusive check-in phone calls, or delayed awareness of health emergencies.

4. **The Medication "Refill Cliff"**:
   - Elderly patients frequently discover their pill bottles are empty on the day a dose is due.
   - Manual calculation of days of supply remaining is complex for seniors, resulting in treatment gaps.

5. **The Digital Accessibility & Exclusion Barrier**:
   - Modern digital healthcare applications are designed for tech-savvy younger audiences: low-contrast pastel color schemes, tiny 12px fonts, complex multi-level menus, and English-only interfaces.
   - Seniors with vision impairments, hand tremors, cognitive slowing, or non-English primary languages are digitally disenfranchised.

---

## 2. Official Solution Mandate & Expected Deliverables

The challenge mandates the creation of a **production-grade, closed-loop healthcare operations platform** tailored specifically to elderly users and their surrounding care network (family members, caregivers, doctors, and nurses):

- **Elder Autonomy**: An interface specifically designed for older adults that maximizes independent living.
- **Connected Care Circle**: Secure, permissioned synchronization among patients, family, and home care workers.
- **Clinical Safety State Machine**: Bulletproof safeguards against missed doses, double-dosing, and uncoordinated care.
- **Predictive & Intelligent Assistance**: Automated supply depletion prediction, habit-slot adherence analytics, and contextual AI companionship with strict clinical safety guardrails.
- **Universal Interoperability**: Integration with standard calendars (RFC 5545 `.ics`) and seamless multi-device responsiveness.

---

## 3. Explicit Requirements & Acceptance Criteria

### Requirement 1: Elder-First Accessible UI (WCAG 2.2 AA)
- **ID**: `REQ-A11Y-01`
- **Scope**: Large typography (125% scaling toggle), 7:1+ high-contrast theme (exceeding WCAG AAA), live screen reader announcements (`aria-live="polite"`), and trilingual support (English, Tamil, Hindi).
- **Acceptance Criteria**: All interactive buttons have minimum 48px touch targets; color alone is never used to convey state; screen readers announce dose administrations and appointment bookings.

### Requirement 2: Idempotent Medication Dose Tracking & Double-Dose Protection
- **ID**: `REQ-MED-02`
- **Scope**: Comprehensive dose scheduling with clear visual timeline; strict state machine (`scheduled` ➔ `taken` / `missed` / `skipped`).
- **Acceptance Criteria**: Secondary attempts to mark an already administered dose as taken must be rejected with HTTP 400; UI must immediately show `"Taken at HH:MM"` and disable repeat submissions.

### Requirement 3: Patient-Local Timezone & Slot-Based Adherence Intelligence
- **ID**: `REQ-ADH-03`
- **Scope**: Accurate calculation of medication adherence using the patient's local calendar day and UTC slots (Morning, Afternoon, Evening, Night).
- **Acceptance Criteria**: Future scheduled doses for the day must never penalize the adherence score; reporting must handle Daylight Saving Time (DST) spring-forward and fall-back transitions, leap days, and non-standard timezone offsets (e.g., India UTC+5:30, Nepal UTC+5:45).

### Requirement 4: Predictive Refill Engine & Shared Caregiver Handoff Notes
- **ID**: `REQ-RFL-04`
- **Scope**: Mathematical calculation of Days-to-Depletion ($\lfloor \frac{\text{stock}}{\text{daily}} \rfloor$) and shared refill notes between senior and caregiver.
- **Acceptance Criteria**: When remaining stock falls to or below the calculated threshold, highlight as urgent refill; sharing a refill note must be visible immediately in the caregiver's notes feed; duplicate submissions on the same calendar day must update the existing note rather than duplicating.

### Requirement 5: Passcode Care Circle & Elder Sovereignty Gate
- **ID**: `REQ-CIR-05`
- **Scope**: Cryptographically secure onboarding of family and caregivers without shared passwords.
- **Acceptance Criteria**: Generate 6-character entropy passcodes hashed with 10-round bcrypt; pre-seed instant testing passcode `CARE-2026`; enforce a 5-strike rate limit per 15 minutes (HTTP 429 lockout); new joiners must enter `pending` status until explicitly approved by the elder.

### Requirement 6: Emergency SOS with Audible Cancellation Window
- **ID**: `REQ-SOS-06`
- **Scope**: One-touch emergency distress signal broadcast to all primary care circle members.
- **Acceptance Criteria**: Activating SOS starts an audible and visual 5-second countdown allowing cancellation to prevent false alarms; once confirmed, records an immutable audit log entry and dispatches urgent notifications to emergency contacts.

### Requirement 7: Universal RFC 5545 Dual-Alarm Calendar Synchronization
- **ID**: `REQ-CAL-07`
- **Scope**: Export scheduled doctor visits to standard calendar formats (Apple, Google, Outlook, Android).
- **Acceptance Criteria**: Generate strictly formatted RFC 5545 `.ics` files featuring dual alarms: a 24-hour advance preparation reminder (`-PT24H`) and a 2-hour departure reminder (`-PT2H`).

### Requirement 8: Contextual AI Health Companion (CareBuddy) with Safety Guardrails
- **ID**: `REQ-AI-08`
- **Scope**: Plain-language conversational companion grounded in the patient's verified active prescriptions and daily routine.
- **Acceptance Criteria**: Answers queries like *"What pills do I have left today?"* using verified local-time schedules; assists in preparing doctor visit questions; strictly refuses requests to adjust dosages, double doses, or diagnose conditions, redirecting the user to licensed medical providers.

### Requirement 9: Enterprise Defense-in-Depth & Zero-Trust Security
- **ID**: `REQ-SEC-09`
- **Scope**: Broken Object-Level Authorization (BOLA/IDOR) defense across all patient records.
- **Acceptance Criteria**: Every query enforces `checkPatientAccess` verifying JWT ownership, active care circle membership, or administrator privileges; cross-patient data access must return HTTP 403 Forbidden; sensitive actions logged to append-only audit stream.

### Requirement 10: Zero-Config Evaluator Experience & Notification Simulator
- **ID**: `REQ-EVAL-10`
- **Scope**: Frictionless testing for hackathon evaluators without database configuration or external API keys.
- **Acceptance Criteria**: 1-click logins for 4 distinct roles (Elderly, Family, Caregiver, Admin); built-in in-app Notification Simulator allowing manual dispatch of reminder notifications and simulated emails on demand.
