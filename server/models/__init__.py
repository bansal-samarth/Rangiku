from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import models after db is defined to avoid circular imports
from .user import User
from .visitor import Visitor
from .meeting import MeetingRequest, MeetingRecipient
from .chat import ChatMessage