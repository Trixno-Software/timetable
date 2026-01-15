# Timetable Generator SaaS — Monolith Development Doc (AI Coding Agent)

> **Repo type:** Monolith (frontend + backend in the same repository)  
> **Goal:** Build a timetable generator that enforces **no overlaps**, supports **substitutes**, **Excel import**, **season/session/shift aware schedules**, **downloads**, and **full versioning**.

---

## 0) What to Build (Scope Snapshot)

### Must-have (Phase 1)
1. **No overlap** (teacher, section/class, optional room) during generation and edits
2. **Substitute flexibility** (single period / date range / full term)
3. **Download** (PDF + Excel/CSV) for school/grade/section/teacher views
4. **Flexible periods** (timings + number of periods vary by grade/section)
5. **Excel upload** for teacher, grade, section, subject mapping and assignments
6. **Session + shift + season** support, retaining old timetables
7. **Versioning** for any timetable update (no overwrite)

### Nice-to-have (Later)
- Room allocation, AI optimization, mobile notifications, heatmaps, advanced constraints

---

## 1) Monolith Architecture (One Repo)

### High-level
- **Backend API** (Django + DRF) serves:
  - REST endpoints
  - Auth + RBAC
  - Timetable engine (constraint solver + validations)
  - Exports (PDF/Excel)
  - Admin panels
- **Frontend** (React/Next.js) lives in the same repo:
  - Consumes backend APIs
  - Provides UI for uploads, rules, generation, review, exports, versioning, substitute operations

### Communication
- Frontend calls backend via `/api/*` routes.
- In dev: separate ports + CORS OR reverse proxy via Next.js rewrites.
- In prod: backend serves static frontend build OR deployed behind single domain with Nginx.

---

## 2) Repository Layout (Recommended)

```
repo/
  README.md
  DEVELOPMENT.md  <-- this file
  .env.example
  docker-compose.yml
  Makefile

  backend/
    manage.py
    pyproject.toml (or requirements.txt)
    config/
      settings/
      urls.py
      wsgi.py / asgi.py
    apps/
      accounts/
      org/
      academics/
      timetable/
      exports/
      audit/
    tests/

  frontend/
    package.json
    next.config.js
    src/
      app/ (or pages/)
      components/
      features/
      lib/
      styles/
```

---

## 3) Tech Stack (Default)

### Backend
- Python 3.11+
- Django + Django REST Framework
- PostgreSQL
- Celery + Redis (optional for heavy generation/export tasks)
- openpyxl / pandas for Excel imports
- WeasyPrint or wkhtmltopdf for PDF exports

### Frontend
- Next.js (React)
- TypeScript
- Tailwind (optional)
- React Query/SWR for data fetching

### DevOps (Local)
- Docker Compose for Postgres + Redis
- Pre-commit hooks (black, isort, ruff, eslint, prettier)

---

## 4) Domain Concepts & Rules

### Core entities
- **Session**: Academic year (e.g., 2025–26)
- **Season**: Summer/Winter timetable variant inside a session
- **Shift**: Morning/Evening (different timings)
- **Grade** → **Section**
- **PeriodTemplate**: Period count + durations + start/end + breaks per grade/section/shift/season
- **Subjects**
- **Teachers**
- **Assignments**: teacher ↔ subject ↔ grade/section (and weekly periods)
- **Timetable**: a published schedule for (session, season, shift, scope)
- **TimetableVersion**: immutable snapshot for any update
- **Substitution**: override records with effective dates/periods

### Non-overlap constraints (hard rules)
- A **teacher** cannot be in two places at the same time.
- A **section** cannot have two subjects in the same period.
- If room allocation is enabled: a **room** cannot be double-booked.

---

## 5) Backend Modules (Apps)

### `accounts/`
- Users, roles: SuperAdmin, SchoolAdmin, Coordinator, Teacher, Auditor
- RBAC middleware/permissions

### `academics/`
- Sessions, seasons, shifts
- Grades, sections, subjects
- Teacher master + availability
- Assignment definitions

### `timetable/`
- Generation engine
- Conflict detector
- Timetable publish / draft / versioning
- Substitution handling

### `exports/`
- PDF generator
- Excel/CSV export builder

### `audit/`
- Change logs, version metadata, restore actions

---

## 6) API Endpoints (Initial)

> Prefix: `/api/v1`

### Auth / Users
- `POST /auth/login`
- `GET /me`

### Master Data
- `GET/POST /sessions`
- `GET/POST /seasons`
- `GET/POST /shifts`
- `GET/POST /grades`
- `GET/POST /sections`
- `GET/POST /subjects`
- `GET/POST /teachers`
- `GET/POST /assignments`

### Period templates
- `GET/POST /period-templates`
- `PUT /period-templates/{id}`

### Excel import
- `POST /imports/teachers`
- `POST /imports/assignments`
- Returns preview + errors + summary

### Timetable
- `POST /timetables/generate` (creates draft)
- `POST /timetables/{id}/publish` (creates version)
- `GET /timetables/{id}` (latest)
- `GET /timetables/{id}/versions`
- `GET /timetables/{id}/versions/{version_id}`
- `POST /timetables/{id}/restore/{version_id}`

