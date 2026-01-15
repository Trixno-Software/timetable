from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AssignmentImportView,
    AssignmentViewSet,
    GradeViewSet,
    PeriodSlotViewSet,
    PeriodTemplateViewSet,
    RoomViewSet,
    SectionViewSet,
    SubjectViewSet,
    TeacherAvailabilityViewSet,
    TeacherImportView,
    TeacherViewSet,
)

router = DefaultRouter()
router.register(r"grades", GradeViewSet, basename="grades")
router.register(r"sections", SectionViewSet, basename="sections")
router.register(r"subjects", SubjectViewSet, basename="subjects")
router.register(r"teachers", TeacherViewSet, basename="teachers")
router.register(r"teacher-availability", TeacherAvailabilityViewSet, basename="teacher-availability")
router.register(r"period-templates", PeriodTemplateViewSet, basename="period-templates")
router.register(r"period-slots", PeriodSlotViewSet, basename="period-slots")
router.register(r"assignments", AssignmentViewSet, basename="assignments")
router.register(r"rooms", RoomViewSet, basename="rooms")

urlpatterns = [
    path("", include(router.urls)),
    path("imports/teachers/", TeacherImportView.as_view(), name="import-teachers"),
    path("imports/assignments/", AssignmentImportView.as_view(), name="import-assignments"),
]
