import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

// Initialise l'extension OpenAPI pour Zod sans utiliser 'any'
extendZodWithOpenApi(z as unknown as typeof z);

export { z };
