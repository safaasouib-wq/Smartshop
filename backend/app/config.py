"""Configuration centralisée — toutes les valeurs viennent des variables d'environnement (.env)."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    # Base de données
    DATABASE_URL: str = "postgresql://smartshop:smartshop@db:5432/smartshop"

    # Telegram (canal principal)
    TELEGRAM_BOT_TOKEN: str = ""
    TELEGRAM_API_URL: str = "https://api.telegram.org"
    # chat_id Telegram du commerçant → reçoit une alerte à chaque escalade (vide = désactivé)
    TELEGRAM_COMMERCANT_CHAT_ID: str = ""

    # WhatsApp Cloud API (Meta) — canal optionnel. Vide = canal désactivé.
    WHATSAPP_TOKEN: str = ""              # jeton d'accès (temporaire 24h ou permanent)
    WHATSAPP_PHONE_NUMBER_ID: str = ""    # identifiant du numéro expéditeur (pas le numéro lui-même)
    WHATSAPP_VERIFY_TOKEN: str = ""       # chaîne inventée, partagée avec la config webhook Meta
    WHATSAPP_API_URL: str = "https://graph.facebook.com/v20.0"

    # LLM — API compatible OpenAI (Groq gratuit, ou Ollama en local)
    LLM_API_KEY: str = ""
    LLM_BASE_URL: str = "https://api.groq.com/openai/v1"  # ou http://localhost:11434/v1 pour Ollama
    LLM_MODEL: str = "openai/gpt-oss-120b"  # Groq a retiré les Llama 3.x ; gpt-oss gère bien le function-calling
    LLM_TRANSCRIPTION_MODEL: str = "whisper-large-v3"  # transcription des messages vocaux (Groq Whisper)

    # Sécurité dashboard
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 480

    # Comportement de l'assistant
    MAX_HISTORY_MESSAGES: int = 12       # mémoire conversationnelle (N derniers messages)


settings = Settings()
