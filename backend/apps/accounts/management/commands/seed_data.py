import random
from datetime import date, time
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User, UserRole
from apps.org.models import School, Branch, Session, Season, Shift
from apps.academics.models import (
    Grade, Section, Subject, Teacher, Assignment,
    PeriodTemplate, PeriodSlot, Room, DayOfWeek
)
from apps.timetable.models import Timetable, TimetableEntry


class Command(BaseCommand):
    help = 'Seed database with dummy data for testing'

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Seeding database with dummy data...')

        # Get or create super admin
        super_admin = User.objects.filter(role=UserRole.SUPER_ADMIN).first()
        if not super_admin:
            super_admin = User.objects.create_superuser(
                email='admin@timetable.com',
                password='Admin@123',
                first_name='Super',
                last_name='Admin',
                role=UserRole.SUPER_ADMIN,
            )

        # Create Schools
        schools_data = [
            {'name': 'Delhi Public School', 'code': 'DPS', 'email': 'contact@dps.edu', 'phone': '9876543210', 'address': '123 Education Street, Delhi'},
            {'name': 'St. Mary\'s High School', 'code': 'SMHS', 'email': 'contact@stmarys.edu', 'phone': '9876543211', 'address': '456 Learning Avenue, Mumbai'},
        ]

        schools = []
        for data in schools_data:
            school, created = School.objects.get_or_create(
                code=data['code'],
                defaults=data
            )
            schools.append(school)
            if created:
                self.stdout.write(f'  Created school: {school.name}')

        # Create Branches for each school
        branches = []
        branch_names = ['Main Campus', 'North Branch', 'South Branch']
        for school in schools:
            for i, branch_name in enumerate(branch_names[:2] if school.code == 'SMHS' else branch_names):
                branch, created = Branch.objects.get_or_create(
                    school=school,
                    name=branch_name,
                    defaults={
                        'code': f'{school.code}-{branch_name[:1]}{i+1}',
                        'address': f'{branch_name}, {school.address}',
                        'phone': f'98765432{i+2}0',
                    }
                )
                branches.append(branch)
                if created:
                    self.stdout.write(f'  Created branch: {branch.name} ({school.name})')

        # Create Sessions for each branch
        sessions = []
        active_sessions = {}
        for branch in branches:
            for year in [2024, 2025]:
                session, created = Session.objects.get_or_create(
                    branch=branch,
                    name=f'{year}-{year+1}',
                    defaults={
                        'start_date': date(year, 4, 1),
                        'end_date': date(year+1, 3, 31),
                        'is_current': year == 2025,
                        'is_active': True,
                    }
                )
                sessions.append(session)
                if year == 2025:
                    active_sessions[branch.id] = session
                if created:
                    self.stdout.write(f'  Created session: {session.name} ({branch.name})')

        # Create Seasons for each branch
        seasons = []
        active_seasons = {}
        for branch in branches:
            active_session = active_sessions.get(branch.id)
            if not active_session:
                continue
            for season_name in ['Summer', 'Winter']:
                season, created = Season.objects.get_or_create(
                    session=active_session,
                    name=season_name,
                    defaults={
                        'start_date': date(2025, 4, 1) if season_name == 'Summer' else date(2025, 10, 1),
                        'end_date': date(2025, 9, 30) if season_name == 'Summer' else date(2026, 3, 31),
                        'is_current': season_name == 'Summer',
                        'is_active': True,
                    }
                )
                seasons.append(season)
                if season_name == 'Summer':
                    active_seasons[branch.id] = season
                if created:
                    self.stdout.write(f'  Created season: {season.name} ({branch.name})')

        # Create Shifts for each branch
        shifts = []
        active_shifts = {}
        shift_data = [
            {'name': 'Morning', 'start_time': time(8, 0), 'end_time': time(14, 0)},
            {'name': 'Afternoon', 'start_time': time(12, 0), 'end_time': time(18, 0)},
        ]
        for branch in branches:
            for data in shift_data:
                shift, created = Shift.objects.get_or_create(
                    branch=branch,
                    name=data['name'],
                    defaults=data
                )
                shifts.append(shift)
                if data['name'] == 'Morning':
                    active_shifts[branch.id] = shift
                if created:
                    self.stdout.write(f'  Created shift: {shift.name} ({branch.name})')

        # Create School Admins and Branch Admins
        for school in schools:
            admin, created = User.objects.get_or_create(
                email=f'admin@{school.code.lower()}.edu',
                defaults={
                    'first_name': f'{school.code}',
                    'last_name': 'Admin',
                    'role': UserRole.SCHOOL_ADMIN,
                    'school': school,
                }
            )
            if created:
                admin.set_password('Admin@123')
                admin.save()
                self.stdout.write(f'  Created school admin: {admin.email}')

        # Create Grades
        grades = []
        grade_data = [
            {'name': 'Grade 1', 'code': 'G1'},
            {'name': 'Grade 2', 'code': 'G2'},
            {'name': 'Grade 3', 'code': 'G3'},
            {'name': 'Grade 4', 'code': 'G4'},
            {'name': 'Grade 5', 'code': 'G5'},
            {'name': 'Grade 6', 'code': 'G6'},
            {'name': 'Grade 7', 'code': 'G7'},
            {'name': 'Grade 8', 'code': 'G8'},
            {'name': 'Grade 9', 'code': 'G9'},
            {'name': 'Grade 10', 'code': 'G10'},
        ]
        for branch in branches:
            for i, data in enumerate(grade_data):
                grade, created = Grade.objects.get_or_create(
                    branch=branch,
                    code=data['code'],
                    defaults={'name': data['name'], 'order': i + 1}
                )
                grades.append(grade)
                if created:
                    self.stdout.write(f'  Created grade: {grade.name} ({branch.name})')

        # Create Sections for each grade
        sections = []
        section_names = ['A', 'B', 'C']
        for grade in grades:
            # Get the morning shift for this branch
            branch_shift = active_shifts.get(grade.branch.id)
            if not branch_shift:
                continue

            num_sections = 2 if grade.code == 'G1' else 3
            for section_name in section_names[:num_sections]:
                section, created = Section.objects.get_or_create(
                    grade=grade,
                    shift=branch_shift,
                    code=section_name,
                    defaults={'name': section_name, 'capacity': 40}
                )
                sections.append(section)
                if created:
                    self.stdout.write(f'  Created section: {grade.name} - {section.name}')

        # Create Subjects
        subjects = []
        subject_data = [
            {'name': 'English', 'code': 'ENG', 'color': '#3B82F6'},
            {'name': 'Mathematics', 'code': 'MATH', 'color': '#EF4444'},
            {'name': 'Science', 'code': 'SCI', 'color': '#10B981'},
            {'name': 'Social Studies', 'code': 'SST', 'color': '#F59E0B'},
            {'name': 'Hindi', 'code': 'HIN', 'color': '#8B5CF6'},
            {'name': 'Computer Science', 'code': 'CS', 'color': '#06B6D4'},
            {'name': 'Physical Education', 'code': 'PE', 'color': '#EC4899'},
            {'name': 'Art', 'code': 'ART', 'color': '#84CC16'},
        ]
        for branch in branches:
            for data in subject_data:
                subject, created = Subject.objects.get_or_create(
                    branch=branch,
                    code=data['code'],
                    defaults={
                        'name': data['name'],
                        'color': data['color'],
                    }
                )
                subjects.append(subject)
                if created:
                    self.stdout.write(f'  Created subject: {subject.name} ({branch.name})')

        # Create Teachers
        teachers = []
        teacher_data = [
            {'first_name': 'Rajesh', 'last_name': 'Kumar', 'subject_code': 'MATH'},
            {'first_name': 'Priya', 'last_name': 'Sharma', 'subject_code': 'ENG'},
            {'first_name': 'Amit', 'last_name': 'Singh', 'subject_code': 'SCI'},
            {'first_name': 'Sunita', 'last_name': 'Verma', 'subject_code': 'HIN'},
            {'first_name': 'Vikram', 'last_name': 'Patel', 'subject_code': 'SST'},
            {'first_name': 'Neha', 'last_name': 'Gupta', 'subject_code': 'CS'},
            {'first_name': 'Rahul', 'last_name': 'Joshi', 'subject_code': 'PE'},
            {'first_name': 'Kavita', 'last_name': 'Reddy', 'subject_code': 'ART'},
            {'first_name': 'Sanjay', 'last_name': 'Mehta', 'subject_code': 'MATH'},
            {'first_name': 'Anjali', 'last_name': 'Nair', 'subject_code': 'ENG'},
            {'first_name': 'Deepak', 'last_name': 'Yadav', 'subject_code': 'SCI'},
            {'first_name': 'Meera', 'last_name': 'Iyer', 'subject_code': 'HIN'},
        ]

        for branch in branches:
            branch_subjects = [s for s in subjects if s.branch == branch]
            for i, data in enumerate(teacher_data):
                code = f'T{branch.id.hex[:4]}{i+1:03d}'
                teacher, created = Teacher.objects.get_or_create(
                    branch=branch,
                    employee_code=code,
                    defaults={
                        'first_name': data['first_name'],
                        'last_name': data['last_name'],
                        'email': f'{data["first_name"].lower()}.{data["last_name"].lower()}.{branch.id.hex[:4]}@{branch.school.code.lower()}.edu',
                        'phone': f'98765{i:05d}',
                    }
                )
                # Assign subjects to teacher
                if created:
                    subject_for_teacher = [s for s in branch_subjects if s.code == data['subject_code']]
                    if subject_for_teacher:
                        teacher.subjects.add(subject_for_teacher[0])
                    self.stdout.write(f'  Created teacher: {teacher.full_name} ({branch.name})')
                teachers.append(teacher)

        # Create Rooms
        rooms = []
        for branch in branches:
            for i in range(1, 11):
                room, created = Room.objects.get_or_create(
                    branch=branch,
                    code=f'R{i:02d}',
                    defaults={
                        'name': f'Room {i}',
                        'capacity': 45,
                        'room_type': 'classroom' if i <= 8 else 'lab',
                    }
                )
                rooms.append(room)
                if created:
                    self.stdout.write(f'  Created room: {room.name} ({branch.name})')

        # Create Period Templates and Slots
        period_templates = []
        period_slots_by_template = {}

        for branch in branches:
            branch_shift = active_shifts.get(branch.id)
            branch_season = active_seasons.get(branch.id)
            branch_grades = [g for g in grades if g.branch == branch]

            if not branch_shift or not branch_season:
                continue

            for grade in branch_grades:
                template, created = PeriodTemplate.objects.get_or_create(
                    branch=branch,
                    shift=branch_shift,
                    season=branch_season,
                    grade=grade,
                    defaults={
                        'name': f'{grade.name} - {branch_shift.name} - {branch_season.name}',
                    }
                )
                period_templates.append(template)

                if created:
                    self.stdout.write(f'  Created period template: {template.name}')

                # Create Period Slots if template is new
                slots = list(PeriodSlot.objects.filter(template=template).order_by('period_number'))
                if not slots:
                    slots = []
                    for period_num in range(1, 9):
                        if period_num <= 4:
                            start_minutes = 8 * 60 + (period_num - 1) * 45
                        else:
                            start_minutes = 8 * 60 + 4 * 45 + 30 + (period_num - 5) * 45  # After lunch

                        start_hour = start_minutes // 60
                        start_minute = start_minutes % 60
                        duration = 40
                        end_minutes = start_minutes + duration
                        end_hour = end_minutes // 60
                        end_minute = end_minutes % 60

                        slot = PeriodSlot.objects.create(
                            template=template,
                            period_number=period_num,
                            name=f'Period {period_num}',
                            start_time=time(start_hour, start_minute),
                            end_time=time(end_hour, end_minute),
                            duration_minutes=duration,
                            is_break=False,
                        )
                        slots.append(slot)

                period_slots_by_template[template.id] = slots

        # Create Assignments (Teacher-Subject-Section mapping)
        assignments = []
        for branch in branches:
            branch_session = active_sessions.get(branch.id)
            if not branch_session:
                continue

            branch_teachers = [t for t in teachers if t.branch == branch]
            branch_subjects = [s for s in subjects if s.branch == branch]
            branch_sections = [s for s in sections if s.grade.branch == branch]

            # Map subjects to teachers
            subject_teacher_map = {}
            for subject in branch_subjects:
                matching_teachers = [t for t in branch_teachers if subject in t.subjects.all()]
                if matching_teachers:
                    subject_teacher_map[subject.id] = matching_teachers
                else:
                    subject_teacher_map[subject.id] = branch_teachers[:2]

            for section in branch_sections:
                for subject in branch_subjects:
                    available_teachers = subject_teacher_map.get(subject.id, branch_teachers[:1])
                    teacher = random.choice(available_teachers)

                    # Weekly periods based on subject
                    weekly_periods = 6 if subject.code in ['ENG', 'MATH'] else 4 if subject.code in ['SCI', 'SST', 'HIN'] else 2

                    assignment, created = Assignment.objects.get_or_create(
                        section=section,
                        subject=subject,
                        session=branch_session,
                        defaults={
                            'teacher': teacher,
                            'weekly_periods': weekly_periods
                        }
                    )
                    assignments.append(assignment)

        self.stdout.write(f'  Created {len(assignments)} assignments')

        # Create sample Timetables with entries
        days = [DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY]

        for branch in branches:
            branch_session = active_sessions.get(branch.id)
            branch_season = active_seasons.get(branch.id)
            branch_shift = active_shifts.get(branch.id)

            if not all([branch_session, branch_season, branch_shift]):
                continue

            timetable, created = Timetable.objects.get_or_create(
                branch=branch,
                session=branch_session,
                season=branch_season,
                shift=branch_shift,
                defaults={
                    'name': f'{branch.name} - {branch_season.name} {branch_shift.name} Timetable',
                    'status': 'draft',
                    'created_by': super_admin,
                }
            )

            if created:
                self.stdout.write(f'  Created timetable: {timetable.name}')

                # Create timetable entries
                branch_sections = [s for s in sections if s.grade.branch == branch][:10]  # First 10 sections

                for section in branch_sections:
                    # Find the template for this section's grade
                    template = None
                    for t in period_templates:
                        if t.grade == section.grade and t.branch == branch:
                            template = t
                            break

                    if not template:
                        continue

                    slots = period_slots_by_template.get(template.id, [])
                    if not slots:
                        continue

                    section_assignments = [a for a in assignments if a.section == section]
                    if not section_assignments:
                        continue

                    for day in days:
                        for slot in slots:
                            assignment = random.choice(section_assignments)
                            TimetableEntry.objects.get_or_create(
                                timetable=timetable,
                                section=section,
                                day_of_week=day,
                                period_slot=slot,
                                defaults={
                                    'subject': assignment.subject,
                                    'teacher': assignment.teacher,
                                }
                            )

        self.stdout.write(self.style.SUCCESS('\nDatabase seeded successfully!'))
        self.stdout.write('\nTest Accounts:')
        self.stdout.write('  Super Admin: admin@timetable.com / Admin@123')
        self.stdout.write('  School Admin (DPS): admin@dps.edu / Admin@123')
        self.stdout.write('  School Admin (SMHS): admin@smhs.edu / Admin@123')
