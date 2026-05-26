# SBOM (Software Bill of Materials)

Inventaire détaillé et machine-readable de toutes les dépendances incluses
dans atlas, au format [CycloneDX 1.6](https://cyclonedx.org/specification/overview/).

Sert à :

- répondre à un audit de chaîne d'approvisionnement (qui est mon vendor,
  où vient cette `lodash@4.17.20` ?) ;
- croiser un advisory CVE avec la liste exacte des packages déployés ;
- alimenter un outil de Dependency-Track / Trivy / OSV-Scanner.

## Où le trouver

Un SBOM est généré **automatiquement** à chaque push sur `main` par le
workflow [`.github/workflows/sbom.yml`](../../../.github/workflows/sbom.yml).

- **Récent (≤ 90 jours)** : artefact `sbom-cyclonedx-<sha>` attaché au
  run du workflow → [Actions → SBOM](https://github.com/univ-lehavre/atlas/actions/workflows/sbom.yml).
- **Plus ancien (> 90 jours)** : non conservé par défaut. Pour archive
  long-terme, snapshoter manuellement vers ce dossier (cf. ci-dessous).
- **Pour une release publiée** : le SBOM de la release inclut le SHA
  du commit qui a déclenché le publish — récupérable via le run SBOM
  correspondant.

## Comment l'utiliser

```bash
# Télécharger le dernier SBOM
gh run download -R univ-lehavre/atlas \
  --name sbom-cyclonedx-$(git rev-parse origin/main)

# Compter les composants
jq '.components | length' sbom-cyclonedx.json

# Lister les dépendances d'un type donné
jq '.components[] | select(.type == "library") | .purl' sbom-cyclonedx.json

# Croiser avec une CVE (via OSV-Scanner)
osv-scanner --sbom sbom-cyclonedx.json

# Importer dans Dependency-Track (si self-hosted)
curl -X POST https://dt.example.org/api/v1/bom \
  -H "X-Api-Key: $DT_API_KEY" \
  -F "project=<project-uuid>" \
  -F "bom=@sbom-cyclonedx.json"
```

## Snapshot manuel (archive long-terme)

Pour fixer un SBOM dans l'historique git (audit, release publique
documentée, divergence à conserver) :

```bash
# Depuis un run SBOM réussi
gh run download <run-id> --name sbom-cyclonedx-<sha>
mv sbom-cyclonedx.json docs/security/sbom/atlas-$(date -u +%Y%m%d)-<sha>.json
git add docs/security/sbom/atlas-*.json
git commit -m "docs(security): snapshot SBOM atlas-$(date -u +%Y-%m-%d)"
```

Convention de nommage : `atlas-YYYYMMDD-<sha-court>.json`. Garder ces
snapshots au strict minimum — chaque SBOM pèse ~quelques MB et le but
du dossier n'est pas de conserver toute l'histoire, juste les jalons
auditables (releases majeures, post-incident, demande explicite d'un
auditeur).

## Format

CycloneDX 1.6, généré par [`@cyclonedx/cdxgen`](https://github.com/CycloneDX/cdxgen)
épinglé à la version `CDXGEN_VERSION` du workflow (cf. en-tête de
`sbom.yml`). Métadonnées incluses :

- `metadata.timestamp` : date de génération
- `metadata.tools[]` : version exacte de cdxgen + Node
- `metadata.component.version` : SHA du commit
- `components[]` : toutes les dépendances directes et transitives avec
  PURL, hash, licences détectées
- `dependencies[]` : graphe d'inclusion (qui dépend de qui)

## Limitations connues

- **Svelte components** : cdxgen ne parse pas les imports inline dans
  les fichiers `.svelte`. Les dépendances arrivent uniquement via
  `pnpm-lock.yaml`, donc le résultat reste correct au niveau package
  mais ne descend pas au niveau fichier `.svelte`.
- **Docker** : ce SBOM couvre la chaîne npm uniquement. Les images
  Docker (Appwrite, REDCap dans `sandbox/`) ont leur propre SBOM à
  générer séparément (voir TODO Phase 8 si on l'intègre un jour).
- **Privacy** : le SBOM est public (artefact GitHub Actions sur repo
  public). Aucun secret n'y figure — c'est de la pure métadonnée
  de dépendance.
