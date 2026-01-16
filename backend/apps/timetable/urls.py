from django.urls import include, path
from rest_framework.routers import DefaultRouter, SimpleRouter

from .views import (
    ConflictViewSet,
    SubstitutionViewSet,
    TimetableEntryViewSet,
    TimetableViewSet,
)

# Main router for timetables (use DefaultRouter for the primary resource)
router = DefaultRouter()
router.register(r"", TimetableViewSet, basename="timetables")

# Sub-router for related endpoints (use SimpleRouter to avoid API root conflicts)
sub_router = SimpleRouter()
sub_router.register(r"entries", TimetableEntryViewSet, basename="entries")
sub_router.register(r"substitutions", SubstitutionViewSet, basename="substitutions")
sub_router.register(r"conflicts", ConflictViewSet, basename="conflicts")

urlpatterns = [
    # Sub-routes first so they match before the catch-all timetable routes
    path("", include(sub_router.urls)),
    # Main timetable routes
    path("", include(router.urls)),
]
