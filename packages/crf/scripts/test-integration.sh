#!/bin/bash
# Test d'intégration du client REDCap contre Prism (mock)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧪 Running integration tests against Prism mock..."

# Cleanup function
cleanup() {
  if [ -n "$PRISM_PID" ]; then
    echo "🛑 Stopping Prism (PID: $PRISM_PID)..."
    kill $PRISM_PID 2>/dev/null || true
    wait $PRISM_PID 2>/dev/null || true
  fi
}

trap cleanup EXIT

# Start Prism mock server
echo "🚀 Starting Prism mock server..."
cd "$ROOT_DIR"
npx prism mock specs/redcap.yaml --port 8080 &
PRISM_PID=$!

# Wait for Prism to be ready
echo "⏳ Waiting for Prism to start..."
for i in {1..30}; do
  if curl -s http://localhost:8080/api/ -d "token=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA&content=version" > /dev/null 2>&1; then
    echo "✅ Prism is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Prism failed to start"
    exit 1
  fi
  sleep 0.5
done

# Run integration tests
echo "🧪 Running integration tests..."
export REDCAP_API_URL=http://localhost:8080/api/
export REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

# Run CLI tests using node directly
node "$ROOT_DIR/dist/bin/crf-redcap.js" test --json

echo "✅ Integration tests passed!"
