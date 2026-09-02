"""Utilitaires transverses."""
from datetime import datetime, timezone


def utcnow() -> datetime:
    """UTC courant, *naïf* (sans tzinfo).

    Remplace `datetime.utcnow()` (déprécié depuis Python 3.12) tout en conservant la
    sémantique existante du projet : toutes les colonnes DateTime sont naïves et stockées
    en UTC. On évite ainsi les comparaisons naïf/aware qui lèveraient une TypeError.
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
