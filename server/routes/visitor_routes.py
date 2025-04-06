from flask import request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta

from . import visitor_bp
from models import db, User, Visitor
from utils.helpers import generate_qr_code, save_photo, generate_badge_id

@visitor_bp.route('/visitors/not-pre-approve', methods=['POST'])
@jwt_required()
def create_visitor():
    data = request.json
    current_user_id = get_jwt_identity()
    
    # Process photo if provided
    photo_path = None
    if 'photo' in data:
        photo_path = save_photo(data['photo'])
    
    # Generate unique badge ID
    badge_id = generate_badge_id()
    
    # Create new visitor
    new_visitor = Visitor(
        full_name=data['full_name'],
        email=data['email'],
        phone=data['phone'],
        company=data.get('company'),
        purpose=data['purpose'],
        host_id=data['host_id'],
        photo_path=photo_path,
        badge_id=badge_id,
        pre_approved=False
    )
    
    db.session.add(new_visitor)
    db.session.commit()
    
    print(f"Notification sent to host ID {new_visitor.host_id} for visitor {new_visitor.full_name}")
    
    return jsonify({
        'message': 'Visitor registered successfully',
        'visitor': new_visitor.to_dict()
    }), 200




@visitor_bp.route('/visitors/<int:visitor_id>/approve', methods=['PUT'])
@jwt_required()
def approve_visitor(visitor_id):
    current_user_id = get_jwt_identity()
    visitor = Visitor.query.get_or_404(visitor_id)
    
    # Check if the current user is the host or an admin
    if visitor.host_id != current_user_id and User.query.get(current_user_id).role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    visitor.status = 'approved'
    db.session.commit()

    print(f"approval QR code sent to {visitor.email or visitor.phone}")
    
    return jsonify({
        'message': 'Visitor approved',
        'visitor': visitor.to_dict(),
    })




@visitor_bp.route('/visitors/<int:visitor_id>/reject', methods=['PUT'])
@jwt_required()
def reject_visitor(visitor_id):
    current_user_id = get_jwt_identity()
    visitor = Visitor.query.get_or_404(visitor_id)
    
    # Check if the current user is the host or an admin
    if visitor.host_id != current_user_id and User.query.get(current_user_id).role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    visitor.status = 'rejected'
    db.session.commit()

    print(f"rejection sent to {visitor.email or visitor.phone}")
    
    return jsonify({'message': 'Visitor rejected', 'visitor': visitor.to_dict()})




@visitor_bp.route('/visitors/<int:visitor_id>/check-in', methods=['PUT'])
@jwt_required()
def check_in_visitor(visitor_id):
    visitor = Visitor.query.get_or_404(visitor_id)
    
    # Check if visitor is approved
    if visitor.status != 'approved' and visitor.status != 'checked_in':
        return jsonify({'message': 'Visitor Must Be Approved First'}), 400
    
    if visitor.status == 'checked_in':
        return jsonify({'message': 'Visitor Is Already Checked-In'}), 201
    
    # Check if pre-approved visitor is within the approval window
    if visitor.pre_approved:
        now = datetime.now()
        if visitor.approval_window_start and visitor.approval_window_end:
            if not (visitor.approval_window_start <= now <= visitor.approval_window_end):
                return jsonify({'message': 'Approval Window Expired'}), 400
    
    visitor.status = 'checked_in'
    visitor.check_in_time = datetime.now()
    db.session.commit()
    
    return jsonify({'message': 'Visitor checked in', 'visitor': visitor.to_dict()})




@visitor_bp.route('/visitors/<int:visitor_id>/check-out', methods=['PUT'])
@jwt_required()
def check_out_visitor(visitor_id):
    visitor = Visitor.query.get_or_404(visitor_id)
    
    # Check if visitor is checked in
    if visitor.status != 'checked_in' and visitor.status != 'checked_out':
        return jsonify({'message': 'Visitor Must Be Checked-In First'}), 400
    
    if visitor.status == 'checked_out':
        return jsonify({'message': 'Visitor Is Already Checked-Out'}), 201
    
    visitor.status = 'checked_out'
    visitor.check_out_time = datetime.now()
    db.session.commit()

    print(f"Thank you for visiting, {visitor.email or visitor.phone}")
    
    return jsonify({'message': 'Visitor checked out', 'visitor': visitor.to_dict()})




