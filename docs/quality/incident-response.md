# Incident response — atlas

Procédure à appliquer en cas de **suspicion** ou de **confirmation**
d'incident de sécurité touchant le code source atlas, les apps déployées
(amarre, ecrin, find-an-expert), les secrets, ou les données accédées
par ces apps (REDCap, OpenAlex, Appwrite).

> Ce document est un **runbook opérationnel**, pas une politique de
> conformité. Il s'utilise au moment de l'incident, ouvert dans un onglet
> en parallèle de la console GitHub, de l'admin Appwrite et du gestionnaire
> de secrets. Garder court, concret, navigable.

## 1. Classification de sévérité

Choisir la sévérité dès la détection — elle conditionne le tempo de la
réponse et les notifications.

| Niveau | Critères                                                                                                                                                                                    | Délai d'engagement                    |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| **P0** | Fuite confirmée de données personnelles ; compromission active d'un compte admin Appwrite ; exfiltration de tokens REDCap valides ; supply-chain compromise sur un package atlas publié.    | Action **immédiate**, 24/7.           |
| **P1** | Vulnérabilité exploitable à distance non corrigée en prod ; secret commité par erreur (token, clé) ; détection d'un publish sans provenance valide ; CodeQL `error` sur une route publique. | Action sous **4 h**, heures ouvrées.  |
| **P2** | CodeQL `warning` haute sévérité ; finding ZAP medium sans exploit immédiat ; advisory CVE moderate sur une dépendance prod ; tentative de brute-force détectée mais bloquée par rate-limit. | Action sous **48 h**, heures ouvrées. |
| **P3** | Hygiène : alertes Dependabot low, faux positif à dismisser, finding ZAP info, hardening cosmétique.                                                                                         | Triage hebdomadaire.                  |

En cas de doute, **escalader d'un cran** par défaut.

## 2. Signaux de détection

Sources à monitorer pour repérer un incident.

