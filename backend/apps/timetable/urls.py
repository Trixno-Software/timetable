from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ConflictViewSet,
    SubstitutionViewSet,
    TimetableEntryViewSet,
    TimetableViewSet,
)

# Sub-router for related endpoints (these need to come first)
sub_router = DefaultRouter()
sub_router.register(r"entries", TimetableEntryViewSet, basename="entries")
sub_router.register(r"substitutions", SubstitutionViewSet, basename="substitutions")
sub_router.register(r"conflicts", ConflictViewSet, basename="conflicts")

# Main router for timetables
main_router = DefaultRouter()
main_router.register(r"", TimetableViewSet, basename="timetables")

urlpatterns = [
    # Include sub-routes first so they match before the catch-all timetable routes
    path("", include(sub_router.urls)),
    path("", include(main_router.urls)),
]
