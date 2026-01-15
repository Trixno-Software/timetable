from rest_framework import serializers

from .models import AuditLog, SystemEvent


class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    school_name = serializers.CharField(source="school.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = AuditLog
        fields = [
            "id", "user", "user_email", "user_name",
            "school", "school_name", "branch", "branch_name",
            "action", "resource_type", "resource_id", "resource_name",
            "old_data", "new_data", "changes",
            "ip_address", "notes", "metadata", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.full_name
        return obj.user_email


class AuditLogDetailSerializer(AuditLogSerializer):
    class Meta(AuditLogSerializer.Meta):
        fields = AuditLogSerializer.Meta.fields + ["user_agent", "request_id"]


class SystemEventSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    resolved_by_name = serializers.CharField(source="resolved_by.full_name", read_only=True)

    class Meta:
        model = SystemEvent
        fields = [
            "id", "event_type", "category", "message", "details",
            "school", "school_name", "branch", "branch_name",
            "is_resolved", "resolved_by", "resolved_by_name", "resolved_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