@visitor_bp.route('/visitors', methods=['GET'])
@jwt_required()
def get_visitors():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Filter visitors based on user role
    if current_user.role == 'admin' or current_user.role == 'security':
        # Admins and security can see all visitors
        visitors = Visitor.query.all()
    else:
        # Employees can only see their visitors
        visitors = Visitor.query.filter_by(host_id=current_user_id).all()
    
    return jsonify({'visitors': [visitor.to_dict() for visitor in visitors]})




@visitor_bp.route('/visitors/<int:visitor_id>', methods=['GET'])
@jwt_required()
def get_visitor(visitor_id):
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    visitor = Visitor.query.get_or_404(visitor_id)
    
    # Check if the current user has access to this visitor
    if current_user.role not in ['admin', 'security'] and visitor.host_id != current_user_id:
        return jsonify({'message': 'Unauthorized'}), 403
    
    return jsonify({'visitor': visitor.to_dict()})




@visitor_bp.route('visitors/pre-approve', methods=['POST'])
@jwt_required()
def pre_approve_visitor():
    data = request.json
    current_user_id = get_jwt_identity()
    
    # Check daily limit (e.g., max 5 visitors per employee per day)
    # today = datetime.now().date()
    # tomorrow = today + timedelta(days=1)
    # today_start = datetime.combine(today, datetime.min.time())
    # today_end = datetime.combine(tomorrow, datetime.min.time())
    
    # count = Visitor.query.filter(
    #     Visitor.host_id == current_user_id,
    #     Visitor.pre_approved == True,
    #     Visitor.approval_window_start >= today_start,
    #     Visitor.approval_window_start < today_end
    # ).count()
    
    # if count >= 5:  # Assuming max 5 pre-approvals per day
    #     return jsonify({'message': 'Daily pre-approval limit reached'}), 400
    
    # Process photo if provided
    photo_path = None
    if 'photo' in data:
        photo_path = save_photo(data['photo'])
    
    # Generate unique badge ID
    badge_id = generate_badge_id("PRE")
    
    # Create new pre-approved visitor
    new_visitor = Visitor(
        full_name=data['full_name'],
        email=data['email'],
        phone=data['phone'],
        company=data.get('company'),
        purpose=data['purpose'],
        host_id=current_user_id,
        photo_path=photo_path,
        badge_id=badge_id,
        status='approved',
        pre_approved=True,
        approval_window_start=datetime.fromisoformat(data['approval_window_start']),
        approval_window_end=datetime.fromisoformat(data['approval_window_end'])
    )
    
    db.session.add(new_visitor)
    db.session.commit()

    # checkin_url = f"http://localhost:5000/api/visitors/{new_visitor.id}/check-in"
    # qr_code_image = generate_qr_code(checkin_url)
    
    # Here you would send QR code/e-pass to visitor
    # This is a placeholder for actual notification logic
    print(f"Pre-approval QR code sent to {new_visitor.email or new_visitor.phone}")
    
    return jsonify({'message': 'Visitor pre-approved successfully', 'visitor': new_visitor.to_dict()}), 200


# For Testing Purposes
@visitor_bp.route('/visitors/<int:visitor_id>/pending', methods=['PUT'])
@jwt_required()
def set_visitor_pending(visitor_id):
    current_user_id = get_jwt_identity()
    visitor = Visitor.query.get_or_404(visitor_id)
    
    # Check if the current user is the host or an admin
    if visitor.host_id != current_user_id and User.query.get(current_user_id).role != 'admin':
        return jsonify({'message': 'Unauthorized'}), 403
    
    visitor.status = 'pending'
    db.session.commit()

    print(f"Visitor {visitor.full_name} status set to pending")
    
    return jsonify({'message': 'Visitor status set to pending', 'visitor': visitor.to_dict()})

# @visitor_bp.route('/visitors/mail', methods=['GET'])
# @jwt_required()
# def check_mail(email):
#     mail = BanEmail.query.get(email)
#     if mail:
#         return jsonify({'message': 'Email is banned'}), 400
#     return jsonify({'message': 'Email is not banned'}), 200