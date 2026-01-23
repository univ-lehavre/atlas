/**
 * Mock REDCap API server for local testing
 *
 * This mock server implements all REDCap API endpoints used by atlas
 * with branded type validation to ensure consistency with redcap-api package.
 */
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import {
  RecordId,
  InstrumentName,
  type RedcapProjectInfo,
  type RedcapInstrument,
  type RedcapField,
  type RedcapExportFieldName,
  PositiveInt,
  NonEmptyString,
  IsoTimestamp,
  BooleanFlag,
} from '@univ-lehavre/atlas-redcap-api';

const app = new Hono();

app.use('*', logger());

// ============================================================================
// Sample Data
// ============================================================================

const mockProjectInfo: RedcapProjectInfo = {
  project_id: PositiveInt(1),
  project_title: NonEmptyString('Mock REDCap Project'),
  creation_time: IsoTimestamp('2024-01-01 00:00:00'),
  in_production: BooleanFlag(1),
  record_autonumbering_enabled: BooleanFlag(0),
};

const mockInstruments: readonly RedcapInstrument[] = [
  {
    instrument_name: InstrumentName('demographics'),
    instrument_label: NonEmptyString('Demographics Form'),
  },
  {
    instrument_name: InstrumentName('consent_form'),
    instrument_label: NonEmptyString('Consent Form'),
  },
];

const mockFields: readonly RedcapField[] = [
  {
    field_name: NonEmptyString('record_id'),
    form_name: InstrumentName('demographics'),
    field_type: 'text',
    field_label: 'Record ID',
    select_choices_or_calculations: '',
    field_note: '',
    text_validation_type_or_show_slider_number: '',
    text_validation_min: '',
    text_validation_max: '',
    identifier: '',
    branching_logic: '',
    required_field: 'y',
    custom_alignment: '',
    question_number: '',
    matrix_group_name: '',
    matrix_ranking: '',
    field_annotation: '',
  },
  {
    field_name: NonEmptyString('userid'),
    form_name: InstrumentName('demographics'),
    field_type: 'text',
    field_label: 'User ID',
    select_choices_or_calculations: '',
    field_note: '',
    text_validation_type_or_show_slider_number: '',
    text_validation_min: '',
    text_validation_max: '',
    identifier: 'y',
    branching_logic: '',
    required_field: 'y',
    custom_alignment: '',
    question_number: '',
    matrix_group_name: '',
    matrix_ranking: '',
    field_annotation: '',
  },
  {
    field_name: NonEmptyString('name'),
    form_name: InstrumentName('demographics'),
    field_type: 'text',
    field_label: 'Full Name',
    select_choices_or_calculations: '',
    field_note: '',
    text_validation_type_or_show_slider_number: '',
    text_validation_min: '',
    text_validation_max: '',
    identifier: 'y',
    branching_logic: '',
    required_field: 'y',
    custom_alignment: '',
    question_number: '',
    matrix_group_name: '',
    matrix_ranking: '',
    field_annotation: '',
  },
  {
    field_name: NonEmptyString('email'),
    form_name: InstrumentName('demographics'),
    field_type: 'text',
    field_label: 'Email Address',
    select_choices_or_calculations: '',
    field_note: '',
    text_validation_type_or_show_slider_number: 'email',
    text_validation_min: '',
    text_validation_max: '',
    identifier: 'y',
    branching_logic: '',
    required_field: 'y',
    custom_alignment: '',
    question_number: '',
    matrix_group_name: '',
    matrix_ranking: '',
    field_annotation: '',
  },
  {
    field_name: NonEmptyString('status'),
    form_name: InstrumentName('demographics'),
    field_type: 'radio',
    field_label: 'Status',
    select_choices_or_calculations: '0, Inactive | 1, Active',
    field_note: '',
    text_validation_type_or_show_slider_number: '',
    text_validation_min: '',
    text_validation_max: '',
    identifier: '',
    branching_logic: '',
    required_field: 'y',
    custom_alignment: '',
    question_number: '',
    matrix_group_name: '',
    matrix_ranking: '',
    field_annotation: '',
  },
];

const mockExportFieldNames: readonly RedcapExportFieldName[] = [
  {
    original_field_name: 'record_id',
    choice_value: '',
    export_field_name: 'record_id',
  },
  {
    original_field_name: 'userid',
    choice_value: '',
    export_field_name: 'userid',
  },
  {
    original_field_name: 'name',
    choice_value: '',
    export_field_name: 'name',
  },
  {
    original_field_name: 'email',
    choice_value: '',
    export_field_name: 'email',
  },
  {
    original_field_name: 'status',
    choice_value: '',
    export_field_name: 'status',
  },
];

