import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from '../src/lib/types/api/zod-openapi';
import { User, ListUsersResponse, MeResponse } from '../src/lib/types/api/user';
import { ApiError } from '../src/lib/types/api/common';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const registry = new OpenAPIRegistry();
  const log = (msg: string) => console.log(`[openapi] ${msg}`);

  // Components
  log('registering components/schemas');
  registry.register('User', User);
  registry.register('ApiError', ApiError);
  registry.register('ListUsersResponse', ListUsersResponse);
  registry.register('MeResponse', MeResponse);
  log('registering security scheme cookieAuth');
  registry.registerComponent('securitySchemes', 'cookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: 'session',
    description:
      'Authentification via cookie de session (défini après /auth/login). Aucun Bearer Token requis.',
  });

  // Paths (initial examples)
  // Route /users supprimée (plus de liste publique d'utilisateurs)

  try {
    log('registerPath /me');
    registry.registerPath({
      method: 'get',
      path: '/me',
      tags: ['users'],
      summary: 'Informations de l’utilisateur courant',
      security: [{ cookieAuth: [] }],
      responses: {
        200: { description: 'OK', content: { 'application/json': { schema: MeResponse } } },
        401: {
          description: 'Non authentifié',
          content: { 'application/json': { schema: MeResponse } },
        },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /me', err);
    throw err;
  }

  // Graphs endpoints supprimés (API réduite)

  // Surveys
  const SurveyLinkResponse = z
    .object({ data: z.object({ url: z.string() }), error: ApiError.nullable().default(null) })
    .openapi('SurveyLinkResponse');
  const SurveyDownloadResponse = z
    .object({ data: z.unknown(), error: ApiError.nullable().default(null) })
    .openapi('SurveyDownloadResponse');

  try {
    log('registerPath /surveys/links');
    registry.registerPath({
      method: 'get',
      path: '/surveys/links',
      tags: ['surveys'],
      summary: 'Récupère un lien de questionnaire (auth requis)',
      security: [{ cookieAuth: [] }],
      responses: {
        200: { description: 'OK', content: { 'application/json': { schema: SurveyLinkResponse } } },
        401: {
          description: 'Non authentifié',
          content: { 'application/json': { schema: SurveyLinkResponse } },
        },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /surveys/links', err);
    throw err;
  }

  // Route /surveys/delete supprimée (API réduite)

  try {
    log('registerPath /surveys/download');
    registry.registerPath({
      method: 'get',
      path: '/surveys/download',
      tags: ['surveys'],
      summary: 'Télécharge les réponses du questionnaire (auth requis)',
      security: [{ cookieAuth: [] }],
      responses: {
        200: {
          description: 'OK',
          content: { 'application/json': { schema: SurveyDownloadResponse } },
        },
        401: {
          description: 'Non authentifié',
          content: { 'application/json': { schema: SurveyDownloadResponse } },
        },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /surveys/download', err);
    throw err;
  }

  // Ajout de /surveys/new
  const SurveyNewResponse = z
    .object({
      data: z
        .object({
          newRequestCreated: z.number().int().nonnegative().describe('Nombre de demandes créées'),
        })
        .nullable()
        .default(null),
      error: ApiError.nullable().default(null),
    })
    .openapi('SurveyNewResponse');

  // Ajout de /surveys/list
  const SurveyRequestItem = z
    .object({
      record_id: z
        .string()
        .describe('Identifiant de la demande')
        .openapi({ example: '0123456789abcdef01234567' }),
      created_at: z
        .string()
        .describe('Date de création (ISO)')
        .optional()
        .openapi({ example: '2025-12-17T12:34:56Z' }),
      form_timestamp: z.string().optional(),
      form_complete: z.union([z.string(), z.number()]).optional(),
      composante_timestamp: z.string().optional(),
      demandeur_composante_complete: z.union([z.string(), z.number()]).optional(),
      labo_timestamp: z.string().optional(),
      labo_complete: z.union([z.string(), z.number()]).optional(),
      encadrant_timestamp: z.string().optional(),
      encadrant_complete: z.union([z.string(), z.number()]).optional(),
      validation_finale_timestamp: z.string().optional(),
      validation_finale_complete: z.union([z.string(), z.number()]).optional(),
    })
    .passthrough()
    .openapi('SurveyRequestItem');

  const SurveyListResponse = z
    .object({
      data: z.array(SurveyRequestItem).nullable().default(null),
      error: ApiError.nullable().default(null),
    })
    .openapi('SurveyListResponse');

  try {
    log('registerPath /surveys/new (POST)');
    registry.registerPath({
      method: 'post',
      path: '/surveys/new',
      tags: ['surveys'],
      summary: 'Crée une nouvelle demande (auth requis)',
      operationId: 'surveys_new',
      security: [{ cookieAuth: [] }],
      responses: {
        200: { description: 'OK', content: { 'application/json': { schema: SurveyNewResponse } } },
        401: {
          description: 'Non authentifié',
          content: { 'application/json': { schema: SurveyNewResponse } },
        },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /surveys/new (POST)', err);
    throw err;
  }

  try {
    log('registerPath /surveys/new (GET)');
    registry.registerPath({
      method: 'get',
      path: '/surveys/new',
      tags: ['surveys'],
      summary: 'Méthode non autorisée - utiliser POST',
      operationId: 'surveys_new_get_not_allowed',
      responses: {
        405: {
          description: 'Méthode non autorisée',
          content: { 'application/json': { schema: SurveyNewResponse } },
        },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /surveys/new (GET)', err);
    throw err;
  }

  try {
    log('registerPath /surveys/list (POST)');
    registry.registerPath({
      method: 'post',
      path: '/surveys/list',
      tags: ['surveys'],
      summary: 'Liste les demandes de l’utilisateur (auth requis)',
      operationId: 'surveys_list',
      security: [{ cookieAuth: [] }],
      responses: {
        200: { description: 'OK', content: { 'application/json': { schema: SurveyListResponse } } },
        401: {
          description: 'Non authentifié',
          content: { 'application/json': { schema: SurveyListResponse } },
        },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /surveys/list (POST)', err);
    throw err;
  }

  try {
    log('registerPath /surveys/list (GET)');
    registry.registerPath({
      method: 'get',
      path: '/surveys/list',
      tags: ['surveys'],
      summary: 'Méthode non autorisée - utiliser POST',
      operationId: 'surveys_list_get_not_allowed',
      responses: {
        405: {
          description: 'Méthode non autorisée',
          content: { 'application/json': { schema: SurveyListResponse } },
        },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /surveys/list (GET)', err);
    throw err;
  }

  // Auth related responses
  const LogoutResponse = z
    .object({
      data: z.object({ loggedOut: z.boolean() }),
      error: ApiError.nullable().default(null),
    })
    .strict()
    .openapi('LogoutResponse');
  registry.register('LogoutResponse', LogoutResponse);
  const SignupResponse = z
    .object({
      data: z.object({ signedUp: z.boolean(), createdAt: z.string().describe('ISO timestamp') }),
      error: ApiError.nullable().default(null),
    })
    .strict()
    .openapi('SignupResponse');
  registry.register('SignupResponse', SignupResponse);
  // Réponses liées à la suppression de compte supprimées (API réduite)

  // Signup request (JSON)
  const SignupRequest = z
    .object({
      email: z
        .string()
        .email()
        .describe("Adresse email de l'utilisateur")
        .openapi({ example: 'alice@inserm.fr' }),
    })
    .strict()
    .openapi('SignupRequest', { example: { email: 'alice@inserm.fr' } });

  // Register the SignupRequest schema into components/schemas so we can reference it.
  registry.register('SignupRequest', SignupRequest);

  // Login request: expect JSON body { userId, secret }
  const LoginRequest = z
    .object({
      userId: z
        .string()
        .describe('Appwrite user id')
        .openapi({ example: '0123456789abcdef01234567' }),
      secret: z
        .string()
        .describe('Appwrite session secret')
        .openapi({ example: 'abcdef0123456789abcdef0123456789' }),
    })
    .strict()
    .openapi('LoginRequest', {
      example: { userId: '0123456789abcdef01234567', secret: 'abcdef0123456789abcdef0123456789' },
    });

  registry.register('LoginRequest', LoginRequest);

  // Register a requestBody component that references the SignupRequest schema.
  registry.registerComponent('requestBodies', 'SignupForm', {
    description: "Formulaire d'inscription",
    required: true,
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/SignupRequest' },
        examples: {
          ExempleValide: { value: { email: 'alice@inserm.fr' } },
          DomaineRefuse: { value: { email: 'alice@gmail.com' } },
        },
      },
    },
  });

  // Login response: simple loggedIn flag (route handles session cookie)
  const LoginResponse = z
    .object({ data: z.object({ loggedIn: z.boolean() }), error: ApiError.nullable().default(null) })
    .strict()
    .openapi('LoginResponse');

  registry.register('LoginResponse', LoginResponse);

  // Register common ApiError examples for API documentation
  registry.registerComponent('examples', 'ValidationError', {
    summary: 'Validation error example',
    value: {
      data: null,
      error: {
        code: 'validation_error',
        message: 'Login failed',
        cause: 'Missing userId or secret',
      },
    },
  });
  registry.registerComponent('examples', 'InvalidContentType', {
    summary: 'Invalid content type',
    value: {
      data: null,
      error: { code: 'invalid_content_type', message: 'Content-Type must be application/json' },
    },
  });
  registry.registerComponent('examples', 'InvalidBody', {
    summary: 'Invalid JSON body',
    value: {
      data: null,
      error: { code: 'invalid_body', message: 'Request body must be valid JSON' },
    },
  });
  registry.registerComponent('examples', 'Unauthorized', {
    summary: 'Unauthorized example',
    value: {
      data: null,
      error: { code: 'unauthorized', message: 'Invalid credentials or internal error' },
    },
  });
  registry.registerComponent('examples', 'InternalError', {
    summary: 'Internal server error',
    value: { data: null, error: { code: 'internal_error', message: 'Unexpected error' } },
  });
  registry.registerComponent('examples', 'InvalidEmail', {
    summary: 'Invalid email',
    value: {
      data: null,
      error: {
        code: 'invalid_email',
        message: 'Registration not possible',
        cause: 'Invalid email format',
      },
    },
  });
  registry.registerComponent('examples', 'NotInAlliance', {
    summary: 'Not in alliance',
    value: {
      data: null,
      error: {
        code: 'not_in_alliance',
        message: 'Registration not possible',
        cause: 'Email not part of alliance',
      },
    },
  });

  // Reusable response components for auth endpoints
  registry.registerComponent('responses', 'LoginValidationResponse', {
    description: 'Validation error for login',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/LoginResponse' },
        examples: { ValidationError: { $ref: '#/components/examples/ValidationError' } },
      },
    },
  });

  registry.registerComponent('responses', 'LoginInvalidContentTypeResponse', {
    description: 'Invalid content type for login',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/LoginResponse' },
        examples: { InvalidContentType: { $ref: '#/components/examples/InvalidContentType' } },
      },
    },
  });

  registry.registerComponent('responses', 'LoginInvalidBodyResponse', {
    description: 'Invalid JSON body for login',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/LoginResponse' },
        examples: { InvalidBody: { $ref: '#/components/examples/InvalidBody' } },
      },
    },
  });

  registry.registerComponent('responses', 'LoginUnauthorizedResponse', {
    description: 'Unauthorized response for login',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/LoginResponse' },
        examples: { Unauthorized: { $ref: '#/components/examples/Unauthorized' } },
      },
    },
  });

  registry.registerComponent('responses', 'SignupValidationResponse', {
    description: 'Validation errors for signup',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/SignupResponse' },
        examples: {
          InvalidEmail: { $ref: '#/components/examples/InvalidEmail' },
          NotInAlliance: { $ref: '#/components/examples/NotInAlliance' },
        },
      },
    },
  });

  registry.registerComponent('responses', 'InternalErrorResponse', {
    description: 'Internal server error',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/LoginResponse' },
        examples: { InternalError: { $ref: '#/components/examples/InternalError' } },
      },
    },
  });

  // Composant de réponse Delete supprimé

  try {
    log('registerPath /auth/logout');
    registry.registerPath({
      method: 'post',
      path: '/auth/logout',
      tags: ['auth'],
      summary: 'Déconnexion (auth requis)',
      security: [{ cookieAuth: [] }],
      responses: {
        200: {
          description: 'Déconnecté',
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/LogoutResponse' } },
          },
        },
        401: { $ref: '#/components/responses/LoginValidationResponse' },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /auth/logout', err);
    throw err;
  }

  try {
    log('registerPath /auth/login');
    registry.registerPath({
      method: 'post',
      path: '/auth/login',
      tags: ['auth'],
      summary: 'Login via Appwrite credentials',
      operationId: 'auth_login',
      request: {
        body: {
          content: {
            'application/json': {
              schema: LoginRequest,
              examples: {
                ExempleValide: {
                  value: {
                    userId: '0123456789abcdef01234567',
                    secret: 'abcdef0123456789abcdef0123456789',
                  },
                },
                MauvaisFormat: { value: { userId: 'user-1', secret: 'not-hex' } },
              },
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: 'Connecté',
          content: { 'application/json': { schema: LoginResponse } },
        },
        400: { $ref: '#/components/responses/LoginValidationResponse' },
        401: { $ref: '#/components/responses/LoginUnauthorizedResponse' },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /auth/login', err);
    throw err;
  }

  try {
    log('registerPath /auth/signup');
    registry.registerPath({
      method: 'post',
      path: '/auth/signup',
      tags: ['auth'],
      summary: 'Inscription (Magic URL token)',
      operationId: 'auth_signup',
      request: {
        body: {
          content: {
            'application/json': {
              schema: SignupRequest,
              examples: {
                ExempleValide: { value: { email: 'alice@inserm.fr' } },
                EmailInvalide: { value: { email: 'alice@@inserm' } },
              },
            },
          },
          required: true,
        },
      },
      responses: {
        200: { description: 'OK', content: { 'application/json': { schema: SignupResponse } } },
        400: { $ref: '#/components/responses/SignupValidationResponse' },
      },
    });
  } catch (err) {
    console.error('[openapi] error registering /auth/signup', err);
    throw err;
  }

  // Endpoint /auth/delete supprimé (API réduite)

  // Health endpoints supprimés (issue #81)

  const generator = new OpenApiGeneratorV31(registry.definitions);

  const doc = generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'ECRIN API',
      version: '1.0.0',
      description: 'Spécification initiale des endpoints versionnés /api/v1',
    },
    servers: [{ url: '/api/v1' }],
    tags: [
      { name: 'users', description: 'Gestion des utilisateurs' },
      { name: 'surveys', description: 'Gestion des questionnaires' },
      { name: 'auth', description: 'Authentification & session' },
    ],
  });

  const outDir = path.resolve(__dirname, '../static/api');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'openapi.json'), JSON.stringify(doc, null, 2), 'utf8');
  console.log(`OpenAPI écrit dans ${path.join(outDir, 'openapi.json')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
