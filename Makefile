.PHONY: lint format check

lint:
	npm run-script lint

format:
	npm run-script format

check:
	npm run-script format-check
