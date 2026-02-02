# ECRIN Specifications

::: info Version
Version 1.0 - February 1, 2026
Le Havre Normandie University - Campus Polytechnique des Territoires Maritimes et Portuaires - EUNICoast
:::

## 1. Introduction

### 1.1 Project Vision

ECRIN is an innovative collaborative platform that aims to revolutionize how researchers identify and establish mutually beneficial scientific collaborations. Inspired by the "matching" concept popularized by consumer applications, ECRIN applies intelligent semantic analysis algorithms to identify scientific complementarities between researchers, thus facilitating the emergence of win-win collaborations.

Beyond simple matching, ECRIN constitutes a true digital ecosystem for the research community, integrating visualization, communication, collaborative project management, event organization, and cultural exchange functionalities, creating a vibrant and dynamic space for science.

### 1.2 Context and Partnership

The ECRIN project is led by Le Havre Normandie University as part of its institutional projects of the Campus Polytechnique des Territoires Maritimes et Portuaires in collaboration with EUNICoast. This initiative is part of a process to strengthen European scientific cooperation and promote academic excellence in the field of maritime and coastal territories.

The platform relies on the University's technical infrastructure and benefits from EUNICoast's expertise and international network, enabling both a local approach (controlled infrastructure) and a global one (international community).

### 1.3 Strategic Objectives

ECRIN's strategic objectives are:

- Facilitate the identification of complementary scientific collaborations through artificial intelligence and semantic analysis
- Create a vibrant ecosystem fostering exchanges between researchers beyond disciplinary and institutional boundaries
- Centralize academic profile information while respecting chosen confidentiality levels
- Stimulate innovation through the meeting of diverse skills and expertise
- Strengthen the visibility and impact of research conducted within the EUNICoast network
- Offer a modern and efficient tool adapted to researchers' current digital practices

### 1.4 Scope and Scale

ECRIN is designed to serve a community of approximately 1,000 researchers, mainly from EUNICoast partner institutions. This scale enables:

- Efficient management of semantic analysis and matching calculations
- A sufficiently large community to generate rich synergies
- A critical mass enabling the emergence of spontaneous collaborative dynamics
- Controlled deployment on the Campus Polytechnique infrastructure

### 1.5 Definitions and Acronyms

| Term | Definition |
|------|------------|
| **NLP** | Natural Language Processing |
| **ORCID** | Open Researcher and Contributor ID (unique researcher identifier) |
| **REDCap** | Research Electronic Data Capture (research data management platform) |
| **CI/CD** | Continuous Integration / Continuous Deployment |
| **k3s** | Lightweight Kubernetes distribution, cluster management software |
| **GDPR** | General Data Protection Regulation |
| **DPO** | Data Protection Officer |
| **WCAG** | Web Content Accessibility Guidelines |
| **PWA** | Progressive Web App |

## 2. User Journey & Functional Sections

### 2.1 Overview

ECRIN is organized around 5 main sections that reflect the complete lifecycle of a scientific collaboration, from the researcher's initial presentation to sharing research results. Each section offers specific functionalities while integrating into a coherent journey.

### 2.2 PROFILE - Scientific Identity and Presentation

This section allows researchers to build their digital identity within ECRIN:

- Personal information and institutional affiliation
- Research questions and scientific interests
- Academic publications (automatically enriched via ORCID and OpenAlex)
- Data visibility level management (public, confidential partners, aggregated)
- Profile completeness tracking

The profile is the foundation on which the matching algorithm and collaboration suggestions are based.

### 2.3 DISCOVER - Exploration and Matching

This section offers powerful tools to explore the researcher community:

- Multiple interactive visualizations (network graphs, geographic maps, thematic histograms, NLP semantic spaces)
- Automatic suggestions of potential collaborators based on the matching algorithm
- Advanced search with multiple filters
- Fluid navigation between different views
- Like system to continuously improve suggestion relevance

### 2.4 COLLABORATE - Communication and Coordination

This section facilitates interactions and coordination between researchers:

- Internal messaging for exchanging with other researchers or administrative services
- Thematic forums for structured discussions and community norms elaboration
- Targeted announcement system (offers and requests distributed intelligently)
- Complete collaborative project management (definition, recruitment, execution)
- Organization and participation in events (virtual and physical)
- Contact with funding support services

### 2.5 SHARE - Resources and Culture Sharing

This section encourages knowledge sharing and dissemination:

- Dataset publishing and searching
- Calls for participation for data collection
- Scientific news sharing
- Cultural space for artistic and informal exchanges (photos, paintings, other art forms)
- Presentation of completed projects with their results

