from rest_framework import serializers

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


class GradeSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    section_count = serializers.SerializerMethodField()

    class Meta:
        model = Grade
        fields = [
            "id", "branch", "branch_name", "name", "code", "order",
            "is_active", "created_at", "updated_at", "section_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_section_count(self, obj):
        return obj.sections.count()


class SectionSerializer(serializers.ModelSerializer):
    grade_name = serializers.CharField(source="grade.name", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)
    branch_id = serializers.UUIDField(source="grade.branch_id", read_only=True)

    class Meta:
        model = Section
        fields = [
            "id", "grade", "grade_name", "shift", "shift_name",
            "branch_id", "name", "code", "room", "capacity",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class SubjectSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = Subject
        fields = [
            "id", "branch", "branch_name", "name", "code",
            "short_name", "color", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TeacherListSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    full_name = serializers.CharField(read_only=True)
    subject_names = serializers.SerializerMethodField()

    class Meta:
        model = Teacher
        fields = [
            "id", "branch", "branch_name", "employee_code",
            "first_name", "last_name", "full_name", "email", "phone",
            "subjects", "subject_names", "max_periods_per_day",
            "max_periods_per_week", "is_class_teacher",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_subject_names(self, obj):
        return [s.name for s in obj.subjects.all()]


class TeacherDetailSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    full_name = serializers.CharField(read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    class_teacher_section_name = serializers.CharField(
        source="class_teacher_section.name", read_only=True
    )

    class Meta:
        model = Teacher
        fields = [
            "id", "branch", "branch_name", "user", "employee_code",
            "first_name", "last_name", "full_name", "email", "phone",
            "subjects", "max_periods_per_day", "max_periods_per_week",
            "is_class_teacher", "class_teacher_section",
            "class_teacher_section_name", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TeacherCreateUpdateSerializer(serializers.ModelSerializer):
    subject_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False
    )

    class Meta:
        model = Teacher
        fields = [
            "id", "branch", "user", "employee_code",
            "first_name", "last_name", "email", "phone",
            "subject_ids", "max_periods_per_day", "max_periods_per_week",
            "is_class_teacher", "class_teacher_section", "is_active",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        subject_ids = validated_data.pop("subject_ids", [])
        teacher = Teacher.objects.create(**validated_data)
        if subject_ids:
            teacher.subjects.set(Subject.objects.filter(id__in=subject_ids))
        return teacher

    def update(self, instance, validated_data):
        subject_ids = validated_data.pop("subject_ids", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if subject_ids is not None:
            instance.subjects.set(Subject.objects.filter(id__in=subject_ids))
        return instance


class TeacherAvailabilitySerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)

    class Meta:
        model = TeacherAvailability
        fields = [
            "id", "teacher", "teacher_name", "day_of_week", "day_name",
            "start_time", "end_time", "is_available", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PeriodSlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = PeriodSlot
        fields = [
            "id", "template", "period_number", "name",
            "start_time", "end_time", "is_break", "duration_minutes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PeriodTemplateSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)
    season_name = serializers.CharField(source="season.name", read_only=True)
    grade_name = serializers.CharField(source="grade.name", read_only=True)
    slots = PeriodSlotSerializer(many=True, read_only=True)

    class Meta:
        model = PeriodTemplate
        fields = [
            "id", "branch", "branch_name", "season", "season_name",
            "shift", "shift_name", "grade", "grade_name", "name",
            "is_active", "created_at", "updated_at", "slots",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class PeriodTemplateCreateSerializer(serializers.ModelSerializer):
    slots = PeriodSlotSerializer(many=True)

    class Meta:
        model = PeriodTemplate
        fields = [
            "id", "branch", "season", "shift", "grade", "name",
            "is_active", "slots",
        ]
        read_only_fields = ["id"]

    def create(self, validated_data):
        slots_data = validated_data.pop("slots", [])
        template = PeriodTemplate.objects.create(**validated_data)
        for slot_data in slots_data:
            PeriodSlot.objects.create(template=template, **slot_data)
        return template

    def update(self, instance, validated_data):
        slots_data = validated_data.pop("slots", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if slots_data is not None:
            # Delete existing slots and recreate
            instance.slots.all().delete()
            for slot_data in slots_data:
                PeriodSlot.objects.create(template=instance, **slot_data)

        return instance


class AssignmentSerializer(serializers.ModelSerializer):
    section_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    session_name = serializers.CharField(source="session.name", read_only=True)
    grade_name = serializers.CharField(source="section.grade.name", read_only=True)

    class Meta:
        model = Assignment
        fields = [
            "id", "section", "section_name", "subject", "subject_name",
            "teacher", "teacher_name", "session", "session_name",
            "grade_name", "weekly_periods", "is_active", "notes",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_section_name(self, obj):
        return f"{obj.section.grade.name} - {obj.section.name}"


class RoomSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = Room
        fields = [
            "id", "branch", "branch_name", "name", "code",
            "room_type", "capacity", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


# Bulk import serializers
class TeacherImportSerializer(serializers.Serializer):
    teacher_code = serializers.CharField(max_length=50)
    teacher_name = serializers.CharField(max_length=200)
    email = serializers.EmailField(required=False, allow_blank=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    subjects = serializers.CharField(required=False, allow_blank=True)


class AssignmentImportSerializer(serializers.Serializer):
    grade = serializers.CharField(max_length=50)
    section = serializers.CharField(max_length=50)
    subject = serializers.CharField(max_length=100)
    teacher_code = serializers.CharField(max_length=50)
    weekly_periods = serializers.IntegerField(min_value=1, max_value=20)
