---
title: "0080 — Capture assistée des drifts au point d'échec"
---

## Contexte

Atlas tient un **registre de drifts** ([ADR 0056](/atlas/decisions/0056-registre-drifts/)) :
un catalogue YAML indexé des écarts révélés à l'exécution. On y appelle _drift_
un écart qui n'apparaît qu'au _run end-to-end_ (abrégé _e2e_ — test complet du
système en conditions réalistes, sur le banc), invisible au _lint_ (analyse
statique du code) et aux tests unitaires ; et _piège de revue_ un bug subtil
attrapé en revue de code, pas au run. Le registre vise les **leçons** — il
consigne les écarts _marquants_, porteurs d'une leçon réutilisable — et **non
l'exhaustivité** : « la pertinence ‹ marquant › relève de la revue humaine ; le
registre n'est pas un journal exhaustif de tous les bugs »
([ADR 0056](/atlas/decisions/0056-registre-drifts/)).

Un utilisateur l'a dit simplement : **« il est difficile de noter tous les
drifts »**. Le diagnostic est moins une question d'exhaustivité que de **moment**
et de **coût**. Le registre est alimenté **100 % à la main et après coup** : on
revient sur l'écart une fois la session refroidie, on reconstitue de mémoire le
symptôme exact, on calcule le prochain identifiant, on ouvre l'issue de suivi à la
main, on espère ne pas s'être trompé sur la forme.

**Risque — l'information froide.** Au moment où l'information est la plus fraîche
— l'instant précis où le run échoue, message d'erreur à l'écran — **rien ne
capture**. Quand la discipline reprend la main, l'info est **froide** et le
symptôme se reconstitue de mémoire.

**Risque — l'entrée non conforme.** Un registre durci au build
([ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/),
volet a) ne sert sa mémoire que s'il est **alimenté** sans casser la chaîne : une
entrée non close écrite sans son issue de suivi fait **échouer `docs:build`** (la
génération du site de documentation Astro, qui valide les collections, donc la
CI). L'oubli d'issue, le mauvais identifiant, la regex ratée : autant de gestes
exacts mais oubliables qui transforment une bonne intention en build cassé.

