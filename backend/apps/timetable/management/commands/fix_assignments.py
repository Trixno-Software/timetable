"""
Management command to fix teacher assignments and ensure timetable can be generated.
"""
import random
from django.core.management.base import BaseCommand
from django.db import transaction
from collections import defaultdict

from apps.org.models import Branch
from apps.academics.models import Grade, Section, Subject, Teacher, Assignment


class Command(BaseCommand):
    help = 'Fix teacher assignments to ensure timetable can be generated without conflicts'

    def add_arguments(self, parser):
        parser.add_argument(
            '--branch',
            type=str,
            help='Branch name to fix (default: Main Campus DPS)',
            default='Main Campus DPS'
        )
        parser.add_argument(
            '--max-load',
            type=int,
            help='Maximum periods per week per teacher (default: 36)',
            default=36
        )

    def handle(self, *args, **options):
        branch_name = options['branch']
        max_load = options['max_load']

        try:
            branch = Branch.objects.get(name=branch_name)
        except Branch.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Branch "{branch_name}" not found'))
            return

        self.stdout.write(f'Fixing assignments for branch: {branch.name}')
        self.stdout.write(f'Max teacher load: {max_load} periods/week')

        with transaction.atomic():
            # Step 1: Analyze current load
            teacher_load = self.analyze_teacher_load(branch)

            # Step 2: Get subjects taught by each teacher
            teacher_subjects = self.get_teacher_subjects(branch)

            # Step 3: Create additional teachers if needed
            self.create_additional_teachers(branch, teacher_load, teacher_subjects, max_load)

            # Step 4: Redistribute assignments
            self.redistribute_assignments(branch, max_load)

            # Step 5: Verify final state
            self.verify_assignments(branch, max_load)

        self.stdout.write(self.style.SUCCESS('Done!'))

    def analyze_teacher_load(self, branch):
        """Analyze current teacher load"""
        teacher_load = defaultdict(lambda: {'periods': 0, 'sections': set(), 'name': ''})

        for grade in Grade.objects.filter(branch=branch):
            for section in Section.objects.filter(grade=grade):
                for assignment in Assignment.objects.filter(section=section):
                    tid = str(assignment.teacher_id)
                    teacher_load[tid]['periods'] += assignment.weekly_periods
                    teacher_load[tid]['sections'].add(section.id)
                    teacher_load[tid]['name'] = f"{assignment.teacher.first_name} {assignment.teacher.last_name}"
                    teacher_load[tid]['teacher'] = assignment.teacher

        self.stdout.write(f'\nCurrent teacher loads:')
        overloaded = 0
        for tid, data in sorted(teacher_load.items(), key=lambda x: -x[1]['periods']):
            status = '⚠️ OVERLOADED' if data['periods'] > 48 else '✓'
            self.stdout.write(f"  {data['name']}: {data['periods']} periods ({len(data['sections'])} sections) {status}")
            if data['periods'] > 48:
                overloaded += 1

        self.stdout.write(f'\nOverloaded teachers: {overloaded}')
        return teacher_load

    def get_teacher_subjects(self, branch):
        """Get which subjects each teacher teaches"""
        teacher_subjects = defaultdict(set)

        for grade in Grade.objects.filter(branch=branch):
            for section in Section.objects.filter(grade=grade):
                for assignment in Assignment.objects.filter(section=section):
                    teacher_subjects[str(assignment.teacher_id)].add(assignment.subject)

        return teacher_subjects

    def create_additional_teachers(self, branch, teacher_load, teacher_subjects, max_load):
        """Create additional teachers for overloaded subjects"""
        self.stdout.write('\nCreating additional teachers...')

        # Get subjects that need more teachers
        subject_teachers = defaultdict(list)
        for tid, subjects in teacher_subjects.items():
            for subject in subjects:
                subject_teachers[subject.id].append(teacher_load[tid])

        created = 0
        for subject_id, teachers in subject_teachers.items():
            subject = Subject.objects.get(id=subject_id)
            total_load = sum(t['periods'] for t in teachers)

            # Calculate how many teachers we need
            needed_teachers = (total_load // max_load) + 1
            current_teachers = len([t for t in teachers if t['periods'] > 0])

            if needed_teachers > current_teachers:
                # Create additional teachers for this subject
                for i in range(needed_teachers - current_teachers):
                    # Generate a unique teacher name
                    existing_count = Teacher.objects.filter(
                        branch=branch,
                        first_name__startswith=f'{subject.name} Teacher'
                    ).count()

                    new_teacher = Teacher.objects.create(
                        branch=branch,
                        first_name=f'{subject.name} Teacher {existing_count + i + 1}',
                        last_name='',
                        email=f'{subject.name.lower().replace(" ", "_")}_teacher_{existing_count + i + 1}@school.com',
                        employee_code=f'T{subject.name[:3].upper()}{existing_count + i + 1:03d}',
                    )
                    new_teacher.subjects.add(subject)
                    self.stdout.write(f'  Created: {new_teacher.first_name} for {subject.name}')
                    created += 1

        self.stdout.write(f'Created {created} new teachers')

    def redistribute_assignments(self, branch, max_load):
        """Redistribute assignments to balance teacher load"""
        self.stdout.write('\nRedistributing assignments...')

        # Group assignments by subject
        subject_assignments = defaultdict(list)
        for grade in Grade.objects.filter(branch=branch):
            for section in Section.objects.filter(grade=grade):
                for assignment in Assignment.objects.filter(section=section):
                    subject_assignments[assignment.subject_id].append(assignment)

        # For each subject, redistribute among available teachers
        for subject_id, assignments in subject_assignments.items():
            subject = Subject.objects.get(id=subject_id)

            # Get all teachers who can teach this subject
            teachers = list(Teacher.objects.filter(
                branch=branch,
                subjects=subject
            ))

            if not teachers:
                self.stdout.write(f'  ⚠️ No teachers for {subject.name}, keeping current assignments')
                continue

            # Calculate target load per teacher
            total_periods = sum(a.weekly_periods for a in assignments)
            target_per_teacher = total_periods // len(teachers)

            # Track current load
            teacher_current_load = {t.id: 0 for t in teachers}

            # Sort assignments randomly to distribute evenly
            random.shuffle(assignments)

            # Assign each assignment to the least loaded teacher
            for assignment in assignments:
                # Find teacher with lowest load
                min_teacher = min(teachers, key=lambda t: teacher_current_load[t.id])

                if assignment.teacher_id != min_teacher.id:
                    assignment.teacher = min_teacher
                    assignment.save()

                teacher_current_load[min_teacher.id] += assignment.weekly_periods

            self.stdout.write(f'  {subject.name}: redistributed among {len(teachers)} teachers')

    def verify_assignments(self, branch, max_load):
        """Verify final assignment state"""
        self.stdout.write('\nFinal teacher loads:')

        teacher_load = defaultdict(lambda: {'periods': 0, 'sections': set()})

        for grade in Grade.objects.filter(branch=branch):
            for section in Section.objects.filter(grade=grade):
                for assignment in Assignment.objects.filter(section=section):
                    tid = str(assignment.teacher_id)
                    teacher_load[tid]['periods'] += assignment.weekly_periods
                    teacher_load[tid]['sections'].add(section.id)
                    teacher_load[tid]['name'] = f"{assignment.teacher.first_name} {assignment.teacher.last_name}"

        issues = 0
        for tid, data in sorted(teacher_load.items(), key=lambda x: -x[1]['periods']):
            if data['periods'] > max_load:
                status = '⚠️ Still overloaded'
                issues += 1
            elif data['periods'] > 0:
                status = '✓'
            else:
                continue
            self.stdout.write(f"  {data['name']}: {data['periods']} periods ({len(data['sections'])} sections) {status}")

        if issues > 0:
            self.stdout.write(self.style.WARNING(f'\n{issues} teachers still overloaded'))
        else:
            self.stdout.write(self.style.SUCCESS('\nAll teachers within load limits!'))
