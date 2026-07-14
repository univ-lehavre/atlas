"""Test de la provenance figée du modèle d'embedding (model_provenance.py, lot 5).

Copie du littéral de citation (parité stricte, ADR 0055/0057) : on vérifie que la révision
HF et les sha256 sont bien figés et cohérents (4 fichiers, sha non vides)."""

from scholar_network_dagster import model_provenance as mp


def test_provenance_is_pinned():
    """Révision HF épinglée (commit hash, pas 'main') + 4 fichiers avec sha256."""
    assert mp.HF_REPO == "Xenova/all-MiniLM-L6-v2"
    assert len(mp.HF_REVISION) == 40  # commit hash figé
    assert set(mp.FILES) >= {
        "onnx/model_quantized.onnx",
        "tokenizer.json",
        "tokenizer_config.json",
        "config.json",
    }


def test_file_sha256_maps_local_names_to_hashes():
    """file_sha256 : chaque nom local → un sha256 de 64 hexchars (vérif d'intégrité)."""
    shas = mp.file_sha256()
    assert "model_quantized.onnx" in shas
    for name, sha in shas.items():
        assert len(sha) == 64, name
        assert all(c in "0123456789abcdef" for c in sha), name
