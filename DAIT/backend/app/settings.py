from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DAIT_", env_file=".env", extra="ignore")

    app_name: str = "DAIT API"
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_exp_minutes: int = 60 * 24

    sqlite_path: str = "dait.db"
    cors_origins: str = "http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://localhost:5177,http://localhost:5178,http://localhost:5179,http://localhost:5180,http://localhost:5181,http://localhost:5182,http://localhost:5183,http://localhost:5184,http://localhost:5185,http://localhost:5186,http://localhost:5187,http://localhost:5188,http://localhost:5189,http://localhost:5190"

    # Resolved relative to backend/app/; model is at project_root/model/
    model_path: str = "../../model/thrombus_model.keras"
    image_size: int = 224

    # Where uploaded study images are stored (relative to backend/ by default).
    storage_dir: str = "storage"

    # Set by packaged launcher; used for session heartbeats + /api/runtime.
    shutdown_token: str = ""
    idle_shutdown_seconds: int = Field(default=45, ge=15, le=600)


settings = Settings()

