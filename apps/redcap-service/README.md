# @univ-lehavre/atlas-redcap-service

HTTP microservice exposing a REST API for REDCap, built with [Hono](https://hono.dev/).

## Installation

```bash
pnpm add @univ-lehavre/atlas-redcap-service
```

## Configuration

Create a `.env` file:

```env
PORT=3000
REDCAP_API_URL=https://redcap.example.com/api/
REDCAP_API_TOKEN=YOUR_32_CHAR_HEXADECIMAL_TOKEN
```

## Running

```bash
# Development
pnpm dev

# Production
pnpm build && pnpm start
```

## Docker

```bash
# Start with mock REDCap server
pnpm docker

# Build images
pnpm docker:build

# Stop containers
pnpm docker:down
```

## Testing

### With a real REDCap server

1. Configure `.env` with your REDCap credentials (see [Configuration](#configuration))

2. Create `.env.local` for the test script:

```env
baseUrl=http://localhost:3000
```

3. Run:

```bash
# Terminal 1: start the service
pnpm dev

# Terminal 2: run the test
pnpm test:redcap
```

### With Docker (mock server)

```bash
pnpm test:redcap:docker
```

### What the test checks

- Service connectivity
- REDCap server accessibility and latency
- API token validity
- Available instruments and fields
- Sample records

## API Endpoints

| Method | Endpoint                          | Description                             |
| ------ | --------------------------------- | --------------------------------------- |
| GET    | `/health`                         | Simple health check                     |
| GET    | `/health/detailed`                | Detailed health with instruments/fields |
| GET    | `/api/v1/records`                 | Export records                          |
| PUT    | `/api/v1/records`                 | Import (upsert) records                 |
| GET    | `/api/v1/records/:id/pdf`         | Download PDF                            |
| GET    | `/api/v1/records/:id/survey-link` | Get survey link                         |
| GET    | `/api/v1/users/by-email`          | Find user by email                      |

## Example

```bash
# Export records
curl "http://localhost:3000/api/v1/records?fields=record_id,name"

# Import (upsert) records
curl -X PUT "http://localhost:3000/api/v1/records" \
  -H "Content-Type: application/json" \
  -d '{"records": [{"record_id": "123", "name": "John"}]}'
```

## Documentation

See the [full documentation](https://univ-lehavre.github.io/atlas/api/redcap-service) for detailed API reference.

## License

MIT
