Add these features to this app. Ensure that the Form Builder Already Designed will serve in creating new forms for these whole new functionalities. Ensure that the Permissions and Roles Manager already in the system is dynamic enough to manage the new users and access levels from the https://herams.org concept.

This document outlines the necessary features and milestones for transitioning the NHERAMS prototype (Leaflet Edition) towards a Minimum Viable Product (MVP) and subsequent integrations, based on the provided Concept Note and Field Guide.

I. Core Application Setup and UI/UX (Phase N1: Prototype Shell)

Objective: Establish the single-template, public-facing portal shell using Leaflet/JS.

Single-Page Application (SPA) Shell & Dynamic Routing:

Feature: Implement the core application router and shell pages (e.g., Map View, Detail View, About/Disclaimer).

Feature (NEW): Dynamic Dashboard Routing: Upon successful authentication, the router MUST detect the user's assigned role and redirect to the corresponding dashboard defined by the role's configuration (e.g., State Professional Dashboard, Public Lite Aggregates, or Vendor Scorecard).

Geospatial Map Integration:

Feature: Initialize an interactive map using Leaflet/JS.

Data Requirement: Load all six pilot facilities (tertiary, primary, secondary, tertiary, primary, private) onto the map.

Functionality: Implement Clustering and Filtering to ensure all six facilities are visible and manageable on the map view.

Controller & Disclaimer Elements:

Feature: Display a permanent "Controller Ribbon" identifying the Federal Ministry of Health and Social Welfare (FMOH&SW).

Feature: Include a prominent "Synthetic Disclaimer" (as the data is not yet live/real) visible on all relevant pages.

Public Aggregates:

Feature: Implement the Public Lite Aggregates view, showing high-level, synthesized data.

Logic: Ensure this aggregate data is displayed as banded (e.g., Red/Yellow/Green health status) and lagged (illustrating publication delay) as per Controller privacy rules.

II. Facility Template & Data Visualization (Phase N1/N2: Read-Only MVP)

Objective: Implement the standard NHERAMS facility template, which must serve all care levels and ownership types.

Standard Facility Card Component (One Template):

Feature: Create a reusable component (FacilityCard) that is loaded for all six pilot facilities.

Content: The card must render banded indicators (e.g., energy resilience status) and validator chips for each relevant pilot status.

Initial Data: Use the provided JSON/synthetic data structure for initial population.

Evidence Accordion:

Feature: Implement an expandable section (EvidenceAccordion) within the facility view.

Content Display: This section must display three key data points:

Certificate IDs/References.

Telemetry Targets and Actuals (as synthetic data initially).

Sampling Notes/Provenance.

Verification Bundle Preview:

Feature: Implement the BundlePreview component using the standard bundle schema.

Content Display: This preview must consistently display:

The facility's Tier/Care Level.

Defined resilience targets.

Formal sign-offs (simulated or synthetic initially).

III. Data & API Integration (Phase N2: Read-Only API)

Objective: Transition from local JSON data to a simulated API endpoint, enforcing data privacy rules server-side.

API Swap (N2 Milestone):

Feature: Refactor data loading logic to swap local JSON files for read-only API responses.

Requirement: Ensure the API responses strictly adhere to the defined NHERAMS schema.

Server-Side Logic Enforcement (N2 Milestone):

Feature: The API/backend service must enforce data banding and publication lag server-side before data is returned to the frontend, demonstrating Controller ownership of privacy rules.

IV. Security and Advanced Integrations (Phases N3-N5)

Objective: Implement core security features and wire up external data sources for service-readiness.

Authentication and Dynamic Permission Management (N3 Milestone) (UPDATED):

Feature: Implement Single Sign-On (SSO) and Multi-Factor Authentication (MFA) capabilities for authenticated users.

Feature: Upon successful sign-in, the system MUST dynamically fetch the user's role and associated permissions from the database (defined in VI.1) and apply them to all UI elements and API calls.

Feature: Use the fetched permissions to enable/disable UI components (e.g., the Due Diligence Download button) and control access to specific data views (e.g., raw telemetry).

Feature: Display the user's role as a prominent Role Badge on the UI, using the display name defined in the dynamic configuration.

External System Integration (N3 Milestone):

Feature: Integrate indicators where required for service-readiness using external standards like DHIS2 and HL7-FHIR.

Real-Time Data Preparation (N4 Milestone):

Feature: Integrate the logic to compute "targets met" from simulated or real telemetry data, moving beyond simple synthetic status flags.

Feature: Populate the Evidence Accordion with real certificate references instead of placeholders.

Scaling and Professional Dashboards (N5 Milestone):

Feature: Develop separate State-Professional Dashboards for high-level aggregated data specific to state authorities.

Feature: Create Vendor Scorecards to monitor and audit vendor performance metrics.

