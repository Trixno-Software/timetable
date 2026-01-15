from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.accounts.permissions import IsAuditor, IsSchoolAdmin

from .models import AuditLog, SystemEvent
from .serializers import (
    AuditLogDetailSerializer,
    AuditLogSerializer,
    SystemEventSerializer,
)


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    View audit logs (read-only).
    """
    queryset = AuditLog.objects.all()
    permission_classes = [IsAuthenticated, IsAuditor]
    filterset_fields = [
        "user", "action", "resource_type",
        "school", "branch"
    ]
    search_fields = ["resource_name", "user_email", "notes"]
    ordering_fields = ["created_at", "action"]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return AuditLogDetailSerializer
        return AuditLogSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = AuditLog.objects.select_related(
            "user", "school", "branch"
        )

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(school=user.school)

        if user.branch:
            return queryset.filter(branch=user.branch)

        return queryset.filter(user=user)

    @action(detail=False, methods=["get"])
    def by_resource(self, request):
        """Get audit logs for a specific resource"""
        resource_type = request.query_params.get("resource_type")
        resource_id = request.query_params.get("resource_id")

        queryset = self.get_queryset()
        if resource_type:
            queryset = queryset.filter(resource_type=resource_type)
        if resource_id:
            queryset = queryset.filter(resource_id=resource_id)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """Get audit summary statistics"""
        from django.db.models import Count
        from datetime import timedelta

        queryset = self.get_queryset()

        # Last 30 days
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent = queryset.filter(created_at__gte=thirty_days_ago)

        # Action breakdown
        action_counts = recent.values("action").annotate(
            count=Count("id")
        ).order_by("-count")

        # Resource type breakdown
        resource_counts = recent.values("resource_type").annotate(
            count=Count("id")
        ).order_by("-count")

        # User activity
        user_activity = recent.values("user_email").annotate(
            count=Count("id")
        ).order_by("-count")[:10]

        return Response({
            "total_logs": queryset.count(),
            "last_30_days": recent.count(),
            "action_breakdown": list(action_counts),
            "resource_breakdown": list(resource_counts),
            "top_users": list(user_activity),
        })


class SystemEventViewSet(viewsets.ModelViewSet):
    """
    View and manage system events.
    """
    queryset = SystemEvent.objects.all()
    serializer_class = SystemEventSerializer
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    filterset_fields = ["event_type", "category", "is_resolved", "school", "branch"]
    search_fields = ["message"]
    ordering_fields = ["created_at", "event_type"]

    def get_queryset(self):
        user = self.request.user
        queryset = SystemEvent.objects.select_related(
            "school", "branch", "resolved_by"
        )

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(school=user.school)

        if user.branch:
            return queryset.filter(branch=user.branch)

        return queryset.none()

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Mark an event as resolved"""
        event = self.get_object()
        event.is_resolved = True
        event.resolved_by = request.user
        event.resolved_at = timezone.now()
        event.save()
        return Response(SystemEventSerializer(event).data)

    @action(detail=False, methods=["get"])
    def unresolved(self, request):
        """Get unresolved events"""
        queryset = self.get_queryset().filter(is_resolved=False)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
