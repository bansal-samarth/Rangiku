from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from models import db, ChatMessage

from . import chat_bp

@chat_bp.route('/chat/history', methods=['GET'])
@jwt_required()
def get_chat_history():
    current_user_id = get_jwt_identity()
    path = request.args.get('path', '')
    
    query = ChatMessage.query.filter_by(user_id=current_user_id)
    if path:
        query = query.filter_by(path=path)
        
    messages = query.order_by(ChatMessage.timestamp.asc()).all()
    return jsonify({'messages': [msg.to_dict() for msg in messages]}), 200

@chat_bp.route('/chat/message', methods=['POST'])
@jwt_required()
def save_chat_message():
    current_user_id = get_jwt_identity()
    data = request.json
    
    message = ChatMessage(
        user_id=current_user_id,
        content=data['content'],
        role=data['role'],
        path=data.get('path', '')
    )
    
    db.session.add(message)
    db.session.commit()
    
    return jsonify(message.to_dict()), 201

@chat_bp.route('/chat/system', methods=['POST'])
@jwt_required()
def save_system_context():
    current_user_id = get_jwt_identity()
    data = request.json
    
    message = ChatMessage(
        user_id=current_user_id,
        content=data['content'],
        role='system',
        path=data.get('path', '')
    )
    
    db.session.add(message)
    db.session.commit()
    
    return jsonify(message.to_dict()), 201

# Optionally, add a function to retrieve system messages
@chat_bp.route('/chat/system', methods=['GET'])
@jwt_required()
def get_system_context():
    current_user_id = get_jwt_identity()
    path = request.args.get('path', '')
    
    query = ChatMessage.query.filter_by(user_id=current_user_id, role='system')
    if path:
        query = query.filter_by(path=path)
        
    messages = query.order_by(ChatMessage.timestamp.desc()).limit(1).all()
    return jsonify({'messages': [msg.to_dict() for msg in messages]}), 200