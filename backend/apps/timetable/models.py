import uuid

from django.db import models

from apps.academics.models import (
    Assignment,
    DayOfWeek,
    PeriodSlot,
    PeriodTemplate,
    Room,
    Section,
    Subject,
    Teacher,
)
from apps.org.models import Branch, Season, Session, Shift


class TimetableStatus(models.TextChoices):
    DRAFT = "draft", "Draft"
    PUBLISHED = "published", "Published"
    ARCHIVED = "archived", "Archived"


class Timetable(models.Model):
    """
    A timetable schedule for a specific context (session, season, shift).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="timetables"
    )
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="timetables"
    )
    season = models.ForeignKey(
        Season,
        on_delete=models.CASCADE,
        related_name="timetables",
        null=True,
        blank=True
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name="timetables"
    )
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=TimetableStatus.choices,
        default=TimetableStatus.DRAFT
    )
    effective_from = models.DateField(null=True, blank=True)
    effective_to = models.DateField(null=True, blank=True)

    # Store schedule as JSON for quick retrieval
    schedule_data = models.JSONField(default=dict)

    # Metadata
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_timetables"
    )
    published_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="published_timetables"
    )
    published_at = models.DateTimeField(null=True, blank=True)

    current_version = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "timetables"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} - {self.session.name}"


class TimetableVersion(models.Model):
    """
    Immutable snapshot of a timetable at a point in time.
    Created whenever a timetable is published or modified.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable = models.ForeignKey(
        Timetable,
        on_delete=models.CASCADE,
        related_name="versions"
    )
    version_number = models.IntegerField()
    schedule_data = models.JSONField()  # Full schedule snapshot
    change_note = models.TextField()
    diff_summary = models.JSONField(default=dict)  # Auto-generated diff

    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="timetable_versions"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "timetable_versions"
        ordering = ["-version_number"]
        unique_together = [["timetable", "version_number"]]

    def __str__(self):
        return f"{self.timetable.name} v{self.version_number}"


class TimetableEntry(models.Model):
    """
    Individual entry in a timetable (one cell in the grid).
    Represents a period assignment for a section.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable = models.ForeignKey(
        Timetable,
        on_delete=models.CASCADE,
        related_name="entries"
    )
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="timetable_entries"
    )
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    period_slot = models.ForeignKey(
        PeriodSlot,
        on_delete=models.CASCADE,
        related_name="timetable_entries"
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="timetable_entries"
    )
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name="timetable_entries"
    )
    room = models.ForeignKey(
        Room,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="timetable_entries"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "timetable_entries"
        ordering = ["day_of_week", "period_slot__period_number"]
        unique_together = [["timetable", "section", "day_of_week", "period_slot"]]

    def __str__(self):
        return f"{self.section} - {self.get_day_of_week_display()} P{self.period_slot.period_number}"


class SubstitutionType(models.TextChoices):
    SINGLE_PERIOD = "single_period", "Single Period"
    DATE_RANGE = "date_range", "Date Range"
    FULL_TERM = "full_term", "Full Term"


class Substitution(models.Model):
    """
    Substitution override for a timetable entry.
    Allows replacing a teacher for specific periods/dates.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable = models.ForeignKey(
        Timetable,
        on_delete=models.CASCADE,
        related_name="substitutions"
    )
    original_entry = models.ForeignKey(
        TimetableEntry,
        on_delete=models.CASCADE,
        related_name="substitutions"
    )
    substitute_teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name="substitution_assignments"
    )
    substitution_type = models.CharField(
        max_length=20,
        choices=SubstitutionType.choices,
        default=SubstitutionType.SINGLE_PERIOD
    )

    # For single period substitution
    date = models.DateField(null=True, blank=True)

    # For date range substitution
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_substitutions"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "substitutions"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Substitution: {self.original_entry.teacher.full_name} -> {self.substitute_teacher.full_name}"


class Conflict(models.Model):
    """
    Detected conflicts in a timetable.
    Used during generation and validation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timetable = models.ForeignKey(
        Timetable,
        on_delete=models.CASCADE,
        related_name="conflicts"
    )
    conflict_type = models.CharField(max_length=50)  # teacher_overlap, section_overlap, room_overlap
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    period_slot = models.ForeignKey(
        PeriodSlot,
        on_delete=models.CASCADE,
        related_name="conflicts"
    )
    description = models.TextField()
    involved_entries = models.JSONField(default=list)  # List of entry IDs
    is_resolved = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "timetable_conflicts"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.conflict_type} - {self.get_day_of_week_display()} P{self.period_slot.period_number}"
