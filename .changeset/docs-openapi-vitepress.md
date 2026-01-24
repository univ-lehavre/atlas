---
"atlas": patch
---

docs: intégration vitepress-openapi pour afficher les specs REDCap

- Corrige typedoc.json pour pointer vers packages/crf au lieu de packages/redcap-api
- Ajoute vitepress-openapi pour afficher les specs OpenAPI REDCap dans VitePress
- Corrige tsconfig.json pour référencer les packages existants
- Simplifie la sidebar API
- Ajoute page /openapi/ avec le composant OASpec
