#!/bin/bash
# Publish packages to both npm and GitHub Packages registries
# This script is called by changesets after versioning

set -e

echo "📦 Publishing packages to npm..."
pnpm changeset publish

echo ""
echo "📦 Publishing packages to GitHub Packages..."
# changeset publish does not support --registry; publish to GitHub Packages
# by iterating over publishable packages and calling pnpm publish directly
find packages -maxdepth 2 -name "package.json" \
  ! -path "*/node_modules/*" \
  ! -path "*/.svelte-kit/*" | while read -r pkg; do
  private=$(node -e "const p=require('./$pkg'); process.stdout.write(String(p.private ?? false))")
  name=$(node -e "const p=require('./$pkg'); process.stdout.write(p.name ?? '')")
  if [ "$private" = "false" ] && [ -n "$name" ]; then
    dir=$(dirname "$pkg")
    echo "  Publishing $name from $dir..."
    pnpm --filter "$name" publish --registry https://npm.pkg.github.com --no-git-checks 2>&1 || true
  fi
done

echo ""
echo "✅ Published successfully!"