| Source                                                                                                  | Quoi y chercher                                               | Périodicité                           |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| [Security → Code scanning](https://github.com/univ-lehavre/atlas/security/code-scanning)                | Nouveaux findings CodeQL `error` ou `high warning`            | À chaque PR + post-merge              |
| [Security → Dependabot](https://github.com/univ-lehavre/atlas/security/dependabot)                      | Advisories `high` ou `critical`                               | Quotidien (auto-merge couvre patches) |
| [Security → Secret scanning](https://github.com/univ-lehavre/atlas/security/secret-scanning)            | Secrets détectés ; push protection bloqués                    | Quotidien                             |
| [Actions → Gitleaks](https://github.com/univ-lehavre/atlas/actions/workflows/gitleaks.yml)              | Findings sur PR ou push main                                  | À chaque PR                           |
| [Actions → ZAP Baseline](https://github.com/univ-lehavre/atlas/actions/workflows/zap-baseline.yml)      | Findings High/Medium après scan                               | Sur demande (Phase 7.1 Phase 1)       |
| Logs Appwrite (console admin)                                                                           | 5xx > seuil ; tentatives auth échouées ; latence p95 anormale | À cadrer avec la DSI (cf. § Logs)     |
| Email `redcap-support@univ-lehavre.fr`                                                                  | Divulgation responsable externe                               | Surveillance quotidienne              |
| [GitHub Private Vulnerability Reporting](https://github.com/univ-lehavre/atlas/security/advisories/new) | Rapport coordonné                                             | Notification GitHub                   |

## 3. Phases de réponse

### 3.1 Détection

- Ouvrir une **issue privée** via [Security advisories → New draft](https://github.com/univ-lehavre/atlas/security/advisories/new).
  Une issue publique exposerait la vulnérabilité avant correctif.
- Consigner dès l'ouverture : qui a détecté, quand, source, premiers
  symptômes, sévérité estimée.
- Ne **rien remédier** avant l'étape 3.2 — d'abord contenir, ensuite
  réparer.

### 3.2 Confinement

Couper l'exposition sans détruire les preuves.

**Si compromission d'un secret (token, clé, mot de passe)** :

1. **Rotation immédiate** côté émetteur (REDCap, Appwrite Console,
   OpenAlex, GitHub PAT, npm token…) — cf. [section Secrets de Sécurité](./security#secrets-inventaire-et-rotation)
   pour la procédure par secret.
2. **Révocation** de l'ancien secret (et pas seulement remplacement) si
   l'émetteur le permet.
3. **Mise à jour** des GitHub Secrets / Appwrite variables d'environnement.
4. **Redéploiement** des apps qui consomment le secret (`amarre`,
   `ecrin`, `find-an-expert`).

**Si compromission d'un compte utilisateur Appwrite** :

1. **Désactiver** le compte côté Appwrite Console (`Users → <user> → Block`).
2. **Invalider** les sessions actives (`Users → <user> → Sessions → Delete all`).
3. **Auditer** les actions récentes du compte via les logs Appwrite.

**Si compromission d'un package npm publié** :

1. **`npm deprecate @univ-lehavre/atlas-<name>@<version> "<message>"`**
   immédiatement (le package reste accessible mais signalé).
2. **Vérifier la provenance** des autres versions via `npm audit signatures`
   et `npm view <pkg>@<version> --json | jq .dist.attestations`.
3. **Ne pas unpublish** sans coordination — `npm unpublish` est
   irréversible après 72h et casse les consommateurs en aval.
4. Préparer une version `patch` qui surclasse la version compromise.

**Si fuite de données personnelles confirmée** :

1. Couper l'accès au système qui fuite (mettre l'app en maintenance).
2. **Notifier la DSI ULHN dans les 4 h** (cf. § Contacts).
3. **Démarrer le compteur CNIL 72 h** (cf. § 3.6 RGPD).

### 3.3 Éradication

Identifier et supprimer la cause racine.

- **Compromission de secret** : trouver comment il a fuité (`git log
-p`, `gitleaks detect --log-opts="--all"`, logs CI, accès workstation).
- **Vulnérabilité applicative** : corriger en code, ajouter un test
  de régression, déployer.
- **Account takeover** : forcer un reset de mot de passe (Appwrite) +
  examiner les autres comptes du même tenant.
- **Dependency vulnerability** : bump du package, override transitive
  si pas encore patché upstream (cf. `pnpm.overrides` dans
  `package.json`), changeset patch.

### 3.4 Récupération

Restaurer le service à un état sain.

- Redéployer les apps depuis `main` (build CI vert obligatoire).
- Restaurer les données depuis sauvegarde si altérées (cf. § Sauvegardes).
- Surveiller les métriques (5xx, latence p95) pendant **24 h**
  post-restauration pour détecter une récidive.
- Lever progressivement les protections temporaires (rate-limits
  durcis, IP banlists) si elles ont été mises en place pendant le
  confinement.

### 3.5 Post-mortem

Documenter pour ne pas répéter.

- Dans les **72 h** après résolution (P0/P1) ou la semaine suivante (P2).
- Format : section ajoutée à la fin de ce document (`## Post-mortem
YYYY-MM-DD — titre court`), ou doc séparé `docs/security/post-mortems/`
  si la liste grossit.
- À couvrir : timeline factuelle, impact, cause racine technique,
  contribution humaine (process, monitoring), actions correctives
  (techniques + process) avec owners et dates.
- **Blameless** : critiquer le système, pas les personnes. Le but est
  d'améliorer le process, pas de désigner un coupable.

### 3.6 Obligations RGPD

Si l'incident touche des **données à caractère personnel** (au sens
RGPD article 4) :

- **Notification CNIL** dans les **72 h** après détection, sauf si le
  risque pour les personnes est négligeable. Formulaire en ligne :
  https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles
- **Notification aux personnes concernées** si risque élevé.
- Coordination obligatoire avec la **DSI ULHN** (responsable de traitement)
  — eux ouvrent la notification, pas le mainteneur du repo.

## 4. Contacts

| Rôle                                           | Canal                                                                                                           | Quand                                                                                     |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Mainteneur atlas**                           | `pierre-olivier.chasset@univ-lehavre.fr`                                                                        | Premier point de contact                                                                  |
| **DSI ULHN**                                   | _coordonnées à compléter par le mainteneur_                                                                     | P0 confirmé ; suspicion de fuite RGPD ; question infra Appwrite/REDCap                    |
| **CNIL** (si fuite données perso)              | https://www.cnil.fr/fr/notifier-une-violation-de-donnees-personnelles                                           | Sous 72 h après détection ; **via la DSI**, pas directement                               |
| **Divulgation responsable externe**            | `redcap-support@univ-lehavre.fr` ou [GitHub PVR](https://github.com/univ-lehavre/atlas/security/advisories/new) | Documenté dans [SECURITY.md](https://github.com/univ-lehavre/atlas/blob/main/SECURITY.md) |
| **GitHub Security**                            | https://github.com/contact/report-content                                                                       | Compromise de compte / abuse                                                              |
| **npm Security**                               | https://www.npmjs.com/support                                                                                   | Compromise de package publié                                                              |
| **Vanderbilt REDCap** (si bug REDCap upstream) | https://projectredcap.org/contact/                                                                              | Bug confirmé dans REDCap, pas dans atlas                                                  |

## 5. Logs et alerting (cadre Phase 8.1)

**État actuel** : framework documenté ci-dessous, intégration concrète
en attente d'arbitrage avec la DSI ULHN.

### 5.1 Sources de logs

| Source                     | Accès                              | Rétention                             | Quoi y trouver                                                    |
| -------------------------- | ---------------------------------- | ------------------------------------- | ----------------------------------------------------------------- |
| **Appwrite Console**       | Admin Appwrite (DSI ULHN)          | _à confirmer DSI_                     | Requêtes API, auth events, 5xx, audit log admin                   |
| **Appwrite Sites runtime** | Idem                               | _à confirmer DSI_                     | Logs SSR SvelteKit (`console.error` dans `hooks.server.ts`, etc.) |
| **GitHub Actions**         | Public sur PR, repo admin sur main | 90 jours                              | CI/CD, scans CodeQL/ZAP/SBOM/Gitleaks                             |
| **GitHub Audit log**       | Admin org                          | 90 jours (free) / 6 mois (enterprise) | Push, modifs settings, ajout/retrait collaborator                 |
| **REDCap upstream**        | DSI ULHN (compte admin REDCap)     | Selon politique DSI                   | Requêtes API utilisant les tokens REDCap                          |

### 5.2 Alerting basique à mettre en place

À cadrer avec la DSI ULHN :

- **5xx > seuil** (suggérer : 5 erreurs/min pendant 5 min) → alerte
  email / Slack.
- **Latence p95 anormale** (suggérer : > 2× la baseline 7j sur 10 min) →
  alerte.
- **Auth fail rate > seuil** (suggérer : 10 échecs/min sur la même IP
  ou même email) → alerte (signal brute-force, déjà partiellement
  couvert par rate-limit Phase 6.5).
- **Code scanning** : config GitHub envoie déjà notifications email aux
  watchers du repo.

### 5.3 Logs d'auth

Les apps amarre/ecrin/find-an-expert utilisent un magic-link Appwrite
(cf. [packages/auth/src/](https://github.com/univ-lehavre/atlas/tree/main/packages/auth/src/)). Les événements à
tracer côté Appwrite :

- Création de session (succès/échec)
- Logout
- Création de compte (rate-limité côté app — Phase 6.5)
- Suppression de compte (`ecrin` uniquement)

Appwrite log ces événements nativement dans `Logs → Sessions`. Pas
d'agrégation externe pour l'instant.

## 6. Sauvegardes et restauration (cadre Phase 8.3)

**État actuel** : framework documenté, paramètres concrets à confirmer
avec la DSI ULHN — la politique dépend de l'hébergement Appwrite
(self-hosted ULHN ? Appwrite Cloud ?).

### 6.1 Périmètre à sauvegarder

| Donnée                                                        | Localisation                                                               | Owner sauvegarde                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| **Code source atlas**                                         | GitHub (mirror local des mainteneurs)                                      | GitHub + clones locaux                                                                         |
| **Données utilisateurs Appwrite** (comptes, sessions, tables) | Appwrite (`baas-mongodb-data` en self-hosted)                              | _DSI ULHN_                                                                                     |
| **Données REDCap**                                            | Instance REDCap ULHN                                                       | _DSI ULHN_                                                                                     |
| **Secrets**                                                   | GitHub Secrets + Appwrite vars d'env + `~/.config/atlas/` côté workstation | À documenter par le mainteneur                                                                 |
| **SBOMs historiques**                                         | Artefacts GitHub Actions (90j)                                             | Snapshots manuels — cf. [section SBOM de Sécurité](./security#sbom-software-bill-of-materials) |

### 6.2 RPO / RTO cibles

À fixer avec la DSI selon la criticité applicative.

- **RPO** (Recovery Point Objective — combien de données on accepte
  de perdre) : suggérer **24 h** pour amarre/ecrin/find-an-expert.
- **RTO** (Recovery Time Objective — délai max de rétablissement) :
  suggérer **4 h** pour amarre (formulaire de mobilité, période active
  limitée), **24 h** pour ecrin/find-an-expert.

_Valeurs à valider par les owners métier ; ces chiffres ne sont pas
des engagements contractuels (cf. note SECURITY.md)._

### 6.3 Test de restauration

À conduire **au moins une fois par an**, en environnement isolé
(`sandbox/amarre-sandbox/`). Procédure type :

1. Récupérer la dernière sauvegarde Appwrite (dump MongoDB).
2. Monter `sandbox/amarre-sandbox/` propre.
3. Restaurer le dump dans le `baas-mongodb` du sandbox.
4. Vérifier que les flows amarre fonctionnent contre cette base
   restaurée (signup → magic link → submit demande).
5. Documenter le temps réel de restauration → ajuster le RTO si écart
   significatif avec l'objectif.

## 7. Checklist de clôture

Avant de marquer un incident comme résolu :

- [ ] Cause racine identifiée et documentée.
- [ ] Correctif déployé en prod et validé (smoke test).
- [ ] Tests de régression ajoutés (couvre la vulnérabilité spécifique).
- [ ] Secret(s) compromis rotaté(s) et révoqué(s).
- [ ] Sessions / comptes affectés invalidés.
- [ ] Surveillance 24 h post-déploiement sans récidive.
- [ ] Post-mortem rédigé (P0/P1) ou ticket de suivi créé (P2).
- [ ] Notification CNIL effectuée si fuite données perso (via DSI).
- [ ] Communication aux parties prenantes (utilisateurs / DSI / chercheurs).
- [ ] Issue/advisory privée fermée ou rendue publique si responsabilité
      revealed (en accord avec le reporter).

## 8. Historique des incidents

_Aucun incident enregistré à ce jour. Premier post-mortem à ajouter
ici quand survient._
