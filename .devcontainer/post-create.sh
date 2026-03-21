#!/bin/bash
set -e

echo "🚀 Setting up prisma-strong-migrations development environment..."

# Fix: git refuses to operate in directories owned by a different user.
# /workspaces/ is owned by root but we run as node, so we register an exception.
git config --global --add safe.directory /workspaces/prisma-strong-migrations

# Make git-secrets available as a git subcommand (git secrets).
# The pre-commit hook references /home/node/bin/git-secrets, so symlink the
# system-installed binary (/usr/local/bin/git-secrets) to that path.
mkdir -p /home/node/bin
ln -sf /usr/local/bin/git-secrets /home/node/bin/git-secrets

# Install dependencies if package.json exists.
# node_modules is a Docker named volume; ensure it is owned by the node user.
# Then retry once with cleared contents if the first attempt fails.
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    vp install || {
        echo "⚠️  vp install failed, retrying with clean node_modules..."
        # Cannot remove the mount point itself — clear contents instead.
        find node_modules -mindepth 1 -delete 2>/dev/null || true
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
