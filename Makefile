.PHONY: help install migrate run backend frontend test docker-up docker-down superadmin

help:
	@echo "Available commands:"
	@echo "  make install      - Install all dependencies"
	@echo "  make migrate      - Run database migrations"
	@echo "  make run          - Run backend and frontend servers"
	@echo "  make backend      - Run backend server only"
	@echo "  make frontend     - Run frontend server only"
	@echo "  make superadmin   - Create super admin user"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make test         - Run backend tests"

install:
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

migrate:
	cd backend && python manage.py migrate

run:
	@echo "Starting backend and frontend..."
	@make -j2 backend frontend

backend:
	cd backend && python manage.py runserver

frontend:
	cd frontend && npm run dev

superadmin:
	@read -p "Enter email: " email; \
	read -p "Enter password: " password; \
	read -p "Enter first name (default: Admin): " first_name; \
	read -p "Enter last name (default: User): " last_name; \
	cd backend && python manage.py create_superadmin \
		--email="$$email" \
		--password="$$password" \
		--first-name="$${first_name:-Admin}" \
		--last-name="$${last_name:-User}"

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

test:
	cd backend && python manage.py test
