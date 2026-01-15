# Timetable Generator SaaS

A comprehensive timetable generator for educational institutions with multi-tenant architecture, supporting schools with multiple branches.

## Features

- **Multi-tenant Architecture**: Schools as top-level tenants with multiple branches
- **Role-Based Access Control (RBAC)**: Super Admin, School Admin, Branch Admin, Coordinator, Teacher, Auditor roles
- **Timetable Generation**: Automated schedule generation with conflict detection
- **Versioning**: Full version history for timetables with restore capability
- **Substitution Management**: Handle teacher substitutions for single periods or date ranges
- **Excel Import/Export**: Bulk import teachers and assignments, export timetables
- **PDF Export**: Generate printable timetables
- **Audit Logging**: Track all changes and system events

## Tech Stack

### Backend
- Python 3.11+
- Django 5.0 + Django REST Framework
- PostgreSQL
- Celery + Redis
- WeasyPrint (PDF generation)

### Frontend
- Next.js 14 (React)
- TypeScript
- Tailwind CSS
- React Query
- Zustand (State management)

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL (or use Docker)
- Redis (optional, for Celery)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd timetable
   ```

2. **Set up the backend**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   # Copy and edit .env file
   cp ../.env.example .env
   # Edit .env with your database credentials
   ```

4. **Run migrations**
   ```bash
   python manage.py migrate
   ```

5. **Create super admin**
   ```bash
   python manage.py create_superadmin --email=admin@example.com --password=your_password --first-name=Admin --last-name=User
   ```

6. **Start backend server**
   ```bash
   python manage.py runserver
   ```

7. **Set up the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

8. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000/api/v1/
   - API Docs: http://localhost:8000/api/docs/

### Using Docker

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate

# Create super admin
docker-compose exec backend python manage.py create_superadmin --email=admin@example.com --password=your_password
```

## Project Structure

```
timetable/
├── backend/
│   ├── config/          # Django settings
│   ├── apps/
│   │   ├── accounts/    # User management & RBAC
│   │   ├── org/         # Schools, Branches, Sessions
│   │   ├── academics/   # Grades, Sections, Teachers, Subjects
│   │   ├── timetable/   # Timetable generation & management
│   │   ├── exports/     # PDF/Excel exports
│   │   └── audit/       # Audit logging
│   └── templates/       # PDF templates
├── frontend/
│   └── src/
│       ├── app/         # Next.js pages
│       ├── components/  # React components
│       ├── lib/         # Utilities, API client, stores
│       └── styles/      # Global styles
├── docker-compose.yml
└── Makefile
```

## User Roles

| Role | Permissions |
|------|-------------|
| Super Admin | Full access to all schools and branches |
| School Admin | Manage school and all its branches |
| Branch Admin | Manage branch, users, and academic data |
| Coordinator | Manage timetables, teachers, assignments |
| Teacher | View own timetable |
| Auditor | View-only access to audit logs |

## API Endpoints

- `POST /api/v1/auth/login/` - User login
- `GET /api/v1/auth/me/` - Current user info
- `GET /api/v1/org/schools/` - List schools
- `GET /api/v1/org/branches/` - List branches
- `GET /api/v1/academics/teachers/` - List teachers
- `POST /api/v1/timetables/generate/` - Generate timetable
- `POST /api/v1/timetables/{id}/publish/` - Publish timetable
- `GET /api/v1/exports/timetable/{id}/` - Export timetable

Full API documentation available at `/api/docs/`

## License

Private - All rights reserved

## Author

Amit Anand
