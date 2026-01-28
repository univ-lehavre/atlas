#!/bin/bash
# Publish packages to both npm and GitHub Packages registries
# This script is called by changesets after versioning

set -e

echo "📦 Publishing packages to npm..."
pnpm changeset publish

echo ""
echo "📦 Publishing packages to GitHub Packages..."
pnpm changeset publish --registry https://npm.pkg.github.com

echo ""
echo "✅ Published to both registries successfully!"
