from django.contrib import admin

from .models import Conflict, Substitution, Timetable, TimetableEntry, TimetableVersion


@admin.register(Timetable)
class TimetableAdmin(admin.ModelAdmin):
    list_display = [
        "name", "branch", "session", "shift",
        "status", "current_version", "created_at"
    ]
    list_filter = ["status", "branch", "session"]
    search_fields = ["name"]
    ordering = ["-created_at"]


@admin.register(TimetableVersion)
class TimetableVersionAdmin(admin.ModelAdmin):
    list_display = ["timetable", "version_number", "created_by", "created_at"]
    list_filter = ["timetable"]
    ordering = ["-created_at"]


@admin.register(TimetableEntry)
class TimetableEntryAdmin(admin.ModelAdmin):
    list_display = [
        "timetable", "section", "day_of_week",
        "period_slot", "subject", "teacher"
    ]
    list_filter = ["timetable", "day_of_week"]
    ordering = ["timetable", "day_of_week", "period_slot"]


@admin.register(Substitution)
class SubstitutionAdmin(admin.ModelAdmin):
    list_display = [
        "timetable", "original_entry", "substitute_teacher",
        "substitution_type", "is_active", "created_at"
    ]
    list_filter = ["is_active", "substitution_type"]
    ordering = ["-created_at"]


@admin.register(Conflict)
class ConflictAdmin(admin.ModelAdmin):
    list_display = [
        "timetable", "conflict_type", "day_of_week",
        "period_slot", "is_resolved", "created_at"
    ]
    list_filter = ["is_resolved", "conflict_type"]
    ordering = ["-created_at"]
