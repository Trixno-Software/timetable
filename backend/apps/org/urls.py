from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    BranchViewSet,
    SchoolViewSet,
    SeasonViewSet,
    SessionViewSet,
    ShiftViewSet,
)

router = DefaultRouter()
router.register(r"schools", SchoolViewSet, basename="schools")
router.register(r"branches", BranchViewSet, basename="branches")
router.register(r"sessions", SessionViewSet, basename="sessions")
router.register(r"seasons", SeasonViewSet, basename="seasons")
router.register(r"shifts", ShiftViewSet, basename="shifts")

urlpatterns = [
    path("", include(router.urls)),
]
