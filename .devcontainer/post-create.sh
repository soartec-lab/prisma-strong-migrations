#!/bin/bash
set -e

echo "🚀 Setting up prisma-strong-migrations development environment..."

# Install dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    vp install
fi

echo "✅ Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  vp install  - Install dependencies"
echo "  vp dev      - Start development server"
echo "  vp test     - Run tests"
echo "  vp check    - Run lint, format, and type checks"
echo "  vp pack     - Build library for publishing"
