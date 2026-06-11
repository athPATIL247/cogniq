from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    redis_url: str = "redis://localhost:6379"
    postgres_url: str = "postgresql://cogniq:cogniq@localhost:5432/cogniq"
    mongo_url: str = "mongodb://localhost:27017/cogniq"
    risk_engine_port: int = 8000
    secret_key: str = "cogniq-dev-secret"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