C'est un **déséquilibre** dans un dépôt par ailleurs entièrement outillé. Le
formatage est imposé par Prettier, le code par le _lint_, la cohérence
documentaire par `pnpm audit:docs`
([ADR 0052](/atlas/decisions/0052-charte-redactionnelle-documentation/)), le
miroir doc ↔ specs par un test, la matrice E2E par un schéma
([ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)).
Partout, une obligation de qualité dispose d'un **appui mécanique**. La saisie des
drifts est la seule corvée laissée **entièrement à la discipline humaine, sans
appui**. Et cette obligation existe déjà, formellement :
l'[ADR 0073](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/)
pose que « tout écart révélé au run est corrigé dans le code ET consigné au
registre de drifts », et qu'« un drift révélé au run sans entrée au registre est
signalé » en revue. Ce qui manque n'est donc **pas une règle de plus**, mais un
**outil qui rende l'obligation peu coûteuse**, donc respectée plus souvent.
Durcir la porte de sortie (le build refuse l'entrée malformée) sans faciliter
l'entrée, c'est armer une pièce dans laquelle on n'entre plus.

Une frontière encadre la conception. Le run _DataOps_ (la chaîne d'ingestion et
de traitement de données du dépôt, en Python natif) le plus riche tourne sur le
**banc Lima** (cluster Kubernetes mono-nœud local), qui vit dans le dépôt voisin
`cluster` et se déclenche par _GitOps_ (un opérateur de réconciliation — Argo CD —
applique l'état déclaré dans un dépôt de manifestes). Or Atlas **ne sonde pas un
cluster vivant** : la frontière de responsabilité de
l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) lui interdit
d'aller capturer un écart _depuis_ l'infrastructure cluster. Tout dispositif de
capture devra donc vivre **côté Atlas**, accroché à son propre harnais de test,
sans traverser la frontière.

## Décision

> **On outille la _consignation_ d'un drift, jamais sa _décision_. Au point
> d'échec d'un run du harnais Atlas, un dispositif local capture à chaud un
> brouillon de drift — jamais commité ; une commande de promotion le transforme
> ensuite en entrée conforme du registre. Le jugement « cet écart est-il
> marquant ? » reste 100 % humain : le run ne consigne jamais rien tout seul.**

### Volet (a) — Capture au point d'échec : un brouillon local, jamais commité

On dote le harnais de test Atlas de deux capteurs symétriques, **côté Atlas
uniquement**. Un _reporter_ Playwright — un greffon que le pilote de navigateur
_Playwright_ appelle au fil d'un test pour en rapporter l'issue, enregistré par
configuration dans chaque `playwright.config.ts` concerné — pour les _smoke_
(test de fumée : vérification minimale que le système démarre et répond) et e2e
applicatifs. Et un _hook_ pytest — une fonction de rappel que le lanceur de tests
Python _pytest_ invoque à un moment défini de son cycle, déclarée dans le
`conftest.py` (fichier de configuration que pytest charge automatiquement) du
paquet — pour les runs DataOps locaux. Sur **échec** d'un run, le capteur écrit un
_brouillon_ : un squelette d'entrée de drift dans un fichier `.draft` **local,
gitignoré (exclu du suivi de version via `.gitignore`), jamais commité**. Le
`symptome` du brouillon est le **message d'erreur capturé à chaud** ; les champs
de jugement (`cause`, `correctif`, `nature`, `portee`) restent vides, à remplir
par l'humain.

_Pourquoi un brouillon gitignoré, et non un commit automatique de l'entrée ?_
Parce que la décision d'entrée n'est **pas mécanisable**. Le registre de
l'[ADR 0056](/atlas/decisions/0056-registre-drifts/) ne consigne que les écarts
_marquants_, et ce filtre « est-ce une leçon réutilisable ? » relève
explicitement « de la revue humaine ». Un run qui commiterait chaque échec
transformerait le registre en **journal exhaustif de bugs** — exactement ce que
l'[ADR 0056](/atlas/decisions/0056-registre-drifts/) refuse — et noierait les
leçons sous le bruit. Le brouillon gitignoré tranche proprement : la machine
**tend** une capture fraîche, l'humain **juge**, complète et décide. Le prix est
qu'un échec non promu ne laisse aucune trace versionnée — c'est voulu : un écart
trivial **ne doit pas** en laisser.

_Pourquoi deux capteurs distincts, et non un script unique enveloppant les deux
lanceurs ?_ Parce que Playwright et pytest exposent chacun leur **point
d'extension natif** : le reporter `onTestEnd(test, result)` côté Playwright (qui
reçoit le statut et le message d'erreur du test échoué), le hook
`pytest_runtest_makereport` côté pytest (qui reçoit le rapport du test, avec son
message — là où `pytest_sessionfinish` ne reçoit que le code de sortie agrégé et
**perdrait le symptôme exact**). S'y greffer est plus robuste qu'un wrapper commun
qui re-parserait les sorties textuelles des deux lanceurs. Corollaire assumé : le
capteur ne se déclenche que sur **échec**, pas sur _skip_ — or un run DataOps
s'auto-saute quand le banc local est absent, donc **la capture à chaud des écarts
d'environnement de banc reste partielle** ; ces cas-là restent saisis à la main,
ce que ce dispositif n'aggrave pas.

_Pourquoi côté Atlas, et non une capture depuis le banc cluster ?_ Parce que le
banc vit dans le dépôt `cluster` et qu'Atlas **ne sonde pas un cluster vivant**
([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)). Le capteur
s'attache au **harnais de test d'Atlas**, là où il s'exécute — c'est-à-dire aux
runs pytest et Playwright **locaux**. Il **ne couvre pas** le run GitOps réconcilié
par Argo CD sur le banc Lima : ce run-là relève de l'infrastructure cluster, et sa
capture reste manuelle, du bon côté de la frontière 0033.

### Volet (b) — Promotion par CLI : du brouillon à l'entrée conforme

On ajoute une commande de promotion, **`pnpm drift:new`**, sur le modèle des
générateurs déjà présents sous `scripts/` (`docs:generate` en Node `.mjs`,
`stats:generate` et `crf:fixtures:generate` en TypeScript via `tsx`, déjà
outillé) — donc **sans dépendance nouvelle**. Invoquée par l'humain qui a jugé
l'écart marquant, elle **promeut** un brouillon en entrée conforme : elle calcule
le **prochain identifiant `Dnn`** (préfixe `D` suivi d'un entier — format
`/^D\d+$/` du schéma ; valeur = plus grand `Dnn` existant + 1, jamais le
comblement d'un trou, car les identifiants sont **stables, jamais réutilisés ni
renumérotés**, [ADR 0056](/atlas/decisions/0056-registre-drifts/)), reprend le
`symptome` capturé à chaud, pose les champs énumérés, et **crée l'issue de suivi**
via `gh issue create` (l'interface en ligne de commande GitHub, déjà présente dans
l'environnement) en **injectant le numéro retourné** dans le champ `issue` (au
format `/^#\d+$/`). L'entrée naissante au statut `ouvert` ou `en-cours` est ainsi
**conforme d'emblée** : le `superRefine` (règle de validation transverse de _Zod_,
la bibliothèque de schémas qui valide les collections de contenu) **exige** une
issue pour ces statuts, faute de quoi `docs:build` casse.

