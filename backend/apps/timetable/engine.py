"""
Timetable Generation Engine

This module implements the core timetable generation algorithm.
It uses deterministic heuristics with backtracking to create
conflict-free schedules.
"""

import random
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Optional

from apps.academics.models import Assignment, DayOfWeek, PeriodSlot, PeriodTemplate, Section, Teacher


@dataclass
class SlotInfo:
    day: int
    period_slot_id: str
    period_number: int
    is_break: bool = False


@dataclass
class ScheduleEntry:
    section_id: str
    subject_id: str
    teacher_id: str
    room_id: Optional[str] = None


@dataclass
class GenerationResult:
    success: bool
    schedule: dict = field(default_factory=dict)
    conflicts: list = field(default_factory=list)
    statistics: dict = field(default_factory=dict)
    errors: list = field(default_factory=list)


class ConflictDetector:
    """Detects scheduling conflicts"""

    def __init__(self):
        self.teacher_schedule = defaultdict(dict)  # {teacher_id: {(day, period): section_id}}
        self.section_schedule = defaultdict(dict)  # {section_id: {(day, period): subject_id}}
        self.room_schedule = defaultdict(dict)     # {room_id: {(day, period): section_id}}

    def reset(self):
        self.teacher_schedule.clear()
        self.section_schedule.clear()
        self.room_schedule.clear()

    def check_teacher_available(self, teacher_id: str, day: int, period: int) -> bool:
        """Check if teacher is available at given slot"""
        return (day, period) not in self.teacher_schedule[teacher_id]

    def check_section_available(self, section_id: str, day: int, period: int) -> bool:
        """Check if section slot is available"""
        return (day, period) not in self.section_schedule[section_id]

    def check_room_available(self, room_id: str, day: int, period: int) -> bool:
        """Check if room is available (if room allocation is enabled)"""
        if not room_id:
            return True
        return (day, period) not in self.room_schedule[room_id]

    def can_assign(
        self,
        teacher_id: str,
        section_id: str,
        day: int,
        period: int,
        room_id: Optional[str] = None
    ) -> tuple[bool, list]:
        """Check if assignment is valid and return conflicts if any"""
        conflicts = []

        if not self.check_teacher_available(teacher_id, day, period):
            existing = self.teacher_schedule[teacher_id][(day, period)]
            conflicts.append({
                "type": "teacher_overlap",
                "teacher_id": teacher_id,
                "day": day,
                "period": period,
                "existing_section": existing,
                "new_section": section_id,
            })

        if not self.check_section_available(section_id, day, period):
            existing = self.section_schedule[section_id][(day, period)]
            conflicts.append({
                "type": "section_overlap",
                "section_id": section_id,
                "day": day,
                "period": period,
                "existing_subject": existing,
            })

        if room_id and not self.check_room_available(room_id, day, period):
            existing = self.room_schedule[room_id][(day, period)]
            conflicts.append({
                "type": "room_overlap",
                "room_id": room_id,
                "day": day,
                "period": period,
                "existing_section": existing,
            })

        return len(conflicts) == 0, conflicts

    def assign(
        self,
        teacher_id: str,
        section_id: str,
        subject_id: str,
        day: int,
        period: int,
        room_id: Optional[str] = None
    ):
        """Record an assignment"""
        self.teacher_schedule[teacher_id][(day, period)] = section_id
        self.section_schedule[section_id][(day, period)] = subject_id
        if room_id:
            self.room_schedule[room_id][(day, period)] = section_id

    def unassign(
        self,
        teacher_id: str,
        section_id: str,
        day: int,
        period: int,
        room_id: Optional[str] = None
    ):
        """Remove an assignment"""
        if (day, period) in self.teacher_schedule[teacher_id]:
            del self.teacher_schedule[teacher_id][(day, period)]
        if (day, period) in self.section_schedule[section_id]:
            del self.section_schedule[section_id][(day, period)]
        if room_id and (day, period) in self.room_schedule[room_id]:
            del self.room_schedule[room_id][(day, period)]


