from fastapi.middleware.cors import CORSMiddleware
import os

# Should be configured securely for production (e.g., specific domains)
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

def add_cors_middleware(app):
    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
