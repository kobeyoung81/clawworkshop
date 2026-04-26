.PHONY: backend-dev frontend-dev db-up db-down migrate-up migrate-down test frontend-build docker-build runtime-up runtime-down

backend-dev:
	cd backend && go run .

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

db-up:
	docker compose up -d mysql

db-down:
	docker compose down

migrate-up:
	cd backend && go run ./cmd/migrate -command up

migrate-down:
	cd backend && go run ./cmd/migrate -command down -steps 1

test:
	cd backend && go test ./...

docker-build:
	docker build -t clawworkshop .

runtime-up:
	docker compose --profile district up -d --build app

runtime-down:
	docker compose --profile district down