### 2.6 LEARN - Training and Development

This section supports continuous professional development:

- Training events
- Methodological resources
- Standards and references collaboratively developed by the community

## 3. Detailed Features

### 3.1 Profile Management

#### 3.1.1 Basic Data

Each profile includes:

- Last name, first name
- Institutional affiliation (university, laboratory)
- Contact details (email)
- ORCID identifier (optional but recommended)

#### 3.1.2 Research Questions

Researchers describe their research questions in English. This textual information is analyzed by the NLP algorithm to identify complementarities with other researchers.

#### 3.1.3 Publications

Researcher publications are automatically retrieved from bibliographic databases (see section 3.2) and enrich their profile. Researchers can validate and complete this list.

#### 3.1.4 Visibility Levels

Researchers choose a visibility level for each type of information:

| Level | Description |
|-------|-------------|
| **Public** | Accessible to all ECRIN users |
| **Confidential to partner institutions** | Only visible to researchers from EUNICoast member institutions |
| **Aggregated/anonymous** | Used only for anonymized statistics |

These levels also apply to matching possibilities: a researcher can only be suggested to people who have access to their visibility level.

#### 3.1.5 Language Validation

The ECRIN application automatically detects the language used in text fields (biography, research questions). If a language other than English is detected after submission, the researcher receives a notification asking them to correct their content. The affected fields are hidden/marked as incomplete until correction, as the NLP algorithm only works with English content.

#### 3.1.6 Progressive Completeness

The profile is visible from registration, but the quality of matching suggestions improves with profile completeness. A participation score is calculated based on:

- Profile completeness (bio, questions, publications)
- Participation (forums, events, likes)
- Regular updates

### 3.2 Automatic Enrichment

#### 3.2.1 ORCID Integration

If researchers provide their ORCID identifier, the platform automatically retrieves their publications from the ORCID API. This method is reliable and direct.

#### 3.2.2 Name Search with Disambiguation

For researchers without ORCID, the application searches for their publications in OpenAlex by name. A disambiguation process crosses:

- Author name
- Declared institutional affiliation
- Mentioned article titles

This disambiguation avoids confusion between namesakes.

#### 3.2.3 Multiple Bibliographic Sources

Enrichment relies on several bibliographic databases to maximize completeness and reliability:

- **OpenAlex** (main source)
- **Crossref**
- **IDREF** (for French researchers)
- **HAL** (French open archives)

#### 3.2.4 Automatic Confidence Thresholds

A scoring system evaluates concordance between multiple sources:

- If 3 out of 4 sources agree: automatic publication validation
- If only 1 or 2 sources: manual validation required by the researcher

This mechanism reduces researcher cognitive load while maintaining profile reliability.

#### 3.2.5 Automatic Monthly Refresh

Profiles are automatically synchronized monthly with bibliographic databases to detect new publications. Researchers are notified of additions and can validate publications detected below the confidence threshold.

### 3.3 Matching Algorithm & Suggestions

#### 3.3.1 NLP Semantic Analysis

The algorithm uses natural language processing techniques to analyze:

- Researcher biographies
- Formulated research questions
- Publication titles and abstracts
- Project contents

This analysis extracts semantic embeddings that capture the meaning of texts beyond keywords, enabling identification of subtle complementarities.

#### 3.3.2 Asynchronous Calculation

Matching calculations are performed in the background via a task queue and dedicated workers (Python/Torch, R containers). This enables:

- Not blocking the user experience
- Efficiently managing heavy processing
- Recalculating suggestions following profile updates

Researchers are notified when their suggestions are updated.

#### 3.3.3 Personalized Suggestions

The algorithm automatically suggests potential collaborators to researchers based on:

- Scientific complementarity (skills, methodologies, data)
- Thematic proximity
- Implicit preferences (via researcher likes)
- Consultation and interaction history

#### 3.3.4 Visibility Level Compliance

The algorithm strictly respects visibility levels: a researcher can only be suggested to people who have the right to access their information according to their privacy settings.

### 3.4 Visualizations & Exploration

#### 3.4.1 Network Graphs

Visualization of collaboration networks and thematic proximities between researchers. Graphs enable identification of disciplinary clusters, bridges between domains, and visual navigation through the community.

#### 3.4.2 Geographic Maps

Display of the geographic distribution of researchers and their institutions. Useful for identifying physical proximities facilitating meetings or understanding the network's geographic coverage.

#### 3.4.3 Thematic Histograms