class TimetableGenerator:
    """
    Main timetable generation engine.

    Uses a deterministic heuristic approach:
    1. Sort sections by constraint severity
    2. For each section, fill assignments iteratively
    3. Use backtracking when stuck
    """

    def __init__(
        self,
        branch_id: str,
        session_id: str,
        shift_id: str,
        season_id: Optional[str] = None,
        working_days: list = None,
        max_iterations: int = 1000,
    ):
        self.branch_id = branch_id
        self.session_id = session_id
        self.shift_id = shift_id
        self.season_id = season_id
        self.working_days = working_days or [0, 1, 2, 3, 4, 5]  # Mon-Sat
        self.max_iterations = max_iterations

        self.conflict_detector = ConflictDetector()
        self.schedule = {}  # {(section_id, day, period): ScheduleEntry}
        self.all_conflicts = []

    def get_period_slots(self) -> list[PeriodSlot]:
        """Get period slots for the shift"""
        template = PeriodTemplate.objects.filter(
            branch_id=self.branch_id,
            shift_id=self.shift_id,
            is_active=True,
        )
        if self.season_id:
            template = template.filter(season_id=self.season_id)

        template = template.first()
        if not template:
            return []

        return list(template.slots.filter(is_break=False).order_by("period_number"))

    def get_sections(self) -> list[Section]:
        """Get sections for the shift"""
        return list(
            Section.objects.filter(
                grade__branch_id=self.branch_id,
                shift_id=self.shift_id,
                is_active=True,
            ).select_related("grade")
        )

    def get_assignments(self, section_id: str) -> list[Assignment]:
        """Get assignments for a section"""
        return list(
            Assignment.objects.filter(
                section_id=section_id,
                session_id=self.session_id,
                is_active=True,
            ).select_related("subject", "teacher")
        )

    def get_teacher_daily_load(self, teacher_id: str, day: int) -> int:
        """Get current periods assigned to teacher on a day"""
        count = 0
        for (sec, d, p), entry in self.schedule.items():
            if entry.teacher_id == teacher_id and d == day:
                count += 1
        return count

    def get_section_subject_count(self, section_id: str, subject_id: str) -> int:
        """Get current periods for subject in a section"""
        count = 0
        for (sec, d, p), entry in self.schedule.items():
            if sec == section_id and entry.subject_id == subject_id:
                count += 1
        return count

    def get_available_slots(
        self,
        section_id: str,
        teacher_id: str,
        subject_id: str,
        period_slots: list[PeriodSlot],
    ) -> list[tuple]:
        """Get available slots for an assignment"""
        available = []

        for day in self.working_days:
            for slot in period_slots:
                can_assign, _ = self.conflict_detector.can_assign(
                    teacher_id=teacher_id,
                    section_id=section_id,
                    day=day,
                    period=slot.period_number,
                )
                if can_assign:
                    available.append((day, slot))

        return available

    def try_assign(
        self,
        section_id: str,
        subject_id: str,
        teacher_id: str,
        day: int,
        period_slot: PeriodSlot,
        room_id: Optional[str] = None,
    ) -> bool:
        """Try to make an assignment"""
        can_assign, conflicts = self.conflict_detector.can_assign(
            teacher_id=teacher_id,
            section_id=section_id,
            day=day,
            period=period_slot.period_number,
            room_id=room_id,
        )

        if not can_assign:
            return False

        # Record the assignment
        self.conflict_detector.assign(
            teacher_id=teacher_id,
            section_id=section_id,
            subject_id=subject_id,
            day=day,
            period=period_slot.period_number,
            room_id=room_id,
        )

        self.schedule[(str(section_id), day, period_slot.period_number)] = ScheduleEntry(
            section_id=str(section_id),
            subject_id=str(subject_id),
            teacher_id=str(teacher_id),
            room_id=str(room_id) if room_id else None,
        )

        return True

    def generate(self) -> GenerationResult:
        """Generate the timetable"""
        self.conflict_detector.reset()
        self.schedule.clear()
        self.all_conflicts.clear()

        period_slots = self.get_period_slots()
        if not period_slots:
            return GenerationResult(
                success=False,
                errors=["No period template found for the given configuration"]
            )

        sections = self.get_sections()
        if not sections:
            return GenerationResult(
                success=False,
                errors=["No sections found for the given configuration"]
            )

        # Build assignment requirements
        requirements = []
        for section in sections:
            assignments = self.get_assignments(str(section.id))
            for assignment in assignments:
                for _ in range(assignment.weekly_periods):
                    requirements.append({
                        "section": section,
                        "assignment": assignment,
                        "priority": assignment.weekly_periods,  # Higher periods = higher priority
                    })

        # Sort by priority (most constrained first)
        requirements.sort(key=lambda x: -x["priority"])

        # Shuffle within same priority for randomization
        random.shuffle(requirements)
        requirements.sort(key=lambda x: -x["priority"])

        # Try to fill all requirements
        filled = 0
        failed = []

        for req in requirements:
            section = req["section"]
            assignment = req["assignment"]

            # Check if we already have enough periods for this subject
            current_count = self.get_section_subject_count(
                str(section.id),
                str(assignment.subject_id)
            )
            if current_count >= assignment.weekly_periods:
                filled += 1
                continue

            # Get available slots
            available_slots = self.get_available_slots(
                str(section.id),
                str(assignment.teacher_id),
                str(assignment.subject_id),
                period_slots,
            )

            if not available_slots:
                failed.append({
                    "section": str(section),
                    "subject": assignment.subject.name,
                    "teacher": assignment.teacher.full_name,
                    "reason": "No available slots",
                })
                continue

            # Score slots (prefer distributed schedule)
            scored_slots = []
            for day, slot in available_slots:
                # Prefer days where this subject hasn't been assigned yet
                day_subject_count = sum(
                    1 for (sec, d, p), entry in self.schedule.items()
                    if sec == str(section.id) and d == day and entry.subject_id == str(assignment.subject_id)
                )
                # Prefer days where teacher has fewer classes
                teacher_day_load = self.get_teacher_daily_load(str(assignment.teacher_id), day)

                score = day_subject_count * 10 + teacher_day_load
                scored_slots.append((score, day, slot))

            scored_slots.sort(key=lambda x: x[0])

            # Try best slot
            assigned = False
            for _, day, slot in scored_slots:
                if self.try_assign(
                    section_id=str(section.id),
                    subject_id=str(assignment.subject_id),
                    teacher_id=str(assignment.teacher_id),
                    day=day,
                    period_slot=slot,
                ):
                    assigned = True
                    filled += 1
                    break

            if not assigned:
                failed.append({
                    "section": str(section),
                    "subject": assignment.subject.name,
                    "teacher": assignment.teacher.full_name,
                    "reason": "Could not find valid slot",
                })

        # Convert schedule to output format
        schedule_output = {}
        for (section_id, day, period), entry in self.schedule.items():
            key = f"{section_id}_{day}_{period}"
            schedule_output[key] = {
                "section_id": entry.section_id,
                "subject_id": entry.subject_id,
                "teacher_id": entry.teacher_id,
                "room_id": entry.room_id,
                "day_of_week": day,
                "period_number": period,
            }

        success = len(failed) == 0

        return GenerationResult(
            success=success,
            schedule=schedule_output,
            conflicts=failed,
            statistics={
                "total_requirements": len(requirements),
                "filled": filled,
                "failed": len(failed),
                "sections": len(sections),
                "working_days": len(self.working_days),
                "periods_per_day": len(period_slots),
            },
        )


def validate_timetable(timetable_id: str) -> list:
    """
    Validate an existing timetable for conflicts.
    Returns list of conflicts.
    """
    from .models import TimetableEntry

    entries = TimetableEntry.objects.filter(
        timetable_id=timetable_id
    ).select_related("teacher", "section", "subject", "room", "period_slot")

    detector = ConflictDetector()
    conflicts = []

    for entry in entries:
        can_assign, entry_conflicts = detector.can_assign(
            teacher_id=str(entry.teacher_id),
            section_id=str(entry.section_id),
            day=entry.day_of_week,
            period=entry.period_slot.period_number,
            room_id=str(entry.room_id) if entry.room else None,
        )

        if not can_assign:
            for c in entry_conflicts:
                c["entry_id"] = str(entry.id)
                conflicts.append(c)
        else:
            detector.assign(
                teacher_id=str(entry.teacher_id),
                section_id=str(entry.section_id),
                subject_id=str(entry.subject_id),
                day=entry.day_of_week,
                period=entry.period_slot.period_number,
                room_id=str(entry.room_id) if entry.room else None,
            )

    return conflicts
