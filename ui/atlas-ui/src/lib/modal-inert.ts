/**
 * Action Svelte qui rend une modale Bootstrap **inerte** tant qu'elle est
 * fermée, et la « réveille » à l'ouverture.
 *
 * Pourquoi : une modale Bootstrap 5 fermée garde dans le DOM des éléments
 * focusables (champ, bouton de fermeture…). Le marquage historique
 * `aria-hidden="true"` sur la racine `.modal` masque ces éléments aux
 * technologies d'assistance, mais axe le signale (`aria-hidden-focus`) car
 * `aria-hidden` ne doit pas couvrir des éléments focusables — et les
 * navigateurs récents bloquent même ce cas (« Blocked aria-hidden … its
 * descendant retained focus »).
 *
 * La bonne primitive est l'attribut **`inert`** : il retire l'élément (et ses
 * descendants) de l'ordre de tabulation ET de l'arbre d'accessibilité, sans
 * l'incohérence d'`aria-hidden` sur du focusable. On l'applique à l'état fermé
 * et on le retire pendant que la modale est ouverte, en suivant les événements
 * de cycle de vie de Bootstrap (`show.bs.modal` / `hidden.bs.modal`).
 *
 * Le composant rend donc la racine avec `inert` statique (état fermé par
 * défaut) ; cette action prend le relais dès que Bootstrap pilote la modale.
 *
 * @param node - la racine `.modal`.
 * @returns Le contrôleur d'action Svelte (`destroy` retire les écouteurs).
 */
export function modalInert(node: HTMLElement): { destroy(): void } {
  // À l'ouverture, la modale doit redevenir interactive.
  const onShow = (): void => node.removeAttribute("inert");
  // Une fois entièrement fermée, on la rend de nouveau inerte.
  const onHidden = (): void => node.setAttribute("inert", "");

  node.addEventListener("show.bs.modal", onShow);
  node.addEventListener("hidden.bs.modal", onHidden);

  return {
    destroy(): void {
      node.removeEventListener("show.bs.modal", onShow);
      node.removeEventListener("hidden.bs.modal", onHidden);
    },
  };
}