Representation of statistical distributions: breakdown by discipline, project type, publication year, etc. These visualizations provide a macro view of the community composition.

#### 3.4.4 NLP Semantic Spaces

Profile projection in 2D or 3D semantic space enabling visualization of thematic proximities. Researchers close in this space share similar scientific interests.

#### 3.4.5 Technologies: D3.js and Vega

Visualizations are developed with D3.js and Vega, enabling performant interactive rendering with zoom, dynamic filtering, and fluid transitions.

#### 3.4.6 Fluid Navigation Between Views

Researchers can start with a global view (community graph), zoom in on an area of interest, then consult individual profiles. Conversely, they can launch a targeted search then visualize results from different angles. Visualizations are both entry points for exploration and tools for analyzing search results.

### 3.5 Advanced Search

#### 3.5.1 Multiple Filters

The search interface offers many combinable filters:

- Keywords in profiles, publications, projects
- Research domains
- Institutions
- Geographic locations
- Skill types
- Collaboration availability

#### 3.5.2 Semantic Search

Beyond keyword search, semantic search uses NLP embeddings to find conceptually close profiles, even without identical terms.

#### 3.5.3 Multiple Entry Points

Search can be initiated from:

- A global search bar
- A click on a visualization zone (e.g., geographic region, thematic cluster)
- Automatic suggestions

### 3.6 Internal Messaging

#### 3.6.1 Peer-to-Peer Communication

Researchers can exchange directly via internal messaging integrated into the platform. This facilitates initiating contacts following a discovery via matching or visualizations.

#### 3.6.2 Contact with Administrative Services

A dedicated channel allows researchers to contact support services (valorization, funding application preparation, technical support).

#### 3.6.3 Notifications

Researchers receive notifications:

- **In-app**: visible when connected to the platform
- **Email**: configurable by event type (new messages, project invitations, matching suggestions, etc.)

Notification preferences are customizable via a dedicated dashboard.

### 3.7 Announcements

#### 3.7.1 Announcement Types

Researchers can create different types of announcements:

- Collaboration offers
- Expertise requests
- Data sharing
- Funding search
- Calls for participation

#### 3.7.2 Intelligent Targeted Distribution

The matching algorithm automatically identifies researchers most likely to be interested in a given announcement, based on their profile, skills, and interests. Announcements are thus distributed in a targeted manner rather than broadcast to the entire community, reducing noise and increasing relevance.

#### 3.7.3 Link to Projects

An announcement can be linked to a specific project (e.g., recruitment announcement for a project under constitution).

### 3.8 Thematic Forums

#### 3.8.1 Free Creation with Suggestions

Any researcher can create a thematic forum. Before creation, the system automatically suggests similar existing forums (NLP detection on title and description) to encourage joining rather than fragmenting the discussion.

#### 3.8.2 Structured Discussions

Forums allow exchanges organized by discussion threads, with the ability to reply, mark messages as important, and search through history.

#### 3.8.3 Collaborative Norms Elaboration

Thematic forums also serve as spaces for collaborative elaboration of:

- Methodological norms
- Disciplinary frameworks
- Data collection standards
- Shared best practices

#### 3.8.4 Calls for Contribution

Forums can host calls for contribution (submissions to special volumes, survey participation, etc.).

### 3.9 Events

#### 3.9.1 Algorithmic Critical Mass Detection

The algorithm monitors emerging themes and detects when a critical mass of researchers is interested in a subject. It then proposes to concerned researchers to organize an event (webinar, workshop, meeting).

#### 3.9.2 Researcher Creation

Researchers can also freely create events. The algorithm then suggests these events to relevant profiles.

#### 3.9.3 Virtual Then Physical

The strategy prioritizes virtual events first (webinars, video conferences) to test audience and engagement. Engagement metrics (participation, interactions, feedback) then help decide whether to organize a physical meeting if interest is confirmed.

#### 3.9.4 Registration Management

The platform manages registrations, confirmations, and reminders. For physical events, capacity, location, and logistics management is integrated.

#### 3.9.5 Calendar Integration

Events integrate into researchers' personal calendars. .ics export available for import into external calendar applications (Outlook, Google Calendar, etc.).

#### 3.9.6 Timezone Management

Complete timezone management system:

- Automatic display in each researcher's local timezone
- Explicit conversions displayed (e.g., '10:00 UTC (11:00 Paris, 05:00 New York)')
- Optimal time slot suggestions when creating events based on potential participants' timezones

### 3.10 Cultural Space

#### 3.10.1 Objective

The cultural space aims to create human connections beyond pure scientific activity, fostering informal exchanges that can themselves lead to unexpected collaborations.

