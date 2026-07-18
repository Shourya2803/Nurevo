import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "nurevo_db"
    JWT_SECRET: str = "super_secret_jwt_signing_key_change_in_production_1234567890"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    MAGIC_LINK_EXPIRE_MINUTES: int = 15
    SMTP_HOST: str = "smtp.mailtrap.io"
    SMTP_PORT: int = 2525
    SMTP_USER: str = "test_smtp_user"
    SMTP_PASSWORD: str = "test_smtp_password"
    SMTP_FROM_EMAIL: str = "no-reply@nurevo.com"
    SMTP_FROM_NAME: str = "Nurevo"
    FRONTEND_URL: str = "http://localhost:5173"

    # Supabase Config
    SUPABASE_URL: str = "https://your-project.supabase.co"
    SUPABASE_KEY: str = "your-service-role-key"
    SUPABASE_BUCKET: str = "nurevo-documents"

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
