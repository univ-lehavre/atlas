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

| Variable           | Required | Default | Description                     |
| ------------------ | -------- | ------- | ------------------------------- |
| `PORT`             | No       | `3000`  | HTTP server port                |
| `REDCAP_API_URL`   | Yes      | -       | REDCap API URL                  |
| `REDCAP_API_TOKEN` | Yes      | -       | REDCap API token (32 hex chars) |

## Running

```bash
# Development
pnpm dev

# Production
pnpm build && pnpm start
```

## API Endpoints

Base URL: `http://localhost:3000/api/v1`

### Health Check

```http
GET /health
```

**Response:**

```json
{ "status": "ok" }
```

---

### Records

#### Export Records

```http
GET /api/v1/records
```

**Query Parameters:**

| Parameter     | Type   | Description                    |
| ------------- | ------ | ------------------------------ |
| `fields`      | string | Comma-separated list of fields |
| `forms`       | string | Comma-separated list of forms  |
| `filterLogic` | string | REDCap filter expression       |
| `rawOrLabel`  | string | `raw` or `label`               |

**Example:**

```bash
curl "http://localhost:3000/api/v1/records?fields=record_id,name&forms=enrollment"
```

**Response:**

```json
{
  "data": [
    { "record_id": "123", "name": "John Doe" },
    { "record_id": "124", "name": "Jane Doe" }
  ],
  "error": null
}
```

---

#### Import Records

```http
POST /api/v1/records
```

**Body:**

```json
{
  "records": [
    { "record_id": "123", "name": "John Doe" },
    { "record_id": "124", "name": "Jane Doe" }
  ],
  "overwriteBehavior": "normal"
}
```

| Field               | Type   | Required | Description             |
| ------------------- | ------ | -------- | ----------------------- |
| `records`           | array  | Yes      | Array of record objects |
| `overwriteBehavior` | string | No       | `normal` or `overwrite` |

**Response:**

```json
{
  "data": { "count": 2 },
  "error": null
}
```

---

#### Download PDF

```http
GET /api/v1/records/:recordId/pdf
```

**Path Parameters:**

| Parameter  | Description                         |
| ---------- | ----------------------------------- |
| `recordId` | Record ID (alphanumeric, 20+ chars) |

**Query Parameters:**

| Parameter    | Type   | Default | Description     |
| ------------ | ------ | ------- | --------------- |
| `instrument` | string | `form`  | Instrument name |

**Example:**

```bash
curl "http://localhost:3000/api/v1/records/abcdef0123456789abcd/pdf?instrument=enrollment_form" \
  --output record.pdf
```

**Response:** Binary PDF file

---

#### Get Survey Link

```http
GET /api/v1/records/:recordId/survey-link
```

**Path Parameters:**

| Parameter  | Description                         |
| ---------- | ----------------------------------- |
| `recordId` | Record ID (alphanumeric, 20+ chars) |

**Query Parameters:**

| Parameter    | Type   | Required | Description     |
| ------------ | ------ | -------- | --------------- |
| `instrument` | string | Yes      | Instrument name |

**Example:**

```bash
curl "http://localhost:3000/api/v1/records/abcdef0123456789abcd/survey-link?instrument=satisfaction_survey"
```

**Response:**

```json
{
  "data": { "url": "https://redcap.example.com/surveys/?s=ABCD1234" },
  "error": null
}
```

---

### Users

#### Find User by Email

```http
GET /api/v1/users/by-email
```

**Query Parameters:**

| Parameter | Type   | Required | Description   |
| --------- | ------ | -------- | ------------- |
| `email`   | string | Yes      | Email address |

**Example:**

```bash
curl "http://localhost:3000/api/v1/users/by-email?email=user@example.com"
```

**Response (found):**

```json
{
  "data": { "userId": "abcdef0123456789abcd" },
  "error": null
}
```

**Response (not found):**

```json
{
  "data": null,
  "error": { "code": "RedcapApiError", "message": "User not found" }
}
```

---

## Error Handling

All endpoints return a consistent error format:

```json
{
  "data": null,
  "error": {
    "code": "RedcapApiError",
    "message": "Error description"
  }
}
```

**Error Codes:**

| Code                 | HTTP Status | Description              |
| -------------------- | ----------- | ------------------------ |
| `RedcapHttpError`    | 502         | REDCap returned non-2xx  |
| `RedcapApiError`     | 400         | REDCap API error         |
| `RedcapNetworkError` | 502         | Network/connection error |
| `internal_error`     | 500         | Unexpected server error  |

## Validation

The service validates all inputs:

- **RecordId**: Alphanumeric string, minimum 20 characters
- **InstrumentName**: Lowercase letters with underscores
- **Email**: Valid email format

Invalid inputs return a 400 error with validation details.
