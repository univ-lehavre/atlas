# sillage

> Reboot d'ECRIN sur l'écosystème amarre, branché sur le dictionnaire REDCap ECRIN v2-alpha.

## Vision

sillage est une plateforme SvelteKit qui guide un chercheur dans la déclaration progressive de son profil, de ses questions de recherche, de ses publications, de son projet et de son équipe. Elle s'appuie sur :

- **Auth Appwrite** via [@univ-lehavre/atlas-auth](../../packages/auth/) (magic link)
- **Persistance REDCap** via le dictionnaire [data-dictionaries/136-ecrin-v2-alpha.json](../../data-dictionaries/136-ecrin-v2-alpha.json) (6 instruments, 55 champs)
- **Design system** partagé [@univ-lehavre/atlas-ui](../../ui/atlas-ui/)
- **Sandbox Docker zero-click** [sandbox/sillage-sandbox/](../../sandbox/sillage-sandbox/)

sillage coexiste avec [apps/ecrin/](../ecrin/) (à déprécier une fois sillage validé) et reprend les patterns éprouvés d'[apps/amarre/](../amarre/).

## Périmètre MVP

**Inclus** :

- Homepage 4 sections (Introduce / Collaborate / Explore / Administrate) avec progressive disclosure
- Trois branches d'affichage : anonymous, authenticated researcher, admin
- Auth Appwrite (signup magic-link, login, logout, delete account)
- Lecture REDCap server-side pour piloter le gating (`GET /api/v1/profile/state`)
- Section Administrate fonctionnelle (download, delete, logout)
- Iframe vers Shiny project-graph (admin-only en MVP)
- Iframe vers rapports Quarto rapatriés (admin-only en MVP)
- Stub `POST /api/v1/publications/match` (202 Accepted, pas de matching réel)

**Exclu (follow-ups)** :

- Rendu des formulaires REDCap — les CardItems renvoient vers `/coming-soon`
- Wiring réel du CLI [cli/researcher-profiles](../../cli/researcher-profiles/) pour `match-researchers` → `matches.html`
- Snapshots Quarto en variantes `public` et `chercheurs` (nécessite le pipeline Python `ecrin.py` hors atlas)
- Logo dédié sillage (utilise `ulhn.svg` en placeholder)
- Réconciliation de l'instrument `references_openalex` attendu par le CLI vs `publications` + `openalex` dans le dict v2

## Architecture

### Homepage — 4 sections amarre-style

| Section      | CardItems                         | Gating intra-section                                                                      |
| ------------ | --------------------------------- | ----------------------------------------------------------------------------------------- |
| Introduce    | Me, Mes questions, Mes références | Me toujours actif ; Questions/Références si `researcher_profile_complete == 2`            |
| Collaborate  | Mon projet, Mon équipe            | Projet si `researcher_profile_complete == 2` ; Équipe si `project_proposal_complete == 2` |
| Explore      | Mon graphe, Mes correspondances   | Graphe & Matches si `project_proposal_complete == 2`                                      |
| Administrate | Logout, Download, Delete          | Toujours actif (logged-in)                                                                |

Pattern technique repris de [apps/amarre/src/routes/+page.svelte](../amarre/src/routes/+page.svelte) : `HorizontalScroller` + `SectionTile` + N × `CardItem` du DS, snippets `title` / `description` / `actions`. Alternance light/dark calculée selon visibilité des sections.

### Branches d'affichage

| Viewer                             | Composant racine                     | Sections visibles                                                      |
| ---------------------------------- | ------------------------------------ | ---------------------------------------------------------------------- |
| Anonymous (`user == null`)         | `AnonymousHome`                      | Hero plateforme + signup CTA + community teaser (public-audience only) |
| Authenticated researcher           | `SillageHomePage`                    | Les 4 sections orchestrées                                             |
| Admin (`labels.includes('admin')`) | `SillageHomePage` + `/admin/reports` | Les 4 sections + iframe rapports Quarto + iframe Shiny                 |

### Consent & audience gating (RGPD)

Toute donnée chercheur exposée respecte le double dispositif :

- `{instrument}_identification_level` : Identifiable / Pseudonymised / Anonymised / Aggregated only
- `{instrument}_data_audience` : General public / Authenticated researchers only

Matrice à 12 croisements (extrait du cahier ECRIN v1) :

| Viewer     | identification_level | audience         | Champs identifiants | User ID    |
| ---------- | -------------------- | ---------------- | ------------------- | ---------- |
| Public     | Identifiable         | General public   | Téléchargés         | Original   |
| Public     | Identifiable         | Researchers only | Exclu               | Exclu      |
| Public     | Pseudonymised        | General public   | Non téléchargés     | Hashé      |
| Public     | Anonymised           | General public   | Non téléchargés     | Aucun      |
| Public     | Aggregated           | \*               | Non téléchargés     | Stats only |
| Chercheurs | Identifiable         | \*               | Téléchargés         | Original   |
| Chercheurs | Pseudonymised        | \*               | Non téléchargés     | Hashé      |
| Chercheurs | Anonymised           | \*               | Non téléchargés     | Aucun      |
| Admin      | \*                   | \*               | Téléchargés         | Original   |

