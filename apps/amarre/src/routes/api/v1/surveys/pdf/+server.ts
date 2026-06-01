import type { RequestHandler } from './$types';
import { withHandler } from '@univ-lehavre/atlas-sveltekit-handler';
import { ApplicationError } from '@univ-lehavre/atlas-errors';
import { downloadSurveyPdf } from '$lib/server/services/surveys';

export const GET: RequestHandler = withHandler(async ({ locals, fetch, url }) => {
  const userId = locals.userId;
  if (!userId) throw new ApplicationError('unauthenticated', 401, 'No authenticated user');

  const recordId = url.searchParams.get('record_id');
  if (!recordId) throw new ApplicationError('invalid_request', 400, 'Missing record_id parameter');

  const pdfBuffer = await downloadSurveyPdf(recordId, { fetch });

  return new Response(pdfBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="formulaire_${recordId}.pdf"`,
    },
  });
});
