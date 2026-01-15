from django.core.management.base import BaseCommand

from apps.accounts.models import User, UserRole


class Command(BaseCommand):
    help = 'Create a super admin user for the timetable system'

    def add_arguments(self, parser):
        parser.add_argument('--email', type=str, required=True, help='Email for the super admin')
        parser.add_argument('--password', type=str, required=True, help='Password for the super admin')
        parser.add_argument('--first-name', type=str, default='Admin', help='First name')
        parser.add_argument('--last-name', type=str, default='User', help='Last name')

    def handle(self, *args, **options):
        email = options['email']
        password = options['password']
        first_name = options['first_name']
        last_name = options['last_name']

        if User.objects.filter(email=email).exists():
            self.stdout.write(self.style.WARNING(f'User with email {email} already exists'))
            return

        user = User.objects.create_superuser(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            role=UserRole.SUPER_ADMIN,
        )

        self.stdout.write(self.style.SUCCESS(f'Super admin created successfully: {user.email}'))
