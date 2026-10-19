from fastapi.middleware.cors import CORSMiddleware
import os

ALLOWED_ORIGINS_RAW = os.getenv("ALLOWED_ORIGINS", "*")

def add_cors_middleware(app):
    origins = [o.strip() for o in ALLOWED_ORIGINS_RAW.split(",") if o.strip()]
    if "*" in origins or not origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origin_regex=r"^https?://.*",
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    else:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
