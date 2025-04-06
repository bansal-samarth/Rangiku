from flask import Blueprint

# Create blueprints
auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')
visitor_bp = Blueprint('visitor', __name__, url_prefix='/api')
dashboard_bp = Blueprint('dashboard', __name__, url_prefix='/api')
meeting_bp = Blueprint('meeting', __name__, url_prefix='/api')
chat_bp = Blueprint('chat', __name__, url_prefix='/api')


# Import routes after blueprints are defined
from .auth_routes import *
from .visitor_routes import *
from .dashboard_routes import *
from .meeting_routes import *
from .chat_routes import *