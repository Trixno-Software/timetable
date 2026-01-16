from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CurrentUserView,
    LoginView,
    LogoutView,
    PasswordChangeView,
    RegisterSchoolView,
    UserActivityViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register(r"users", UserViewSet, basename="users")
router.register(r"activities", UserActivityViewSet, basename="activities")

urlpatterns = [
    path("register/", RegisterSchoolView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", CurrentUserView.as_view(), name="current_user"),
    path("change-password/", PasswordChangeView.as_view(), name="change_password"),
    path("", include(router.urls)),
]
