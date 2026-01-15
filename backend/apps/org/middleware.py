from django.utils.deprecation import MiddlewareMixin


class TenantMiddleware(MiddlewareMixin):
    """
    Middleware to set tenant context for the current request.
    Extracts school and branch from the authenticated user.
    """

    def process_request(self, request):
        request.school = None
        request.branch = None

        if hasattr(request, "user") and request.user.is_authenticated:
            request.school = getattr(request.user, "school", None)
            request.branch = getattr(request.user, "branch", None)

    def process_view(self, request, view_func, view_args, view_kwargs):
        # Additional tenant validation can be added here
        pass
