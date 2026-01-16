import uuid

from django.db import models

from apps.org.models import Branch, Season, Session, Shift


class DayOfWeek(models.IntegerChoices):
    MONDAY = 0, "Monday"
    TUESDAY = 1, "Tuesday"
    WEDNESDAY = 2, "Wednesday"
    THURSDAY = 3, "Thursday"
    FRIDAY = 4, "Friday"
    SATURDAY = 5, "Saturday"
    SUNDAY = 6, "Sunday"


class Grade(models.Model):
    """Academic grade/class (e.g., Class 1, Class 10)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="grades"
    )
    name = models.CharField(max_length=50)  # e.g., "Class 1", "Grade 10"
    code = models.CharField(max_length=20)  # e.g., "1", "10"
    order = models.IntegerField(default=0)  # For sorting
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "grades"
        ordering = ["order", "name"]
        unique_together = [["branch", "code"]]

    def __str__(self):
        return f"{self.branch.name} - {self.name}"


class Section(models.Model):
    """Section within a grade (e.g., Section A, Section B)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    grade = models.ForeignKey(
        Grade,
        on_delete=models.CASCADE,
        related_name="sections"
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name="sections"
    )
    name = models.CharField(max_length=50)  # e.g., "A", "B"
    code = models.CharField(max_length=20)  # e.g., "A", "B"
    room = models.CharField(max_length=50, blank=True)  # Optional room assignment
    capacity = models.IntegerField(default=40)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sections"
        ordering = ["grade", "name"]
        unique_together = [["grade", "shift", "code"]]

    def __str__(self):
        return f"{self.grade.name} - {self.name}"

    @property
    def branch(self):
        return self.grade.branch


class Subject(models.Model):
    """Subject taught in the school"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="subjects"
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    short_name = models.CharField(max_length=10, blank=True)
    color = models.CharField(max_length=7, default="#3B82F6")  # Hex color for UI
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "subjects"
        ordering = ["name"]
        unique_together = [["branch", "code"]]

    def __str__(self):
        return f"{self.name} ({self.code})"


class TeacherStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    ON_LEAVE = "on_leave", "On Leave"
    RESIGNED = "resigned", "Resigned"
    TERMINATED = "terminated", "Terminated"


class Teacher(models.Model):
    """Teacher entity linked to user account"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="teachers"
    )
    user = models.OneToOneField(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="teacher_profile"
    )
    employee_code = models.CharField(max_length=50)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    subjects = models.ManyToManyField(
        Subject,
        related_name="teachers",
        blank=True
    )
    max_periods_per_day = models.IntegerField(default=8)
    max_periods_per_week = models.IntegerField(default=40)
    is_class_teacher = models.BooleanField(default=False)
    class_teacher_section = models.ForeignKey(
        Section,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="class_teacher"
    )
    status = models.CharField(
        max_length=20,
        choices=TeacherStatus.choices,
        default=TeacherStatus.ACTIVE
    )
    departure_date = models.DateField(null=True, blank=True)
    departure_reason = models.TextField(blank=True)
    replaced_by = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="replaces"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "teachers"
        ordering = ["first_name", "last_name"]
        unique_together = [["branch", "employee_code"]]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_code})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def has_left(self):
        return self.status in [TeacherStatus.RESIGNED, TeacherStatus.TERMINATED]

    @property
    def needs_replacement(self):
        """Check if teacher has left and has active assignments without replacement"""
        if not self.has_left:
            return False
        return self.assignments.filter(is_active=True).exists() and not self.replaced_by


class TeacherAvailability(models.Model):
    """Teacher availability for scheduling"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name="availability"
    )
    day_of_week = models.IntegerField(choices=DayOfWeek.choices)
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_available = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "teacher_availability"
        ordering = ["day_of_week", "start_time"]

    def __str__(self):
        status = "Available" if self.is_available else "Unavailable"
        return f"{self.teacher.full_name} - {self.get_day_of_week_display()} ({status})"


class PeriodTemplate(models.Model):
    """
    Period configuration for a grade/section/shift/season combination.
    Defines the number of periods and their timings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="period_templates"
    )
    season = models.ForeignKey(
        Season,
        on_delete=models.CASCADE,
        related_name="period_templates",
        null=True,
        blank=True
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.CASCADE,
        related_name="period_templates"
    )
    grade = models.ForeignKey(
        Grade,
        on_delete=models.CASCADE,
        related_name="period_templates",
        null=True,
        blank=True  # If null, applies to all grades
    )
    name = models.CharField(max_length=100)  # e.g., "Morning Shift - Summer"
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "period_templates"
        ordering = ["name"]

    def __str__(self):
        return self.name


class PeriodSlot(models.Model):
    """Individual period slot within a template"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    template = models.ForeignKey(
        PeriodTemplate,
        on_delete=models.CASCADE,
        related_name="slots"
    )
    period_number = models.IntegerField()  # 1, 2, 3, etc.
    name = models.CharField(max_length=50)  # e.g., "Period 1", "Lunch Break"
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_break = models.BooleanField(default=False)  # True for breaks
    duration_minutes = models.IntegerField()  # Duration in minutes
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "period_slots"
        ordering = ["template", "period_number"]
        unique_together = [["template", "period_number"]]

    def __str__(self):
        return f"{self.template.name} - {self.name}"


class Assignment(models.Model):
    """
    Subject-teacher assignment for a section.
    Defines how many periods per week a teacher teaches a subject in a section.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    section = models.ForeignKey(
        Section,
        on_delete=models.CASCADE,
        related_name="assignments"
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name="assignments"
    )
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name="assignments",
        null=True,
        blank=True
    )
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="assignments"
    )
    weekly_periods = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "assignments"
        ordering = ["section", "subject"]
        unique_together = [["section", "subject", "session"]]

    def __str__(self):
        teacher_name = self.teacher.full_name if self.teacher else "Unassigned"
        return f"{self.section} - {self.subject} ({teacher_name})"

    @property
    def branch(self):
        return self.section.grade.branch


class Room(models.Model):
    """Room/Lab for scheduling (optional feature)"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="rooms"
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    room_type = models.CharField(max_length=50, default="classroom")  # classroom, lab, etc.
    capacity = models.IntegerField(default=40)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "rooms"
        ordering = ["name"]
        unique_together = [["branch", "code"]]

    def __str__(self):
        return f"{self.name} ({self.code})"
