from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AuditLogViewSet, SystemEventViewSet

router = DefaultRouter()
router.register(r"logs", AuditLogViewSet, basename="audit-logs")
router.register(r"events", SystemEventViewSet, basename="system-events")

urlpatterns = [
    path("", include(router.urls)),
]
