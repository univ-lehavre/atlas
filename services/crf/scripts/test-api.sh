#!/bin/bash
# Test de l'API CRF avec Schemathesis
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🧪 Running API tests with Schemathesis..."

# Cleanup function
cleanup() {
  if [ -n "$PRISM_PID" ]; then
    echo "🛑 Stopping Prism (PID: $PRISM_PID)..."
    kill $PRISM_PID 2>/dev/null || true
    wait $PRISM_PID 2>/dev/null || true
  fi
  if [ -n "$CRF_PID" ]; then
    echo "🛑 Stopping CRF server (PID: $CRF_PID)..."
    kill $CRF_PID 2>/dev/null || true
    wait $CRF_PID 2>/dev/null || true
  fi
}

trap cleanup EXIT

cd "$ROOT_DIR"

# Start Prism mock server
echo "🚀 Starting Prism mock server on port 8080..."
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

# Start CRF server (with rate limiting disabled for tests)
echo "🚀 Starting CRF server on port 3000..."
export REDCAP_API_URL=http://localhost:8080/api/
export REDCAP_API_TOKEN=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
export PORT=3000
export DISABLE_RATE_LIMIT=true
node dist/server/index.js &
CRF_PID=$!

# Wait for CRF to be ready
echo "⏳ Waiting for CRF server to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ CRF server is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ CRF server failed to start"
    exit 1
  fi
  sleep 0.5
done

# Run Schemathesis tests
echo "🧪 Running Schemathesis tests against http://localhost:3000/openapi.json..."
uvx schemathesis run http://localhost:3000/openapi.json --checks all --workers 1

echo "✅ API tests passed!"
