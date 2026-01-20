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

## API Endpoints

| Method | Endpoint                          | Description        |
| ------ | --------------------------------- | ------------------ |
| GET    | `/health`                         | Health check       |
| GET    | `/api/v1/records`                 | Export records     |
| POST   | `/api/v1/records`                 | Import records     |
| GET    | `/api/v1/records/:id/pdf`         | Download PDF       |
| GET    | `/api/v1/records/:id/survey-link` | Get survey link    |
| GET    | `/api/v1/users/by-email`          | Find user by email |

## Example

```bash
# Export records
curl "http://localhost:3000/api/v1/records?fields=record_id,name"

# Import records
curl -X POST "http://localhost:3000/api/v1/records" \
  -H "Content-Type: application/json" \
  -d '{"records": [{"record_id": "123", "name": "John"}]}'
```

## Documentation

See the [full documentation](https://univ-lehavre.github.io/atlas/api/redcap-service) for detailed API reference.

## License

MIT
