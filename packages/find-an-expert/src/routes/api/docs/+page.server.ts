import type { PageServerLoad } from './$types';
import openapi from './openapi.json';

/**
 * Loads the OpenAPI specification for the Swagger UI.
 */
export const load: PageServerLoad = async () => {
  return {
    spec: openapi,
  };
};
