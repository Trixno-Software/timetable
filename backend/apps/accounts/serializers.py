from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User, UserActivity, UserRole


class UserSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source="school.name", read_only=True)
    branch_name = serializers.CharField(source="branch.name", read_only=True)
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "phone", "role", "school", "school_name", "branch",
            "branch_name", "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = [
            "id", "email", "first_name", "last_name", "phone",
            "password", "confirm_password", "role", "school", "branch",
        ]

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})

        role = data.get("role", UserRole.VIEWER)
        school = data.get("school")
        branch = data.get("branch")

        # Validate role-tenant relationships
        if role == UserRole.SUPER_ADMIN:
            if school or branch:
                raise serializers.ValidationError(
                    "Super Admin should not be assigned to a school or branch"
                )
        elif role in [UserRole.SCHOOL_ADMIN]:
            if not school:
                raise serializers.ValidationError(
                    {"school": "School Admin must be assigned to a school"}
                )
        elif role in [UserRole.BRANCH_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            if not branch:
                raise serializers.ValidationError(
                    {"branch": "This role must be assigned to a branch"}
                )
            if branch and branch.school != school:
                raise serializers.ValidationError(
                    {"branch": "Branch does not belong to the selected school"}
                )

        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        password = validated_data.pop("password")
        user = User.objects.create_user(password=password, **validated_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "first_name", "last_name", "phone", "role", "school", "branch", "is_active",
        ]


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)
    confirm_password = serializers.CharField(required=True)

    def validate(self, data):
        if data["new_password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match"}
            )
        return data


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")

        user = authenticate(username=email, password=password)
        if not user:
            raise serializers.ValidationError("Invalid email or password")
        if not user.is_active:
            raise serializers.ValidationError("User account is disabled")

        data["user"] = user
        return data


class TokenResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()
    user = UserSerializer()


class UserActivitySerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source="user.email", read_only=True)

    class Meta:
        model = UserActivity
        fields = ["id", "user", "user_email", "action", "details", "ip_address", "created_at"]
        read_only_fields = ["id", "created_at"]


class SchoolRegistrationSerializer(serializers.Serializer):
    """Serializer for school self-registration"""
    # School details
    school_name = serializers.CharField(max_length=255)
    school_code = serializers.CharField(max_length=50)
    school_email = serializers.EmailField(required=False, allow_blank=True)
    school_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    school_address = serializers.CharField(required=False, allow_blank=True)
    school_city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    school_state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    school_pincode = serializers.CharField(max_length=20, required=False, allow_blank=True)

    # Admin user details
    admin_email = serializers.EmailField()
    admin_password = serializers.CharField(write_only=True, min_length=8)
    admin_confirm_password = serializers.CharField(write_only=True, min_length=8)
    admin_first_name = serializers.CharField(max_length=100)
    admin_last_name = serializers.CharField(max_length=100, required=False, allow_blank=True)
    admin_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_school_code(self, value):
        from apps.org.models import School
        if School.objects.filter(code__iexact=value).exists():
            raise serializers.ValidationError("A school with this code already exists")
        return value.upper()

    def validate_admin_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists")
        return value.lower()

    def validate(self, data):
        if data["admin_password"] != data["admin_confirm_password"]:
            raise serializers.ValidationError(
                {"admin_confirm_password": "Passwords do not match"}
            )
        return data

    def create(self, validated_data):
        from django.db import transaction
        from apps.org.models import School, Branch

        with transaction.atomic():
            # Create school
            school = School.objects.create(
                name=validated_data["school_name"],
                code=validated_data["school_code"],
                email=validated_data.get("school_email", ""),
                phone=validated_data.get("school_phone", ""),
                address=validated_data.get("school_address", ""),
                city=validated_data.get("school_city", ""),
                state=validated_data.get("school_state", ""),
                pincode=validated_data.get("school_pincode", ""),
                plan="basic",
                max_branches=1,
                max_users=50,
            )

            # Create default branch
            branch = Branch.objects.create(
                school=school,
                name="Main Branch",
                code="MAIN",
                email=validated_data.get("school_email", ""),
                phone=validated_data.get("school_phone", ""),
                address=validated_data.get("school_address", ""),
                city=validated_data.get("school_city", ""),
                state=validated_data.get("school_state", ""),
                pincode=validated_data.get("school_pincode", ""),
            )

            # Create admin user
            admin_user = User.objects.create_user(
                email=validated_data["admin_email"],
                password=validated_data["admin_password"],
                first_name=validated_data["admin_first_name"],
                last_name=validated_data.get("admin_last_name", ""),
                phone=validated_data.get("admin_phone", ""),
                role=UserRole.SCHOOL_ADMIN,
                school=school,
                branch=branch,
            )

            return {
                "school": school,
                "branch": branch,
                "user": admin_user,
            }
