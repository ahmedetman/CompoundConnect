# Product Requirements Document: CompoundConnect
**Version: 1.0**
**Date: [Current Date]**

## 1. Vision & Goals
CompoundConnect is a modern, multi-platform application designed to streamline operations, enhance security, and improve the resident experience within private residential compounds.

*   **Primary Goal:** To replace manual access control and management processes with a secure, efficient, and user-friendly digital system centered around QR codes.
*   **Key Pillars:** Security, Convenience, Communication, and Management Efficiency.

## 2. User Personas

*   **Super Admin:** Manages multiple compounds. Needs a high-level web dashboard for oversight and adding new compounds.
*   **Compound Management:** The primary power user. Manages a single compound's daily operations, including finances, staff, residents, and communication via a detailed web dashboard.
*   **Unit Owner / Resident:** The primary mobile user. Values convenience and security. Needs quick access to personal QRs, visitor management, and compound news.
*   **Security & Facility Personnel:** On-the-ground staff (gate security, pool staff). Needs an extremely simple, fast, and reliable mobile app for scanning and validating QR codes.

## 3. Feature Breakdown (User Stories)

### 3.1. Core System & Multi-Tenancy
*   **As a Super Admin, I want to** add and manage multiple compounds, each with its own isolated data and management team.

### 3.2. Management & Administration (Web Dashboard)
*   **As a Compound Manager, I want to** view a dashboard with key statistics (payment compliance, active visitors).
*   **As a Compound Manager, I want to** manage all units, including assigning multiple owners/residents to a single unit.
*   **As a Compound Manager, I want to** track and update the payment status for each unit's fees (e.g., Annual Maintenance, Pool Access) for the current season.
*   **As a Compound Manager, I want to** manage personnel accounts, generate one-time invitation codes for them, and revoke their access at any time.
*   **As a Compound Manager, I want to** configure the start and end dates of the "Compound Season" which dictates payment cycles and personnel account validity.
*   **As a Compound Manager, I want to** receive an automated notification when the current season is about to end.
*   **As a Compound Manager, I want to** view a master log of all visitor QR codes, see their status, and have the ability to invalidate any active code.
*   **As a Compound Manager, I want to** publish news and alerts (e.g., sea conditions, events, maintenance notices) to all residents.
*   **As a Compound Manager, I want to** generate reports on finances (payments due vs. paid) and visitor traffic.

### 3.3. Unit Owner / Resident (Mobile App)
*   **As a Unit Owner, I want to** log in securely to my account.
*   **As a Unit Owner, I want to** view my personal, non-expiring Gate Access QR code, which is automatically enabled for the season when my unit's maintenance fee is paid.
*   **As a Unit Owner, I want to** view my facility-specific QR codes (e.g., Pool, Kids Area), which are only visible if the corresponding fees are paid for my unit.
*   **As a Unit Owner, I want to** generate a time-bound QR code for my visitors, providing their name, number of accompanying persons, and an optional vehicle plate number.
*   **As a Unit Owner, I want to** view a history of my generated visitor QR codes and their usage status.
*   **As a Unit Owner, I want to** receive a push notification for my awareness whenever one of my QR codes (personal or visitor) is successfully scanned at an entry point.
*   **As a Unit Owner, I want to** view the latest news and alerts from compound management.
*   **As a Unit Owner, I want to** see the payment status of my unit's fees.

### 3.4. Security & Personnel (Mobile App)
*   **As a Security Guard, I want to** register my device once using a unique invitation code from management.
*   **As a Security Guard, I want to** use a simple interface with one primary button: "Scan QR Code".
*   **As a Security Guard, I want to** scan a QR code and instantly see a clear, color-coded result:
    *   **VALID:** Display the owner's profile (photo, name, unit) or visitor's details.
    *   **INVALID:** Display a clear, unambiguous error message.
*   **As a Facility Staff member, I want to** scan a facility QR code and see if the user has access and for how many people (e.g., "Kids Area Access: 2 Children").

## 4. Out of Scope for Version 1.0
*   In-app payment processing. (Status is updated manually by management).
*   Direct messaging between residents and management.
*   Booking system for compound facilities.
*   Social features like a resident forum.