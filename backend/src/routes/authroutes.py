from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
import datetime
import os
from dotenv import load_dotenv
from config.config import get_mongo_connection      # Assume you connect MongoDB in config/db.py
from middleware.auth import create_token  # From previous auth.py
from model.user import User
# Load .env
load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET", "default_secret")

auth_bp = Blueprint('auth', __name__)
mongo = get_mongo_connection()

# -------------------------------
# Register Route
# -------------------------------
@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'message': 'Email and password required'}), 400

        # Check if user already exists
        existing_user = User.find_one({'email': email})
        if existing_user:
            return jsonify({'message': 'User already exists'}), 400

        # Hash password and save user
        hashed_password = User.hash_password(password)

        new_user = User(email, hashed_password)
            
        # Save user and get the user ID
        user_id = new_user.save()

        # Create JWT token
        token = create_token(email, role='investigator', user_id=str(user_id))

        # Return token and user data
        return jsonify({
            'token': token,
            'user': {
                'id': str(user_id),
                'email': email,
                'role': 'investigator'
            }
        }), 201

    except Exception as e:
        print("Register Error:", e)
        return jsonify({'message': 'Server error'}), 500

# -------------------------------
# Login Route
# -------------------------------
@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'error': 'Email and password required'}), 400

        # Find user
        user = User.find_one({'email': email})
        print("user" , user)
        if not user:
            print("user not found")
            return jsonify({'error': 'User Not Found'}), 400

        # Validate password
        if not User.check_password(user['password'], password):
            return jsonify({'error': 'Invalid credentials'}), 401

        # Create token with user ID
        token = create_token(email, role='investigator', user_id=str(user['_id']))

        # Return token and user data
        return jsonify({
            'token': token,
            'user': {
                'id': str(user['_id']),
                'email': email,
                'role': user.get('role', 'investigator')
            }
        })

    except Exception as e:
        print("Login Error:", e)
        return jsonify({'error': 'Server error'}), 500
