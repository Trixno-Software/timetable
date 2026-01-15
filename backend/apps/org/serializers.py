from rest_framework import serializers

from .models import Branch, School, Season, Session, Shift


class SchoolSerializer(serializers.ModelSerializer):
    branch_count = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = [
            "id", "name", "code", "email", "phone", "address",
            "city", "state", "country", "pincode", "website", "logo",
            "plan", "max_branches", "max_users",
            "is_active", "created_at", "updated_at",
            "branch_count", "user_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_branch_count(self, obj):
        return obj.branches.count()

    def get_user_count(self, obj):
        return obj.users.count()


class BranchSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)
    user_count = serializers.SerializerMethodField()

    class Meta:
        model = Branch
        fields = [
            "id", "school", "school_name", "name", "code",
            "email", "phone", "address", "city", "state", "pincode",
            "is_active", "created_at", "updated_at", "user_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_user_count(self, obj):
        return obj.users.count()

    def validate(self, data):
        school = data.get("school") or self.instance.school if self.instance else None
        if school:
            branch_count = school.branches.count()
            if not self.instance and branch_count >= school.max_branches:
                raise serializers.ValidationError(
                    f"Maximum branches ({school.max_branches}) reached for this school"
                )
        return data


class SessionSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    season_count = serializers.SerializerMethodField()

    class Meta:
        model = Session
        fields = [
            "id", "branch", "branch_name", "name",
            "start_date", "end_date", "is_current", "is_active",
            "created_at", "updated_at", "season_count",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_season_count(self, obj):
        return obj.seasons.count()

    def validate(self, data):
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date"}
            )
        return data


class SeasonSerializer(serializers.ModelSerializer):
    session_name = serializers.CharField(source="session.name", read_only=True)

    class Meta:
        model = Season
        fields = [
            "id", "session", "session_name", "name",
            "start_date", "end_date", "is_current", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        start_date = data.get("start_date")
        end_date = data.get("end_date")
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                {"end_date": "End date must be after start date"}
            )
        return data


class ShiftSerializer(serializers.ModelSerializer):
    branch_name = serializers.CharField(source="branch.name", read_only=True)

    class Meta:
        model = Shift
        fields = [
            "id", "branch", "branch_name", "name",
            "start_time", "end_time", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, data):
        start_time = data.get("start_time")
        end_time = data.get("end_time")
        if start_time and end_time and start_time >= end_time:
            raise serializers.ValidationError(
                {"end_time": "End time must be after start time"}
            )
        return data
