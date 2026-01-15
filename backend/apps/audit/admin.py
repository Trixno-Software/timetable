from django.contrib import admin

from .models import AuditLog, SystemEvent


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = [
        "user_email", "action", "resource_type",
        "resource_name", "school", "branch", "created_at"
    ]
    list_filter = ["action", "resource_type", "school", "created_at"]
    search_fields = ["user_email", "resource_name", "notes"]
    readonly_fields = [
        "user", "user_email", "school", "branch", "action",
        "resource_type", "resource_id", "resource_name",
        "content_type", "object_id", "old_data", "new_data",
        "changes", "ip_address", "user_agent", "request_id",
        "notes", "metadata", "created_at"
    ]
    ordering = ["-created_at"]


@admin.register(SystemEvent)
class SystemEventAdmin(admin.ModelAdmin):
    list_display = [
        "event_type", "category", "message",
        "school", "is_resolved", "created_at"
    ]
    list_filter = ["event_type", "category", "is_resolved", "school"]
    search_fields = ["message"]
    ordering = ["-created_at"]
