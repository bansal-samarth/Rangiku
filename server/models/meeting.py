from . import db
from datetime import datetime

class MeetingRequest(db.Model):
    __tablename__ = 'meeting_request'
    
    id = db.Column(db.Integer, primary_key=True)
    requestor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    purpose = db.Column(db.String(255), nullable=False)
    schedule_start = db.Column(db.DateTime, nullable=False)
    schedule_end = db.Column(db.DateTime, nullable=False)
    google_meet_link = db.Column(db.String(255), nullable=False)
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to the recipients
    recipients = db.relationship('MeetingRecipient', backref='meeting', cascade="all, delete-orphan")

    def to_dict(self):
        return {
            'id': self.id,
            'requestor_id': self.requestor_id,
            'purpose': self.purpose,
            'schedule_start': self.schedule_start.isoformat(),
            'schedule_end': self.schedule_end.isoformat(),
            'google_meet_link': self.google_meet_link,
            'notes': self.notes,
            'created_at': self.created_at.isoformat(),
            'recipients': [r.to_dict() for r in self.recipients]
        }

class MeetingRecipient(db.Model):
    __tablename__ = 'meeting_recipient'
    
    id = db.Column(db.Integer, primary_key=True)
    meeting_id = db.Column(db.Integer, db.ForeignKey('meeting_request.id'), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, approved, rejected
    response_reason = db.Column(db.String(255))
    responded_at = db.Column(db.DateTime)

    def to_dict(self):
        return {
            'id': self.id,
            'meeting_id': self.meeting_id,
            'recipient_id': self.recipient_id,
            'status': self.status,
            'response_reason': self.response_reason,
            'responded_at': self.responded_at.isoformat() if self.responded_at else None
        }
