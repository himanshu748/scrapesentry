.PHONY: api mcp dashboard lint test dashboard-build verify

PYTHON := $(if $(wildcard .venv/bin/python),.venv/bin/python,python)
UVICORN := $(if $(wildcard .venv/bin/uvicorn),.venv/bin/uvicorn,uvicorn)

api:
	$(UVICORN) app.api:app --reload --port 8000

mcp:
	$(PYTHON) -m app.server

dashboard:
	cd dashboard && npm run dev

lint:
	$(PYTHON) -m ruff check app tests
	cd dashboard && npm run lint

test:
	PYTHONPYCACHEPREFIX=/tmp/scrapesentry-pycache $(PYTHON) -m pytest

dashboard-build:
	cd dashboard && npm run build

verify: lint test dashboard-build
