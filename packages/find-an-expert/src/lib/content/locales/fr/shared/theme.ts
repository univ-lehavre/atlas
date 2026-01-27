/**
 * Theme content - French.
 * Content for theme customization page and theme preferences card.
 */

import { brand, commonLabels, pageTitle } from '$lib/content/core/brand';
import type { ThemeContent } from '$lib/content/types';

/**
 * French theme content.
 */
export const fr: ThemeContent = {
  card: {
    title: 'Préférences de thème',
    palette: 'Palette',
    font: 'Police',
    mode: 'Mode',
    light: 'Clair',
    dark: 'Sombre',
    changeTheme: 'Changer le thème',
  },
  page: {
    meta: {
      title: pageTitle('Thème'),
      description: `Personnalisation du thème et système de design ${brand.ecrin} ${brand.appName}`,
    },
    selectorBar: {
      title: 'Personnalisation du thème',
      fontLabels: {
        heading: commonLabels.heading,
        body: commonLabels.body,
        mono: commonLabels.mono,
      },
      resetButton: 'Réinitialiser',
      resetFeedback: 'Aléatoire !',
      setButton: 'Fixer',
      setFeedback: 'Fixé !',
    },
    hero: {
      title: 'Personnalisation du thème',
      description:
        "Personnalisez les couleurs et les polices pour prévisualiser l'apparence de votre application. Sélectionnez une palette et un appairage de polices pour voir les changements appliqués.",
    },
    currentSettings: {
      title: 'Paramètres actuels',
      paletteTitle: 'Palette',
      fontTitle: 'Polices',
      fontLabels: {
        heading: commonLabels.heading,
        body: commonLabels.body,
        mono: commonLabels.mono,
      },
      fontDemo: {
        headingText: 'Le vif zéphyr jubile',
        bodyText:
          'Le vif zéphyr jubile sur les kumquats du clown gracieux. Ce texte démontre la police du corps.',
        monoText: 'const exemple = "code";',
      },
      colorLabels: {
        primary: commonLabels.primary,
        accent: commonLabels.accent,
        neutral: 'Neutre',
        success: commonLabels.success,
        warning: commonLabels.warning,
        error: commonLabels.error,
      },
    },
    colorScales: {
      title: 'Échelles de couleurs',
      scaleHeader: 'Échelle',
      colorNames: {
        primary: commonLabels.primary,
        accent: commonLabels.accent,
        secondary: commonLabels.secondary,
        success: commonLabels.success,
        warning: commonLabels.warning,
        error: commonLabels.error,
      },
      usageExamples: {
        title: "Exemples d'utilisation",
        background: '// Arrière-plan',
        textColor: '// Couleur du texte',
        border: '// Bordure',
        cssVariable: '// Variable CSS',
      },
    },
    buttons: {
      title: 'Boutons',
      variantsTitle: 'Variantes',
      withIconsTitle: 'Avec icônes',
      variants: {
        primary: commonLabels.primary,
        secondary: commonLabels.secondary,
        accent: commonLabels.accent,
        outline: 'Contour',
        ghost: 'Fantôme',
      },
      iconButtons: {
        addItem: 'Ajouter',
        download: 'Télécharger',
        settings: 'Paramètres',
      },
    },
    alerts: {
      title: 'Alertes',
      labels: {
        info: `${commonLabels.info} :`,
        success: `${commonLabels.success} :`,
        warning: `${commonLabels.warning} :`,
        error: `${commonLabels.error} :`,
      },
      info: 'Ceci est un message informatif utilisant les couleurs du thème.',
      success: 'Opération terminée avec succès !',
      warning: 'Veuillez vérifier avant de continuer.',
      error: "Une erreur s'est produite. Veuillez réessayer.",
    },
    modalSection: {
      title: 'Modal et Inscription',
      modalCard: {
        title: 'Modal',
        description: 'Cliquez sur le bouton pour ouvrir une boîte de dialogue modale.',
        openButton: 'Ouvrir le modal',
      },
      signupCard: {
        title: 'Inscription',
        description:
          "Le composant d'inscription est un formulaire modal pour l'authentification des utilisateurs.",
        openButton: "Ouvrir le modal d'inscription",
      },
      modalContent: {
        title: 'Exemple de modal',
        line1:
          "Ceci est un composant modal réutilisable. Il gère le clic sur l'arrière-plan, la touche échap et la gestion du focus.",
        line2:
          "Vous pouvez passer n'importe quel contenu en tant qu'enfants et optionnellement fournir un snippet de pied de page.",
        footer: 'Appuyez sur Échap ou cliquez à côté pour fermer.',
      },
    },
    statCards: {
      title: 'Cartes de statistiques',
      labels: {
        default: 'Par défaut',
        success: commonLabels.success,
        danger: 'Danger',
        net: commonLabels.net,
      },
    },
    badges: {
      title: 'Badges',
      labels: {
        primary: commonLabels.primary,
        accent: commonLabels.accent,
        success: commonLabels.success,
        warning: commonLabels.warning,
        error: commonLabels.error,
      },
    },
    cardSection: {
      title: 'Carte',
      card1: {
        title: 'Composant Carte',
        description: "Ceci est un composant Carte réutilisable avec un style d'ombre par défaut.",
        button: 'Action',
      },
      card2: {
        title: 'Carte avec classe personnalisée',
        description: 'Les cartes acceptent une prop pour la personnalisation.',
        button: 'Action personnalisée',
      },
    },
    loadingSpinner: {
      title: 'Indicateur de chargement',
      sizeVariants: 'Variantes de taille',
      colorVariants: 'Variantes de couleur',
      sizes: {
        small: 'Petit',
        medium: 'Moyen',
        large: 'Grand',
      },
      colors: {
        primary: commonLabels.primary,
        accent: commonLabels.accent,
        secondary: commonLabels.secondary,
      },
    },
    themeToggle: {
      title: 'Basculement du thème',
      description:
        'Le composant de basculement du thème permet aux utilisateurs de passer du mode clair au mode sombre. La sélection est conservée dans les cookies.',
      hint: 'Cliquez pour basculer entre les modes clair et sombre',
    },
  },
};
