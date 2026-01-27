/**
 * Authentication content - French.
 */

import { brand, commonLabels, pageTitle } from '$lib/content/core/brand';
import type { AuthContent } from '$lib/content/types';

/**
 * French authentication content.
 */
export const fr: AuthContent = {
  login: {
    title: pageTitle('Connexion'),
    description: `Connectez-vous à votre compte ${brand.ecrin} ${brand.appName}`,
    loading: {
      title: 'Connexion en cours...',
      message: 'Veuillez patienter pendant la vérification de vos identifiants.',
    },
    error: {
      title: 'Connexion échouée',
      message: 'Le lien de connexion est invalide ou a expiré.',
    },
    buttons: {
      retry: commonLabels.retry,
      home: commonLabels.home,
    },
  },
  form: {
    title: 'Connexion',
    description:
      'Entrez votre adresse email professionnelle pour recevoir un lien de connexion sécurisé.',
    emailLabel: 'Adresse email',
    emailPlaceholder: 'prenom.nom@universite.fr',
    emailHint: 'Seules les adresses email universitaires sont acceptées',
    submitButton: 'Envoyer le lien de connexion',
    submitting: commonLabels.submitting,
    error: {
      prefix: 'Erreur :',
      default: 'Une erreur est survenue',
    },
    success: {
      title: 'Email envoyé !',
      message: 'Un lien de connexion vous a été envoyé. Vérifiez votre boîte de réception.',
    },
    footer: 'En vous connectant, vous acceptez nos',
    termsLink: "conditions d'utilisation",
  },
  modal: {
    title: 'Authentification à votre compte',
    closeLabel: 'Fermer',
    description:
      "Pour accéder à mes demandes, je vais m'authentifier. Cette action déposera un cookie nécessaire au bon fonctionnement du site dans votre navigateur. Pour le supprimer après l'authentification, il suffira que je me déconnecte.",
    emailLabel: 'Courriel',
    emailPlaceholder: 'prenom.nom@univ-lehavre.fr',
    emailHint: 'Entrez votre adresse email universitaire',
    submitButton: "S'authentifier",
    submitting: commonLabels.submitting,
    error: {
      prefix: 'Erreur :',
      default: 'Une erreur est survenue',
    },
    closeAlert: "Fermer l'alerte",
    success:
      "Un courriel d'authentification vous a été envoyé. Veuillez vérifier votre boîte de réception.",
    footer: "En vous authentifiant, vous acceptez nos conditions d'utilisation.",
  },
  errorCodes: {
    invalid_email: "L'adresse email n'est pas valide ou n'appartient pas à un domaine autorisé.",
    magicurl_login_validation_error: 'Les paramètres du lien de connexion sont invalides.',
    signup_failed: "L'inscription a échoué.",
    login_failed: 'La connexion a échoué.',
    invalid_magic_link: 'Le lien de connexion est invalide ou a expiré.',
    unexpected_error: 'Une erreur inattendue est survenue.',
  },
};
