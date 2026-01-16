from django.contrib.auth import update_session_auth_hash
from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import User, UserActivity, UserRole
from .permissions import CanManageUsers, IsSuperAdmin
from .serializers import (
    LoginSerializer,
    PasswordChangeSerializer,
    SchoolRegistrationSerializer,
    TokenResponseSerializer,
    UserActivitySerializer,
    UserCreateSerializer,
    UserSerializer,
    UserUpdateSerializer,
)


class RegisterSchoolView(APIView):
    """
    Public endpoint for school self-registration.
    Creates a school, default branch, and admin user.
    """
    permission_classes = [AllowAny]
    serializer_class = SchoolRegistrationSerializer

    def post(self, request):
        serializer = SchoolRegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        result = serializer.save()
        user = result["user"]

        # Generate tokens
        refresh = RefreshToken.for_user(user)

        # Log activity
        UserActivity.objects.create(
            user=user,
            action="school_registration",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
            details={
                "school_id": str(result["school"].id),
                "school_name": result["school"].name,
            },
        )

        return Response({
            "message": "School registered successfully",
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
            "school": {
                "id": str(result["school"].id),
                "name": result["school"].name,
                "code": result["school"].code,
            },
            "branch": {
                "id": str(result["branch"].id),
                "name": result["branch"].name,
            },
        }, status=status.HTTP_201_CREATED)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR")


class LoginView(APIView):
    permission_classes = [AllowAny]
    serializer_class = LoginSerializer

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)

        # Log activity
        UserActivity.objects.create(
            user=user,
            action="login",
            ip_address=self.get_client_ip(request),
            user_agent=request.META.get("HTTP_USER_AGENT", ""),
        )

        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": UserSerializer(user).data,
        })

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR")


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()

            UserActivity.objects.create(
                user=request.user,
                action="logout",
                ip_address=self.get_client_ip(request),
            )

            return Response({"message": "Successfully logged out"})
        except Exception:
            return Response(
                {"message": "Successfully logged out"},
                status=status.HTTP_200_OK
            )

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0]
        return request.META.get("REMOTE_ADDR")


class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserUpdateSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class PasswordChangeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"old_password": "Current password is incorrect"},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save()
        update_session_auth_hash(request, user)

        UserActivity.objects.create(
            user=user,
            action="password_change",
        )

        return Response({"message": "Password changed successfully"})


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    permission_classes = [IsAuthenticated, CanManageUsers]
    filterset_fields = ["role", "school", "branch", "is_active"]
    search_fields = ["email", "first_name", "last_name"]
    ordering_fields = ["created_at", "email", "first_name"]

    def get_serializer_class(self):
        if self.action == "create":
            return UserCreateSerializer
        if self.action in ["update", "partial_update"]:
            return UserUpdateSerializer
        return UserSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = User.objects.all()

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN:
            return queryset.filter(school=user.school)

        if user.role == UserRole.BRANCH_ADMIN:
            return queryset.filter(branch=user.branch)

        return queryset.filter(id=user.id)

    def perform_create(self, serializer):
        user = serializer.save()
        UserActivity.objects.create(
            user=self.request.user,
            action="user_created",
            details={"created_user_id": str(user.id), "email": user.email},
        )

    @action(detail=True, methods=["post"])
    def activate(self, request, pk=None):
        user = self.get_object()
        user.is_active = True
        user.save()
        return Response({"message": "User activated"})

    @action(detail=True, methods=["post"])
    def deactivate(self, request, pk=None):
        user = self.get_object()
        user.is_active = False
        user.save()
        return Response({"message": "User deactivated"})

    @action(detail=True, methods=["post"])
    def reset_password(self, request, pk=None):
        user = self.get_object()
        new_password = request.data.get("new_password")
        if not new_password or len(new_password) < 8:
            return Response(
                {"error": "Password must be at least 8 characters"},
                status=status.HTTP_400_BAD_REQUEST
            )
        user.set_password(new_password)
        user.save()
        return Response({"message": "Password reset successfully"})


class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = UserActivity.objects.all()
    serializer_class = UserActivitySerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ["user", "action"]
    ordering_fields = ["created_at"]

    def get_queryset(self):
        user = self.request.user
        queryset = UserActivity.objects.all()

        if user.role == UserRole.SUPER_ADMIN:
            return queryset

        if user.role == UserRole.SCHOOL_ADMIN:
            return queryset.filter(user__school=user.school)

        if user.role == UserRole.BRANCH_ADMIN:
            return queryset.filter(user__branch=user.branch)

        return queryset.filter(user=user)
