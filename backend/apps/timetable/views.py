from django.db import transaction
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole
from apps.accounts.permissions import IsCoordinator, IsBranchAdmin
from apps.academics.models import PeriodSlot, Section

from .engine import TimetableGenerator, validate_timetable
from .models import (
    Conflict,
    Substitution,
    Timetable,
    TimetableEntry,
    TimetableStatus,
    TimetableVersion,
)
from .serializers import (
    ConflictSerializer,
    GenerateTimetableSerializer,
    PublishTimetableSerializer,
    RestoreVersionSerializer,
    SubstitutionSerializer,
    TimetableCreateSerializer,
    TimetableDetailSerializer,
    TimetableEntryCreateSerializer,
    TimetableEntrySerializer,
    TimetableListSerializer,
    TimetableVersionSerializer,
)


class TimetableViewSet(viewsets.ModelViewSet):
    queryset = Timetable.objects.all()
    permission_classes = [IsAuthenticated, IsCoordinator]
    filterset_fields = ["branch", "session", "season", "shift", "status"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "name"]

    def get_serializer_class(self):
        if self.action == "list":
            return TimetableListSerializer
        if self.action == "create":
            return TimetableCreateSerializer
        return TimetableDetailSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Timetable.objects.select_related(
            "branch", "session", "season", "shift", "created_by"
        )

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(branch__school=user.school)

        if user.branch:
            return queryset.filter(branch=user.branch)

        return queryset.none()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["post"])
    def generate(self, request):
        """Generate a new timetable"""
        serializer = GenerateTimetableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Generate timetable
        generator = TimetableGenerator(
            branch_id=str(data["branch_id"]),
            session_id=str(data["session_id"]),
            shift_id=str(data["shift_id"]),
            season_id=str(data.get("season_id")) if data.get("season_id") else None,
            working_days=data.get("working_days", [0, 1, 2, 3, 4, 5]),
        )

        result = generator.generate()

        if not result.success and result.errors:
            return Response({
                "success": False,
                "errors": result.errors,
            }, status=status.HTTP_400_BAD_REQUEST)

        # Create timetable record
        with transaction.atomic():
            timetable = Timetable.objects.create(
                branch_id=data["branch_id"],
                session_id=data["session_id"],
                shift_id=data["shift_id"],
                season_id=data.get("season_id"),
                name=data["name"],
                description=data.get("description", ""),
                status=TimetableStatus.DRAFT,
                schedule_data=result.schedule,
                created_by=request.user,
            )

            # Create entries from schedule
            entries_to_create = []
            for key, entry_data in result.schedule.items():
                period_slot = PeriodSlot.objects.filter(
                    template__branch_id=data["branch_id"],
                    template__shift_id=data["shift_id"],
                    period_number=entry_data["period_number"],
                ).first()

                if period_slot:
                    entries_to_create.append(TimetableEntry(
                        timetable=timetable,
                        section_id=entry_data["section_id"],
                        day_of_week=entry_data["day_of_week"],
                        period_slot=period_slot,
                        subject_id=entry_data["subject_id"],
                        teacher_id=entry_data["teacher_id"],
                        room_id=entry_data.get("room_id"),
                    ))

            TimetableEntry.objects.bulk_create(entries_to_create)

            # Create conflicts if any
            for conflict in result.conflicts:
                period_slot = PeriodSlot.objects.filter(
                    template__branch_id=data["branch_id"],
                    template__shift_id=data["shift_id"],
                ).first()

                if period_slot:
                    Conflict.objects.create(
                        timetable=timetable,
                        conflict_type="generation_failure",
                        day_of_week=0,
                        period_slot=period_slot,
                        description=f"{conflict['section']} - {conflict['subject']}: {conflict['reason']}",
                    )

        return Response({
            "success": result.success,
            "timetable_id": str(timetable.id),
            "statistics": result.statistics,
            "conflicts": result.conflicts,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        """Publish a timetable (creates a new version)"""
        timetable = self.get_object()

        serializer = PublishTimetableSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Validate timetable
        conflicts = validate_timetable(str(timetable.id))
        if conflicts:
            return Response({
                "error": "Cannot publish timetable with conflicts",
                "conflicts": conflicts,
            }, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            # Create version
            version_number = timetable.current_version + 1
            TimetableVersion.objects.create(
                timetable=timetable,
                version_number=version_number,
                schedule_data=timetable.schedule_data,
                change_note=data["change_note"],
                created_by=request.user,
            )

            # Update timetable
            timetable.status = TimetableStatus.PUBLISHED
            timetable.current_version = version_number
            timetable.published_by = request.user
            timetable.published_at = timezone.now()
            if data.get("effective_from"):
                timetable.effective_from = data["effective_from"]
            if data.get("effective_to"):
                timetable.effective_to = data["effective_to"]
            timetable.save()

        return Response({
            "message": "Timetable published successfully",
            "version": version_number,
        })

    @action(detail=True, methods=["get"])
    def versions(self, request, pk=None):
        """Get all versions of a timetable"""
        timetable = self.get_object()
        versions = timetable.versions.all()
        serializer = TimetableVersionSerializer(versions, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="versions/(?P<version_id>[^/.]+)")
    def version_detail(self, request, pk=None, version_id=None):
        """Get a specific version"""
        timetable = self.get_object()
        version = timetable.versions.filter(id=version_id).first()
        if not version:
            return Response(
                {"error": "Version not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = TimetableVersionSerializer(version)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="restore/(?P<version_id>[^/.]+)")
    def restore(self, request, pk=None, version_id=None):
        """Restore a previous version"""
        timetable = self.get_object()
        version = timetable.versions.filter(id=version_id).first()
        if not version:
            return Response(
                {"error": "Version not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = RestoreVersionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            # Create new version from restored data
            new_version_number = timetable.current_version + 1
            TimetableVersion.objects.create(
                timetable=timetable,
                version_number=new_version_number,
                schedule_data=version.schedule_data,
                change_note=f"Restored from v{version.version_number}: {serializer.validated_data['change_note']}",
                created_by=request.user,
            )

            # Update timetable
            timetable.schedule_data = version.schedule_data
            timetable.current_version = new_version_number
            timetable.save()

            # Recreate entries
            timetable.entries.all().delete()
            entries_to_create = []
            for key, entry_data in version.schedule_data.items():
                period_slot = PeriodSlot.objects.filter(
                    period_number=entry_data["period_number"],
                ).first()

                if period_slot:
                    entries_to_create.append(TimetableEntry(
                        timetable=timetable,
                        section_id=entry_data["section_id"],
                        day_of_week=entry_data["day_of_week"],
                        period_slot=period_slot,
                        subject_id=entry_data["subject_id"],
                        teacher_id=entry_data["teacher_id"],
                        room_id=entry_data.get("room_id"),
                    ))

            TimetableEntry.objects.bulk_create(entries_to_create)

        return Response({
            "message": f"Restored to version {version.version_number}",
            "new_version": new_version_number,
        })

    @action(detail=True, methods=["get"])
    def validate(self, request, pk=None):
        """Validate timetable for conflicts"""
        timetable = self.get_object()
        conflicts = validate_timetable(str(timetable.id))
        return Response({
            "valid": len(conflicts) == 0,
            "conflicts": conflicts,
        })

    @action(detail=True, methods=["get"])
    def by_section(self, request, pk=None):
        """Get timetable entries grouped by section"""
        timetable = self.get_object()
        section_id = request.query_params.get("section_id")

        entries = timetable.entries.all()
        if section_id:
            entries = entries.filter(section_id=section_id)

        entries = entries.select_related(
            "section", "section__grade", "subject", "teacher", "period_slot"
        )

        serializer = TimetableEntrySerializer(entries, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"])
    def by_teacher(self, request, pk=None):
        """Get timetable entries for a teacher"""
        timetable = self.get_object()
        teacher_id = request.query_params.get("teacher_id")

        entries = timetable.entries.all()
        if teacher_id:
            entries = entries.filter(teacher_id=teacher_id)

        entries = entries.select_related(
            "section", "section__grade", "subject", "teacher", "period_slot"
        )

        serializer = TimetableEntrySerializer(entries, many=True)
        return Response(serializer.data)


class TimetableEntryViewSet(viewsets.ModelViewSet):
    queryset = TimetableEntry.objects.all()
    permission_classes = [IsAuthenticated, IsCoordinator]
    filterset_fields = ["timetable", "section", "teacher", "subject", "day_of_week"]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return TimetableEntryCreateSerializer
        return TimetableEntrySerializer

    def get_queryset(self):
        user = self.request.user
        queryset = TimetableEntry.objects.select_related(
            "timetable", "section", "section__grade",
            "subject", "teacher", "period_slot", "room"
        )

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(timetable__branch__school=user.school)

        if user.branch:
            return queryset.filter(timetable__branch=user.branch)

        return queryset.none()


class SubstitutionViewSet(viewsets.ModelViewSet):
    queryset = Substitution.objects.all()
    serializer_class = SubstitutionSerializer
    permission_classes = [IsAuthenticated, IsCoordinator]
    filterset_fields = [
        "timetable", "original_entry", "substitute_teacher",
        "substitution_type", "is_active"
    ]
    ordering_fields = ["created_at", "date"]

    def get_serializer_class(self):
        if self.action == "create":
            from .serializers import SubstitutionCreateSerializer
            return SubstitutionCreateSerializer
        return SubstitutionSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Substitution.objects.select_related(
            "timetable", "original_entry", "original_entry__teacher",
            "original_entry__subject", "original_entry__section",
            "substitute_teacher", "created_by"
        )

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(timetable__branch__school=user.school)

        if user.branch:
            return queryset.filter(timetable__branch=user.branch)

        return queryset.none()

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        # Return the created substitution using the read serializer
        output_serializer = SubstitutionSerializer(instance)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["get"])
    def active(self, request):
        """Get active substitutions"""
        from datetime import date
        today = date.today()

        queryset = self.get_queryset().filter(is_active=True)

        # Filter by date
        queryset = queryset.filter(
            models.Q(date=today) |
            models.Q(start_date__lte=today, end_date__gte=today) |
            models.Q(substitution_type="full_term")
        )

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        """Cancel a substitution"""
        substitution = self.get_object()
        substitution.is_active = False
        substitution.save()
        return Response({"message": "Substitution cancelled"})


class ConflictViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Conflict.objects.all()
    serializer_class = ConflictSerializer
    permission_classes = [IsAuthenticated, IsCoordinator]
    filterset_fields = ["timetable", "conflict_type", "is_resolved"]

    def get_queryset(self):
        user = self.request.user
        queryset = Conflict.objects.select_related("timetable", "period_slot")

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(timetable__branch__school=user.school)

        if user.branch:
            return queryset.filter(timetable__branch=user.branch)

        return queryset.none()

    @action(detail=True, methods=["post"])
    def resolve(self, request, pk=None):
        """Mark a conflict as resolved"""
        conflict = self.get_object()
        conflict.is_resolved = True
        conflict.save()
        return Response({"message": "Conflict marked as resolved"})


# Add missing import for models.Q
from django.db import models
