import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'ECRIN API',
    version: '1.0.0',
    description:
      'API pour la plateforme ECRIN - gestion des utilisateurs, questionnaires et graphes',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  tags: [
    { name: 'auth', description: 'Authentification & session' },
    { name: 'users', description: 'Gestion des utilisateurs' },
    { name: 'account', description: 'Gestion du compte' },
    { name: 'surveys', description: 'Gestion des questionnaires' },
    { name: 'graphs', description: 'Génération des graphes' },
  ],
  paths: {
    '/auth/signup': {
      post: {
        tags: ['auth'],
        summary: 'Inscription par email',
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: { email: { type: 'string', format: 'email' } },
                required: ['email'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Magic link envoyé par email' },
          '400': { description: 'Email invalide ou non autorisé' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['auth'],
        summary: 'Connexion via magic link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { userId: { type: 'string' }, secret: { type: 'string' } },
                required: ['userId', 'secret'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Session créée' },
          '400': { description: 'Paramètres invalides' },
          '401': { description: 'Identifiants invalides' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['auth'],
        summary: 'Déconnexion',
        responses: { '200': { description: 'Session supprimée' } },
      },
    },
    '/auth/delete': {
      delete: {
        tags: ['auth'],
        summary: 'Suppression du compte utilisateur',
        responses: {
          '200': { description: 'Compte supprimé' },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/me': {
      get: {
        tags: ['users'],
        summary: "Récupérer le profil de l'utilisateur connecté",
        responses: {
          '200': {
            description: 'Profil utilisateur',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UserResponse' } },
            },
          },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/users': {
      get: {
        tags: ['users'],
        summary: 'Lister les utilisateurs',
        responses: {
          '200': {
            description: 'Liste des utilisateurs',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/UsersListResponse' } },
            },
          },
        },
      },
    },
    '/account/push': {
      get: {
        tags: ['account'],
        summary: 'Pousser le compte vers REDCap',
        responses: {
          '200': { description: 'Compte poussé' },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/account/pushed': {
      get: {
        tags: ['account'],
        summary: 'Vérifier si le compte a été poussé',
        responses: {
          '200': {
            description: 'Statut du compte',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/AccountPushedResponse' },
              },
            },
          },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/surveys/url': {
      get: {
        tags: ['surveys'],
        summary: "Obtenir l'URL du questionnaire",
        responses: {
          '200': {
            description: 'URL du questionnaire',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      properties: { url: { type: 'string', format: 'uri' } },
                    },
                    error: { type: 'object', nullable: true },
                  },
                },
              },
            },
          },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/surveys/download': {
      get: {
        tags: ['surveys'],
        summary: 'Télécharger les données du questionnaire',
        responses: {
          '200': { description: 'Données du questionnaire' },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/surveys/delete': {
      get: {
        tags: ['surveys'],
        summary: 'Supprimer les données du questionnaire',
        responses: {
          '200': { description: 'Données supprimées' },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/graphs': {
      get: {
        tags: ['graphs'],
        summary: "Obtenir le graphe de l'utilisateur",
        responses: {
          '200': { description: 'Données du graphe' },
          '401': { description: 'Non authentifié' },
        },
      },
    },
    '/graphs/global': {
      get: {
        tags: ['graphs'],
        summary: 'Obtenir le graphe global',
        responses: { '200': { description: 'Données du graphe global' } },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email', nullable: true },
          labels: { type: 'array', items: { type: 'string' } },
        },
        required: ['id', 'labels'],
      },
      ApiError: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          cause: { type: 'string' },
        },
        required: ['code', 'message'],
      },
      UserResponse: {
        type: 'object',
        properties: {
          data: { $ref: '#/components/schemas/User' },
          error: { $ref: '#/components/schemas/ApiError', nullable: true },
        },
      },
      UsersListResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: { id: { type: 'string' }, name: { type: 'string' } },
            },
          },
          error: { $ref: '#/components/schemas/ApiError', nullable: true },
        },
      },
      AccountPushedResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              hasPushedID: { type: 'boolean' },
              hasPushedEmail: { type: 'boolean' },
              hasPushedAccount: { type: 'boolean' },
              isActive: { type: 'boolean' },
            },
          },
          error: { $ref: '#/components/schemas/ApiError', nullable: true },
        },
      },
    },
  },
};

export const GET: RequestHandler = async () => {
  return json(openApiSpec, {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
};