Le cas nominal de
l'[ADR 0073](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/)
reste un drift **corrigé dans le code et consigné `corrige` dans la même PR** : le
CLI sert aussi ce cas (l'issue est alors facultative). Le statut `ouvert` /
`en-cours` vise l'écart **identifié mais non résoluble immédiatement** — c'est
lui, et lui seul, qui exige l'issue, et c'est précisément là que l'oubli coûte un
build cassé. Outiller ce cas n'encourage pas à laisser des drifts ouverts : cela
rend simplement conforme et tracé l'écart qu'on ne peut pas fermer tout de suite,
fidèle à l'esprit « un changement se reflète dans la même trace » de
l'[ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/).

_Pourquoi un CLI de promotion, et non un simple template à copier-coller ?_ Parce
que le coût n'est pas dans la _frappe_ du squelette, il est dans les **gestes
mécaniques exacts mais oubliables** : calculer le bon `Dnn` sans collision,
respecter `/^#\d+$/`, ne pas omettre l'issue qui ferait casser le build. Un
template laisse ces gestes à la main, donc à l'erreur ; le CLI les exécute
correctement, à tout coup. Il automatise la **corvée**, pas le jugement : l'humain
a déjà décidé que l'écart était marquant en lançant `drift:new`.

_Pourquoi créer l'issue depuis le CLI, et dans quel ordre ?_ Parce que c'est
précisément le point de friction qui produit aujourd'hui des entrées non
conformes : on écrit le drift `ouvert`, on remet l'issue « à plus tard », le build
casse. Le CLI crée donc l'issue **d'abord** (en mode non interactif, titre et
corps fournis ; l'issue naît sur le dépôt de l'`origin`, c'est-à-dire le tracker
d'Atlas où vit le registre), récupère son numéro, **puis** écrit l'entrée complète
en un seul geste : ainsi un échec d'écriture laisse au pire une issue orpheline
(récupérable), jamais une entrée `ouvert` **sans** issue qui casserait le build.
Si `gh` est absent, non authentifié, ou si la création échoue, le CLI **échoue
bruyamment** sans rien écrire au registre — pas d'entrée non conforme silencieuse.

_Comment écrire le YAML sans casser le format ?_ Le registre est un **tableau de
premier niveau** (contrainte du loader `file()` d'Astro — le chargeur qui lit
toute la collection depuis cet unique fichier), précédé d'un **en-tête de
commentaires** et composé de scalaires repliés à la main. Le CLI **ajoute** donc le
nouveau bloc en fin de fichier (_append_), sans re-parser ni re-sérialiser
l'existant — ce qui préserve l'en-tête, l'ordre et le repli des entrées
antérieures, et évite d'introduire une bibliothèque YAML (qui détruirait les
commentaires et serait une dépendance nouvelle). Le brouillon `.draft` est un
**fragment réinjectable** : un fichier par run (en cas d'exécutions parallèles, un
fichier par worker), que la promotion lit puis efface ; la mise en forme finale
(repli, espacement) est laissée à Prettier au commit.

## Alternatives écartées

- **« Capture entièrement automatique qui commit l'entrée au registre sur chaque
  échec. »** Écarté : viole le jugement humain de
  l'[ADR 0056](/atlas/decisions/0056-registre-drifts/). Le registre vise les écarts
  _marquants_, filtre qui « relève de la revue humaine » ; commiter chaque échec en
  ferait un **journal exhaustif de bugs** et noierait les leçons. La machine capture
  à chaud, l'humain décide.

- **« Un simple fichier template à copier-coller. »** Écarté : il laisse à la main
  les gestes mécaniques mais oubliables (calcul du `Dnn` sans collision, format
  `/^#\d+$/`, création et liaison de l'issue), donc à l'erreur — l'oubli d'issue
  fait casser `docs:build`. Le coût n'est pas la frappe du squelette, il est dans
  l'**exactitude**.

- **« Un wrapper unique enveloppant Playwright et pytest. »** Écarté : il devrait
  re-parser les sorties textuelles de deux lanceurs hétérogènes, fragile, là où
  chacun offre un point d'extension natif typé (`onTestEnd`,
  `pytest_runtest_makereport`). Deux capteurs minces valent mieux qu'un wrapper qui
  devine.

- **« Re-sérialiser le registre avec une bibliothèque YAML. »** Écarté : un
  aller-retour _load → dump_ **détruit l'en-tête de commentaires** et altère le
  repli des entrées existantes, et imposerait une **dépendance nouvelle** (aucune
  lib YAML n'est aujourd'hui importable depuis `scripts/`). L'_append_ d'un bloc en
  fin de fichier préserve l'existant sans rien ajouter au socle.

- **« Capturer le drift depuis le banc cluster. »** Écarté : cela ferait **franchir
  la frontière** [ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/) —
  sonder un cluster vivant relève de l'infrastructure. Le capteur s'attache au
  harnais Atlas local ; le run GitOps sur Lima reste hors champ, sa capture
  manuelle.

- **« Brouillon versionné (commité), revu en PR puis nettoyé. »** Écarté : un
  fichier de brouillon dans l'arbre Git bruite chaque diff et invite à le promouvoir
  « pour ne pas le laisser traîner », ré-introduisant l'exhaustivité refusée. Le
  `.draft` gitignoré garde la capture **strictement locale** jusqu'à la décision
  humaine.

## Statut

Accepted (2026-06-26). **Outille** l'[ADR 0056](/atlas/decisions/0056-registre-drifts/)
et l'[ADR 0073](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/)
sans en changer aucune décision : le critère « marquant », les identifiants
stables et l'obligation de consigner « tout écart révélé au run » restent
inchangés ; l'alimentation, jusqu'ici **manuelle et après coup**, devient une
**capture assistée à chaud** promue par un geste humain délibéré, ce qui rend
l'obligation existante **peu coûteuse**, donc plus probable. C'est un ajout
d'outil, pas une nouvelle décision sur le registre : cet ADR **n'amende ni ne
remplace** 0056, et l'index n'a pas à le rebadger de ce fait.

**Prolonge** l'[ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)
(registre _vivant_) en deux temps. D'une part, le CLI rend conforme d'emblée une
entrée non close en créant et liant son issue, du bon côté du `superRefine`.
D'autre part, le présent ADR **assume formellement l'extension du statut
`en-cours`** : le schéma `content.config.ts` exige déjà une issue pour `ouvert`
**et** `en-cours`, alors que l'[ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)
volet (a) ne visait que `ouvert` et que le registre n'a encore aucune entrée non
close ; cet ADR consigne cette extension et l'aligne (l'en-tête de commentaires du
registre, qui ne liste que `corrige | caduc | ouvert`, est complété de `en-cours`
dans la même PR).

