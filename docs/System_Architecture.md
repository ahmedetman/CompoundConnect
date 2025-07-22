# System Architecture: CompoundConnect
**Version: 1.0**
**Date: [Current Date]**

## 1. Overview
This document outlines the high-level architecture for the CompoundConnect platform. It is a multi-tenant, multi-platform system designed for scalability, maintainability, and security.

## 2. Architectural Approach: Monorepo
The project is structured as a monorepo containing three distinct packages: `api`, `mobile`, and `web`.
*   **Rationale:** This approach simplifies dependency management, streamlines the development process, and facilitates code sharing. It is well-suited for a small-to-medium-sized team where consistency across platforms is key.
*   **Tooling:** npm/yarn/pnpm workspaces will be used to manage the monorepo.

## 3. Component Diagram & Technology Stack
*   **Backend API (`api`):** A stateless Node.js/Express.js monolith. It handles all business logic, database interactions, and authentication.
    *   **Rationale:** A monolith is simpler to develop, deploy, and manage for V1. It can be broken into microservices later if complexity demands it.
*   **Mobile App (`mobile`):** A single-codebase React Native application for iOS and Android.
    *   **Rationale:** Reduces development time and cost while providing a near-native experience for the app's CRUD and scanning functionalities.
*   **Web Dashboard (`web`):** A React (Vite/CRA) Single Page Application (SPA).
    *   **Rationale:** React is ideal for building the data-rich, interactive UIs required for the management dashboard.
*   **Database (`db`):** A MySQL relational database, likely hosted on a managed service like AWS RDS.
    *   **Rationale:** The data is highly structured and relational (Users, Units, Payments). The transactional nature of a SQL database is critical for financial tracking.

## 4. Non-Functional Requirements (NFRs)

*   **Scalability:** The backend API is designed to be stateless, allowing it to be horizontally scaled by running multiple instances behind a load balancer.
*   **Availability:** The database should be deployed in a high-availability configuration (e.g., AWS RDS Multi-AZ). The API will use health checks to ensure traffic is only routed to healthy instances.
*   **Performance:** The QR code validation flow is critical. The `POST /api/personnel/validate-qr` endpoint must have a p95 response time of under 300ms.
*   **Security:**
    *   **Transport:** All traffic between clients and the API must be encrypted via HTTPS.
    *   **Authentication:** JWTs will be used for stateless authentication.
    *   **Authorization:** Strict Role-Based Access Control (RBAC) will be enforced at the API middleware level for every request.
    *   **Data:** Passwords will be hashed using `bcrypt`. All user input will be validated to prevent injection attacks.

## 5. Deployment Strategy
*   **Backend API:** Dockerized and deployed to a container orchestration service like AWS Fargate or a PaaS like Heroku.
*   **Web Dashboard:** Deployed as a static site to a service like AWS S3/CloudFront, Netlify, or Vercel.
*   **Mobile App:** Submitted to the Apple App Store and Google Play Store.