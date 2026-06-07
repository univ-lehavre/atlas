import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  firstH1,
  hasDescriptionParagraph,
  normalizeName,
  h1MatchesName,
  exportSubpaths,
  binNames,
  relativeMarkdownLinks,
  adrReferences,
  staleAdrCounts,
  navLinks,
  findOrphanPages,
} from "./documentation.mjs";

describe("firstH1", () => {
  it("extrait le premier titre H1", () => {
    assert.equal(firstH1("# Mon paquet\n\ntexte"), "Mon paquet");
  });

  it("ignore les titres de niveau inférieur", () => {
    assert.equal(firstH1("## Sous-titre\n\n# Vrai titre"), "Vrai titre");
  });

  it("renvoie null en l'absence de H1", () => {
    assert.equal(firstH1("texte sans titre"), null);
  });

  it("rogne les espaces", () => {
    assert.equal(firstH1("#   Titre espacé   "), "Titre espacé");
  });
});

describe("hasDescriptionParagraph", () => {
  it("détecte un paragraphe de prose après le H1", () => {
    assert.equal(
      hasDescriptionParagraph("# Titre\n\nCeci est une description."),
      true,
    );
  });

  it("rejette un README réduit à un titre", () => {
    assert.equal(hasDescriptionParagraph("# Titre seul\n"), false);
  });

  it("ne compte pas un sous-titre comme description", () => {
    assert.equal(hasDescriptionParagraph("# Titre\n\n## Installation"), false);
  });

  it("ne compte pas une puce comme description", () => {
    assert.equal(hasDescriptionParagraph("# Titre\n\n- un point"), false);
  });

  it("ne compte pas une citation comme description", () => {
    assert.equal(hasDescriptionParagraph("# Titre\n\n> note"), false);
  });

  it("ignore le contenu d'un bloc de code", () => {
    assert.equal(hasDescriptionParagraph("# Titre\n\n```\ncode\n```\n"), false);
  });

  it("accepte une prose qui suit un bloc de code", () => {
    assert.equal(
      hasDescriptionParagraph("# Titre\n\n```\ncode\n```\n\nUne phrase."),
      true,
    );
  });

  it("renvoie false sans H1", () => {
    assert.equal(hasDescriptionParagraph("juste du texte"), false);
  });
});

describe("normalizeName", () => {
  it("retire le scope, les tirets et la casse", () => {
    assert.equal(normalizeName("@univ-lehavre/atlas-crf-core"), "crfcore");
  });

  it("retire un scope arbitraire", () => {
    assert.equal(normalizeName("@scope/Mon-Paquet"), "monpaquet");
  });
});

describe("h1MatchesName", () => {
  it("accepte un H1 égal au nom court", () => {
    assert.equal(
      h1MatchesName("crf-core", "@univ-lehavre/atlas-crf-core"),
      true,
    );
  });

  it("tolère le suffixe -cli absent du titre", () => {
    assert.equal(
      h1MatchesName("atlas-biblio", "@univ-lehavre/atlas-biblio-cli"),
      true,
    );
  });

  it("accepte un titre verbeux contenant le nom", () => {
    assert.equal(
      h1MatchesName(
        "Le paquet crf-core (domaine)",
        "@univ-lehavre/atlas-crf-core",
      ),
      true,
    );
  });

  it("rejette un titre sans rapport", () => {
    assert.equal(
      h1MatchesName("Tout autre chose", "@univ-lehavre/atlas-crf-core"),
      false,
    );
  });
});

describe("exportSubpaths", () => {
  it("liste les sous-chemins hors '.' et './package.json'", () => {
    const pkg = {
      exports: {
        ".": {},
        "./package.json": "./package.json",
        "./brands": {},
        "./errors": {},
      },
    };
    assert.deepEqual(exportSubpaths(pkg), ["./brands", "./errors"]);
  });

  it("renvoie un tableau vide sans exports", () => {
    assert.deepEqual(exportSubpaths({}), []);
  });

  it("ignore un exports de type chaîne", () => {
    assert.deepEqual(exportSubpaths({ exports: "./index.js" }), []);
  });
});

describe("binNames", () => {
  it("liste les clés d'un bin objet", () => {
    assert.deepEqual(
      binNames({ bin: { "crf-redcap": "./a.js", "crf-server": "./b.js" } }),
      ["crf-redcap", "crf-server"],
    );
  });

  it("dérive un nom d'un bin chaîne", () => {
    assert.deepEqual(
      binNames({ name: "@univ-lehavre/atlas-net-cli", bin: "./bin.js" }),
      ["atlas-net-cli"],
    );
  });

  it("renvoie un tableau vide sans bin", () => {
    assert.deepEqual(binNames({}), []);
  });
});

