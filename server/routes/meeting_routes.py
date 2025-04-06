from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from . import meeting_bp  # Ensure you have created a Blueprint named meeting_bp
from models import db, User, MeetingRequest, MeetingRecipient

@meeting_bp.route('/meetings/request', methods=['POST'])
@jwt_required()
def create_meeting_request():
    """
    Create a meeting request with one or more recipients.
    Expected JSON payload:
    {
        "recipients": [1, 2, 3],
        "purpose": "Project sync",
        "schedule_start": "2025-04-10T09:00:00",
        "schedule_end": "2025-04-10T10:00:00",
        "google_meet_link": "https://meet.google.com/abc-defg-hij",
        "notes": "Please review the attached agenda."
    }
    """
    data = request.json
    current_user_id = get_jwt_identity()

    # Validate required fields
    recipients = data.get('recipients', [])
    if not recipients or not isinstance(recipients, list):
        return jsonify({'message': 'At least one recipient is required'}), 400

    try:
        schedule_start = datetime.fromisoformat(data['schedule_start'])
        schedule_end = datetime.fromisoformat(data['schedule_end'])
        if schedule_end <= schedule_start:
            return jsonify({'message': 'End time must be after start time'}), 400
    except Exception as e:
        return jsonify({'message': 'Invalid date format for schedule times'}), 400

    if not data.get('purpose') or not data.get('google_meet_link'):
        return jsonify({'message': 'Purpose and Video Meet link are required'}), 400

    # Create the meeting request
    meeting = MeetingRequest(
        requestor_id=current_user_id,
        purpose=data['purpose'],
        schedule_start=schedule_start,
        schedule_end=schedule_end,
        google_meet_link=data['google_meet_link'],
        notes=data.get('notes')
    )
    db.session.add(meeting)
    db.session.flush()  # Flush to obtain meeting.id

    # Create a MeetingRecipient entry for each recipient
    for rec_id in recipients:
        meeting_recipient = MeetingRecipient(
            meeting_id=meeting.id,
            recipient_id=rec_id
        )
        db.session.add(meeting_recipient)

    db.session.commit()

    # TODO: Trigger notifications to recipients here.

    return jsonify({
        'message': 'Meeting request sent successfully',
        'meeting': meeting.to_dict()
    }), 200


@meeting_bp.route('/meetings/<int:meeting_id>/approve', methods=['PUT'])
@jwt_required()
def approve_meeting_request(meeting_id):
    """
    Approve a meeting request for the current recipient.
    """
    current_user_id = get_jwt_identity()
    meeting_recipient = MeetingRecipient.query.filter_by(
        meeting_id=meeting_id, recipient_id=current_user_id
    ).first()
    if not meeting_recipient:
        return jsonify({'message': 'Meeting request not found for this user'}), 404

    if meeting_recipient.status != 'pending':
        return jsonify({'message': 'Meeting request has already been responded to'}), 400

    meeting_recipient.status = 'approved'
    meeting_recipient.responded_at = datetime.utcnow()
    db.session.commit()

    # Optionally notify the requestor here.

    return jsonify({'message': 'Meeting approved successfully'}), 200


@meeting_bp.route('/meetings/<int:meeting_id>/reject', methods=['PUT'])
@jwt_required()
def reject_meeting_request(meeting_id):
    """
    Reject a meeting request for the current recipient.
    Expected JSON payload (optional):
    {
        "reason": "Optional reason for rejection"
    }
    """
    current_user_id = get_jwt_identity()
    meeting_recipient = MeetingRecipient.query.filter_by(
        meeting_id=meeting_id, recipient_id=current_user_id
    ).first()
    if not meeting_recipient:
        return jsonify({'message': 'Meeting request not found for this user'}), 404

    if meeting_recipient.status != 'pending':
        return jsonify({'message': 'Meeting request has already been responded to'}), 400

    data = request.json or {}
    meeting_recipient.status = 'rejected'
    meeting_recipient.response_reason = data.get('reason')
    meeting_recipient.responded_at = datetime.utcnow()
    db.session.commit()

    # Optionally notify the requestor here.

    return jsonify({'message': 'Meeting rejected successfully'}), 200


@meeting_bp.route('/meetings/incoming', methods=['GET'])
@jwt_required()
def get_incoming_meetings():
    """
    Get all pending meeting requests received by the current user.
    """
    current_user_id = get_jwt_identity()
    meeting_recipients = MeetingRecipient.query.filter_by(
        recipient_id=current_user_id, 
        status='pending'
    ).all()
    meetings = [mr.meeting.to_dict() for mr in meeting_recipients]
    return jsonify({'meetings': meetings}), 200



@meeting_bp.route('/meetings/outgoing', methods=['GET'])
@jwt_required()
def get_outgoing_meetings():
    """
    Get all meeting requests sent by the current user.
    """
    current_user_id = get_jwt_identity()
    meetings = MeetingRequest.query.filter_by(requestor_id=current_user_id).all()
    return jsonify({'meetings': [meeting.to_dict() for meeting in meetings]}), 200


@meeting_bp.route('/meetings/received', methods=['GET'])
@jwt_required()
def get_received_meetings():
    """
    Get all meeting requests received by the current user.
    """
    current_user_id = get_jwt_identity()
    meeting_recipients = MeetingRecipient.query.filter_by(recipient_id=current_user_id).all()
    meetings = [mr.meeting.to_dict() for mr in meeting_recipients]
    return jsonify({'meetings': meetings}), 200


@meeting_bp.route('/meetings/<int:meeting_id>/start-call', methods=['PUT'])
@jwt_required()
def start_call(meeting_id):
    """
    Mark a meeting as having started its video call.
    Only the sender (requestor) is allowed to start the call.
    """
    current_user_id = get_jwt_identity()
    meeting = MeetingRequest.query.get_or_404(meeting_id)
    
    # Only allow the requestor to start the call.
    if meeting.requestor_id != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403

    meeting.call_started = True  # Set the call_started flag to True.
    db.session.commit()

    return jsonify({'message': 'Call started successfully', 'meeting': meeting.to_dict()}), 200