Utilitaire central à créer : `src/lib/server/consent/audience.ts`. Tests unitaires sur l'ensemble des croisements.

## Dépendances dans le monorepo

| Package                                                                 | Rôle                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [@univ-lehavre/atlas-auth](../../packages/auth/)                        | Magic-link Appwrite, hooks SvelteKit                               |
| [@univ-lehavre/atlas-baas](../../packages/baas/)                        | Appwrite client factory                                            |
| [@univ-lehavre/atlas-errors](../../packages/errors/)                    | Erreurs HTTP typées                                                |
| [@univ-lehavre/atlas-logos](../../packages/logos/)                      | Logos institutionnels (ULHN, EUNICoast, France 2030, Région)       |
| [@univ-lehavre/atlas-ui](../../ui/atlas-ui/)                            | DS Svelte (HorizontalScroller, CardItem, MainTitle, Administrate…) |
| [@univ-lehavre/atlas-validators](../../packages/validators/)            | Validators emails, JSON                                            |
| [@univ-lehavre/atlas-crf-sandbox-core](../../sandbox/crf-sandbox-core/) | Scripts génériques de bootstrap (utilisé par la sandbox)           |

## Services associés

| Service                                                              | Rôle                                                        | Statut MVP                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------- |
| [sandbox/sillage-sandbox/](../../sandbox/sillage-sandbox/)           | Docker zero-click pour dev local (Appwrite + REDCap + SMTP) | Wrapper du sandbox-core                     |
| [services/project-graph-shiny/](../../services/project-graph-shiny/) | App Shiny — visualisation du graphe projets/topics LDA      | Rapatrié, host externe en prod              |
| [services/cahier-reports/](../../services/cahier-reports/)           | Snapshots HTML Quarto (admin-only)                          | Rapatrié, exposition gated `/admin/reports` |
| [cli/researcher-profiles](../../cli/researcher-profiles/)            | Matching OpenAlex (TF-IDF + embeddings)                     | Hors-app pour MVP, stub endpoint sillage    |

## Stack technique

- **Frontend** : SvelteKit 2, Svelte 5, Bootstrap 5
- **Auth** : Appwrite (self-hosted en sandbox, mutualisé en prod)
- **Données** : REDCap (dictionnaire ECRIN v2-alpha)
- **Validation** : Zod
- **Tests** : Vitest (3 projets — unit / ui / integration), couverture 100% visée
- **CI** : turbo + lefthook pre-commit (prettier, eslint, typecheck, svelte:check)

## Mapping homepage ↔ instruments REDCap

| CardItem homepage          | Instrument REDCap    | Action MVP                                   |
| -------------------------- | -------------------- | -------------------------------------------- |
| Introduce \| Me            | `researcher_profile` | Bouton → `/coming-soon`                      |
| Introduce \| Questions     | `research_questions` | Idem                                         |
| Introduce \| Références    | `publications`       | Idem                                         |
| Collaborate \| Projet      | `project_proposal`   | Idem                                         |
| Collaborate \| Équipe      | _(à définir)_        | CardItem TBD, actions futures                |
| Explore \| Graphe          | _(visualisation)_    | iframe Shiny (admin-only en MVP)             |
| Explore \| Correspondances | _(matching)_         | POST `/api/v1/publications/match` (stub 202) |

## Roadmap au-delà du MVP

1. **Form rendering** — Implémenter le rendu Svelte des 6 instruments ECRIN v2 (dont les 10 champs `sql` qui nécessitent un setup REDCap dédié).
2. **Matching réel** — Wirer le CLI [cli/researcher-profiles](../../cli/researcher-profiles/) sur `POST /api/v1/publications/match`. Adapter le CLI pour lire `publications` + écrire dans `openalex` (recommandation β du plan).
3. **Rapports public/chercheurs** — Regénérer les variantes Quarto avec stacks `public.yml` et `chercheurs.yml` (réactivation ponctuelle du pipeline Python hors atlas).
4. **Logo dédié sillage** — Remplacer `ulhn.svg` placeholder par un visuel propre.
5. **Dépréciation `apps/ecrin/`** — Supprimer une fois sillage validé en prod.

## Plan d'implémentation détaillé

Séquence des 17 commits atomiques (chacun vert sur lint + typecheck + test + svelte:check + build) : voir le plan local `~/.claude/plans/je-propose-de-faire-atomic-badger.md`.

## Organisation

This package is part of **Atlas**, a set of tools developed by **Le Havre Normandie University** to facilitate research and collaboration between researchers.

Atlas est développé dans le cadre de :

- [Campus Polytechnique des Territoires Maritimes et Portuaires](https://www.cptmp.fr/)
- [EUNICoast](https://eunicoast.eu/)

## License

MIT
