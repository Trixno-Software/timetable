import uuid

from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserRole(models.TextChoices):
    SUPER_ADMIN = "super_admin", "Super Admin"
    SCHOOL_ADMIN = "school_admin", "School Admin"
    BRANCH_ADMIN = "branch_admin", "Branch Admin"
    COORDINATOR = "coordinator", "Coordinator"
    TEACHER = "teacher", "Teacher"
    AUDITOR = "auditor", "Auditor"
    VIEWER = "viewer", "Viewer"


class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("Email is required")
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", UserRole.SUPER_ADMIN)
        extra_fields.setdefault("is_active", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True)

    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.VIEWER,
    )

    # Multi-tenant relationships
    school = models.ForeignKey(
        "org.School",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
    )
    branch = models.ForeignKey(
        "org.Branch",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="users",
    )

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    def is_super_admin(self):
        return self.role == UserRole.SUPER_ADMIN

    def is_school_admin(self):
        return self.role == UserRole.SCHOOL_ADMIN

    def is_branch_admin(self):
        return self.role == UserRole.BRANCH_ADMIN

    def can_manage_school(self, school_id):
        if self.is_super_admin():
            return True
        if self.is_school_admin() and str(self.school_id) == str(school_id):
            return True
        return False

    def can_manage_branch(self, branch_id):
        if self.is_super_admin():
            return True
        if self.is_school_admin() and self.school:
            from apps.org.models import Branch
            branch = Branch.objects.filter(id=branch_id).first()
            return branch and str(branch.school_id) == str(self.school_id)
        if self.is_branch_admin() and str(self.branch_id) == str(branch_id):
            return True
        return False


class UserActivity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="activities")
    action = models.CharField(max_length=100)
    details = models.JSONField(default=dict)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_activities"
        ordering = ["-created_at"]
        verbose_name_plural = "User activities"

    def __str__(self):
        return f"{self.user.email} - {self.action}"
