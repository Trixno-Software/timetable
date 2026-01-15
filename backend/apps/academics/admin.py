from django.contrib import admin

from .models import (
    Assignment,
    Grade,
    PeriodSlot,
    PeriodTemplate,
    Room,
    Section,
    Subject,
    Teacher,
    TeacherAvailability,
)


@admin.register(Grade)
class GradeAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "branch", "order", "is_active"]
    list_filter = ["is_active", "branch"]
    search_fields = ["name", "code"]
    ordering = ["branch", "order", "name"]


@admin.register(Section)
class SectionAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "grade", "shift", "room", "is_active"]
    list_filter = ["is_active", "grade", "shift"]
    search_fields = ["name", "code"]
    ordering = ["grade", "name"]


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "branch", "color", "is_active"]
    list_filter = ["is_active", "branch"]
    search_fields = ["name", "code"]
    ordering = ["name"]


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = [
        "employee_code", "first_name", "last_name",
        "branch", "is_class_teacher", "is_active"
    ]
    list_filter = ["is_active", "branch", "is_class_teacher"]
    search_fields = ["first_name", "last_name", "employee_code", "email"]
    ordering = ["first_name", "last_name"]
    filter_horizontal = ["subjects"]


@admin.register(TeacherAvailability)
class TeacherAvailabilityAdmin(admin.ModelAdmin):
    list_display = ["teacher", "day_of_week", "start_time", "end_time", "is_available"]
    list_filter = ["is_available", "day_of_week"]
    ordering = ["teacher", "day_of_week", "start_time"]


@admin.register(PeriodTemplate)
class PeriodTemplateAdmin(admin.ModelAdmin):
    list_display = ["name", "branch", "shift", "season", "grade", "is_active"]
    list_filter = ["is_active", "branch", "shift"]
    search_fields = ["name"]
    ordering = ["name"]


@admin.register(PeriodSlot)
class PeriodSlotAdmin(admin.ModelAdmin):
    list_display = [
        "template", "period_number", "name",
        "start_time", "end_time", "is_break"
    ]
    list_filter = ["is_break", "template"]
    ordering = ["template", "period_number"]


@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = [
        "section", "subject", "teacher",
        "session", "weekly_periods", "is_active"
    ]
    list_filter = ["is_active", "session", "subject"]
    search_fields = ["section__name", "subject__name", "teacher__first_name"]
    ordering = ["section", "subject"]


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "branch", "room_type", "capacity", "is_active"]
    list_filter = ["is_active", "room_type", "branch"]
    search_fields = ["name", "code"]
    ordering = ["name"]
