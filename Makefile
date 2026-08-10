.PHONY: all help lint format check test build clean install

# Default target
all: lint check test build

# Help command
help:
	@echo "Available commands:"
	@echo "  make              Run lint, check, test, and build"
	@echo "  make help         Show this help message"
	@echo "  make lint         Run ESLint"
	@echo "  make format       Format code with Prettier"
	@echo "  make check        Check formatting with Prettier"
	@echo "  make test         Run tests"
	@echo "  make build        Build the project"
	@echo "  make clean        Remove build artifacts"
	@echo "  make install      Install dependencies"

# Check if Node and npm are installed
check-node:
	@which node > /dev/null || (echo "Node.js is not installed. Please install it first." && exit 1)
	@which npm > /dev/null || (echo "npm is not installed. Please install it first." && exit 1)

# Install dependencies
install: check-node
	@echo "📦 Installing dependencies..."
	@npm install

# Lint code
lint: check-node
	@echo "🔍 Linting code..."
	@npm run lint

# Format code
format: check-node
	@echo "✨ Formatting code..."
	@npm run format

# Check formatting
check: check-node
	@echo "🔎 Checking formatting..."
	@npm run format-check

# Run tests
test: check-node
	@echo "🧪 Running tests..."
	@npm test

# Build the project
build: check-node
	@echo "🏗️  Building project..."
	@npm run build

# Clean build artifacts
clean:
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf dist/ || true
	@echo "✅ Clean complete"
