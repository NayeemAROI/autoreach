# AutoReach: Advanced B2B Outreach Automation Platform

AutoReach is an enterprise-grade, multi-channel sales engagement and outreach automation platform. It is engineered to help sales teams, founders, growth marketers, and lead generation agencies automate their outbound prospecting across LinkedIn and Email while meticulously safeguarding account health and domain reputation. 

By unifying intelligent sequencing, robust CRM capabilities, centralized inbox management, and deep team collaboration into a single, highly intuitive interface, AutoReach transforms manual and fragmented prospecting into a scalable, high-converting revenue engine.

---

## 🚀 Core Platform Capabilities

### 1. Multi-Channel Campaign Builder & Sequencing
AutoReach moves beyond single-channel limitations by allowing users to build complex, conditional outreach sequences.
*   **Visual Workflow Builder:** Design multi-step sequences combining LinkedIn connection requests, LinkedIn messages, and Emails.
*   **Smart Delays & Timing:** Introduce logical delays (e.g., "Wait 2 days after connection request before sending message 1").
*   **Dynamic Personalization:** Inject lead data and dynamic variables into message templates to ensure every touchpoint feels highly personalized and handcrafted.
*   **A/B Testing (Coming Soon):** Test different subject lines and message variations to optimize conversion rates.

### 2. Intelligent Lead Management & CRM
Centralize your prospecting efforts with a built-in CRM tailored specifically for outbound campaigns.
*   **Seamless Import:** Import leads via CSV or direct integration with essential contact data points.
*   **Pipeline Visibility:** Track the exact status of each lead—from 'Imported' and 'Contacted' to 'Replied' and 'Converted'.
*   **Lead Enrichment:** Store and organize vital prospect information including Name, Email, Job Title, Company, LinkedIn URL, and custom tags.

### 3. State-of-the-Art Safety Engine & Deliverability Protection
Outbound automation is only effective if your accounts stay active and your emails land in the primary inbox. AutoReach features a massive suite of safety tools.
*   **Automated Warm-up Mode:** Gradually scales up your daily sending and connection volumes automatically (e.g., over 14 or 30 days) to build native trust with LinkedIn and Email providers.
*   **Humanoid Action Delays:** Randomizes the exact seconds between automated actions (e.g., wait between 30 to 120 seconds between tasks) to perfectly mimic human browsing behavior and evade bot detection.
*   **Strict Daily Limits:** Granular controls over the maximum number of daily connection requests, direct messages, and emails sent.
*   **Working Hours & Timezone Configuration:** Restrict the automation engine to only execute tasks during chosen local business hours.
*   **Global Blacklists:** Maintain an organizational blacklist of domains and companies to guarantee you never accidentally solicit competitors, existing clients, or disqualified prospects.

### 4. Enterprise Workspace & Team Management
AutoReach is built on a secure, multi-tenant architecture designed to scale seamlessly from solo-preneurs to massive outbound sales floors.
*   **Seat-Based Subscriptions:** Subscriptions dictate exactly how many team members can join a single workspace.
*   **Role-Based Access Control (RBAC):** Strict permission hierarchies consisting of `Owner`, `Admin`, and `Member` tiers.
    *   *Owners* possess full control over billing, workspace deletion, and Admin promotions.
    *   *Admins* can invite members, manage the workspace settings, and view the team roster.
    *   *Members* can access campaigns and the inbox, but cannot alter core organizational structures.
*   **Secure Invitation Flows:** Invite colleagues via email utilizing unique, time-expiring cryptographic tokens. 
*   **Individual Profiles & Preferences:** Every team member maintains their independent profile, password, timezone, Notification configurations (Email, Campaign, Inbox alerts), and UI Theme.

### 5. Unified Smart Inbox
Never lose track of a warm lead across disparate platforms again.
*   **Centralized Communication:** Aggregates replies from both LinkedIn and Email campaigns directly into the AutoReach dashboard.
*   **Contextual Engagement:** View the entire history of the automated campaign sequence alongside the prospect's reply, allowing sales reps to take over the conversation seamlessly and manual close the deal without context-switching.

### 6. Comprehensive Analytics & Activity Logging
Understand exactly what is driving your pipeline generation.
*   **Campaign-Level Insights:** Monitor Sent, Opened, Clicked, Replied, and Bounced metrics per campaign.
*   **Global Activity Log:** A highly transparent, chronological ledger detailing every single action the backend execution engine has taken on your behalf (e.g., "Sent Connection Request to John Doe at 10:45 AM").

---

## 🛠️ Technical Architecture

AutoReach is built using a modern, highly scalable full-stack JavaScript ecosystem.

*   **Frontend:** React.js powered by Vite, utilizing TailwindCSS for a sleek, responsive, and glassmorphism-inspired "premium" UI. Employs React Router for SPA navigation and Lucide React for iconography.
*   **Backend:** Node.js backend executing via Express.js. Implements heavy JWT-based authentication mechanisms and granular route-guarding middleware.
*   **Database:** Robust SQL relational structure (SQLite/PostgreSQL) tracking users, workspaces, complex many-to-many workspace memberships, subscriptions, campaigns, leads, and continuous activity logs.
*   **Execution Engine:** A decoupled background processor responsible for querying campaigns, evaluating logical time delays, respecting user-defined safety constraints (working hours/limits), and executing the actual third-party API payloads.
*   **Integrations & Payments:** Seamless Stripe integration for handling complex tier-based SaaS subscriptions, checkout sessions, and customer portals. Built-in hooks for LinkedIn cookie validation and SMTP integration.

---

## 💳 Pricing & Tiers (Seat-Based)

AutoReach scales dynamically with your organizational needs, utilizing a seat-based subscription model.

*   **Free Plan:** Designed for testing the waters. Includes basic analytics, 100 maximum leads, 2 campaigns, 25 daily actions, and supports 1 Seat.
*   **Pro Plan ($49/mo):** Unlocks advanced analytics, priority support, 2,500 leads, 15 active campaigns, 150 daily actions, and supports a team of up to 3 Seats.
*   **Business Plan ($149/mo):** Built for serious revenue organizations. Unlimited leads, unlimited campaigns, 500 daily automated actions, VIP integrations, and supports up to 10 Seats for a full outbound sales floor.
