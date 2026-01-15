import uuid

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models


class AuditAction(models.TextChoices):
    CREATE = "create", "Create"
    UPDATE = "update", "Update"
    DELETE = "delete", "Delete"
    PUBLISH = "publish", "Publish"
    RESTORE = "restore", "Restore"
    IMPORT = "import", "Import"
    EXPORT = "export", "Export"
    LOGIN = "login", "Login"
    LOGOUT = "logout", "Logout"


class AuditLog(models.Model):
    """
    Comprehensive audit log for tracking all system changes.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # User who performed the action
    user = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs"
    )
    user_email = models.EmailField(blank=True)  # Stored for historical reference

    # Tenant context
    school = models.ForeignKey(
        "org.School",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )
    branch = models.ForeignKey(
        "org.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs"
    )

    # Action details
    action = models.CharField(max_length=20, choices=AuditAction.choices)
    resource_type = models.CharField(max_length=100)  # e.g., "timetable", "teacher"
    resource_id = models.CharField(max_length=100, blank=True)
    resource_name = models.CharField(max_length=255, blank=True)

    # Generic foreign key to the actual object
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    object_id = models.CharField(max_length=100, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    # Change data
    old_data = models.JSONField(default=dict)
    new_data = models.JSONField(default=dict)
    changes = models.JSONField(default=dict)  # Summary of what changed

    # Request metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    request_id = models.CharField(max_length=100, blank=True)

    # Additional context
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["resource_type", "resource_id"]),
            models.Index(fields=["action", "created_at"]),
            models.Index(fields=["school", "created_at"]),
            models.Index(fields=["branch", "created_at"]),
        ]

    def __str__(self):
        return f"{self.user_email} - {self.action} - {self.resource_type}"


class SystemEvent(models.Model):
    """
    System-level events (errors, warnings, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=50)  # error, warning, info
    category = models.CharField(max_length=100)  # timetable_generation, import, export
    message = models.TextField()
    details = models.JSONField(default=dict)

    school = models.ForeignKey(
        "org.School",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="system_events"
    )
    branch = models.ForeignKey(
        "org.Branch",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="system_events"
    )

    is_resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resolved_events"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "system_events"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} - {self.category} - {self.message[:50]}"