#### 3.10.2 Content Types

Researchers can share:

- Photographs
- Paintings and illustrations
- Other forms of artistic expression

This content is moderated by community self-regulation with reporting capability.

### 3.11 Project Management (Complete Cycle)

#### 3.11.1 Project Definition

To create a project, researchers provide:

- Project title
- Acronym
- Scientific summary (in English)
- Integration with EUNICoast common research teams or hubs
- Visibility choice (public or confidential)

The creator automatically becomes project leader with extended rights.

#### 3.11.2 Team Recruitment

Collaborator recruitment is done through several channels:

- **Automatic algorithmic suggestions**: as soon as a project is created, the algorithm identifies and alerts potentially interested researchers
- **Spontaneous applications**: researchers can apply to public projects
- **Direct invitations**: the project leader can directly invite researchers discovered via matching or visualizations

The project leader validates the integration of new members.

#### 3.11.3 Active Collaborative Space

Once the team is formed, a complete workspace is available:

- Internal project team discussion
- Document sharing (NextCloud integration for collaborative files, REDCap for sensitive data)
- Milestone management
- Task assignment and tracking
- Overall progress monitoring
- Common publication preparation

#### 3.11.4 Roles and Permissions

Two main roles:

| Role | Rights |
|------|--------|
| **Project Leader** | Defines milestones, validates members, archives the project |
| **Contributors** | Participate, add documents, discussions, but cannot modify project structure |

#### 3.11.5 Completed Projects

When a project ends, it is transformed into a 'completed project' and published in the SHARE section with its results and associated publications. This enriches the community knowledge base and can inspire future projects.

### 3.12 Data and Calls for Participation

#### 3.12.1 Dataset Publishing

Researchers can share their datasets with the community (subject to licenses and agreements). This facilitates data reuse and encourages open science.

#### 3.12.2 Calls for Participation

Researchers can launch calls for participation to collect data (surveys, distributed experiments, field observations).

### 3.13 Administrative Services Contact

A dedicated communication channel connects researchers with institutional administrative services for:

- Funding application preparation
- Research valorization
- Legal and contractual support

### 3.14 Gamification System

#### 3.14.1 Objectives

The gamification system aims to encourage active engagement and quality contribution to the community, while avoiding adverse effects (spam, toxic competition).

#### 3.14.2 Contribution Score

A score is calculated by weighting contributions by their quality:

- Likes received on forum posts count more than simple message volume
- Successfully organized events (high participation)
- Completed collaborative projects
- Published datasets being reused

#### 3.14.3 Diversity Valorization

Bonuses are awarded for varied contributions (forums + events + cultural space) rather than concentration on a single activity.

#### 3.14.4 Anti-spam Caps

Daily point caps discourage spam and favor reflection over raw volume.

#### 3.14.5 Badges and Recognition

Badges recognize specific contributions:

- 'Event Organizer'
- 'Active Expert'
- 'Top Contributor 2026'

Some badges require community validation (peer votes or nominations).

### 3.15 Like System

#### 3.15.1 Implicit Feedback

Researchers can "like":

- Matching suggestions
- Relevant visualizations
- Search results
- Proposed analyses

#### 3.15.2 Continuous Algorithm Improvement

These signals help refine the matching algorithm by learning from researchers' implicit preferences.

#### 3.15.3 Experience Personalization

If a researcher regularly likes certain types of profiles or visualizations, the system adjusts future suggestions accordingly.

## 4. Technical Architecture

### 4.1 Infrastructure

#### 4.1.1 K3s Hosting

The platform is hosted on Le Havre Normandie University's own infrastructure, using k3s (lightweight Kubernetes distribution). This choice guarantees:

- Complete data control (essential for GDPR and confidentiality)
- Independence from commercial cloud providers
- Adaptation to available resources
- Kubernetes power for orchestration

#### 4.1.2 Microservices Architecture

The application is decomposed into independent containerized services:

- Authentication service
- Profile management service
- Matching/NLP service (Python/Torch containers)
- Visualization service
- Messaging service
- Forum service
- Event service
- Project service
- API Gateway for routing

### 4.2 Technology Stack

#### 4.2.1 Backend

**Node.js + Hono**: ultra-lightweight and performant framework for the backend API.

#### 4.2.2 Frontend

**Svelte**: modern framework compiling to optimized JavaScript code, offering excellent performance and pleasant developer experience.

#### 4.2.3 Multi-platform Applications

