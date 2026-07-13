"""Embedding sémantique par publication (étape 4, lot 3).

Module **pur** (aucune I/O Dagster ni S3) : il charge le modèle ONNX (téléchargé
hors git par ``scripts/fetch_model.py``, figé dans l'image au build) et calcule
des vecteurs(384), pour être testable hors réseau et hors Docker (cache local).

Parité stricte avec le code TS de référence (`packages/researcher-profiles/src/
services/embedding-profile.ts` + `topic-extractor.ts`), qui pilote
`Xenova/all-MiniLM-L6-v2` via `@xenova/transformers` :

  - **texte d'une publication** = labels des topics (score >= 0,3) puis labels des
    keywords (non filtrés), joints par ``", "`` (cf. `topic-extractor.ts:4,31` et
    `embedding-profile.ts:31-35`) ;
  - **vecteur par publication** = mean-pool PONDÉRÉ par l'`attention_mask` au niveau
    token, SANS L2 (xenova `pooling:'mean', normalize:false`) — laissé re-poolable
    pour la purge chirurgicale (ADR 0059) ;
  - **agrégat par author_id** = mean-pool NON pondéré entre publications PUIS un
    unique L2 (`embedding-profile.ts:76`).

Déterminisme (ADR 0057) : `onnxruntime` à 1 thread, exécution séquentielle. Le
`sha256` du Parquet est stable **par architecture** seulement (le bit-exact
cross-archi n'est pas garanti par onnxruntime — ADR 0059).

NB : pas de ``from __future__ import annotations`` (drift D9 : Dagster introspecte
les annotations à l'exécution).
"""

import os
from pathlib import Path

import numpy as np
import onnxruntime as ort
from tokenizers import Tokenizer

# Dimension du modèle all-MiniLM-L6-v2.
EMBEDDING_DIM = 384

# Filtre du TEXTE source, parité TS (topic-extractor.ts:4) : seuls les topics
# >= 0,3 entrent dans le texte ; les keywords ne sont jamais filtrés. C'est
# DISTINCT des seuils de POIDS du mart lexical (lot 2 : topic 0,5 / keyword 0,2).
TEXT_TOPIC_SCORE_MIN = 0.3

# Longueur max de séquence : @xenova/transformers tronque à 256 pour ce modèle
# (le tokenizer_config annonce 512, mais le pipeline xenova plafonne à 256). On
# fige 256 explicitement pour ne pas diverger sur les textes longs.
MAX_LENGTH = 256

# Le modèle n'est PAS versionné dans git (cf. scripts/fetch_model.py) : il est
# téléchargé (révision HF figée + sha256) dans un cache local au build de l'image
# ou avant les tests. ONNX_MODEL_DIR pointe ce répertoire ; à défaut, un cache
# sous le paquet (gitignoré). Le code ne dépend jamais d'un chemin en dur.
_DEFAULT_MODEL_DIR = Path(__file__).parent / "models" / "all-MiniLM-L6-v2"


def model_dir():
    """Répertoire du modèle (surchargé par ONNX_MODEL_DIR si défini).

    Le modèle y est déposé par ``scripts/fetch_model.py`` — jamais committé.
    """
    override = os.environ.get("ONNX_MODEL_DIR")
    return Path(override) if override else _DEFAULT_MODEL_DIR


def work_to_text(topic_labels, keyword_labels):
    """Texte d'une publication, parité `embedding-profile.ts:31-35`.

    ``topic_labels`` : labels des topics DÉJÀ filtrés (score >= TEXT_TOPIC_SCORE_MIN),
    dans l'ordre de la provenance ; ``keyword_labels`` : labels des keywords (tous).
    Joints par ``", "``. Renvoie ``""`` si aucun label (publication sans texte).
    """
    return ", ".join([*topic_labels, *keyword_labels])


class Embedder:
    """Session ONNX + tokenizer, chargés une fois, déterministes (1 thread)."""

    def __init__(self, model_path=None):
        directory = Path(model_path) if model_path else model_dir()
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = 1
        opts.inter_op_num_threads = 1
        opts.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        self._session = ort.InferenceSession(str(directory / "model_quantized.onnx"), opts)
        self._tokenizer = Tokenizer.from_file(str(directory / "tokenizer.json"))
        self._tokenizer.enable_truncation(max_length=MAX_LENGTH)
        self._input_names = {i.name for i in self._session.get_inputs()}

    def embed_text(self, text):
        """Vecteur(384) d'un texte : mean-pool pondéré par attention_mask, SANS L2.

        Un texte vide renvoie un vecteur nul (parité `embedding-profile.ts:66`).
        """
        if not text:
            return np.zeros(EMBEDDING_DIM, dtype=np.float32)
        enc = self._tokenizer.encode(text)
        ids = np.array([enc.ids], dtype=np.int64)
        mask = np.array([enc.attention_mask], dtype=np.int64)
        feeds = {"input_ids": ids, "attention_mask": mask}
        if "token_type_ids" in self._input_names:
            feeds["token_type_ids"] = np.zeros_like(ids)
        last_hidden = self._session.run(None, feeds)[0]  # (1, seq, 384)
        weights = mask[0][:, None].astype(np.float32)  # (seq, 1)
        pooled = (last_hidden[0] * weights).sum(axis=0) / weights.sum()
        return pooled.astype(np.float32)


def aggregate_author(vectors):
    """Agrège les vecteurs-par-publication d'un author_id : mean-pool NON pondéré
    PUIS L2 (parité `embedding-profile.ts:76` : ``l2Normalize(meanPool(vecs))``).

    ``vectors`` : liste de vecteurs(384) (un par publication du chercheur). Si la
    liste est vide, renvoie un vecteur nul.
    """
    if len(vectors) == 0:
        return np.zeros(EMBEDDING_DIM, dtype=np.float32)
    stacked = np.stack(vectors).astype(np.float32)
    mean = stacked.mean(axis=0)
    norm = float(np.linalg.norm(mean))
    if norm == 0.0:
        return mean.astype(np.float32)
    return (mean / norm).astype(np.float32)
