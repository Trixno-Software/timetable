import io

import pandas as pd
from django.db import transaction
from openpyxl import load_workbook
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import UserRole
from apps.accounts.permissions import IsBranchAdmin, IsCoordinator

from .models import (
    Assignment,
    Grade,
    PeriodSlot,
    PeriodTemplate,
    Room,
    Section,
    Subject,
    Teacher,
    TeacherAvailability,
)
from .serializers import (
    AssignmentImportSerializer,
    AssignmentSerializer,
    GradeSerializer,
    PeriodSlotSerializer,
    PeriodTemplateCreateSerializer,
    PeriodTemplateSerializer,
    RoomSerializer,
    SectionSerializer,
    SubjectSerializer,
    TeacherAvailabilitySerializer,
    TeacherCreateUpdateSerializer,
    TeacherDetailSerializer,
    TeacherImportSerializer,
    TeacherListSerializer,
)


class TenantFilterMixin:
    """Mixin to filter querysets by tenant (branch)"""

    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(branch__school=user.school)

        if user.branch:
            return queryset.filter(branch=user.branch)

        return queryset.none()


class GradeViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Grade.objects.all()
    serializer_class = GradeSerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["branch", "is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["order", "name", "created_at"]

    def perform_create(self, serializer):
        user = self.request.user
        if user.branch and user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]:
            serializer.save(branch=user.branch)
        else:
            serializer.save()


