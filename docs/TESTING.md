# 🧪 GLB EXAMSPHERE — Automated Regression Suite & QA Matrix (86/86 Tests)

## 1. Automated Regression Architecture

GLB EXAMSPHERE contains a self-contained, automated test suite located at `backend/test_api.js`. The suite operates in-memory against `mongodb-memory-server` and tests the complete application backend without requiring external databases or third-party cloud services.

```bash
# Execute the full automated regression suite
cd backend
npm test
```

---

## 2. Complete 86-Test Verification Catalog

| # | Test Name | Phase | Key Validation & Security Assertions |
| :-: | :--- | :-: | :--- |
| **1** | Public Self-Registration Rejection | Phase 1 | Public `/api/auth/register` returns `403 Forbidden` |
| **2** | Spreadsheet Validation & In-File Duplicate Engine | Phase 2 | Excel parser detects in-file duplicates and row-level schema errors |
| **3** | Admin Confirms Bulk Student Import | Phase 2 | Admin bulk imports valid parsed rows into MongoDB with encrypted passwords |
| **4** | Student Direct Login with Email + Password | Phase 2 | Preloaded student logs in directly with JWT (no OTP required) |
| **5** | Password Hash Leakage Prevention | Phase 2 | Student list API strictly excludes password hashes |
| **6** | Student Deactivation & Blocked Login | Phase 2 | Inactive student login returns `403 Forbidden` |
| **7** | Admin Resets Student Password | Phase 2 | Admin resets student password and student successfully authenticates |
| **8** | Student Blocked from Student Management APIs | Phase 2 | Student role accessing `/api/admin/students` receives `403 Forbidden` |
| **9** | Admin Creates & Publishes Exam | Phase 2 | Admin authors question bank and publishes exam |
| **10** | Preloaded Student Takes and Submits Exam | Phase 2 | Student completes attempt and generates unique `GLB-VRF-` verification ID |
| **11** | Verification ID Collision Prevention | Phase 2 | Second student submission receives distinct verification ID without index errors |
| **12** | Single-Attempt Exam Re-attempt Prevention | Phase 2 | Starting an already submitted single-attempt exam returns `400 Bad Request` |
| **13** | Manual Student Creation Duplicate Checks | Phase 2 | Duplicate email, rollNumber, or enrollmentNumber returns `400 Bad Request` |
| **14** | Student Deletion Audit Protection | Phase 2 | Deleting a student with historical exam attempts is blocked (`400 Bad Request`) |
| **15** | Clean Candidate Deletion Allowed | Phase 2 | Clean student record with zero exam history safely deleted (`200 OK`) |
| **16** | Admin Creates Teacher & Escalation Block | Phase 3B | Enforces `role: 'TEACHER'` even if client attempts role escalation |
| **17** | Teacher Password Hashing Verification | Phase 3B | Teacher password encrypted with bcrypt in DB |
| **18** | Unauthenticated Access to Teacher APIs Blocked | Phase 3B | Unauthenticated POST returns `401 Unauthorized` |
| **19** | Student Blocked from Creating Teachers | Phase 3B | Student attempting teacher creation receives `403 Forbidden` |
| **20** | Student Blocked from Listing Teachers | Phase 3B | Student attempting teacher query receives `403 Forbidden` |
| **21** | Teacher Direct Login | Phase 3B | Teacher authenticates and receives JWT with `role: 'TEACHER'` |
| **22** | Teacher Blocked from Teacher Management APIs | Phase 3B | Teacher role accessing `/api/admin/teachers` returns `403 Forbidden` |
| **23** | Teacher Blocked from Student Management APIs | Phase 3B | Teacher role accessing `/api/admin/students` returns `403 Forbidden` |
| **24** | Teacher Blocked from Creating Admins | Phase 3B | Teacher accessing `/api/auth/admin/create-admin` returns `403 Forbidden` |
| **25** | Duplicate Teacher Email Rejection | Phase 3B | Duplicate teacher email returns `400 Bad Request` |
| **26** | Duplicate Teacher Employee ID Rejection | Phase 3B | Duplicate `employeeId` returns `400 Bad Request` |
| **27** | Admin Updates Teacher Profile | Phase 3B | Administrator updates teacher department and contact metadata |
| **28** | Teacher Deactivation & Blocked Login | Phase 3B | Inactive teacher login returns `403 Forbidden` |
| **29** | Teacher Reactivation | Phase 3B | Reactivated teacher login succeeds (`200 OK`) |
| **30** | Admin Resets Teacher Password | Phase 3B | Admin resets teacher credentials |
| **31** | Teacher Deletion Protection with Exam History | Phase 3B | Deleting teacher who created an exam is blocked (`400 Bad Request`) |
| **32** | Clean Teacher Account Safe Deletion | Phase 3B | Deleting teacher with zero exams succeeds (`200 OK`) |
| **33** | Non-Admin Blocked from Academic Master Endpoints | Phase 3C | Teachers and students blocked from academic master setup (`403 Forbidden`) |
| **34** | Academic Year Management & Single Current Year | Phase 3C | Atomic switch ensuring only one academic year has `isCurrent: true` |
| **35** | Branch Management & Unique Code | Phase 3C | Unique branch code constraint enforced (`400 Bad Request` on duplicate) |
| **36** | Semester Management & Number Constraints | Phase 3C | Unique semester numbers (1–12) enforced |
| **37** | Section Management & Compound Uniqueness | Phase 3C | Section uniqueness scoped to branch `{ name, branch }` |
| **38** | Batch Management Independence | Phase 3C | Batch entities managed independently from academic years |
| **39** | Subject Management & Unique subjectCode | Phase 3C | Subjects mapped to branch/semester with unique `subjectCode` |
| **40** | Referenced Branch Deletion Protection | Phase 3C | Deleting branch referenced by subjects/sections is blocked (`400 Bad Request`) |
| **41** | Referenced Semester Deletion Protection | Phase 3C | Deleting semester referenced by subjects is blocked (`400 Bad Request`) |
| **42** | Academic Master Options All Endpoint | Phase 3C | Fetches consolidated academic master metadata |
| **43** | Update Teacher Assignments & Scopes | Phase 3C | Assigns subjects and academic groups to faculty |
| **44** | Fetch Teacher Assignments with Population | Phase 3C | Retrieves fully populated references for teacher assigned groups |
| **45** | Assigned Subject Deletion Protection | Phase 3C | Deleting subject assigned to faculty is blocked (`400 Bad Request`) |
| **46** | Unauth & Student Exam Creation Lockdown | Phase 3D | Non-staff exam creation attempts rejected with `401` / `403` |
| **47** | Multi-Audience Exam Creation | Phase 3D | Admin creates `ENTIRE_COLLEGE`, `BRANCH`, and `COMBINATION_TARGET` exams |
| **48** | Target Configuration Validation Rules | Phase 3D | Empty target arrays and malformed targets return `400 Bad Request` |
| **49** | Teacher Subject Authorization Scope | Phase 3D | Teacher creating exam for unassigned subject receives `403 Forbidden` |
| **50** | Teacher Audience & Group Scoping | Phase 3D | Teacher targeting unauthorized branches or entire college receives `403 Forbidden` |
| **51** | Elevated Faculty Privileges Support | Phase 3D | Teachers with `canTargetEntireCollege` create college-wide exams |
| **52** | Teacher Exam Ownership Boundaries | Phase 3D | Faculty cannot modify or delete exams created by other instructors |
| **53** | Server-Side Exam Catalog Eligibility Filtering | Phase 3D | Student receives only exams matching their academic branch/semester/section |
| **54** | Direct Endpoint Security for Ineligible Students | Phase 3D | Direct GET, START, and SUBMIT on ineligible exam returns `403 Forbidden` |
| **55** | Inactive Student Exam Start Rejection | Phase 3D | Inactive student attempting exam start receives `403 Forbidden` |
| **56** | Eligible Student Full Assessment Cycle | Phase 3D | Eligible student completes attempt with deterministic score calculation |
| **57** | Legacy Student Without Academic Year Compatibility | Phase 3F | Legacy students safely take branch/entire exams, failing only year-specific |
| **58** | Legacy Exam Compatibility | Phase 3F | Legacy exams (`subjectId: null`) operate smoothly |
| **59** | Passcode-Protected Exam Verification | Phase 3F | Exam start requires valid `accessCode` PIN (`403` on missing/wrong code) |
| **60** | Reattempt Lockdown for Single-Attempt Exams | Phase 3F | Completed single-attempt exam cannot be restarted (`400 Bad Request`) |
| **61** | Result Ownership & PDF Security | Phase 3F | Cross-student access to results and PDF scorecards returns `403 Forbidden` |
| **62** | Student Blocked from Admin Student Routes | Phase 3G | Comprehensive RBAC boundary verification for students |
| **63** | Student Blocked from Admin Teacher Routes | Phase 3G | Comprehensive RBAC boundary verification for students |
| **64** | Teacher Blocked from Admin Student Routes | Phase 3G | Comprehensive RBAC boundary verification for teachers |
| **65** | Teacher Blocked from Admin Teacher Routes | Phase 3G | Comprehensive RBAC boundary verification for teachers |
| **66** | Malformed & Expired JWT Token Rejection | Phase 3G | Malformed or missing JWT tokens return `401 Unauthorized` |
| **67** | Proctoring Session Initialization & Event Logging | Phase 4A | Session initialized (`201 ACTIVE`) and `SESSION_STARTED` logged |
| **68** | Idempotent Session Resumption & Reconnects | Phase 4A | Reconnecting attempt resumes session and logs `SESSION_RESUMED` |
| **69** | Proctoring Session Ownership Security | Phase 4A | Cross-student session access returns `403 Forbidden` |
| **70** | Proctoring Heartbeat Synchronization | Phase 4A | Heartbeat updates server timestamp and session status (`200 OK`) |
| **71** | Graceful Proctoring Session Finalization | Phase 4A | Exam submission transitions session to `ENDED` and logs `SESSION_ENDED` |
| **72** | Admin Live Monitor Endpoint Scoping | Phase 4A | Students blocked from `/api/proctor/live-sessions` (`403 Forbidden`) |
| **73** | Exam proctoringConfig Schema Defaults | Phase 4B | Verifies AI proctoring configuration schema and defaults |
| **74** | Centralized Event Ingestion Engine Validation | Phase 4B | Validates event taxonomy and rejects unknown event types / oversized metadata |
| **75** | Cross-Student Event Ingestion Lockdown | Phase 4B | Cross-student event submission returns `403 Forbidden` |
| **76** | Warning Engine Rule Evaluation & Deduplication | Phase 4C | Warning engine generates factual warnings with cooldown deduplication |
| **77** | Warning Management Actions Audit | Phase 4C | Faculty/admin acknowledge and resolve warnings; students blocked |
| **78** | Teacher Live Monitoring Scoping | Phase 4C | Faculty can monitor only their own exams (`403` on unauthorized exams) |
| **79** | Inactive User Token Invalidation | Phase 4D | Deactivated user tokens rejected across all proctoring routes |
| **80** | Anti-Tampering & Client Forgery Immunity | Phase 4D | Client-provided fake `studentId`, role, or timestamps are discarded |
| **81** | Cross-Student Warning & Session Tampering | Phase 4D | Cross-student warning inspection and termination blocked (`403 Forbidden`) |
| **82** | Session Hijacking & Non-Existent Attempt Guard | Phase 4D | Non-existent attempt returns `404 Not Found`; malformed ID returns `400` |
| **83** | Event Flooding & State Stability | Phase 4D | High-frequency telemetry bursts ingested without session corruption |
| **84** | Admin Command Authorization Security | Phase 4D | Students blocked from invoking `grant-time` (`403 Forbidden`) |
| **85** | Complete End-to-End Proctoring Lifecycle | Phase 4D | Complete attempt cycle with AI telemetry, warning, and score verification |
| **86** | Zero-Media Privacy Storage Audit | Phase 4D | Scans MongoDB events to confirm zero video/audio base64 data is stored |

---

## 3. Test Suite Execution Summary
- **Total Automated Tests Executed**: **86**
- **Total Tests Passed**: **86**
- **Total Tests Failed**: **0**
- **Overall Pass Rate**: **100.0%**
