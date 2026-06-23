"""Provenance FIGÉE du modèle d'embedding `all-MiniLM-L6-v2` — source de vérité unique.

La révision HuggingFace épinglée et le sha256 de chaque fichier vivent ICI (dans le
package), pas dans ``scripts/fetch_model.py`` : ils sont ainsi **importables** à la fois
par le script de téléchargement (build de l'image) ET par l'instrumentation MLflow
(``tracking.py``, étape 4 lot 3 / atlas#397) qui enregistre le modèle au *registry* avec
sa provenance exacte. Une seule définition → pas de divergence sha256 entre le téléchargé
et le déclaré (reproductibilité, ADR 0057/0059).

Aucune dépendance lourde ici (pur littéral) : importable sans coût au démarrage Dagster.
"""

# Révision HuggingFace ÉPINGLÉE de Xenova/all-MiniLM-L6-v2 (même modèle que le code TS
# via @xenova/transformers). Figée par commit hash (pas `main`) pour la reproductibilité.
HF_REPO = "Xenova/all-MiniLM-L6-v2"
HF_REVISION = "751bff37182d3f1213fa05d7196b954e230abad9"

# Fichiers nécessaires + leur sha256 de référence (vérifié à la récupération).
# {chemin distant (resolve/<rev>/<path>): (nom local, sha256)}
FILES = {
    "onnx/model_quantized.onnx": (
        "model_quantized.onnx",
        "afdb6f1a0e45b715d0bb9b11772f032c399babd23bfc31fed1c170afc848bdb1",
    ),
    "tokenizer.json": (
        "tokenizer.json",
        "da0e79933b9ed51798a3ae27893d3c5fa4a201126cef75586296df9b4d2c62a0",
    ),
    "tokenizer_config.json": (
        "tokenizer_config.json",
        "9261e7d79b44c8195c1cada2b453e55b00aeb81e907a6664974b4d7776172ab3",
    ),
    "config.json": (
        "config.json",
        "7135149f7cffa1a573466c6e4d8423ed73b62fd2332c575bf738a0d033f70df7",
    ),
}


def file_sha256() -> dict[str, str]:
    """sha256 par nom de fichier LOCAL (pour tags MLflow et vérification)."""
    return {name: sha for (name, sha) in FILES.values()}