const mockRecords = [
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

// ============================================================================
// REDCap API endpoint (POST only, as per REDCap spec)
// ============================================================================

app.post('/api/', async (c) => {
  const body = await c.req.parseBody();
  const token = body['token'];
  const content = body['content'];

  // Validate token (must be 32 hex characters)
  if (typeof token !== 'string' || token.length !== 32 || !/^[A-F0-9]{32}$/.test(token)) {
    return c.json({ error: 'Invalid token: must be 32 uppercase hex characters' }, 400);
  }

  // Handle different content types
  switch (content) {
    case 'version': {
      // Return version as plain text (with quotes, as REDCap does)
      return c.text('"14.0.0"');
    }

    case 'project': {
      return c.json(mockProjectInfo);
    }

    case 'instrument': {
      return c.json(mockInstruments);
    }

    case 'metadata': {
      return c.json(mockFields);
    }

    case 'exportFieldNames': {
      return c.json(mockExportFieldNames);
    }

    case 'record': {
      const action = body['action'];

      if (action === 'export') {
        // Export records
        let result: Array<Record<string, string>> = [...mockRecords];

        // Filter by filterLogic (simple email matching)
        const filterLogic = body['filterLogic'];
        if (typeof filterLogic === 'string' && filterLogic !== '') {
          const emailMatch = filterLogic.match(/\[email\]\s*=\s*"([^"]+)"/);
          if (emailMatch) {
            const searchEmail = emailMatch[1];
            result = result.filter((r) => r['email'] === searchEmail);
          }
        }

        // Filter by fields if specified
        const fields = body['fields'];
        if (typeof fields === 'string' && fields !== '') {
          const fieldList = fields.split(',');
          result = result.map((r) =>
            Object.fromEntries(Object.entries(r).filter(([key]) => fieldList.includes(key)))
          );
        }

        return c.json(result);
      }

      if (action === 'import') {
        // Import records
        const data = typeof body['data'] === 'string' ? JSON.parse(body['data']) : [];
        return c.json({ count: Array.isArray(data) ? data.length : 0 });
      }

      return c.json({ error: 'Invalid action for content=record' }, 400);
    }

    case 'surveyLink': {
      const recordIdRaw = body['record'];
      const instrumentRaw = body['instrument'];

      if (typeof recordIdRaw !== 'string' || typeof instrumentRaw !== 'string') {
        return c.json({ error: 'Missing record or instrument' }, 400);
      }

      // Validate branded types
      try {
        RecordId(recordIdRaw);
        InstrumentName(instrumentRaw);
      } catch (error) {
        return c.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Invalid record ID or instrument name format',
          },
          400
        );
      }

      return c.text(
        `https://mock-redcap.local/surveys/?s=MOCK${recordIdRaw.slice(0, 8).toUpperCase()}`
      );
    }

    case 'pdf': {
      const recordIdRaw = body['record'];
      const instrumentRaw = body['instrument'];

      if (typeof recordIdRaw !== 'string') {
        return c.json({ error: 'Missing record' }, 400);
      }

      // Validate branded types
      try {
        RecordId(recordIdRaw);
        if (typeof instrumentRaw === 'string' && instrumentRaw !== '') {
          InstrumentName(instrumentRaw);
        }
      } catch (error) {
        return c.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Invalid record ID or instrument name format',
          },
          400
        );
      }

      // Return a minimal valid PDF
      const instrumentName = typeof instrumentRaw === 'string' ? instrumentRaw : 'form';
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
BT /F1 12 Tf 100 700 Td (Mock PDF for ${recordIdRaw}) Tj ET
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
          'Content-Disposition': `attachment; filename="${recordIdRaw}_${instrumentName}.pdf"`,
        },
      });
    }

    default:
      return c.json({ error: `Unknown content type: ${String(content)}` }, 400);
  }
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok' }));

const port = Number(process.env['PORT']) || 8080;

console.log(`Mock REDCap server running on http://localhost:${port}`);
console.log(`API endpoint: http://localhost:${port}/api/`);
console.log(`Valid token: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA`);

serve({ fetch: app.fetch, port });
