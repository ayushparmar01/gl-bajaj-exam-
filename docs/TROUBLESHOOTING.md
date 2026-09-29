# 🔧 GLB EXAMSPHERE — Troubleshooting & Operational Diagnosis

## 1. Common Client & Browser Issues

### 1.1 Camera / Microphone Permission Denied
- **Symptom**: Candidate is stuck on pre-exam check or receives *"Webcam Access Required"* error.
- **Root Cause**: Browser permissions blocked or another application is using the camera.
- **Resolution**:
  1. Click the lock/tune icon in the browser address bar (left of `https://`).
  2. Toggle **Camera** and **Microphone** permissions to **Allow**.
  3. Close any external video calling software (Zoom, Teams, Discord).
  4. Refresh the examination page.

### 1.2 Fullscreen Auto-Exit or Tab Blur Warnings
- **Symptom**: Candidate triggers unexpected strike warnings while taking the exam.
- **Root Cause**: Operating system notifications, background popups, or multi-monitor setups.
- **Resolution**:
  1. Disable OS notifications (Windows Focus Assist / macOS Do Not Disturb).
  2. Disconnect secondary external monitors before beginning the exam.
  3. Do not press `Alt+Tab`, `Cmd+Tab`, or swipe gestures on trackpads.

---

## 2. Examination Access & Passcode Issues

### 2.1 Exam Card Shows "Not Eligible" (Grayed Out)
- **Symptom**: Student sees an exam listed under "Upcoming / Ineligible" with a lock icon.
- **Root Cause**: The student's academic profile (Branch, Semester, Section, or Batch) does not match the exam's target criteria configured by the instructor.
- **Resolution**:
  1. Administrator should check the student's profile via **Admin Portal ➔ Students**.
  2. Instructor should verify the exam's **Target Audience** configuration.

### 2.2 Exam Card Shows "Upcoming" or "Expired"
- **Symptom**: Student cannot click "Start Exam".
- **Root Cause**: The current system time is outside the scheduled `startTime` to `endTime` window.
- **Resolution**:
  - If **Upcoming**: Wait until the exact start time.
  - If **Expired**: The scheduled window has closed. The instructor must adjust the exam end time if a retake is granted.

---

## 3. Server & Network Diagnostics

### 3.1 Socket.IO Disconnects / Live Proctoring Reconnect Loop
- **Symptom**: Live Proctoring Dashboard displays *"Reconnecting..."* banner.
- **Root Cause**: Reverse proxy (Nginx / Cloudflare) not configured for WebSocket upgrade headers.
- **Resolution**:
  Ensure proxy headers include:
  ```nginx
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_http_version 1.1;
  ```

### 3.2 MongoDB Memory Server Startup Timeout in CI/Test Environment
- **Symptom**: `npm test` times out during binary download.
- **Root Cause**: Slow initial binary download from MongoDB mirror.
- **Resolution**: Set `MONGOMS_DOWNLOAD_URL` or pre-cache the binary in local cache directory.