| Platform | Technology |
|----------|------------|
| **Web/Desktop** | Tauri (near-native, lightweight ~3-5MB, using system webview) |
| **iOS** | Capacitor (optimized wrapper of the web application) |

#### 4.2.4 Visualizations

D3.js and Vega for rich and performant interactive visualizations.

#### 4.2.5 NLP Computing

Isolated specialized containers:

- Python with PyTorch for deep learning and semantic embeddings
- R for complementary statistical analyses

These containers are triggered asynchronously via a task queue.

### 4.3 Databases

#### 4.3.1 REDCap (Sensitive Data Repository)

REDCap remains the permanent reference system for storing all sensitive data:

- Researcher profiles
- Questionnaires
- Personal identifying data
- Confidential project data

The ECRIN application interacts with REDCap exclusively via its API. ECRIN is the user interface that reads and writes to REDCap, completely masking REDCap's complexity from researchers.

#### 4.3.2 InfluxDB (Timeseries)

Specialized database for storing pseudonymized timeseries data:

- Platform usage metrics
- Events (connections, user actions)
- Temporal analytics

#### 4.3.3 Vector Database (NLP Embeddings)

Specialized database (Milvus or Qdrant) for efficiently storing and querying profile semantic embeddings, enabling fast similarity searches.

#### 4.3.4 Graph Database (Optional)

If network visualizations become complex, a graph database (Neo4j) could be added to efficiently model collaboration networks.

#### 4.3.5 NextCloud (Collaborative Documents)

NextCloud instance integrated with ECRIN for sharing and collaborative editing of documents within project spaces. Sensitive documents remain in REDCap.

### 4.4 Data Synchronization

#### 4.4.1 Real-time via Webhooks

For critical updates (new profile, visibility modification, new validated publications), REDCap webhooks trigger immediate synchronization to specialized databases.

#### 4.4.2 Batch ETL

For heavy processing (complete embeddings recalculation, metric aggregations), ETL (Extract-Transform-Load) jobs run daily or weekly, extracting pseudonymized data from REDCap to specialized databases.

#### 4.4.3 ECRIN Writes to REDCap

Any profile or sensitive data modification made via the ECRIN interface is immediately written to REDCap via its API, maintaining REDCap as the single source of truth.

### 4.5 Asynchronous Processing

#### 4.5.1 Task Queue

A task queue manages asynchronous processing:

- NLP analysis of new profiles or content
- Matching suggestions recalculation
- Language detection on submitted content
- Complex visualization generation

#### 4.5.2 Dedicated Workers

Workers (containers) consume tasks from the queue and execute calculations.

#### 4.5.3 Completion Notifications

When asynchronous processing is complete, the concerned researcher receives a notification (in-app and/or email according to preferences).

### 4.6 CI/CD

#### 4.6.1 Continuous Integration

Automated pipelines:

- Automatic test triggering on each commit
- Code quality verification (linting, static analysis)
- Unit tests and integration tests
- Docker image builds

#### 4.6.2 Continuous Deployment

If all tests pass, automatic deployment:

- First deployment to staging environment
- Automatic then manual validation
- Production deployment with Canaries strategy (progressive rollout)

## 5. Security & Confidentiality

### 5.1 Authentication

#### 5.1.1 Passwordless

Password-free authentication via:

- Magic links sent by email
- WebAuthn/Passkeys (biometric authentication or security keys)

This significantly improves security (no weak or reused passwords) and user experience.

#### 5.1.2 Optional MFA

Optional multi-factor authentication via TOTP (Time-based One-Time Password) for researchers handling particularly sensitive data.

#### 5.1.3 Session Management

- Automatic expiration after 30 minutes of inactivity
- Secure tokens (JWT or similar)
- Session revocation possible by user

#### 5.1.4 Anomaly Detection

- Connections from unusual geolocations
- Device fingerprinting to detect unauthorized access
- User alerts in case of suspicious activity

### 5.2 Network Protection

#### 5.2.1 Rate Limiting

Limiting the number of requests per IP/user to prevent:

- Spam
- Brute force attacks
- API abuse

#### 5.2.2 DDoS Protection

Protection against distributed denial of service, potentially via Cloudflare (free version) as a front-end or on-premise solution.

#### 5.2.3 WAF (Web Application Firewall)

Filtering of malicious requests (SQL injections, XSS, etc.).

#### 5.2.4 Strict HTTPS

- Auto-renewed Let's Encrypt certificates
- HSTS (HTTP Strict Transport Security) to force HTTPS

### 5.3 Application Security

#### 5.3.1 Validation and Sanitization

All user inputs are validated and cleaned to prevent:

