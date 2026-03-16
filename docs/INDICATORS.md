Indicators Tutorial

Overview

Indicators are computed metrics built from form answers or direct SQL queries. They can be shown on dashboards (map dashboard, facility dashboard, activity dashboard) and can be defined as either SQL (SELECT) or Expression (JS-like) formulas.

Key concepts

- indicator_level: Defines the level the indicator targets: National, State, LGA, Facility, or User.
- formula_type: "sql" (read-only SELECT) or "expression" (JS-like computation over available answers/rows).
- show_on_map: Boolean. If true, the map dashboard will compute and display this indicator per facility.
- Placeholders: Use curly-braced placeholders in SQL such as {selected_facility_id} to have the server substitute the current facility id when computing an indicator (map marker click, facility dashboard, etc.).

SQL indicators

Rules:
- The SQL must begin with a SELECT statement.
- Avoid destructive queries — only read operations are allowed.
- Use placeholders to accept context values. Supported placeholders (case-insensitive):
  - {selected_facility_id}
  - {selected_facility}
  - {facility_id}
  - {facilityId}

Example (sum answers for a question at the facility):

SELECT SUM( (CASE WHEN jsonb_typeof(answer_value) = 'number' THEN (answer_value::text)::numeric ELSE 0 END) ) as value
FROM dqai_answers
WHERE question_id = 'q1764684635235' AND facility_id = {selected_facility_id}

Notes about compatibility with MySQL functions (you're using Postgres):
- IFNULL(x,y) -> COALESCE(x,y)
- CONCAT(a,b) -> use || (a || b) or Postgres CONCAT
- DATE_FORMAT -> to_char(date_col, 'YYYY-MM-DD')

Expression (JS-like) indicators

- Expressions run in a sandboxed JS evaluation environment on the server.
- The environment exposes typical variables like `answers` (array of answer rows) or facility context when applicable. Use defensive checks.

Example (sum answers in JS):

// `answers` is an array of { question_id, answer_value }
const vals = answers.filter(a => String(a.question_id) === 'q1764684635235').map(a => Number((a.answer_value && a.answer_value.value) || a.answer_value || 0));
return vals.reduce((s, v) => s + (isNaN(v) ? 0 : v), 0);

How the map dashboard uses indicators

- When the map page requests facilities, the frontend computes indicators marked `show_on_map` by calling `/api/indicators/compute_bulk`.
- Each facility object receives an `indicators` map with computed values keyed by indicator id.
- Use {selected_facility_id} placeholder in SQL indicators to filter queries to the facility being evaluated.

UI tips

- When creating an indicator, set `Level` to reflect the intended scope (National/State/LGA/Facility/User).
- Toggle `Show On Map` so the indicator will appear on the map dashboard.
- Use the schema browser in the indicator form to help compose SQL.

Security and best practices

- Keep SQL read-only and avoid expensive queries. Use indexes on `dqai_answers.question_id` and `dqai_answers.facility_id` for performant aggregations.
- Test indicators on a subset of facilities before enabling map-wide compute.
- Prefer explicit JSONB numeric coercion as shown in examples to avoid casting errors.

If you need help converting MySQL-specific SQL to Postgres, include the query and I can suggest a Postgres equivalent.
