Title: Map data: populate, collect and validate

Overview
- This guide explains how to populate the map with facilities and indicator data, collect data from field teams, and validate data for use in NHERAMS-style dashboards.

1) Data model (brief)
- Facilities: each facility should have id, name, lat, lng, tier/category, ownership, and optional evidence.
- Indicators: metadata-driven definitions in `public/metadata/indicators.json` define `id`, `name`, `isBanded`, `dataType` and `questionId` (maps to form question id).
- Activity reports & answers: reports are persisted in `dqai_activity_reports` and individual answers in `dqai_answers` (server-side). Answers with `question_id` matching `indicators.questionId` are used by the public aggregation endpoints.

2) Populating the map (manual and programmatic)
- Manual (admin UI): Use Settings → Facilities (or call `POST /api/facilities` as an admin) to create facilities with lat/lng and tier.
- Bulk CSV: prepare a CSV with columns `id,name,lat,lng,tier,ownership` and use the Settings import tools or write a simple script to call `POST /api/facilities` for each row.
- API ingest: configure an API Connector in Settings → API Connectors and point it to a data source that returns facility & telemetry JSON; use connectors to fetch and transform ingested data into `dqai_facilities` and `dqai_answers` via admin mapping.

3) Collecting data from the field
- Use the mobile data collector or the frontend Fill Form page to submit activity reports. Each submission creates a `dqai_activity_report` and `dqai_answers` rows.
- Ensure form definitions used for activities include question IDs that match `public/metadata/indicators.json` `questionId` values so aggregation picks them up.
- For offline workflows, have field teams store submissions in the mobile app persistence, then sync to API `/api/reports` when network is available.

4) Validating incoming data
- Automated validation: create an activity that includes validation rules and use server-side hooks in `POST /api/reports` to enforce required fields and field types.
- Manual validation: the Settings UI and Activity Dashboard surfaces answers; validators can review answers and update reviewer fields via `PUT /api/answers/:id`.
- Data quality checks: run the Activity Dashboard endpoint `/api/activity_dashboard/:activityId` to review completeness and sample answers.

5) Aggregation & public maps
- Public endpoints used by the map:
  - `GET /api/public/facilities` — returns redacted, banded facility indicators.
  - `GET /api/public/indicator_summary` — returns band counts per indicator.
  - `GET /api/public/facility_summary` — returns country-level aggregates.

6) Roles & registration
- Self-registration: the public can register via `POST /auth/register` and select allowed roles `public`, `controller`, or `validator` (admins must be created via admin UI).
- Admin: users with role `admin` retain full access (create/update/delete facilities, users, connectors).
- Controllers/Validators: assign appropriate permissions via Roles/Permissions page in Settings.

7) Validation checklist
- Verify lat/lng are within expected bounds and not zero.
- Ensure `questionId` values in metadata match question ids in form definitions.
- Check for duplicate facility ids and inconsistent tiers.
- Check that telemetry/uptime values are numeric and within 0-100.

8) Quick commands (dev)
- Start server (metadata-only):
```
$env:SKIP_DB_ON_INIT='true'; npm run start:server
```
- Start server (run DB init & seeder):
```
$env:DB_HOST='localhost'; $env:DB_USER='user'; $env:DB_PASSWORD='pass'; $env:DB_NAME='nherams'; npm run start:server
```

Contact
- For custom ingestion mappings or onboarding, coordinate with the admin team to add API Connectors and map incoming fields to `dqai_answers`/`dqai_facilities`.
