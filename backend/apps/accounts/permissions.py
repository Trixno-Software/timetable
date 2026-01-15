from rest_framework import permissions

from .models import UserRole


class IsSuperAdmin(permissions.BasePermission):
    """Only Super Admin users have access"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.SUPER_ADMIN
        )


class IsSchoolAdmin(permissions.BasePermission):
    """School Admin or higher"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [UserRole.SUPER_ADMIN, UserRole.SCHOOL_ADMIN]
        )


class IsBranchAdmin(permissions.BasePermission):
    """Branch Admin or higher"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.SUPER_ADMIN,
                UserRole.SCHOOL_ADMIN,
                UserRole.BRANCH_ADMIN,
            ]
        )


class IsCoordinator(permissions.BasePermission):
    """Coordinator or higher"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.SUPER_ADMIN,
                UserRole.SCHOOL_ADMIN,
                UserRole.BRANCH_ADMIN,
                UserRole.COORDINATOR,
            ]
        )


class IsTeacher(permissions.BasePermission):
    """Teacher or higher"""

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role in [
                UserRole.SUPER_ADMIN,
                UserRole.SCHOOL_ADMIN,
                UserRole.BRANCH_ADMIN,
                UserRole.COORDINATOR,
                UserRole.TEACHER,
            ]
        )


class IsAuditor(permissions.BasePermission):
    """Auditor (view-only access)"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.user.role == UserRole.AUDITOR:
            return request.method in permissions.SAFE_METHODS
        return request.user.role in [
            UserRole.SUPER_ADMIN,
            UserRole.SCHOOL_ADMIN,
            UserRole.BRANCH_ADMIN,
            UserRole.COORDINATOR,
        ]


class CanManageUsers(permissions.BasePermission):
    """Permission to manage users within tenant scope"""

    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in [
            UserRole.SUPER_ADMIN,
            UserRole.SCHOOL_ADMIN,
            UserRole.BRANCH_ADMIN,
        ]

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role == UserRole.SUPER_ADMIN:
            return True

        if user.role == UserRole.SCHOOL_ADMIN:
            # Can manage users in same school
            return obj.school_id == user.school_id

        if user.role == UserRole.BRANCH_ADMIN:
            # Can only manage users in same branch
            return obj.branch_id == user.branch_id

        return False


class TenantPermission(permissions.BasePermission):
    """
    Ensure users can only access resources within their tenant scope
    """

    def has_permission(self, request, view):
        return request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        user = request.user

        if user.role == UserRole.SUPER_ADMIN:
            return True

        # Check if object has school/branch attribute
        obj_school_id = getattr(obj, "school_id", None)
        obj_branch_id = getattr(obj, "branch_id", None)

        if user.role == UserRole.SCHOOL_ADMIN:
            if obj_school_id:
                return str(obj_school_id) == str(user.school_id)
            return True

        if user.role in [UserRole.BRANCH_ADMIN, UserRole.COORDINATOR, UserRole.TEACHER]:
            if obj_branch_id:
                return str(obj_branch_id) == str(user.branch_id)
            if obj_school_id:
                return str(obj_school_id) == str(user.school_id)
            return True

        return False
