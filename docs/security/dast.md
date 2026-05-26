# DAST — Dynamic Application Security Testing

Complément du SAST (CodeQL, cf. [SECURITY.md](../../SECURITY.md)) : sonder
le comportement réel d'une app déployée pour détecter ce que l'analyse
statique ne voit pas (headers HTTP manquants, redirections vers HTTP,
mixed content, info disclosure, cookies sans flags, etc.).

Outil : [OWASP ZAP](https://www.zaproxy.org/) en mode **baseline**
(passif uniquement, pas d'attaque active), via l'action GitHub
[`zaproxy/action-baseline`](https://github.com/zaproxy/action-baseline).

## État actuel

**Phase 1 (livrée)** — workflow déclenché manuellement uniquement, sur une
URL passée en input :

- Trigger : `workflow_dispatch`
- Cible : input `target_url` (URL accessible depuis un runner GitHub)
- Coût : ~5-10 min par scan (spider + passive scan)
- Rapport : artefact `zap_scan` (HTML + Markdown + JSON, 90 jours)
- Issue auto-créée si findings non-IGNORE (cf. config dans
  [`zap-baseline.yml`](../../.github/workflows/zap-baseline.yml))

**Phase 2 (différée)** — automatisation nightly contre prod ou stack
locale. Trois pistes en attente :

1. **Nightly contre prod** : nécessite que les URLs `amarre.univ-lehavre.fr`
   et les autres soient figées dans [`surfaces.md`](surfaces.md), et que
   la **DSI ULHN soit prévenue** du trafic ZAP pour éviter alertes IDS
   ou rate-limit. Décision en attente.
2. **Nightly contre `sandbox/amarre-sandbox/`** : monter la stack
   docker-compose (Appwrite + REDCap + amarre) en CI et scanner
   `localhost:5173`. Lourd (~10 min CI supplémentaires) mais aucune
   coordination externe nécessaire. Couvre uniquement amarre.
3. **Sur PR avec preview URL** : Appwrite Sites n'offre pas de
   previews automatiques par PR. Hors périmètre tant qu'on reste sur
   ce déploiement.

## Lancer un scan

1. Aller sur [Actions → ZAP Baseline](https://github.com/univ-lehavre/atlas/actions/workflows/zap-baseline.yml)
2. Cliquer "Run workflow", choisir la branche `main`
3. Remplir l'URL cible (ex : `https://amarre.univ-lehavre.fr`)
4. Choisir `fail_action` :
   - `warn` (défaut) : le job réussit même avec des findings. Adapté
     au premier scan, à l'exploration, au shadow IT.
   - `fail` : le job échoue dès qu'une alerte non-IGNORE remonte.
     Adapté quand le scan est branché sur un gate (release, merge).
5. Attendre 5-10 min. Le rapport apparaît dans la section "Artifacts"
   du run + une issue GitHub résume les findings.

## Interpréter le rapport

ZAP classe les findings par niveau de risque :

- **High** : à corriger en priorité — XSS confirmé, mixed content sur
  des pages sensibles, secrets exposés dans une réponse.
- **Medium** : sérieux mais souvent contextuel — cookie sans `Secure`,
  CSP manquante, redirect ouvert.
- **Low** / **Informational** : à évaluer mais souvent acceptable —
  headers d'info versions, commentaires HTML laissés en place.

Les findings de cette app sont en grande partie déjà couverts par les
mesures Phase 6.3 (CSP, HSTS, etc.) et Phase 6.4 (cookies session
hardening). Un scan sain devrait remonter **0 high**, et les low/info
peuvent être triés au cas par cas.

## Gérer les faux positifs

Tout finding considéré comme faux positif ou hors périmètre doit être
documenté dans [`.zap/rules.tsv`](../../.zap/rules.tsv) (un par ligne
avec justification).

**Ne jamais** silencer une alerte sans commentaire — le `IGNORE` sans
contexte devient une zone d'ombre que personne ne sait plus si elle
est légitime.

## Risque résiduel

ZAP baseline est **passif** : il sonde des URLs trouvées via spider +
analyse les réponses, mais n'envoie pas de payloads malveillants. Le
risque pour la cible est limité à du trafic web standard, comparable
à un crawler indexeur.

Néanmoins :

- Le scan peut **déclencher des envois d'email** si le crawler
  rencontre un formulaire de signup → privilégier une cible avec un
  rate-limit déjà actif (Phase 6.5 le couvre côté amarre/ecrin/find-an-expert).
- Le scan peut **créer des comptes test** sur Appwrite si le signup
  ne demande pas de captcha → laisser le rate-limit faire son travail
  et nettoyer manuellement après si nécessaire.
- Le scan **respecte robots.txt** par défaut — pas de scan des routes
  exclues. Vérifier que `robots.txt` ne bloque pas des routes qu'on
  veut couvrir.
