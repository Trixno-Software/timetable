from django.urls import path

from .views import ExportTemplatesView, TimetableExportView

urlpatterns = [
    path("timetable/<uuid:timetable_id>/", TimetableExportView.as_view(), name="export-timetable"),
    path("templates/<str:template_type>/", ExportTemplatesView.as_view(), name="export-templates"),
]