- SQL injections
- Cross-Site Scripting (XSS)
- Command injections

#### 5.3.2 Configured CORS

Cross-Origin Resource Sharing strictly configured: only authorized domains can access the API.

#### 5.3.3 Encryption at Rest

Sensitive data encrypted at rest in REDCap and auxiliary databases.

#### 5.3.4 Audit Logs

Complete traceability of all sensitive operations:

- Who accessed which sensitive data
- When and from which IP address
- Profile, project, visibility setting modifications

### 5.4 Secure Infrastructure

#### 5.4.1 Microservices Isolation

Network partitioning in k3s: microservices only communicate via defined interfaces, limiting the attack surface.

#### 5.4.2 Vulnerability Scans

Automated Docker image scans (Trivy, Snyk) to detect known vulnerabilities in dependencies.

#### 5.4.3 Secrets Management

Secure secrets management (API tokens, encryption keys) via Vault or encrypted k8s Secrets. Never hardcoded credentials in code.

#### 5.4.4 Patching Policy

Regular and systematic security updates of dependencies and system components.

### 5.5 Visibility Levels

The three data visibility levels are strictly applied:

| Level | Description |
|-------|-------------|
| **Public** | Data visible to all internet users and ECRIN. Researcher can appear in public visualizations and receive matching suggestions from any researcher with ECRIN access. |
| **Confidential to partner institutions** | Data only visible to researchers from EUNICoast member institutions. Matching is restricted to this community. |
| **Aggregated/anonymous** | Data used only for anonymized statistics. Researcher does not appear individually in visualizations or matching. |

## 6. GDPR & Compliance

### 6.1 Principles

#### 6.1.1 Privacy by Design

Data protection is integrated from the platform's design, not added later.

#### 6.1.2 Data Minimization

Only data strictly necessary for declared purposes is collected.

#### 6.1.3 Pseudonymization

Non-personal data is pseudonymized when transferred from REDCap to specialized databases (InfluxDB, vector database, etc.).

### 6.2 User Rights

#### 6.2.1 Right to be Forgotten

When a researcher requests account deletion, their personal identifying data is deleted, but their community contributions (forum posts, projects, created events) are pseudonymized and preserved to maintain collective value. Identity is replaced by 'Researcher [deleted]'.

#### 6.2.2 Right to Portability

Researchers can request a complete export of their personal data. A ZIP package is generated containing:

- Structured data (JSON)
- Any attached files
- Readable PDF summary report

#### 6.2.3 Right of Rectification

Researchers can modify their personal data at any time via the ECRIN interface.

### 6.3 Data Governance

#### 6.3.1 Retention Periods

Data retention periods are defined by the Le Havre Normandie University DPO (Data Protection Officer) in compliance with regulations.

#### 6.3.2 REDCap as Compliance Repository

REDCap, specifically designed for research and GDPR compliant, ensures traceability and access controls on all sensitive data.

#### 6.3.3 Access Logs

Access logs for sensitive data are kept for the duration defined by the DPO.

#### 6.3.4 Cookie Consent

A GDPR-compliant consent banner informs users about cookie use and allows them to manage their preferences.

## 7. User Experience

### 7.1 Onboarding

#### 7.1.1 Initial Tutorial

Upon first connection, a short interactive tutorial (2-3 minutes) presents the 5 main sections and their key features.

#### 7.1.2 Contextual Tooltips

Throughout navigation, tooltips appear to explain features at the relevant moment, promoting progressive learning.

#### 7.1.3 Progressive Profile

The profile is visible from registration, but the quality of matching suggestions varies according to profile completeness and researcher participation. This naturally encourages progressive enrichment without blocking initial access.

### 7.2 Multilingualism

#### 7.2.1 100% English Platform

The interface, user content (biographies, research questions, projects, announcements) and all communications must be in English. This choice simplifies design and is consistent with the international scientific context.

#### 7.2.2 Automatic Language Validation

An automatic detection system (fastText or similar) analyzes submitted content. If a language other than English is detected, the researcher is notified and the affected fields are hidden until correction, as the NLP algorithm only works with English.

### 7.3 Accessibility

#### 7.3.1 WCAG 2.1 AA Compliance

Overall compliance with Web Content Accessibility Guidelines 2.1 Level AA:

- Sufficient color contrasts
- Complete keyboard navigation
- Screen reader support
- Alternative texts on images
- Accessible forms

#### 7.3.2 Effort Toward WCAG AAA on Critical Features

For critical features (authentication, profile management, project creation), additional effort to reach AAA level when technically feasible.

