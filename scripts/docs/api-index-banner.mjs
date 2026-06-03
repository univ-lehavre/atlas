#!/usr/bin/env node

/**
 * @fileoverview Préfixe l'index de la Référence API d'un bandeau explicatif.
 *
 * La Référence API (`docs/api/`) est **générée par TypeDoc** depuis la JSDoc
 * du code, donc **en anglais** — une exception assumée à la politique de
 * documentation française (ADR 0013), car ce contenu est dérivé du code et
 * non rédigé. Ce script ajoute, en tête de `docs/api/index.md` régénéré, un
 * bandeau qui situe la page (niveau « Inline », générée, anglaise) et renvoie
 * vers la documentation rédigée. Idempotent : ne ré-ajoute pas le bandeau s'il
 * est déjà présent.
 *
 * @module
 */

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const API_DIR = "docs/.generated/api";
const INDEX = "docs/.generated/api/index.md";
const MARKER = "<!-- api-banner -->";

/**
 * Retire les images relatives `../logos/...` (badges de footer des README de
 * paquets) : TypeDoc recopie ces README dans `docs/api/<pkg>/index.md`, mais
 * le chemin relatif ne résout plus à ce nouvel emplacement et VitePress échoue
 * à la build. On neutralise ces images dans tous les fichiers générés.
 *
 * Utilise `withFileTypes` (un seul appel système, pas de `stat` séparé) et lit
 * chaque fichier en une passe — pas de `existsSync`/`statSync` préalable, pour
 * éviter tout schéma vérification-puis-usage (TOCTOU).
 */
const stripLogoImages = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      stripLogoImages(full);
    } else if (entry.name.endsWith(".md")) {
      const before = readFileSync(full, "utf8");
      const after = before
        // Images markdown vers logos/ : ![alt](.../logos/x.svg)
        .replace(/!\[[^\]]*\]\([^)]*logos\/[^)]*\)/g, "")
        // Balises <img> HTML vers logos/ : <img src="../logos/x.svg" ...>
        .replace(/<img\b[^>]*\blogos\/[^>]*>/g, "");
      if (after !== before) writeFileSync(full, after);
    }
  }
};

const BANNER = `${MARKER}

# Référence API

> **Page générée, en anglais.** Cette référence est produite automatiquement
> par TypeDoc à partir des commentaires du code source (JSDoc/TSDoc). Elle
> liste les **signatures publiques** — fonctions, types, classes — de chaque
> paquet. Contrairement au reste de la documentation, elle est en **anglais**
> (le code et ses commentaires le sont ; voir
> [ADR 0013](../decisions/0013-documentation-public-non-expert-fr.md)).
>
> Pour comprendre **par où entrer dans le code** et **comment les paquets
> s'articulent**, commencez plutôt par
> [Comprendre le code](../architecture/comprendre-le-code.md) et la
> [carte des paquets](../architecture/packages.md).

`;

// 1. Nettoie les images de logo qui casseraient la build VitePress.
stripLogoImages(API_DIR);

// 2. Préfixe l'index du bandeau explicatif. On lit directement (pas de
// `existsSync` préalable : cela créerait un schéma vérification-puis-usage,
// TOCTOU) et on traite l'absence du fichier comme l'erreur attendue.
let content;
try {
  content = readFileSync(INDEX, "utf8");
} catch (error) {
  if (error.code === "ENOENT") {
    console.error(
      `api-index-banner: ${INDEX} introuvable (lance \`typedoc\` d'abord).`,
    );
    process.exit(1);
  }
  throw error;
}
if (content.startsWith(MARKER)) {
  console.log("API index banner already present.");
  process.exit(0);
}

// TypeDoc émet un premier titre « # Documentation » : on le remplace par notre
// bandeau (qui porte son propre titre « # Référence API »).
const withoutLeadingTitle = content.replace(/^#\s+Documentation\s*\n+/, "");
writeFileSync(INDEX, BANNER + withoutLeadingTitle);
console.log(`Wrote API index banner to ${INDEX}`);