class SectionViewSet(viewsets.ModelViewSet):
    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["grade", "shift", "is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        user = self.request.user
        queryset = Section.objects.select_related("grade", "shift")

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(grade__branch__school=user.school)

        if user.branch:
            return queryset.filter(grade__branch=user.branch)

        return queryset.none()


class SubjectViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Subject.objects.all()
    serializer_class = SubjectSerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["branch", "is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        user = self.request.user
        if user.branch and user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]:
            serializer.save(branch=user.branch)
        else:
            serializer.save()


class TeacherViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Teacher.objects.all()
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["branch", "is_active", "is_class_teacher"]
    search_fields = ["first_name", "last_name", "employee_code", "email"]
    ordering_fields = ["first_name", "last_name", "created_at"]

    def get_serializer_class(self):
        if self.action == "list":
            return TeacherListSerializer
        if self.action in ["create", "update", "partial_update"]:
            return TeacherCreateUpdateSerializer
        return TeacherDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.branch and user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]:
            serializer.save(branch=user.branch)
        else:
            serializer.save()

    @action(detail=True, methods=["get"])
    def availability(self, request, pk=None):
        teacher = self.get_object()
        availabilities = teacher.availability.all()
        serializer = TeacherAvailabilitySerializer(availabilities, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def set_availability(self, request, pk=None):
        teacher = self.get_object()
        availabilities = request.data.get("availability", [])

        # Delete existing and recreate
        teacher.availability.all().delete()

        created = []
        for avail_data in availabilities:
            avail_data["teacher"] = teacher.id
            serializer = TeacherAvailabilitySerializer(data=avail_data)
            if serializer.is_valid():
                serializer.save(teacher=teacher)
                created.append(serializer.data)

        return Response(created, status=status.HTTP_201_CREATED)


class TeacherAvailabilityViewSet(viewsets.ModelViewSet):
    queryset = TeacherAvailability.objects.all()
    serializer_class = TeacherAvailabilitySerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["teacher", "day_of_week", "is_available"]

    def get_queryset(self):
        user = self.request.user
        queryset = TeacherAvailability.objects.select_related("teacher")

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(teacher__branch__school=user.school)

        if user.branch:
            return queryset.filter(teacher__branch=user.branch)

        return queryset.none()


class PeriodTemplateViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = PeriodTemplate.objects.all()
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["branch", "shift", "season", "grade", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return PeriodTemplateCreateSerializer
        return PeriodTemplateSerializer

    @action(detail=True, methods=["post"])
    def duplicate(self, request, pk=None):
        """Duplicate a period template"""
        template = self.get_object()
        new_name = request.data.get("name", f"{template.name} (Copy)")

        new_template = PeriodTemplate.objects.create(
            branch=template.branch,
            season=template.season,
            shift=template.shift,
            grade=template.grade,
            name=new_name,
            is_active=template.is_active,
        )

        for slot in template.slots.all():
            PeriodSlot.objects.create(
                template=new_template,
                period_number=slot.period_number,
                name=slot.name,
                start_time=slot.start_time,
                end_time=slot.end_time,
                is_break=slot.is_break,
                duration_minutes=slot.duration_minutes,
            )

        serializer = PeriodTemplateSerializer(new_template)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PeriodSlotViewSet(viewsets.ModelViewSet):
    queryset = PeriodSlot.objects.all()
    serializer_class = PeriodSlotSerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["template", "is_break"]
    ordering_fields = ["period_number"]


class AssignmentViewSet(viewsets.ModelViewSet):
    queryset = Assignment.objects.all()
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated, IsCoordinator]
    filterset_fields = ["section", "subject", "teacher", "session", "is_active"]
    search_fields = ["section__name", "subject__name", "teacher__first_name"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        queryset = Assignment.objects.select_related(
            "section", "section__grade", "subject", "teacher", "session"
        )

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN and user.school:
            return queryset.filter(section__grade__branch__school=user.school)

        if user.branch:
            return queryset.filter(section__grade__branch=user.branch)

        return queryset.none()

    @action(detail=False, methods=["get"])
    def by_section(self, request):
        """Get assignments grouped by section"""
        section_id = request.query_params.get("section_id")
        session_id = request.query_params.get("session_id")

        queryset = self.get_queryset()
        if section_id:
            queryset = queryset.filter(section_id=section_id)
        if session_id:
            queryset = queryset.filter(session_id=session_id)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def by_teacher(self, request):
        """Get assignments for a teacher"""
        teacher_id = request.query_params.get("teacher_id")
        session_id = request.query_params.get("session_id")

        queryset = self.get_queryset()
        if teacher_id:
            queryset = queryset.filter(teacher_id=teacher_id)
        if session_id:
            queryset = queryset.filter(session_id=session_id)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class RoomViewSet(TenantFilterMixin, viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated, IsBranchAdmin]
    filterset_fields = ["branch", "room_type", "is_active"]
    search_fields = ["name", "code"]
    ordering_fields = ["name", "created_at"]

    def perform_create(self, serializer):
        user = self.request.user
        if user.branch and user.role not in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]:
            serializer.save(branch=user.branch)
        else:
            serializer.save()


class ExcelImportView(APIView):
    """Base view for Excel imports"""
    parser_classes = [MultiPartParser]
    permission_classes = [IsAuthenticated, IsBranchAdmin]

    def parse_excel(self, file):
        """Parse Excel file and return DataFrame"""
        workbook = load_workbook(file, data_only=True)
        sheet = workbook.active
        data = sheet.values
        columns = next(data)
        df = pd.DataFrame(data, columns=columns)
        return df


class TeacherImportView(ExcelImportView):
    """Import teachers from Excel"""

    @transaction.atomic
    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        branch_id = request.data.get("branch_id")
        if not branch_id:
            if request.user.branch:
                branch_id = request.user.branch_id
            else:
                return Response(
                    {"error": "Branch ID is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            df = self.parse_excel(file)

            # Normalize column names
            df.columns = df.columns.str.lower().str.strip().str.replace(" ", "_")

            results = {"created": 0, "updated": 0, "errors": []}

            for idx, row in df.iterrows():
                try:
                    data = {
                        "teacher_code": str(row.get("teacher_code", "")).strip(),
                        "teacher_name": str(row.get("teacher_name", "")).strip(),
                        "email": str(row.get("email", "")).strip() if pd.notna(row.get("email")) else "",
                        "phone": str(row.get("phone", "")).strip() if pd.notna(row.get("phone")) else "",
                        "subjects": str(row.get("subjects", "")).strip() if pd.notna(row.get("subjects")) else "",
                    }

                    serializer = TeacherImportSerializer(data=data)
                    if not serializer.is_valid():
                        results["errors"].append({
                            "row": idx + 2,
                            "errors": serializer.errors,
                            "data": data
                        })
                        continue

                    # Parse name
                    name_parts = data["teacher_name"].split(" ", 1)
                    first_name = name_parts[0]
                    last_name = name_parts[1] if len(name_parts) > 1 else ""

                    # Create or update teacher
                    teacher, created = Teacher.objects.update_or_create(
                        branch_id=branch_id,
                        employee_code=data["teacher_code"],
                        defaults={
                            "first_name": first_name,
                            "last_name": last_name,
                            "email": data["email"],
                            "phone": data["phone"],
                        }
                    )

                    # Handle subjects
                    if data["subjects"]:
                        subject_names = [s.strip() for s in data["subjects"].split(",")]
                        subjects = Subject.objects.filter(
                            branch_id=branch_id,
                            name__in=subject_names
                        )
                        teacher.subjects.set(subjects)

                    if created:
                        results["created"] += 1
                    else:
                        results["updated"] += 1

                except Exception as e:
                    results["errors"].append({
                        "row": idx + 2,
                        "error": str(e)
                    })

            return Response(results)

        except Exception as e:
            return Response(
                {"error": f"Failed to process file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class AssignmentImportView(ExcelImportView):
    """Import assignments from Excel"""

    @transaction.atomic
    def post(self, request):
        file = request.FILES.get("file")
        if not file:
            return Response(
                {"error": "No file provided"},
                status=status.HTTP_400_BAD_REQUEST
            )

        branch_id = request.data.get("branch_id")
        session_id = request.data.get("session_id")

        if not branch_id:
            if request.user.branch:
                branch_id = request.user.branch_id
            else:
                return Response(
                    {"error": "Branch ID is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        if not session_id:
            return Response(
                {"error": "Session ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            df = self.parse_excel(file)
            df.columns = df.columns.str.lower().str.strip().str.replace(" ", "_")

            results = {"created": 0, "updated": 0, "errors": []}

            for idx, row in df.iterrows():
                try:
                    data = {
                        "grade": str(row.get("grade", "")).strip(),
                        "section": str(row.get("section", "")).strip(),
                        "subject": str(row.get("subject", "")).strip(),
                        "teacher_code": str(row.get("teacher_code", "")).strip(),
                        "weekly_periods": int(row.get("weekly_periods", 1)),
                    }

                    serializer = AssignmentImportSerializer(data=data)
                    if not serializer.is_valid():
                        results["errors"].append({
                            "row": idx + 2,
                            "errors": serializer.errors,
                            "data": data
                        })
                        continue

                    # Find entities
                    grade = Grade.objects.filter(
                        branch_id=branch_id,
                        code=data["grade"]
                    ).first()
                    if not grade:
                        results["errors"].append({
                            "row": idx + 2,
                            "error": f"Grade not found: {data['grade']}"
                        })
                        continue

                    section = Section.objects.filter(
                        grade=grade,
                        code=data["section"]
                    ).first()
                    if not section:
                        results["errors"].append({
                            "row": idx + 2,
                            "error": f"Section not found: {data['section']}"
                        })
                        continue

                    subject = Subject.objects.filter(
                        branch_id=branch_id,
                        name__iexact=data["subject"]
                    ).first()
                    if not subject:
                        results["errors"].append({
                            "row": idx + 2,
                            "error": f"Subject not found: {data['subject']}"
                        })
                        continue

                    teacher = Teacher.objects.filter(
                        branch_id=branch_id,
                        employee_code=data["teacher_code"]
                    ).first()
                    if not teacher:
                        results["errors"].append({
                            "row": idx + 2,
                            "error": f"Teacher not found: {data['teacher_code']}"
                        })
                        continue

                    # Create or update assignment
                    assignment, created = Assignment.objects.update_or_create(
                        section=section,
                        subject=subject,
                        session_id=session_id,
                        defaults={
                            "teacher": teacher,
                            "weekly_periods": data["weekly_periods"],
                        }
                    )

                    if created:
                        results["created"] += 1
                    else:
                        results["updated"] += 1

                except Exception as e:
                    results["errors"].append({
                        "row": idx + 2,
                        "error": str(e)
                    })

            return Response(results)

        except Exception as e:
            return Response(
                {"error": f"Failed to process file: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