### 7.4 Internationalization

#### 7.4.1 Complete Timezone Management

Sophisticated system to manage the international community:

- Automatic display in each researcher's local timezone
- Explicit conversions displayed (e.g., '10:00 UTC (11:00 Paris, 05:00 New York)')
- Intelligent time slot suggestions when creating events based on potential participants' timezones
- .ics export that automatically handles TZ

### 7.5 Platforms

| Platform | Technology | Notes |
|----------|------------|-------|
| **Web** | Responsive | Adapting to all screen types (desktop, tablet, mobile) |
| **iOS** | Capacitor | Native iOS application offering near-native experience with native system API access |
| **Desktop** | Tauri | Lightweight desktop application (~3-5MB) using system webview with excellent OS integration (Windows, macOS, Linux) |

### 7.6 Notifications

#### 7.6.1 In-app Notifications

Notification center accessible from any application page, displaying:

- New messages
- Updated matching suggestions
- Invitations to projects or events
- Relevant announcements
- Newly detected publications

#### 7.6.2 Email Notifications

Finely configurable email notifications: researchers choose for each event type whether they want to receive an email or only an in-app notification.

## 8. Governance & Moderation

### 8.1 Roles

#### 8.1.1 Researcher

All researchers have the same complete functional rights: create forums, events, projects, publish announcements, etc. No hierarchy between researchers.

#### 8.1.2 Administrator

Technical role only: infrastructure management, bug resolution, log access for diagnostics. Administrators do not intervene in content moderation except in exceptional cases.

### 8.2 Self-regulation

#### 8.2.1 Principle

The academic community is considered mature and capable of self-regulation. No proactive content moderation.

#### 8.2.2 User Reporting

Researchers can report inappropriate content or spam. Reports are examined by administrators only if there is abnormal accumulation.

#### 8.2.3 Exceptional Intervention

Administrators intervene only in case of manifest and serious violation (illegal content, harassment, massive spam).

### 8.3 Forum Management

#### 8.3.1 Free Creation

Any researcher can create a thematic forum without prior validation.

#### 8.3.2 Anti-fragmentation Suggestions

Before creation, the system suggests similar existing forums (NLP analysis on title and description) to encourage joining rather than creating a duplicate.

### 8.4 Event Management

#### 8.4.1 Researcher Creation

Researchers can freely create events. The algorithm suggests these events to relevant profiles.

#### 8.4.2 Algorithmic Detection

The algorithm can also detect a critical mass on a subject and propose to concerned researchers to organize an event.

## 9. Support & Maintenance

### 9.1 User Support

| Level | Description |
|-------|-------------|
| **Level 1: FAQ/Documentation** | Complete online documentation, FAQ for common questions. Researcher starts by looking for the answer themselves. |
| **Level 2: Community Forum** | Forum dedicated to mutual help: researchers help each other. Recurring questions enrich the FAQ. |
| **Level 3: Technical Support** | For unresolved cases, escalation to technical team via GitHub Issues. A structured form forces precise problem description. The system automatically suggests relevant FAQ/forum posts before validation to gently filter. |

### 9.2 Backup & Disaster Recovery

#### 9.2.1 Frequency

Daily automated backups (at 3 AM).

#### 9.2.2 Retention

- 7 last daily backups
- 4 weekly backups
- 3 monthly backups

#### 9.2.3 Location

| Location | Description |
|----------|-------------|
| **Primary** | Campus storage separate from production servers |
| **Off-site** | Weekly copy to economical cloud (S3 Glacier) or EUNICoast partner institution |

#### 9.2.4 Restoration Tests

Quarterly tests (4 times per year) to verify backup integrity and restoration procedure.

#### 9.2.5 Automation

Kubernetes CronJobs manage automatic backups. Alerts sent to technical team on failure.

#### 9.2.6 Objectives

| Metric | Target |
|--------|--------|
| **RPO** (Recovery Point Objective) | Maximum 24h acceptable data loss |
| **RTO** (Recovery Time Objective) | Restoration in 4-8h |

### 9.3 Monitoring

#### 9.3.1 Monitoring Stack

- **Prometheus**: metrics collection
- **Grafana**: visual dashboards
- **Loki**: centralized logs
- **Alertmanager**: alert management
- **Jaeger** (optional): distributed tracing to debug performance

#### 9.3.2 Monitored Metrics

**Infrastructure:**
- CPU, RAM, disk, network per container
- K3s pod health

**Application:**
- Requests/second, API latency, HTTP error rate
- Response time of different services

