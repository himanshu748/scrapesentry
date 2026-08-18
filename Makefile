.PHONY: api mcp dashboard lint test dashboard-build verify

api:
	uvicorn app.api:app --reload --port 8000

mcp:
	python -m app.server

dashboard:
	cd dashboard && npm run dev

lint:
	python -m ruff check app tests
	cd dashboard && npm run lint

test:
	PYTHONPYCACHEPREFIX=/tmp/scrapesentry-pycache python -m pytest

dashboard-build:
	cd dashboard && npm run build

verify: lint test dashboard-build
