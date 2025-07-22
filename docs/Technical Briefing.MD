### **Document 1: UI/UX Design & Frontend Brief**

**To:** UI/UX Design & Frontend Development Team
**Project:** Compound Access & Management Platform ("CompoundConnect")

#### 1. Project Vision & Core Goals

We are creating a modern, multi-platform application to streamline operations and enhance the resident experience within private compounds. The platform will serve multiple user roles on Web, iOS, and Android.

- **Core Goal:** To replace manual, paper-based processes with a secure, efficient, and user-friendly digital system centered around QR code access.
- **Key Pillars:** Security, Convenience, Communication, and Management Efficiency.

#### 2. Target Audience & Personas

- **Super Admin:** Tech-savvy, manages multiple compounds, needs a high-level overview and control. (Web)
- **Compound Management:** The primary power user. Manages daily operations, finances, staff, and residents for a single compound. Needs detailed data and control. (Web)
- **Unit Owner / Resident:** The primary mobile user. Values convenience and security. Needs quick access to their QRs, visitor management, and compound news. (iOS/Android)
- **Security & Facility Personnel:** The on-the-ground user. Needs an extremely simple, fast, and reliable tool for a single purpose: scanning and validating QR codes. (iOS/Android)
- **Visitor:** The end-user of the QR code. Their interaction is outside the app (receiving a QR image), but the scan experience must be seamless.

#### 3. Core Design Principles

- **Modern & Clean:** A sleek, uncluttered interface. Use of white space, clear typography, and a professional color palette. Avoid visual noise.
- **Intuitive & Effortless:** User flows should be logical and require minimal thought. The most common actions (e.g., generating a visitor QR, scanning) should be immediately accessible.
- **Bilingual & RTL Support:** The entire application must fully support both **English (LTR)** and **Arabic (RTL)** layouts. All components and screens must be designed to flip correctly and legibly.
- **Brandable:** The design must allow for easy branding on a per-compound basis. The primary element is the **compound's logo**, which should be prominent. A secondary theme color might also be configurable.
- **Responsive:** The web dashboard must be fully responsive for desktop and tablet use. The mobile app should adapt to various phone screen sizes.

#### 4. Supported Platforms & Technology

- **Mobile:** iOS & Android, built with **React Native**.
- **Web (PC):** Modern browsers (Chrome, Firefox, Safari, Edge), built with **React**.
- The UI kit/component library chosen should have strong support for both React and React Native for consistency (e.g., NativeBase, or a custom system inspired by Material Design or similar).

#### 5. Screen-by-Screen UI/UX Description

##### **Global Screens (Mobile & Web)**

- **Login Screen:** Minimalist. Fields for Email/Username and Password. "Forgot Password" link. Social login options are not required. A language switcher (EN/AR) should be present.
- **Forgot Password Flow:** Standard flow: enter email -> receive instructions -> reset password page.

##### **Mobile App - Unit Owner / Resident**

- **Dashboard (Home Screen):**
  - **Top:** Prominently displays the current Compound's Logo and Name.
  - **Main Section:** A card-based layout for quick access.
    - **Card 1: "My Gate Access QR":** Shows the owner's personal, annual gate QR code. A small icon indicates it's active. Tapping it expands the QR for scanning.
    - **Card 2: "Facility Access":** A carousel/tabbed view to switch between Beach/Pool QR, Kids Area QR, Female Pool QR. Each card clearly shows its status (e.g., "Active - Paid", "Inactive - Payment Due"). Tapping shows the QR.
    - **Card 3: "Visitor Management":** Two large buttons: "Generate Visitor Pass" and "View Active Visitors".
  - **Bottom Section:** A feed for "Latest News & Alerts" from management (e.g., "Sea is unsafe today", "Pool maintenance on Tuesday").
  - **Navigation:** A bottom tab bar: Home | Visitors | Payments | Profile.
- **Visitor Management Screen:**
  - **Tabs:** "Active" and "History".
  - **Active Tab:** A list of currently valid visitor QR codes. Each entry shows Visitor Name, Validity (e.g., "Today, 2 PM - 8 PM"), and an option to "Invalidate".
  - **History Tab:** A log of expired/used visitor codes, showing when they were scanned and by whom.
  - **Floating Action Button (+):** Opens the "Generate Visitor Pass" screen.
- **Generate Visitor Pass Screen (Modal/Full Page):**
  - A simple form:
    - Visitor's Full Name (text field)
    - Number of Accompanying Persons (stepper/number input)
    - Vehicle Plate Number (optional text field)
    - Access Start Date & Time (date/time picker)
    - Access End Date & Time (date/time picker)
  - **Button:** "Generate QR Code".
  - **On Generation:** A success screen displays the QR code with options to "Share" (as an image) or "Done".