### Substitution
- `POST /timetables/{id}/substitutions`
- `GET /timetables/{id}/substitutions`
- `DELETE /timetables/{id}/substitutions/{sub_id}`

### Exports
- `GET /timetables/{id}/export/pdf?scope=teacher|section|grade|school`
- `GET /timetables/{id}/export/xlsx?...`
- `GET /timetables/{id}/export/csv?...`

---

## 7) Timetable Engine Notes (Implementation Guide)

### Inputs
- Period templates per grade/section/shift/season
- Teacher availability (optional)
- Assignments (weekly count per subject per section)
- Constraints (hard: no overlap; soft: minimize gaps, etc.)

### Outputs
- A schedule grid:
  - `(day, period)` → `section` → `{subject, teacher}`
- Computed conflicts (if any)

### Strategy (Phase 1)
- Start with deterministic heuristics:
  1. Sort sections by constraints severity (most assigned periods first)
  2. Fill timetable iteratively:
     - For each section+subject required weekly periods:
       - choose available slots with teacher not used
  3. If stuck:
     - backtrack limited depth OR restart with different ordering
- Store conflicts and partial solutions for debugging.

### Validation layer
- Always run **conflict detection** before publish.
- Conflict detection should be reusable for:
  - generation
  - manual edits
  - substitutions

---

## 8) Versioning Rules (Critical)

### Rule
- **Any update creates a new immutable version**.
- No “edit in place” on published schedules.

### Version metadata
- `version_no` (increment)
- `created_by`, `created_at`
- `change_note` (mandatory)
- `diff_summary` (optional auto-generated)

### Storage approach
- Store schedule as JSON (normalized) in TimetableVersion.
- Optionally also store relational rows for analytics.

---

## 9) Session/Season/Shift Handling

- A timetable is always tied to:
  - `school_id`
  - `session_id`
  - `season_id` (summer/winter)
  - `shift_id`
- Switching season or session **does not delete old data**.
- UI should allow selecting a context to view old timetables.

---

## 10) Frontend Pages (MVP)

1. Login
2. Setup wizard (Session → Season → Shift)
3. Master data:
   - Teachers
   - Grades/Sections
   - Subjects
   - Assignments
4. Period Templates configuration
5. Excel Import page (with preview + error listing)
6. Generate Timetable (draft view + conflict panel)
7. Publish + Version history (compare, restore)
8. Substitute management (apply/remove overrides)
9. Export/Download center

---

## 11) Excel Templates (Phase 1)

### Teachers.xlsx
Required columns:
- `teacher_code`, `teacher_name`, `email(optional)`, `subjects(optional)`

### Sections.xlsx
- `grade`, `section`, `shift`, `season`

### Assignments.xlsx
- `grade`, `section`, `subject`, `teacher_code`, `weekly_periods`

Import flow:
1. Upload → parse → validate → show preview
2. Confirm import → persist + report summary

---

## 12) Security & Permissions (RBAC)

- SchoolAdmin/Coordinator: CRUD master data + generate/publish
- Teacher: view own timetable + substitution notifications (later)
- Auditor: view all versions, no edits
- SuperAdmin: multi-school config if required

---

## 13) Local Dev Setup

### Option A: Docker Compose
- Postgres
- Redis (optional)
- Backend running locally
- Frontend running locally

### Commands (suggested)
Backend:
- `cd backend`
- `python -m venv .venv && source .venv/bin/activate`
- `pip install -r requirements.txt`
- `python manage.py migrate`
- `python manage.py runserver`

Frontend:
- `cd frontend`
- `npm i`
- `npm run dev`

---

## 14) Testing Criteria (Must Pass)

### Unit tests
- conflict detector
- versioning creation
- substitution application rules
- import validators

### Integration tests
- generate → publish → version list → restore
- export endpoints return valid files

### Acceptance checks
- Cannot publish if overlap exists
- Excel import errors surfaced clearly
- Any edit creates new version
- Old versions always viewable

---

## 15) Implementation Plan (Tasks)

### Sprint 1 — Foundations
- Auth + RBAC
- Master data models + CRUD
- Period templates CRUD
- Basic conflict detector

### Sprint 2 — Engine + Drafts
- Generation endpoint creates drafts
- Draft UI grid + conflict view

### Sprint 3 — Publish + Versioning
- Publish creates TimetableVersion
- Version list, view, restore

### Sprint 4 — Substitutions + Exports
- Substitute APIs + UI
- PDF + Excel export

### Sprint 5 — Excel Import + Polish
- Upload + preview + persist
- UX improvements + monitoring + audit logs

---

## 16) Conventions

### API
- JSON snake_case
- Errors: `{ code, message, details }`
- Pagination standard for lists

### DB
- Use UTC timestamps
- Use soft delete where necessary (e.g., substitutions)

### Logging
- Structured logs with `request_id`
- Audit events on publish/restore/import

---

## 17) Done Definition (MVP)

- Generate timetable with no overlaps for teacher+section
- Configure flexible periods per grade/section
- Excel imports working with validation + preview
- Publish creates version; versions can be viewed/restored
- Substitutions supported
- Exports available (PDF + Excel)
- Session/shift/season contexts retain history

---

**Owner:** Amit Anand  
**Repo:** monolith (backend + frontend)  
**Status:** Ready for implementation
