import z from 'zod';
import { makeResponseSchema } from './common';

export const surveyRequestItem = z
  .object({
    record_id: z
      .string()
      .describe('Identifiant de la demande')
      .openapi({ example: '0123456789abcdef01234567' }),
    created_at: z
      .string()
      .describe('Date de création (ISO)')
      .openapi({ example: '2025-12-17T12:34:56Z' }),
    demandeur_statut: z
      .string()
      .describe('Statut professionnel du demandeur (enseignant-chercheur, enseignant, autre)'),
    mobilite_type: z.string().describe('Type de mobilité (invitation entrante ou sortie)'),
    invite_nom: z.string().describe('Nom complet du chercheur invité'),
    mobilite_universite_eunicoast: z
      .string()
      .describe('Université de destination dans le réseau EUNICoast'),
    mobilite_universite_gu8: z.string().describe('Université de destination dans le réseau GU8'),
    mobilite_universite_autre: z
      .string()
      .describe("Nom de l'université de destination (hors réseaux)"),
    form_complete: z.string().describe('Complétude de la demande (ex: 0/1/2)'),
    avis_composante_position: z
      .string()
      .describe(
        "Position de la direction de composante (code d'avis sous forme de chaîne ; par exemple '3' pour un avis défavorable / rejet, d'autres valeurs pouvant représenter d'autres états comme accord ou en attente)"
      ),
    demandeur_composante_complete: z.string().describe('Complétude de la composante (ex: 0/1/2)'),
    avis_laboratoire_position: z
      .string()
      .describe(
        "Position de la direction du laboratoire (code d'avis sous forme de chaîne ; par exemple '3' pour un avis défavorable / rejet, d'autres valeurs pouvant représenter d'autres états comme accord ou en attente)"
      ),
    labo_complete: z.string().describe('Complétude du laboratoire (ex: 0/1/2)'),
    avis_encadrant_position: z
      .string()
      .describe(
        "Position de l'encadrant (code d'avis sous forme de chaîne ; par exemple '3' pour un avis défavorable / rejet, d'autres valeurs pouvant représenter d'autres états comme accord ou en attente)"
      ),
    encadrant_complete: z.string().describe("Complétude de l'encadrant (ex: 0/1/2)"),
    validation_finale_complete: z
      .string()
      .describe('Complétude de la validation finale (ex: 0/1/2)'),
    form: z.string().optional().describe('Lien vers le formulaire'),
    validation_finale: z.string().optional().describe('Lien vers la validation finale'),
  })
  .openapi('SurveyRequestItem');

export type SurveyRequestItem = z.infer<typeof surveyRequestItem>;

export const surveyRequestList = z.array(surveyRequestItem).openapi('SurveyRequestList');

export type SurveyRequestList = z.infer<typeof surveyRequestList>;

export const surveyListResponse =
  makeResponseSchema(surveyRequestList).openapi('SurveyListResponse');

export type SurveyListResponse = z.infer<typeof surveyListResponse>;