- **Payments Screen:** A simple list of payable fees for the current season (e.g., Annual Maintenance, Pool Access). Each item shows "Status: Paid / Due" and the due date. No in-app payment processing is required, this is for status display only.
- **Profile Screen:** View personal info (Name, Unit #). Option to change language, password, and manage notification settings.

##### **Mobile App - Security & Facility Personnel**

- **Login:** A one-time registration flow using an invite code from management, followed by a standard login.
- **Main Screen:** Extremely simple.
  - **Header:** "Gate Security" or "Pool Area". Shows the guard's name.
  - **Center:** A large, full-width button: **"SCAN QR CODE"**. This is the primary and almost only action.
  - **Below:** A small link to view a "Recent Scan Log".
- **Scan Result Screen:** When a QR is scanned, the screen transitions to show the result.
  - **Valid Visitor:** Green header. Displays: Visitor Name, Vehicle Plate, # of Persons, Valid For [Unit #], Access Time.
  - **Valid Owner:** Blue header. Displays: Large Profile Picture, Full Name, Unit #, Spouse & Kids Info.
  - **Valid Facility:** Blue header. Displays: Full Name, Unit #, "Access Granted for X people".
  - **Invalid/Expired:** Red header. A clear message like "QR CODE INVALID" or "ACCESS EXPIRED".

##### **Web Application - Compound Management**

- **Layout:** A standard dashboard layout with a collapsible left-hand navigation menu and a main content area.
- **Dashboard (Home):** At-a-glance view with key stats:
  - Total Units vs. Paid Units (for current season).
  - Active Visitors Today.
  - Recent Scan Activity Log.
  - Expiring Personnel Accounts.
- **Units Management:**
  - A powerful data table of all units.
  - **Columns:** Unit #, Owner(s), Maintenance Status, Pool Status, etc.
  - **Features:** Search, Filter (by payment status, etc.).
  - **Actions:** Click a unit to view its detail page, which allows management to:
    - Assign/Unassign users (owners, spouses) to the unit.
    - Manually mark fees as "Paid" for the current season.
    - View the unit's entire payment and visitor history.
- **User Management:** Table of all users (owners, residents). Search and view profiles.
- **Personnel Management:** Table of all security/facility staff.
  - **Actions:** "Add Personnel" (which generates a one-time invite code), "Revoke Access", "View Activity Log".
- **Visitor Log:** Master table of all visitor QR codes ever generated. Search by unit, visitor name, or date. View details of each scan. Option to "Invalidate" any active QR code.
- **Reporting:** A dedicated section with various report generation options (e.g., "Outstanding Payments Report", "Visitor Traffic by Unit"). Reports should be exportable (CSV/PDF).
- **News & Alerts:** A simple CMS to Create, Read, Update, and Delete news items that appear in the residents' mobile app.
- **Settings:**
  - Configure the **Compound Season** (start and end dates).
  - Upload/Change the compound logo.

#### 6. Push Notifications

The design should account for receiving notifications. When tapped, they should navigate to the relevant screen.

- **For Owners:**
  - "Your QR code was used at [Location]." (navigates to scan history)
  - "Visitor [Name]'s pass has been used." (navigates to visitor log)
  - "Your maintenance fee is due soon."
  - New compound news/alert posted by management.
- **For Management:**
  - "The current season ends in 1 week. Please configure the new season."

---

### **Document 2: Backend Technical Specification**

**To:** Backend Development Team
**Project:** Compound Access & Management Platform API

#### 1. System Architecture & Technology Stack

- **Architecture:** A monolithic RESTful API serving both the React Native mobile app and the React web dashboard.
- **Language/Framework:** **Node.js** with **Express.js**.
- **Database:** **MySQL or SQL Lite**.
- **Authentication:** **JSON Web Tokens (JWT)**.
- **Push Notifications:** Integration with **Firebase Cloud Messaging (FCM)** for both Android and iOS.

#### 2. Database Schema (High-Level)

- `compounds`: `id`, `name`, `logo_url`
- `seasons`: `id`, `compound_id` (FK), `name` (e.g., "2024-2025"), `start_date`, `end_date`
- `users`: `id`, `compound_id` (FK), `name`, `email` (unique), `password_hash`, `profile_picture_url`, `role` ('management', 'owner', 'security', 'pool_staff', etc.), `device_token` (for push notifications)
- `units`: `id`, `compound_id` (FK), `unit_number`
- `unit_users` (Join Table): `unit_id` (FK), `user_id` (FK) - Establishes Many-to-Many relationship.
- `services`: `id`, `name` (e.g., 'Annual Maintenance', 'Pool Access')
- `payments`: `id`, `unit_id` (FK), `service_id` (FK), `season_id` (FK), `status` ('Paid', 'Due'), `paid_on_date`
- `qr_codes`: `id`, `user_id` (Generator), `unit_id` (Associated Unit), `type` ('Visitor', 'OwnerGate', 'OwnerPool'), `code_hash` (hashed unique identifier), `visitor_name`, `visitor_vehicle_plate`, `num_persons`, `valid_from`, `valid_to`, `is_active` (boolean)
- `scan_logs`: `id`, `qr_code_id` (FK), `scanner_user_id` (FK), `scanned_at`, `location_tag` (e.g., 'MainGate'), `result` ('Success', 'Failure')

#### 3. API Endpoint Specification (RESTful)

All protected routes require `Authorization: Bearer <JWT>`. Middleware must check roles.

##### **Authentication (`/api/auth`)**

- `POST /login`: Body `{ email, password }`. Returns JWT and user profile.
- `POST /register-personnel`: Body `{ invite_code, name, email, password }`. Validates code, creates a user with 'security' role, invalidates code.
- `POST /refresh-token`: Refreshes an expiring JWT.

##### **QR Code Flow (`/api/qrcodes`)**

- `POST /visitor` (Role: Owner): Body `{ unit_id, visitor_name, num_persons, vehicle_plate, valid_from, valid_to }`. Generates a new visitor QR, saves to DB. Returns QR data/image.
- `GET /my` (Role: Owner): Returns a list of the user's active personal QR codes (Gate, Pool, etc.) based on their unit's payment status for the current season.
- `POST /validate`: **[CRITICAL ENDPOINT]** Body `{ qr_data }`.
  1.  Find `qr_codes` record by `code_hash`.
  2.  Check `is_active` flag and `valid_from`/`valid_to` dates.
  3.  If `Owner` type, check the associated `unit`'s `payments` status for the required service in the current `season`.
  4.  Log the scan in `scan_logs` (including scanner's user ID).
  5.  If visitor QR, mark it as inactive/used if it's single-use.
  6.  Trigger relevant push notifications (to owner/generator).
  7.  Return a detailed response object: `{ status: 'VALID'/'INVALID', reason: '...', data: { user_profile } or { visitor_info } }`.
- `PUT /{id}/invalidate` (Role: Management, Owner): Body `{}`. Sets `is_active = false` for a specific QR code.

##### **Management Endpoints (`/api/management`)**

- **Units (`/units`):**
  - `GET /`: Get all units with owner and payment status info. Supports pagination and filtering.
  - `POST /`: Create a new unit.
  - `POST /{id}/assign-user`: Body `{ user_id }`.
  - `POST /{id}/payments`: Body `{ service_id, season_id, status: 'Paid' }`.
- **Personnel (`/personnel`):**
  - `GET /`: List all personnel.
  - `POST /invite`: Generates a one-time use invite code for a new staff member.
  - `PUT /{id}/revoke`: Deactivates a personnel user account.
- **Seasons (`/seasons`):** Full CRUD for managing seasons.
- **News (`/news`):** Full CRUD for managing news/alerts.
- **Reports (`/reports`):**
  - `GET /payments-due`: Generates report of all units with outstanding payments.
  - `GET /visitor-log`: Generates visitor report with filters (by date, by unit).

#### 4. Business Logic & Key Processes

- **QR Code Generation:** The `code_data` should be a cryptographically strong random string (e.g., UUID v4). This string is stored, and a hash of it (`code_hash`) is used for DB lookups. The QR code itself will contain this raw string.
- **Seasonal Check:** A scheduled job (e.g., using `node-cron`) must run daily to:
  1.  Check if any seasons are ending within the notification period (e.g., 7 days).
  2.  If so, trigger push notifications to all 'management' role users.
  3.  On the day a season ends, automatically invalidate all `Owner` type QR codes tied to that season.
- **Push Notifications:** Create a dedicated service/module for sending notifications via FCM. It will be called from various points in the API (QR validation, cron jobs, news creation). The `users` table must store the user's FCM device token.

#### 5. Security & Best Practices

- **Authentication:** Implement JWT strategy using a library like Passport.js. Tokens should be short-lived (e.g., 1 hour) with a long-lived refresh token.
- **Authorization:** Use middleware to check the `role` from the JWT payload against a list of permitted roles for each endpoint.
- **Input Validation:** Use a library like **Joi** or **Zod** to validate all incoming request bodies to prevent injection attacks and ensure data integrity.
- **Password Hashing:** Use **bcrypt** to hash and salt all user passwords.
- **Error Handling:** Implement a global error handler to catch and format errors consistently, avoiding stack traces in production responses.
- **Configuration:** Use environment variables (`.env` file) for all secrets and configuration (DB connection string, JWT secret, server port, etc.).
- **CORS:** Configure CORS to only allow requests from the web dashboard's domain.
- **HTTPS:** The application must be deployed behind a reverse proxy (like Nginx) configured for SSL/TLS termination.