describe("relativeMarkdownLinks", () => {
  it("capture les liens relatifs vers des .md", () => {
    const md = "voir [a](./a.md) et [b](../docs/b.md#ancre)";
    assert.deepEqual(relativeMarkdownLinks(md), ["./a.md", "../docs/b.md"]);
  });

  it("ignore les liens http et les ancres pures", () => {
    const md = "[x](https://e.com/y.md) [z](#section)";
    assert.deepEqual(relativeMarkdownLinks(md), []);
  });

  it("ignore les liens absolus", () => {
    assert.deepEqual(relativeMarkdownLinks("[a](/abs/a.md)"), []);
  });
});

describe("adrReferences", () => {
  it("capture un ADR cible d'un lien Markdown", () => {
    const md = "[ADR](../decisions/0005-effect-pour-la-pf.md)";
    assert.deepEqual(adrReferences(md), ["0005-effect-pour-la-pf"]);
  });

  it("capture avec une ancre", () => {
    const md = "[ADR](../decisions/0013-doc-fr.md#contexte)";
    assert.deepEqual(adrReferences(md), ["0013-doc-fr"]);
  });

  it("ignore une mention en prose ou en code span", () => {
    const md = "créer `docs/decisions/0028-futur.md` plus tard";
    assert.deepEqual(adrReferences(md), []);
  });

  it("ignore une URL absolue vers un autre dépôt", () => {
    const md =
      "[ADR cluster](https://github.com/univ-lehavre/cluster/blob/main/docs/decisions/0004-erasure-coding.md)";
    assert.deepEqual(adrReferences(md), []);
  });

  it("capture un lien interne mais pas l'URL absolue dans le même texte", () => {
    const md =
      "voir [local](../decisions/0029-x.md) et [distant](https://h/decisions/0099-y.md)";
    assert.deepEqual(adrReferences(md), ["0029-x"]);
  });
});

describe("staleAdrCounts", () => {
  it("signale un compteur obsolète", () => {
    assert.deepEqual(staleAdrCounts("lire les 35 ADR du dépôt", 52), [
      "35 ADR",
    ]);
  });

  it("ne signale rien quand le compteur est exact", () => {
    assert.deepEqual(staleAdrCounts("lire les 52 ADR du dépôt", 52), []);
  });

  it("capture plusieurs compteurs obsolètes", () => {
    assert.deepEqual(staleAdrCounts("43 ADR hier, 35 ADR avant", 52), [
      "43 ADR",
      "35 ADR",
    ]);
  });

  it("ignore la prose sans le motif « N ADR »", () => {
    assert.deepEqual(staleAdrCounts("les ADR du dépôt, ADR 0052", 52), []);
  });
});

describe("navLinks", () => {
  it("collecte les dossiers autogénérés de la sidebar Starlight", () => {
    const cfg = `items: [{ autogenerate: { directory: "decisions" } }]`;
    const { directories } = navLinks(cfg);
    assert.ok(directories.has("decisions"));
  });

  it("collecte les liens explicites (sans slash final)", () => {
    const cfg = `{ label: "Glossaire", link: "/glossary/" }`;
    const { links } = navLinks(cfg);
    assert.ok(links.has("glossary"));
  });

  it("collecte plusieurs dossiers et liens", () => {
    const cfg = `
      { label: "A", items: [{ autogenerate: { directory: "architecture" } }] },
      { label: "B", link: "/api/" },
    `;
    const { directories, links } = navLinks(cfg);
    assert.deepEqual([...directories].sort(), ["architecture"]);
    assert.deepEqual([...links].sort(), ["api"]);
  });
});

describe("findOrphanPages", () => {
  it("repère une page dont le dossier n'est pas dans la sidebar", () => {
    const pages = ["quality/security", "perdu/orpheline"];
    const nav = { directories: new Set(["quality"]), links: new Set() };
    assert.deepEqual(findOrphanPages(pages, nav), ["perdu/orpheline"]);
  });

  it("ne signale jamais la page d'accueil", () => {
    const nav = { directories: new Set(), links: new Set() };
    assert.deepEqual(findOrphanPages(["index"], nav), []);
  });

  it("couvre toute page d'un dossier autogénéré", () => {
    const pages = ["decisions/0001-x", "decisions/parcours"];
    const nav = { directories: new Set(["decisions"]), links: new Set() };
    assert.deepEqual(findOrphanPages(pages, nav), []);
  });

  it("couvre une page liée explicitement", () => {
    const pages = ["glossary"];
    const nav = { directories: new Set(), links: new Set(["glossary"]) };
    assert.deepEqual(findOrphanPages(pages, nav), []);
  });
});