**Databases:**
- Active connections, query time
- Database size

**NLP Computing:**
- Queue length
- Average processing time

**Users:**
- Active connections
- Feature usage

#### 9.3.3 Alerts

- Critical errors (500, service crashes)
- Overload (CPU >80%, memory >90%)
- Failed backup
- REDCap API inaccessible
- Saturated NLP queue

#### 9.3.4 Dashboards

- Overview: platform overall health
- Performance by service
- User engagement metrics

## 10. Metrics & Analytics

### 10.1 Technical Metrics

- Performance: average latency, response time, errors
- Resource usage: CPU, RAM, bandwidth
- Availability: uptime, incidents

### 10.2 Engagement Metrics

- Profiles created and completion rate
- Matching suggestions consulted
- Messages exchanged
- Announcements distributed and response rate
- Forum participation (posts, reads)
- Events organized/attended
- Likes given
- Visualization usage
- Projects created, members recruited, projects completed

### 10.3 Quality Metrics

- Suggestion relevance (via like rate)
- Profile completion rate
- Number of collaborations initiated
- User satisfaction (periodic surveys)

### 10.4 Analytics for Continuous Improvement

- A/B testing of features
- NLP algorithm optimization based on feedback
- Increasing experience personalization

## 11. Deployment & Evolution

### 11.1 Current Phase (REDCap)

Data collection has already begun via REDCap questionnaires on:

- ORCID identifier
- Bibliographic references
- Research questions
- Name, first name, university affiliation

This collection phase precedes the development of the complete ECRIN application.

### 11.2 Continuous Deployment

Iterative approach with progressive feature delivery. Each sprint develops and deploys a new feature or improvement, enabling frequent user feedback and rapid adjustments.

### 11.3 Pilot Phase (Canaries)

#### 11.3.1 Objective

Test the platform with a restricted group of researchers before generalized deployment. Identify bugs, collect feedback, adjust ergonomics and algorithm.

#### 11.3.2 Pilot Group

Volunteer researchers from an EUNICoast partner institution to start (Canaries strategy).

### 11.4 Pilot Success Criteria

The platform will be considered ready for broader deployment if:

- Minimum number of profiles created and completed
- Adoption rate of main features (messaging, visualizations, matching)
- Perceived quality of matching suggestions (via likes and surveys)
- Stable technical performance (no critical bugs, acceptable response times)
- Overall positive user feedback

### 11.5 Roadmap

| Stage | Description |
|-------|-------------|
| **Stage 1** | Profile consultation interface + basic visualizations. Allows researchers to discover who participates, explore the building database via simple visualizations. |
| **Stage 2** | OpenAlex automatic enrichment. Bibliographic API integration, disambiguation, monthly refresh. |
| **Stage 3** | Matching algorithm + suggestions. NLP algorithm development, asynchronous calculations, personalized suggestions. |
| **Stage 4** | Messaging + announcements. Peer-to-peer communication, targeted announcements, notifications. |
| **Stage 5** | Thematic forums. Structured discussion space, collaborative norms elaboration. |
| **Stage 6** | Events. Creation, management, algorithmic critical mass detection, timezone management. |
| **Stage 7** | Cultural space + gamification. Artistic sharing, badge system and recognition, advanced personalization. |
| **Stage 8** | iOS/Desktop applications. Native application deployment once the web version is stabilized. |

## 12. Appendices

### 12.1 Technical Glossary

| Term | Definition |
|------|------------|
| **API** | Application Programming Interface - interface enabling communication between software |
| **Embedding** | Dense vector representation of a text in a semantic space |
| **ETL** | Extract-Transform-Load - data extraction, transformation and loading process |
| **JWT** | JSON Web Token - authentication token format |
| **Kubernetes (k3s)** | Container orchestration system |
| **Magic link** | Unique link sent by email for password-free authentication |
| **Microservices** | Architecture decomposing the application into independent services |
| **TOTP** | Time-based One-Time Password - time-based unique password |
| **Webhook** | Mechanism allowing an application to notify another in real-time |

### 12.2 Architecture Diagrams

To be produced: system architecture diagrams, data flows, interactions between components.

### 12.3 Wireframes/Mockups

To be produced: mockups of main interfaces for validation before development.

### 12.4 REDCap API: Used Endpoints

To be documented: exhaustive list of used REDCap API endpoints, parameters, call frequency.

### 12.5 Data Model

To be produced: entity-relationship diagrams for REDCap and specialized databases.

### 12.6 Requirements Traceability Matrix

To be maintained: table linking each functional requirement to its implementation and associated tests.
