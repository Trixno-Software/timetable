from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.models import UserRole
from apps.accounts.permissions import IsBranchAdmin, IsSchoolAdmin, IsSuperAdmin

from .models import Branch, School, Season, Session, Shift
from .serializers import (
    BranchSerializer,
    SchoolSerializer,
    SeasonSerializer,
    SessionSerializer,
    ShiftSerializer,
)


class SchoolViewSet(viewsets.ModelViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    permission_classes = [IsAuthenticated, IsSuperAdmin]
    filterset_fields = ["is_active", "plan"]
    search_fields = ["name", "code", "city"]
    ordering_fields = ["name", "created_at"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated(), IsSchoolAdmin()]
        return super().get_permissions()

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN:
            return School.objects.all()
        if user.school:
            return School.objects.filter(id=user.school_id)
        return School.objects.none()

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        school = self.get_object()
        return Response({
            "branch_count": school.branches.filter(is_active=True).count(),
            "user_count": school.users.filter(is_active=True).count(),
            "total_branches": school.branches.count(),
            "total_users": school.users.count(),
        })


class BranchViewSet(viewsets.ModelViewSet):
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    permission_classes = [IsAuthenticated, IsSchoolAdmin]
    filterset_fields = ["school", "is_active"]
    search_fields = ["name", "code", "city"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN:
            return Branch.objects.all()
        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return Branch.objects.filter(school=user.school)
        if user.branch:
            return Branch.objects.filter(id=user.branch_id)
        return Branch.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            serializer.save(school=user.school)
        else:
            serializer.save()

    @action(detail=True, methods=["get"])
    def stats(self, request, pk=None):
        branch = self.get_object()
        return Response({
            "user_count": branch.users.filter(is_active=True).count(),
            "session_count": branch.sessions.count(),
            "shift_count": branch.shifts.filter(is_active=True).count(),
        })


class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.all()
    serializer_class = SessionSerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["branch", "is_current", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["start_date", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN:
            return Session.objects.all()
        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return Session.objects.filter(branch__school=user.school)
        if user.branch:
            return Session.objects.filter(branch=user.branch)
        return Session.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.branch and user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]:
            serializer.save(branch=user.branch)
        else:
            serializer.save()

    @action(detail=True, methods=["post"])
    def set_current(self, request, pk=None):
        session = self.get_object()
        session.is_current = True
        session.save()
        return Response(SessionSerializer(session).data)


class SeasonViewSet(viewsets.ModelViewSet):
    queryset = Season.objects.all()
    serializer_class = SeasonSerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["session", "is_current", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["start_date", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN:
            return Season.objects.all()
        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return Season.objects.filter(session__branch__school=user.school)
        if user.branch:
            return Season.objects.filter(session__branch=user.branch)
        return Season.objects.none()

    @action(detail=True, methods=["post"])
    def set_current(self, request, pk=None):
        season = self.get_object()
        season.is_current = True
        season.save()
        return Response(SeasonSerializer(season).data)


class ShiftViewSet(viewsets.ModelViewSet):
    queryset = Shift.objects.all()
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["branch", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["start_time", "created_at"]

    def get_queryset(self):
        user = self.request.user
        if user.role == UserRole.SUPER_ADMIN:
            return Shift.objects.all()
        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return Shift.objects.filter(branch__school=user.school)
        if user.branch:
            return Shift.objects.filter(branch=user.branch)
        return Shift.objects.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.branch and user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]:
            serializer.save(branch=user.branch)
        else:
            serializer.save()
