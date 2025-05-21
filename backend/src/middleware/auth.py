import os
import jwt
import datetime
from functools import wraps
from flask import request, jsonify
from dotenv import load_dotenv

# Load env vars
load_dotenv()
JWT_SECRET = os.getenv("JWT_SECRET", "default_secret")  # fallback for dev

# -------------------
# Token Creation
# -------------------
def create_token(email, role='investigator', user_id=None):
    """Create a JWT token with user information"""
    payload = {
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
        'iat': datetime.datetime.utcnow(),
        'sub': email,
        'role': role
    }
    
    # Add user_id to payload if provided
    if user_id:
        payload['user_id'] = user_id
    
    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm='HS256'
    )

# -------------------
# JWT Middleware
# -------------------
def require_jwt(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)

        auth_header = request.headers.get("Authorization")
        token = None

        # Try to get the token from the Authorization or x-auth-token headers
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            token = request.headers.get("x-auth-token")

        if not token:
            return jsonify({"error": "Unauthorized: No token provided"}), 401

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            request.user = payload  # Set user info on the request
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401

        return f(*args, **kwargs)
    return decorated
