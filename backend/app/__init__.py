import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv

# Load .env before anything reads os.environ, otherwise the startup key check
# below fires a false "GROQ_API_KEY not set" warning
load_dotenv()

DEFAULT_ORIGINS = [
    # Vite dev server (see frontend/vite.config.ts), on both hostnames -
    # 127.0.0.1 and localhost are different origins to a browser.
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    # `vite preview`, for checking a production build against a local backend
    "http://localhost:4173",
    "http://127.0.0.1:4173",
    "http://localhost:3000",  # Added for React dev server
    "https://resume-ai-rework.vercel.app",
    "https://resumeai.live",
    "https://www.resumeai.live",
]

def get_allowed_origins():
    """Allowed browser origins: the defaults above plus anything in
    CORS_ORIGINS (comma separated).

    Additive on purpose - CORS_ORIGINS was previously read by nothing, and
    the value in use does not list the production domain, so treating it as
    an override would have taken resumeai.live offline.
    """
    configured = os.environ.get("CORS_ORIGINS", "")
    extra = [origin.strip() for origin in configured.split(",") if origin.strip()]
    
    origins = list(DEFAULT_ORIGINS)
    for origin in extra:
        if origin not in origins:
            origins.append(origin)
    return origins

def create_app():
    app = Flask(__name__)

    # One policy for every route. The /api/* rules used to allow "*", which
    # left the AI assistant endpoints callable from any site on the internet
    # and spending this project's Groq quota.
    CORS(app, resources={
        r"/*": {
            "origins": get_allowed_origins(),
            "methods": ["GET", "POST", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    # Set maximum file upload size (10MB)
    app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

    # Validate Groq API key on startup
    if not os.environ.get('GROQ_API_KEY'):
        print("WARNING: GROQ_API_KEY environment variable not set!")
        print("Please set your Groq API key: export GROQ_API_KEY=your_key_here")
        print("Get your free API key at: https://console.groq.com/keys")
    else:
        print("Groq API key found")

    from app.routes.routes import routes
    from app.routes.ai_assistant import ai_bp
    from app.gmail_routes import gmail_routes

    # Register routes
    app.register_blueprint(routes)
    app.register_blueprint(gmail_routes)
    app.register_blueprint(ai_bp)

    return app
