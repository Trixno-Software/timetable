from rest_framework import serializers

from apps.academics.serializers import (
    PeriodSlotSerializer,
    SectionSerializer,
    SubjectSerializer,
    TeacherListSerializer,
)

from .models import (
    Conflict,
    Substitution,
    SubstitutionType,
    Timetable,
    TimetableEntry,
    TimetableVersion,
)


class TimetableListSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    session_name = serializers.CharField(source="session.name", read_only=True)
    season_name = serializers.CharField(source="season.name", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    version_count = serializers.SerializerMethodField()

    class Meta:
        model = Timetable
        fields = [
            "id", "branch", "branch_name", "session", "session_name",
            "season", "season_name", "shift", "shift_name",
            "name", "description", "status", "effective_from", "effective_to",
            "current_version", "created_by", "created_by_name",
            "published_by", "published_at", "created_at", "updated_at",
            "version_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "current_version"]

    def get_version_count(self, obj):
        return obj.versions.count()


class TimetableDetailSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    session_name = serializers.CharField(source="session.name", read_only=True)
    season_name = serializers.CharField(source="season.name", read_only=True)
    shift_name = serializers.CharField(source="shift.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)
    entries = serializers.SerializerMethodField()

    class Meta:
        model = Timetable
        fields = [
            "id", "branch", "branch_name", "session", "session_name",
            "season", "season_name", "shift", "shift_name",
            "name", "description", "status", "effective_from", "effective_to",
            "schedule_data", "current_version", "created_by", "created_by_name",
            "published_by", "published_at", "created_at", "updated_at",
            "entries",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "current_version"]

    def get_entries(self, obj):
        entries = obj.entries.all().select_related(
            "section", "section__grade", "subject", "teacher", "period_slot"
        )
        return TimetableEntrySerializer(entries, many=True).data


class TimetableCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Timetable
        fields = [
            "id", "branch", "session", "season", "shift",
            "name", "description", "effective_from", "effective_to",
        ]
        read_only_fields = ["id"]


class TimetableEntrySerializer(serializers.ModelSerializer):
    section_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source="subject.name", read_only=True)
    subject_color = serializers.CharField(source="subject.color", read_only=True)
    teacher_name = serializers.CharField(source="teacher.full_name", read_only=True)
    period_number = serializers.IntegerField(source="period_slot.period_number", read_only=True)
    period_name = serializers.CharField(source="period_slot.name", read_only=True)
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)
    room_name = serializers.CharField(source="room.name", read_only=True)

    class Meta:
        model = TimetableEntry
        fields = [
            "id", "timetable", "section", "section_name",
            "day_of_week", "day_name", "period_slot", "period_number", "period_name",
            "subject", "subject_name", "subject_color",
            "teacher", "teacher_name",
            "room", "room_name",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_section_name(self, obj):
        return f"{obj.section.grade.name} - {obj.section.name}"


class TimetableEntryCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TimetableEntry
        fields = [
            "id", "timetable", "section", "day_of_week",
            "period_slot", "subject", "teacher", "room",
        ]
        read_only_fields = ["id"]

    def validate(self, data):
        from .engine import ConflictDetector

        detector = ConflictDetector()
        timetable = data.get("timetable") or self.instance.timetable if self.instance else None

        if timetable:
            # Load existing entries
            existing_entries = TimetableEntry.objects.filter(
                timetable=timetable
            ).exclude(id=self.instance.id if self.instance else None)

            for entry in existing_entries:
                detector.assign(
                    teacher_id=str(entry.teacher_id),
                    section_id=str(entry.section_id),
                    subject_id=str(entry.subject_id),
                    day=entry.day_of_week,
                    period=entry.period_slot.period_number,
                    room_id=str(entry.room_id) if entry.room else None,
                )

            # Check new assignment
            can_assign, conflicts = detector.can_assign(
                teacher_id=str(data["teacher"].id),
                section_id=str(data["section"].id),
                day=data["day_of_week"],
                period=data["period_slot"].period_number,
                room_id=str(data["room"].id) if data.get("room") else None,
            )

            if not can_assign:
                raise serializers.ValidationError({
                    "conflicts": conflicts,
                    "message": "Assignment creates conflicts",
                })

        return data


class TimetableVersionSerializer(serializers.ModelSerializer):
    timetable_name = serializers.CharField(source="timetable.name", read_only=True)
    created_by_name = serializers.CharField(source="created_by.full_name", read_only=True)

    class Meta:
        model = TimetableVersion
        fields = [
            "id", "timetable", "timetable_name", "version_number",
            "schedule_data", "change_note", "diff_summary",
            "created_by", "created_by_name", "created_at",
        ]
        read_only_fields = ["id", "version_number", "created_at"]


class SubstitutionSerializer(serializers.ModelSerializer):
    original_teacher = serializers.UUIDField(
        source="original_entry.teacher.id", read_only=True
    )
    original_teacher_name = serializers.CharField(
        source="original_entry.teacher.full_name", read_only=True
    )
    substitute_teacher_name = serializers.CharField(
        source="substitute_teacher.full_name", read_only=True
    )
    section = serializers.UUIDField(
        source="original_entry.section.id", read_only=True
    )
    section_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(
        source="original_entry.subject.name", read_only=True
    )
    day_name = serializers.CharField(
        source="original_entry.get_day_of_week_display", read_only=True
    )
    period_number = serializers.IntegerField(
        source="original_entry.period_slot.period_number", read_only=True
    )
    created_by_name = serializers.CharField(
        source="created_by.full_name", read_only=True
    )
    status = serializers.SerializerMethodField()

    class Meta:
        model = Substitution
        fields = [
            "id", "timetable", "original_entry",
            "original_teacher", "original_teacher_name",
            "substitute_teacher", "substitute_teacher_name",
            "section", "section_name", "subject_name", "day_name", "period_number",
            "substitution_type", "date", "start_date", "end_date",
            "reason", "notes", "is_active", "status",
            "created_by", "created_by_name", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_section_name(self, obj):
        entry = obj.original_entry
        return f"{entry.section.grade.name} - {entry.section.name}"

    def get_status(self, obj):
        from datetime import date
        today = date.today()

        if not obj.is_active:
            return "cancelled"

        if obj.substitution_type == "single_period":
            if obj.date:
                if obj.date < today:
                    return "completed"
                elif obj.date == today:
                    return "active"
                else:
                    return "pending"
        else:  # date_range or full_term
            if obj.end_date and obj.end_date < today:
                return "completed"
            elif obj.start_date and obj.start_date <= today:
                if obj.end_date is None or obj.end_date >= today:
                    return "active"
            elif obj.start_date and obj.start_date > today:
                return "pending"

        return "active" if obj.is_active else "cancelled"

    def validate(self, data):
        sub_type = data.get("substitution_type", SubstitutionType.SINGLE_PERIOD)

        if sub_type == SubstitutionType.SINGLE_PERIOD:
            if not data.get("date"):
                raise serializers.ValidationError({
                    "date": "Date is required for single period substitution"
                })
        elif sub_type == SubstitutionType.DATE_RANGE:
            if not data.get("start_date") or not data.get("end_date"):
                raise serializers.ValidationError({
                    "start_date": "Start and end dates are required for date range substitution"
                })
            if data["start_date"] > data["end_date"]:
                raise serializers.ValidationError({
                    "end_date": "End date must be after start date"
                })

        return data


class SubstitutionCreateSerializer(serializers.Serializer):
    """
    Serializer for creating substitutions from frontend.
    Accepts teacher/section and creates substitutions for matching entries.
    """
    timetable = serializers.UUIDField()
    original_teacher = serializers.UUIDField()
    substitute_teacher = serializers.UUIDField()
    section = serializers.UUIDField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    reason = serializers.CharField(required=False, allow_blank=True)
    period_number = serializers.IntegerField(required=False, allow_null=True)

    def validate(self, data):
        from apps.academics.models import Teacher, Section

        # Validate timetable exists
        try:
            timetable = Timetable.objects.get(id=data["timetable"])
            data["timetable_obj"] = timetable
        except Timetable.DoesNotExist:
            raise serializers.ValidationError({"timetable": "Timetable not found"})

        # Validate teachers exist
        try:
            original_teacher = Teacher.objects.get(id=data["original_teacher"])
            data["original_teacher_obj"] = original_teacher
        except Teacher.DoesNotExist:
            raise serializers.ValidationError({"original_teacher": "Original teacher not found"})

        try:
            substitute_teacher = Teacher.objects.get(id=data["substitute_teacher"])
            data["substitute_teacher_obj"] = substitute_teacher
        except Teacher.DoesNotExist:
            raise serializers.ValidationError({"substitute_teacher": "Substitute teacher not found"})

        # Validate section exists
        try:
            section = Section.objects.get(id=data["section"])
            data["section_obj"] = section
        except Section.DoesNotExist:
            raise serializers.ValidationError({"section": "Section not found"})

        # Validate dates
        if data["start_date"] > data["end_date"]:
            raise serializers.ValidationError({"end_date": "End date must be after start date"})

        # Find matching timetable entries
        entries = TimetableEntry.objects.filter(
            timetable=timetable,
            teacher=original_teacher,
            section=section
        )

        if data.get("period_number"):
            entries = entries.filter(period_slot__period_number=data["period_number"])

        if not entries.exists():
            raise serializers.ValidationError({
                "message": "No timetable entries found for this teacher/section combination"
            })

        data["entries"] = entries
        return data

    def create(self, validated_data):
        entries = validated_data["entries"]
        timetable = validated_data["timetable_obj"]
        substitute_teacher = validated_data["substitute_teacher_obj"]
        start_date = validated_data["start_date"]
        end_date = validated_data["end_date"]
        reason = validated_data.get("reason", "")
        user = self.context.get("request").user

        created_subs = []
        for entry in entries:
            sub = Substitution.objects.create(
                timetable=timetable,
                original_entry=entry,
                substitute_teacher=substitute_teacher,
                substitution_type=SubstitutionType.DATE_RANGE,
                start_date=start_date,
                end_date=end_date,
                reason=reason,
                created_by=user
            )
            created_subs.append(sub)

        # Return the first one for serialization (or we can return a list)
        return created_subs[0] if created_subs else None


class ConflictSerializer(serializers.ModelSerializer):
    day_name = serializers.CharField(source="get_day_of_week_display", read_only=True)
    period_number = serializers.IntegerField(
        source="period_slot.period_number", read_only=True
    )

    class Meta:
        model = Conflict
        fields = [
            "id", "timetable", "conflict_type",
            "day_of_week", "day_name", "period_slot", "period_number",
            "description", "involved_entries", "is_resolved", "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class GenerateTimetableSerializer(serializers.Serializer):
    branch_id = serializers.UUIDField()
    session_id = serializers.UUIDField()
    shift_id = serializers.UUIDField()
    season_id = serializers.UUIDField(required=False, allow_null=True)
    name = serializers.CharField(max_length=200)
    description = serializers.CharField(required=False, allow_blank=True)
    working_days = serializers.ListField(
        child=serializers.IntegerField(min_value=0, max_value=6),
        required=False,
        default=[0, 1, 2, 3, 4, 5]  # Mon-Sat
    )


class PublishTimetableSerializer(serializers.Serializer):
    change_note = serializers.CharField()
    effective_from = serializers.DateField(required=False)
    effective_to = serializers.DateField(required=False)


class RestoreVersionSerializer(serializers.Serializer):
    change_note = serializers.CharField()
