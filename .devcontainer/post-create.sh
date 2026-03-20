#!/bin/bash
set -e

echo "🚀 Setting up prisma-strong-migrations development environment..."

# Fix: git refuses to operate in directories owned by a different user.
# /workspaces/ is owned by root but we run as node, so we register an exception.
git config --global --add safe.directory /workspaces/prisma-strong-migrations

# Make git-secrets available as a git subcommand (git secrets).
mkdir -p /home/node/.local/bin
ln -sf /home/node/bin/git-secrets /home/node/.local/bin/git-secrets

# Install dependencies if package.json exists.
# pnpm may fail on first run due to a symlink race condition; retry once if needed.
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    vp install || {
        echo "⚠️  vp install failed, retrying..."
        vp install
    }
fi

echo "✅ Development environment setup complete!"
echo ""
echo "Available commands:"
echo "  vp install  - Install dependencies"
echo "  vp dev      - Start development server"
echo "  vp test     - Run tests"
echo "  vp check    - Run lint, format, and type checks"
echo "  vp pack     - Build library for publishing"
