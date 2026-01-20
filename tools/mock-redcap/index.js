import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());

// Sample data
const records = [
  {
    record_id: 'abcdef0123456789abcd',
    userid: 'abcdef0123456789abcd',
    name: 'John Doe',
    email: 'john.doe@example.com',
    status: '1',
  },
  {
    record_id: 'bcdef0123456789abcde',
    userid: 'bcdef0123456789abcde',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    status: '1',
  },
  {
    record_id: 'cdef0123456789abcdef',
    userid: 'cdef0123456789abcdef',
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    status: '0',
  },
];

// REDCap API endpoint (POST only, as per REDCap spec)
app.post('/api/', async (c) => {
  const body = await c.req.parseBody();
  const token = body.token;
  const content = body.content;

  // Validate token
  if (!token || token.length !== 32) {
    return c.json({ error: 'Invalid token' });
  }

  switch (content) {
    case 'record': {
      const action = body.action;

      if (action === 'export') {
        // Export records
        let result = [...records];

        // Filter by filterLogic (simple email matching)
        const filterLogic = body.filterLogic;
        if (filterLogic) {
          const emailMatch = filterLogic.match(/\[email\]\s*=\s*"([^"]+)"/);
          if (emailMatch) {
            const searchEmail = emailMatch[1];
            result = result.filter((r) => r.email === searchEmail);
          }
        }

        // Filter by fields if specified
        const fields = body.fields;
        if (fields) {
          const fieldList = fields.split(',');
          result = result.map((r) =>
            Object.fromEntries(Object.entries(r).filter(([key]) => fieldList.includes(key)))
          );
        }

        return c.json(result);
      }

      if (action === 'import') {
        // Import records
        const data = JSON.parse(body.data || '[]');
        return c.json({ count: data.length });
      }

      return c.json({ error: 'Invalid action' });
    }

    case 'surveyLink': {
      const recordId = body.record;
      const instrument = body.instrument;

      if (!recordId || !instrument) {
        return c.json({ error: 'Missing record or instrument' });
      }

      return c.text(
        `https://mock-redcap.local/surveys/?s=MOCK${recordId.slice(0, 8).toUpperCase()}`
      );
    }

    case 'pdf': {
      const recordId = body.record;
      const instrument = body.instrument;

      if (!recordId) {
        return c.json({ error: 'Missing record' });
      }

      // Return a minimal valid PDF
      const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 100 700 Td (Mock PDF for ${recordId}) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000206 00000 n
trailer
<< /Size 5 /Root 1 0 R >>
startxref
300
%%EOF`;

      return new Response(pdfContent, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${recordId}_${instrument || 'form'}.pdf"`,
        },
      });
    }

    default:
      return c.json({ error: `Unknown content type: ${content}` });
  }
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

const port = Number(process.env.PORT) || 8080;

console.log(`Mock REDCap server running on http://localhost:${port}`);
console.log(`API endpoint: http://localhost:${port}/api/`);
console.log(`Valid token: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);

serve({ fetch: app.fetch, port });
