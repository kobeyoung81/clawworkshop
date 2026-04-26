.PHONY: backend-dev frontend-dev db-up db-down migrate-up migrate-down test frontend-build docker-build runtime-up runtime-down

MYSQL_CONTAINER ?= clawworkshop-mysql
MYSQL_VOLUME ?= clawworkshop-mysql-data
MYSQL_PORT ?= 3306
MYSQL_DATABASE ?= clawworkshop
MYSQL_USER ?= clawworkshop
MYSQL_PASSWORD ?= clawworkshop
MYSQL_ROOT_PASSWORD ?= root
DOCKER_NETWORK ?= clawworkshop-net
DOCKER_IMAGE ?= clawworkshop
RUNTIME_CONTAINER ?= clawworkshop-app
RUNTIME_PORT ?= 8080
DEFAULT_DB_DSN ?= clawworkshop:clawworkshop@tcp($(MYSQL_CONTAINER):3306)/clawworkshop?charset=utf8mb4&parseTime=true&loc=UTC&multiStatements=true

backend-dev:
	cd backend && go run .

frontend-dev:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

db-up:
	docker network inspect $(DOCKER_NETWORK) >/dev/null 2>&1 || docker network create $(DOCKER_NETWORK)
	if docker container inspect $(MYSQL_CONTAINER) >/dev/null 2>&1; then \
		docker start $(MYSQL_CONTAINER); \
	else \
		docker run -d --name $(MYSQL_CONTAINER) \
			--network $(DOCKER_NETWORK) \
			--restart unless-stopped \
			-e MYSQL_DATABASE=$(MYSQL_DATABASE) \
			-e MYSQL_USER=$(MYSQL_USER) \
			-e MYSQL_PASSWORD=$(MYSQL_PASSWORD) \
			-e MYSQL_ROOT_PASSWORD=$(MYSQL_ROOT_PASSWORD) \
			-p $(MYSQL_PORT):3306 \
			-v $(MYSQL_VOLUME):/var/lib/mysql \
			mysql:8.4 \
			--character-set-server=utf8mb4 \
			--collation-server=utf8mb4_unicode_ci; \
	fi

db-down:
	if docker container inspect $(MYSQL_CONTAINER) >/dev/null 2>&1; then \
		docker stop $(MYSQL_CONTAINER) && docker rm $(MYSQL_CONTAINER); \
	fi

migrate-up:
	cd backend && go run ./cmd/migrate -command up

migrate-down:
	cd backend && go run ./cmd/migrate -command down -steps 1

test:
	cd backend && go test ./...

docker-build:
	docker build -t $(DOCKER_IMAGE) .

runtime-up: docker-build
	docker network inspect $(DOCKER_NETWORK) >/dev/null 2>&1 || docker network create $(DOCKER_NETWORK)
	if docker container inspect $(RUNTIME_CONTAINER) >/dev/null 2>&1; then \
		docker stop $(RUNTIME_CONTAINER) && docker rm $(RUNTIME_CONTAINER); \
	fi
	docker run -d --name $(RUNTIME_CONTAINER) \
		--network $(DOCKER_NETWORK) \
		--restart unless-stopped \
		-e DB_DSN="$${DB_DSN:-$(DEFAULT_DB_DSN)}" \
		-p $(RUNTIME_PORT):80 \
		$(DOCKER_IMAGE)

runtime-down:
	if docker container inspect $(RUNTIME_CONTAINER) >/dev/null 2>&1; then \
		docker stop $(RUNTIME_CONTAINER) && docker rm $(RUNTIME_CONTAINER); \
	fi
