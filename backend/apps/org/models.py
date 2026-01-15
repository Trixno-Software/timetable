import uuid

from django.db import models


class School(models.Model):
    """
    Top-level tenant representing a school organization.
    A school can have multiple branches.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, default="India")
    pincode = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    logo = models.ImageField(upload_to="school_logos/", blank=True, null=True)

    # Subscription/Plan info
    plan = models.CharField(max_length=50, default="basic")
    max_branches = models.IntegerField(default=1)
    max_users = models.IntegerField(default=50)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "schools"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} ({self.code})"


class Branch(models.Model):
    """
    A branch of a school. Each branch operates semi-independently
    with its own grades, sections, teachers, and timetables.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name="branches"
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    pincode = models.CharField(max_length=20, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "branches"
        ordering = ["school", "name"]
        unique_together = [["school", "code"]]

    def __str__(self):
        return f"{self.school.name} - {self.name}"


class Session(models.Model):
    """
    Academic year/session (e.g., 2025-26).
    Sessions are branch-specific.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="sessions"
    )
    name = models.CharField(max_length=50)  # e.g., "2025-26"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "sessions"
        ordering = ["-start_date"]
        unique_together = [["branch", "name"]]

    def __str__(self):
        return f"{self.branch.name} - {self.name}"

    def save(self, *args, **kwargs):
        # Ensure only one current session per branch
        if self.is_current:
            Session.objects.filter(branch=self.branch, is_current=True).update(is_current=False)
        super().save(*args, **kwargs)


class Season(models.Model):
    """
    Season within a session (e.g., Summer, Winter).
    Different seasons may have different timings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey(
        Session,
        on_delete=models.CASCADE,
        related_name="seasons"
    )
    name = models.CharField(max_length=50)  # e.g., "Summer", "Winter"
    start_date = models.DateField()
    end_date = models.DateField()
    is_current = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "seasons"
        ordering = ["start_date"]
        unique_together = [["session", "name"]]

    def __str__(self):
        return f"{self.session.name} - {self.name}"

    def save(self, *args, **kwargs):
        if self.is_current:
            Season.objects.filter(session=self.session, is_current=True).update(is_current=False)
        super().save(*args, **kwargs)


class Shift(models.Model):
    """
    Shift within a branch (e.g., Morning, Evening).
    Different shifts have different period timings.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    branch = models.ForeignKey(
        Branch,
        on_delete=models.CASCADE,
        related_name="shifts"
    )
    name = models.CharField(max_length=50)  # e.g., "Morning", "Evening"
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "shifts"
        ordering = ["start_time"]
        unique_together = [["branch", "name"]]

    def __str__(self):
        return f"{self.branch.name} - {self.name}"