Feature: Implement a mechanism for due-diligence data downloads (signed bundles/reports) for financiers.

V. Data Structures and User Roles (Pre-Implementation Definitions)

A. Core Data Classifications

The NHERAMS system must be designed around these core classifications, as the single facility template must accommodate all of them:

Care Level (Tiers):

Required Tiers: Primary, Secondary, Tertiary.

Ownership Types:

Required Types: Federal, State, LGA, Private, Faith-Based.

Pilot Status:

Requirement: The system must handle six initial pilot facilities, each testing a different facet (e.g., diesel displacement, resilience, certificate compliance).

B. Indicators and Data Display Components

The primary indicators and display components required on the single facility template are:

Banded Indicators:

Feature: Display the health/resilience status of a facility using a Red/Yellow/Green traffic light system.

Examples: Energy resilience status, compliance status.

Requirement: The banding logic must be enforced server-side (N2 Milestone) as a Controller privacy rule.

Validator Chips:

Feature: Small UI components (chips or badges) that indicate the status of specific, relevant pilot requirements.

Use Case: Displaying a specific certificate status or compliance checkpoint for a pilot facility.

Core Evidence Data Points (in Evidence Accordion):

Certificate IDs/References.

Telemetry Targets and Actuals.

Sampling Notes/Provenance.

C. User Levels (Role-Based Access Control)

The system must support the following primary user roles and apply access controls accordingly (N3 Milestone):

Public (Unauthenticated):

Access: Read-only access to the Public Lite Aggregates view and the facility map.

Data View: Only sees banded and lagged data points; no access to raw/real-time telemetry, certificates, or specific sign-offs.

Controller (Federal Ministry of Health and Social Welfare - DHPRS/DHS):

Access: Highest level access.

Responsibilities: Owns the system, enforces the privacy rules (banding/lagging), signs off on Verification Bundles.

UI Feature: Displays the "DHPRS Controller" Role Badge.

State Professional / State Analyst:

Access: Authenticated access to state-specific aggregated data.

UI Feature: Access to the dedicated State-Professional Dashboard (N5 Milestone).

UI Feature: Displays the "State Analyst" Role Badge.

Vendor Reviewer:

Access: Authenticated access, likely to view performance data related to their vendors.

UI Feature: Access to Vendor Scorecards (N5 Milestone).

UI Feature: Displays a "Vendor Reviewer" Role Badge.

Financier:

Access: Authenticated access to facility data required for due diligence.

Key Action: Ability to request and download signed bundles/reports (N5 Milestone).

VI. Dynamic Metadata & Configuration (Form Builder Integration)

Objective: Replace all hardcoded lists, types, and indicator labels (defined in Section V) with data fetched dynamically from the database. This allows the Controller (via the external form builder/admin tool) to modify the taxonomy without code changes.

Metadata Database Structure (Firestore) (UPDATED):

Feature: Create and read from dedicated metadata collections in Firestore.

Collections Required:

/artifacts/{appId}/public/data/care_levels (for Tiers: Primary, Secondary, Tertiary)

/artifacts/{appId}/public/data/ownership_types (for Federal, State, LGA, Private, Faith-Based)

/artifacts/{appId}/public/data/indicators (for Banded Indicators and Validator Chips)

NEW: /artifacts/{appId}/public/data/roles (Defining role names, display names, and default dashboard routes/components)

NEW: /artifacts/{appId}/public/data/permissions (Mapping roles to specific permissions like READ_TELEMETRY, DOWNLOAD_BUNDLE, ACCESS_DASHBOARD_STATE)

Data Structure Requirement: Each document must have at minimum an id (slug) and a name (display label).

Dynamic Taxonomy Consumption:

Feature: Replace all hardcoded lists in the application with runtime data fetches.

Implementation Requirement: The Map Filter UI (Phase I.2) and the Facility Card headers (Phase II.1) MUST populate their options/labels using the data fetched from the care_levels and ownership_types collections, respectively.

Developer Note: Ensure a reliable mechanism (like React Context or initial async fetch) to load this metadata before the main map component renders.

Dynamic Indicator and Validator Configuration:

Feature: The list and display order of Banded Indicators and Validator Chips must be driven by the indicators collection.

Implementation Requirement:

The indicators document structure must include fields defining its type (e.g., isBanded: true, dataType: 'energy_resilience').

The FacilityCard component (Phase II.1) must iterate over the fetched indicators list, using the indicator's dataType field to look up the corresponding status/value in the facility's data payload.

The label displayed for each indicator/validator must be the dynamic name property from the fetched metadata.

Role Badge Management:

Feature: The displayed Role Badges (Phase IV.1) MUST use the display names and configuration data fetched from the NEW /artifacts/{appId}/public/data/roles collection.