"""Pattern Adapter — interface commune à tous les canaux de messagerie (exigence F1.3).

Pour ajouter un canal (ex: WhatsApp), il suffit de créer une classe qui implémente
cette interface, sans toucher au cœur métier. C'est l'argument d'extensibilité (NF6)
à présenter en soutenance.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass
class IncomingMessage:
    """Format interne unique : tout message entrant est normalisé dans cette structure."""
    canal: str                 # "telegram" | "whatsapp"
    identifiant_canal: str     # identifiant du client sur ce canal (chat_id, wa_id...)
    nom_client: str
    texte: str


class MessagingChannel(ABC):
    """Contrat que chaque adapter de messagerie doit respecter."""

    @property
    @abstractmethod
    def nom_canal(self) -> str:
        """Nom du canal, ex: 'telegram'."""

    @abstractmethod
    def parse_update(self, payload: dict) -> Optional[IncomingMessage]:
        """Transforme le payload brut du webhook en IncomingMessage normalisé.
        Retourne None si le payload n'est pas un message texte exploitable."""

    @abstractmethod
    async def send_message(self, identifiant_canal: str, texte: str) -> None:
        """Envoie un message texte au client sur ce canal."""

    def parse_non_texte(self, payload: dict) -> Optional[str]:
        """Retourne l'identifiant de l'expéditeur si l'update est un message NON-texte
        d'un humain (vocal, image, sticker...) qu'on doit accuser poliment. None sinon.
        Par défaut aucun ; les canaux qui le gèrent surchargent cette méthode."""
        return None
