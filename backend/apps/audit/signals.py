"""
Audit signals to automatically log model changes.
"""

from django.contrib.contenttypes.models import ContentType
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from apps.timetable.models import Timetable, TimetableVersion, Substitution


# Store original data before save
_original_data = {}


def get_model_data(instance):
    """Get serializable data from model instance"""
    data = {}
    for field in instance._meta.fields:
        value = getattr(instance, field.name)
        if hasattr(value, "id"):
            data[field.name] = str(value.id)
        elif hasattr(value, "isoformat"):
            data[field.name] = value.isoformat()
        else:
            try:
                data[field.name] = str(value) if value is not None else None
            except Exception:
                data[field.name] = None
    return data


def create_audit_log(instance, action, old_data=None, new_data=None, user=None):
    """Create an audit log entry"""
    from apps.audit.models import AuditLog

    content_type = ContentType.objects.get_for_model(instance)

    # Get resource name
    resource_name = str(instance)[:255]

    # Get tenant context
    school = None
    branch = None

    if hasattr(instance, "branch"):
        branch = instance.branch
        school = branch.school if branch else None
    elif hasattr(instance, "school"):
        school = instance.school

    # Calculate changes
    changes = {}
    if old_data and new_data:
        for key in new_data:
            if key in old_data and old_data[key] != new_data[key]:
                changes[key] = {
                    "old": old_data[key],
                    "new": new_data[key],
                }

    AuditLog.objects.create(
        user=user,
        user_email=user.email if user else "",
        school=school,
        branch=branch,
        action=action,
        resource_type=content_type.model,
        resource_id=str(instance.pk),
        resource_name=resource_name,
        content_type=content_type,
        object_id=str(instance.pk),
        old_data=old_data or {},
        new_data=new_data or {},
        changes=changes,
    )


@receiver(pre_save, sender=Timetable)
def timetable_pre_save(sender, instance, **kwargs):
    if instance.pk:
        try:
            old = Timetable.objects.get(pk=instance.pk)
            _original_data[f"timetable_{instance.pk}"] = get_model_data(old)
        except Timetable.DoesNotExist:
            pass


@receiver(post_save, sender=Timetable)
def timetable_post_save(sender, instance, created, **kwargs):
    from apps.audit.models import AuditAction

    action = AuditAction.CREATE if created else AuditAction.UPDATE
    old_data = _original_data.pop(f"timetable_{instance.pk}", {})
    new_data = get_model_data(instance)

    create_audit_log(
        instance=instance,
        action=action,
        old_data=old_data if not created else {},
        new_data=new_data,
        user=instance.created_by if created else instance.published_by,
    )


@receiver(post_save, sender=TimetableVersion)
def timetable_version_post_save(sender, instance, created, **kwargs):
    if created:
        from apps.audit.models import AuditAction
        create_audit_log(
            instance=instance,
            action=AuditAction.PUBLISH,
            new_data=get_model_data(instance),
            user=instance.created_by,
        )


@receiver(post_save, sender=Substitution)
def substitution_post_save(sender, instance, created, **kwargs):
    if created:
        from apps.audit.models import AuditAction
        create_audit_log(
            instance=instance,
            action=AuditAction.CREATE,
            new_data=get_model_data(instance),
            user=instance.created_by,
        )
