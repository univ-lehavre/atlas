import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { nextDriftId, renderEntry } from "./promote-draft.mjs";

describe("nextDriftId", () => {
  it("prend le plus grand Dnn + 1", () => {
    const yaml = "- id: D1\n- id: D2\n- id: D23\n";
    assert.equal(nextDriftId(yaml), "D24");
  });

  it("ne comble jamais un trou (identifiants stables, ADR 0056)", () => {
    // D2 manquant : on prend quand même max + 1, pas le trou.
    const yaml = "- id: D1\n- id: D3\n";
    assert.equal(nextDriftId(yaml), "D4");
  });

  it("part de D1 sur un registre vide", () => {
    assert.equal(nextDriftId("# en-tête seul\n"), "D1");
  });

  it("ignore un Dnn cité dans un commentaire de prose (ancré sur `id:`)", () => {
    const yaml = "# voir D99 dans le texte\n- id: D5\n";
    assert.equal(nextDriftId(yaml), "D6");
  });
});

describe("renderEntry — conformité au schéma du registre (content.config.ts)", () => {
  // Invariants du schéma Zod, vérifiés sans instancier Zod : id /^D\d+$/,
  // nature/portee/statut dans leurs énumérations, issue /^#\d+$/ exigée si non clos.
  const NATURES = ["drift-e2e", "piege-revue"];
  const PORTEES = ["code", "env", "harnais"];
  const STATUTS = ["corrige", "caduc", "ouvert", "en-cours"];

  /** Parse minimal du bloc rendu : récupère les champs scalaires de premier niveau. */
  const fields = (block) => {
    const out = {};
    for (const line of block.split("\n")) {
      const m = line.match(/^[-\s]*\b(id|nature|portee|statut|issue):\s*(.+)$/);
      if (m) out[m[1]] = m[2].replace(/^"|"$/g, "").trim();
    }
    return out;
  };

  it("produit une entrée corrigée valide (sans issue)", () => {
    const block = renderEntry({
      id: "D24",
      campagne: "run e2e — exemple",
      nature: "drift-e2e",
      portee: "code",
      symptome: "Au run, le job échoue avec « X ».",
      cause: "Variable d'env ignorée des tests.",
      correctif: "Déclarée dans le Deployment.",
      statut: "corrige",
    });
    const f = fields(block);
    assert.match(f.id, /^D\d+$/);
    assert.ok(NATURES.includes(f.nature));
    assert.ok(PORTEES.includes(f.portee));
    assert.ok(STATUTS.includes(f.statut));
    assert.equal(f.issue, undefined, "pas d'issue pour un statut clos");
    assert.match(
      block,
      /^\n- id: D24$/m,
      "élément de tableau de premier niveau",
    );
  });

  it("inclut l'issue au format #NNN pour un statut non clos", () => {
    const block = renderEntry({
      id: "D25",
      campagne: "écart ouvert",
      nature: "drift-e2e",
      portee: "env",
      symptome: "Lenteur du banc.",
      cause: "Slots de volume saturés.",
      correctif: "À suivre.",
      statut: "ouvert",
      issue: "#42",
    });
    const f = fields(block);
    assert.equal(f.statut, "ouvert");
    assert.match(f.issue, /^#\d+$/);
  });

  it("replie les scalaires longs en >- (format maison)", () => {
    const long = "lorem ipsum ".repeat(30);
    const block = renderEntry({
      id: "D26",
      campagne: "c",
      nature: "piege-revue",
      portee: "harnais",
      symptome: long,
      cause: "c",
      correctif: "c",
      statut: "caduc",
    });
    assert.match(block, /symptome: >-\n/, "scalaire long replié en >-");
    // Chaque ligne de continuation est indentée à 4 espaces.
    const symptomeLines = block
      .split("symptome: >-\n")[1]
      .split("\n")
      .filter((l) => l.startsWith("    "));
    assert.ok(
      symptomeLines.length >= 2,
      "repli sur plusieurs lignes indentées",
    );
  });
});