Régularisation connexe (dans la même PR) : l'[ADR 0056](/atlas/decisions/0056-registre-drifts/)
a été amendé par l'[ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/)
(registre durci au build) mais son `## Statut` et l'index le portaient encore
`Accepted` ; les deux passent à « Amended by 0071 » **des deux côtés**, conformément
à la convention d'index (cohérence vérifiée par `pnpm audit:docs`,
[ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/),
volet b).

## Conséquences

**Bénéfices.** Le déséquilibre se ferme : la saisie des drifts gagne l'**appui
mécanique** que tout le reste du dépôt possède déjà. Le `symptome` est capturé au
point d'échec, info fraîche, plus reconstitué de mémoire. La promotion produit une
entrée **conforme d'emblée** — bon `Dnn`, issue créée et liée, du bon côté du
`superRefine` — qui ne fait pas casser `docs:build`. L'obligation de
l'[ADR 0073](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/)
devient **réaliste à tenir** : « il est difficile de noter tous les drifts » cesse
d'être un coût qui décourage la consignation.

**Prix à payer.** Le dispositif n'est **pas quasi gratuit** au sens du loader natif
de l'[ADR 0056](/atlas/decisions/0056-registre-drifts/) : trois surfaces à porter
dans trois runtimes — un _reporter_ Playwright (TypeScript), un _hook_ pytest
(Python), un script `drift:new` (Node) — plus une entrée `.gitignore` et une entrée
`package.json`. C'est proportionné au problème, pas anecdotique. La promotion
**dépend de `gh`** — assumé : `gh` est déjà présent, et son absence fait échouer
bruyamment. La capture reste **partielle par conception** : un écart non promu, un
_skip_ d'environnement, un run GitOps sur le banc ne laissent aucune trace
automatique — revers volontaire du choix « ne pas tout consigner » et de la
frontière 0033.

