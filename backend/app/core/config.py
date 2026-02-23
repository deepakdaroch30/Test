from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_v1_prefix: str = "/api/v1"
    project_name: str = "qa-orchestrator"
    environment: str = "dev"

    database_url: str = "postgresql+psycopg://postgres:postgres@db:5432/qa_orchestrator"
    redis_url: str = "redis://redis:6379/0"

    jwt_secret: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60

    encryption_key: str = "local-dev-encryption-key"

    admin_email: str = "admin@acme.com"
    admin_password: str = "Admin@123"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
