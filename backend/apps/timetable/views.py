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

    @action(detail=False, methods=["get"])
    def teacher_schedule(self, request):
        """
        Get a teacher's schedule for a specific day in a timetable.
        Query params: timetable_id, teacher_id, day_of_week
        """
        from datetime import date

        timetable_id = request.query_params.get("timetable_id")
        teacher_id = request.query_params.get("teacher_id")
        day_of_week = request.query_params.get("day_of_week")

        if not all([timetable_id, teacher_id]):
            return Response(
                {"error": "timetable_id and teacher_id are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        entries = TimetableEntry.objects.filter(
            timetable_id=timetable_id,
            teacher_id=teacher_id
        ).select_related(
            "section", "section__grade", "subject", "period_slot"
        )

        if day_of_week is not None:
            entries = entries.filter(day_of_week=int(day_of_week))

        entries = entries.order_by("day_of_week", "period_slot__period_number")

        serializer = TimetableEntrySerializer(entries, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def available_teachers(self, request):
        """
        Get teachers who are free at specific time slots.
        Query params: timetable_id, day_of_week, period_numbers (comma-separated)
        Returns teachers not assigned to any period in the given slots.
        """
        from apps.academics.models import Teacher

        timetable_id = request.query_params.get("timetable_id")
        day_of_week = request.query_params.get("day_of_week")
        period_numbers = request.query_params.get("period_numbers", "")

        if not all([timetable_id, day_of_week]):
            return Response(
                {"error": "timetable_id and day_of_week are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            timetable = Timetable.objects.get(id=timetable_id)
        except Timetable.DoesNotExist:
            return Response(
                {"error": "Timetable not found"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all teachers in the branch
        all_teachers = Teacher.objects.filter(
            branch=timetable.branch,
            status="active"
        )

        # Parse period numbers
        periods = []
        if period_numbers:
            periods = [int(p.strip()) for p in period_numbers.split(",") if p.strip()]

        # Get period slots for these period numbers
        period_slots = PeriodSlot.objects.filter(
            template__branch=timetable.branch,
            template__shift=timetable.shift
        )
        if periods:
            period_slots = period_slots.filter(period_number__in=periods)
        period_slot_ids = list(period_slots.values_list("id", flat=True))

        # Find busy teachers for the day/periods
        busy_query = TimetableEntry.objects.filter(
            timetable_id=timetable_id,
            day_of_week=int(day_of_week)
        )
        if period_slot_ids:
            busy_query = busy_query.filter(period_slot_id__in=period_slot_ids)

        busy_teacher_ids = set(busy_query.values_list("teacher_id", flat=True))

        # Build response with availability per period
        result = []
        for teacher in all_teachers:
            teacher_busy_periods = []
            if period_slot_ids:
                teacher_entries = TimetableEntry.objects.filter(
                    timetable_id=timetable_id,
                    teacher_id=teacher.id,
                    day_of_week=int(day_of_week),
                    period_slot_id__in=period_slot_ids
                ).select_related("period_slot", "section", "section__grade", "subject")

                for entry in teacher_entries:
                    teacher_busy_periods.append({
                        "period_number": entry.period_slot.period_number,
                        "section": f"{entry.section.grade.name} - {entry.section.name}",
                        "subject": entry.subject.name
                    })

            is_free_all = str(teacher.id) not in [str(tid) for tid in busy_teacher_ids]

            result.append({
                "id": str(teacher.id),
                "name": teacher.full_name,
                "employee_id": teacher.employee_id,
                "is_free_all_periods": is_free_all,
                "busy_periods": teacher_busy_periods,
                "free_period_count": len(periods) - len(teacher_busy_periods) if periods else 0
            })

        # Sort by free period count (most free first)
        result.sort(key=lambda x: (-x["free_period_count"], x["name"]))

        return Response(result)

    @action(detail=False, methods=["post"])
    def mark_absent(self, request):
        """
        Mark a teacher as absent and create substitutions for their periods.
        Expects: {
            timetable_id: uuid,
            absent_teacher_id: uuid,
            date: "YYYY-MM-DD",
            day_of_week: int,
            substitutions: [
                { period_number: int, substitute_teacher_id: uuid },
                ...
            ],
            reason: string (optional)
        }
        """
        from datetime import datetime
        from apps.academics.models import Teacher

        data = request.data
        timetable_id = data.get("timetable_id")
        absent_teacher_id = data.get("absent_teacher_id")
        absence_date = data.get("date")
        day_of_week = data.get("day_of_week")
        substitutions_data = data.get("substitutions", [])
        reason = data.get("reason", "Teacher absent")

        # Validate required fields
        if not all([timetable_id, absent_teacher_id, absence_date, day_of_week is not None]):
            return Response(
                {"error": "timetable_id, absent_teacher_id, date, and day_of_week are required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            timetable = Timetable.objects.get(id=timetable_id)
            absent_teacher = Teacher.objects.get(id=absent_teacher_id)
        except (Timetable.DoesNotExist, Teacher.DoesNotExist) as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_404_NOT_FOUND
            )

        # Parse date
        try:
            parsed_date = datetime.strptime(absence_date, "%Y-%m-%d").date()
        except ValueError:
            return Response(
                {"error": "Invalid date format. Use YYYY-MM-DD"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get all entries for the absent teacher on that day
        absent_entries = TimetableEntry.objects.filter(
            timetable_id=timetable_id,
            teacher_id=absent_teacher_id,
            day_of_week=int(day_of_week)
        ).select_related("period_slot")

        # Build a map of period_number -> substitute_teacher_id
        sub_map = {s["period_number"]: s["substitute_teacher_id"] for s in substitutions_data}

        created_substitutions = []
        skipped_periods = []

        with transaction.atomic():
            for entry in absent_entries:
                period_num = entry.period_slot.period_number
                substitute_id = sub_map.get(period_num)

                if not substitute_id:
                    skipped_periods.append(period_num)
                    continue

                # Check if substitution already exists for this entry and date
                existing = Substitution.objects.filter(
                    original_entry=entry,
                    date=parsed_date,
                    is_active=True
                ).first()

                if existing:
                    # Update existing substitution
                    existing.substitute_teacher_id = substitute_id
                    existing.reason = reason
                    existing.save()
                    created_substitutions.append(existing)
                else:
                    # Create new substitution
                    sub = Substitution.objects.create(
                        timetable=timetable,
                        original_entry=entry,
                        substitute_teacher_id=substitute_id,
                        substitution_type="single_period",
                        date=parsed_date,
                        reason=reason,
                        is_active=True,
                        created_by=request.user
                    )
                    created_substitutions.append(sub)

        serializer = SubstitutionSerializer(created_substitutions, many=True)
        return Response({
            "message": f"Created {len(created_substitutions)} substitutions",
            "substitutions": serializer.data,
            "skipped_periods": skipped_periods
        }, status=status.HTTP_201_CREATED)


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