**Garde-fous.**

- **En revue de PR**, le brouillon `.draft` n'est **jamais commité** (gitignoré) ;
  une entrée de drift apparaît dans la PR **uniquement** par promotion humaine
  délibérée. Un drift révélé au run sans entrée au registre reste signalé en revue
  ([ADR 0073](/atlas/decisions/0073-corriger-le-code-pas-l-etat-garde-fou-cible/)).
- **Le jugement « marquant » reste humain** : le run ne consigne jamais rien tout
  seul — il tend un brouillon, l'humain juge
  ([ADR 0056](/atlas/decisions/0056-registre-drifts/)).
- **Le CLI échoue bruyamment** si `gh` est absent, non authentifié ou si la création
  d'issue échoue, et crée l'issue **avant** d'écrire l'entrée, plutôt que de
  produire une entrée `ouvert` / `en-cours` sans issue qui casserait `docs:build`
  ([ADR 0071](/atlas/decisions/0071-meta-gouvernance-documentaire-et-matrice-e2e/),
  volet a).
- **Identifiants stables, collision surveillée en revue** : `drift:new` calcule
  `Dnn = max + 1` et ne réutilise jamais un trou ; deux promotions concurrentes sur
  deux branches pouvant viser le même `Dnn`, l'absence de doublon d'identifiant se
  **vérifie au merge** ([ADR 0056](/atlas/decisions/0056-registre-drifts/)).
- **Aucune marque dans les identifiants** : le dispositif ne nomme ni établissement
  ni marque dans ses identifiants
  ([ADR 0035](/atlas/decisions/0035-depot-generaliste-ouvert/)) ; il vit **côté
  Atlas** et ne sonde aucun cluster vivant
  ([ADR 0033](/atlas/decisions/0033-contrat-interface-cluster/)).
- **Aucune dépendance nouvelle** : le CLI se range sous `scripts/` (TypeScript via
  `tsx`, sur le modèle des générateurs existants), écrit le YAML en _append_ sans
  bibliothèque tierce ; `gh` est déjà présent (esprit
  [ADR 0056](/atlas/decisions/0056-registre-drifts/) — le loader natif a suffi).
