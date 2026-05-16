# CodeGuard API Documentation

## Base URL
```
http://localhost:3000/api
```

## Endpoints

### 1. Start Security Audit

**Endpoint:** `POST /api/audit`

**Description:** Initiates a security audit for a GitHub repository.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/username/repository"
}
```

**Request Parameters:**
- `repoUrl` (string, required): Valid GitHub repository URL

**Response (202 Accepted):**
```json
{
  "success": true,
  "auditId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Audit started successfully",
  "status": "processing"
}
```

**Error Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid GitHub URL format"
}
```

**Error Response (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Failed to clone repository",
  "details": "Error message details"
}
```

---

### 2. Get Audit Status

**Endpoint:** `GET /api/audit/:id`

**Description:** Retrieves the status and results of a security audit.

**URL Parameters:**
- `id` (string, required): Audit ID returned from POST /api/audit

**Response (200 OK) - Processing:**
```json
{
  "success": true,
  "auditId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "processing",
  "progress": 45,
  "message": "Analyzing repository files..."
}
```

**Response (200 OK) - Completed:**
```json
{
  "success": true,
  "auditId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "repoUrl": "https://github.com/username/repository",
  "timestamp": "2026-05-16T20:30:00.000Z",
  "summary": {
    "totalIssues": 15,
    "critical": 3,
    "high": 5,
    "medium": 4,
    "low": 3
  },
  "findings": [
    {
      "id": "finding-001",
      "type": "hardcoded_secret",
      "severity": "critical",
      "title": "Hardcoded API Key Detected",
      "description": "AWS API key found in configuration file",
      "file": "config/database.js",
      "line": 12,
      "code": "const apiKey = 'AKIAIOSFODNN7EXAMPLE';",
      "recommendation": "Move API keys to environment variables and use .env file"
    },
    {
      "id": "finding-002",
      "type": "sql_injection",
      "severity": "high",
      "title": "SQL Injection Vulnerability",
      "description": "User input directly concatenated in SQL query",
      "file": "routes/users.js",
      "line": 45,
      "code": "const query = 'SELECT * FROM users WHERE id = ' + userId;",
      "recommendation": "Use parameterized queries or prepared statements"
    }
  ],
  "reports": {
    "json": "/api/reports/550e8400-e29b-41d4-a716-446655440000/json",
    "html": "/api/reports/550e8400-e29b-41d4-a716-446655440000/html"
  }
}
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Audit not found"
}
```

---

### 3. Download Report

**Endpoint:** `GET /api/reports/:id/:format`

**Description:** Downloads the audit report in specified format.

**URL Parameters:**
- `id` (string, required): Audit ID
- `format` (string, required): Report format (`json` or `html`)

**Response (200 OK):**
- For JSON: Returns JSON file with Content-Type: application/json
- For HTML: Returns HTML file with Content-Type: text/html

**Headers:**
```
Content-Disposition: attachment; filename="codeguard-report-{auditId}.{format}"
```

**Error Response (404 Not Found):**
```json
{
  "success": false,
  "error": "Report not found"
}
```

---

## Data Models

### Finding Object
```typescript
{
  id: string;              // Unique finding identifier
  type: string;            // Type of vulnerability
  severity: string;        // critical | high | medium | low
  title: string;           // Short description
  description: string;     // Detailed explanation
  file: string;            // File path relative to repo root
  line: number;            // Line number where issue found
  code: string;            // Code snippet showing the issue
  recommendation: string;  // How to fix the issue
}
```

### Vulnerability Types
- `hardcoded_secret` - API keys, passwords, tokens in code
- `sql_injection` - SQL injection vulnerabilities
- `missing_auth` - Unprotected routes/endpoints
- `exposed_route` - Sensitive endpoints without protection
- `missing_validation` - Missing input validation
- `xss_vulnerability` - Cross-site scripting risks

### Severity Levels
- `critical` - Immediate security risk, requires urgent fix
- `high` - Significant security concern, should be fixed soon
- `medium` - Moderate risk, should be addressed
- `low` - Minor issue, good practice to fix

---

## Rate Limiting

- Maximum 10 requests per minute per IP address
- Maximum 100 requests per hour per IP address

**Rate Limit Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
X-RateLimit-Reset: 1621180800
```

**Rate Limit Exceeded Response (429):**
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "retryAfter": 60
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - Server-side error |
| 503 | Service Unavailable - Server overloaded |

---

## Example Usage

### Using cURL

**Start an audit:**
```bash
curl -X POST http://localhost:3000/api/audit \
  -H "Content-Type: application/json" \
  -d '{"repoUrl": "https://github.com/username/repository"}'
```

**Check audit status:**
```bash
curl http://localhost:3000/api/audit/550e8400-e29b-41d4-a716-446655440000
```

**Download JSON report:**
```bash
curl -O http://localhost:3000/api/reports/550e8400-e29b-41d4-a716-446655440000/json
```

### Using JavaScript (Fetch API)

```javascript
// Start audit
const response = await fetch('http://localhost:3000/api/audit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    repoUrl: 'https://github.com/username/repository'
  })
});

const data = await response.json();
const auditId = data.auditId;

// Poll for results
const checkStatus = async () => {
  const statusResponse = await fetch(`http://localhost:3000/api/audit/${auditId}`);
  const statusData = await statusResponse.json();
  
  if (statusData.status === 'completed') {
    console.log('Audit complete!', statusData);
  } else {
    setTimeout(checkStatus, 2000); // Check again in 2 seconds
  }
};

checkStatus();
```

---

## Notes

- Repository cloning is limited to 100MB
- Analysis timeout is set to 5 minutes
- Temporary files are automatically cleaned up after analysis
- Reports are stored for 24 hours before automatic deletion