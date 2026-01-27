import type { RequestHandler } from './$types';
import { downloadSurveyPdf } from '$lib/server/services/surveys';
import { mapErrorToResponse } from '$lib/errors/mapper';
import { json } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, fetch, url }) => {
  try {
    const userId = locals.userId;
    if (!userId) {
      return json(
        { data: null, error: { code: 'unauthenticated', message: 'No authenticated user' } },
        { status: 401 }
      );
    }

    const recordId = url.searchParams.get('record_id');
    if (!recordId) {
      return json(
        { data: null, error: { code: 'invalid_request', message: 'Missing record_id parameter' } },
        { status: 400 }
      );
    }

    const pdfBuffer = await downloadSurveyPdf(recordId, { fetch });

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="formulaire_${recordId}.pdf"`,
      },
    });
  } catch (err) {
    return mapErrorToResponse(err);
  }
};
