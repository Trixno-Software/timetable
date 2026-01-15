from django.contrib import admin

from .models import Branch, School, Season, Session, Shift


@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "city", "plan", "is_active", "created_at"]
    list_filter = ["is_active", "plan", "city"]
    search_fields = ["name", "code"]
    ordering = ["name"]


@admin.register(Branch)
class BranchAdmin(admin.ModelAdmin):
    list_display = ["name", "code", "school", "city", "is_active", "created_at"]
    list_filter = ["is_active", "school"]
    search_fields = ["name", "code"]
    ordering = ["school", "name"]


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ["name", "branch", "start_date", "end_date", "is_current", "is_active"]
    list_filter = ["is_current", "is_active", "branch"]
    search_fields = ["name"]
    ordering = ["-start_date"]


@admin.register(Season)
class SeasonAdmin(admin.ModelAdmin):
    list_display = ["name", "session", "start_date", "end_date", "is_current", "is_active"]
    list_filter = ["is_current", "is_active"]
    search_fields = ["name"]
    ordering = ["start_date"]


@admin.register(Shift)
class ShiftAdmin(admin.ModelAdmin):
    list_display = ["name", "branch", "start_time", "end_time", "is_active"]
    list_filter = ["is_active", "branch"]
    search_fields = ["name"]
    ordering = ["start_time"]
