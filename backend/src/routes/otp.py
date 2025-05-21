from flask import Blueprint, request, jsonify, current_app, make_response
from flask_mail import Message
from datetime import datetime, timedelta
import random
import traceback
import jwt
from config.config import JWT_SECRET
# from auth import token_required  # Your JWT middleware
from middleware.auth import require_jwt as token_required  
# from config.config import mail     # Flask-Mail instance
from config.config import mail
otp_bp = Blueprint('otp', __name__)

# In-memory OTP store (for demo)
otp = {
    'mailcode': None,
    'email': None,
    'expiresAt': None,
}

OTP_EXPIRATION_SECONDS = 45

# Send OTP Email
def send_otp_email(email, code):
    try:
        msg = Message(
            subject="Your OTP Code",
            sender=current_app.config['MAIL_USERNAME'],
            recipients=[email],
            body=f"Your OTP code is: {code}\n\nThis code will expire in {OTP_EXPIRATION_SECONDS} seconds."
        )
        mail.send(msg)
        print(f"OTP sent to {email}")
    except Exception as e:
        print("Error sending OTP:", e)

# -------------------------------
# Resend OTP Route
# -------------------------------
@otp_bp.route('/resend-otp', methods=['POST', 'OPTIONS'])
def resend_otp():
    print("OTP route accessed with method:", request.method)
    
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        response = make_response('', 204)
        # Add CORS headers manually
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-auth-token, Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        return response

    try:
        # Get token from x-auth-token header
        token = request.headers.get('x-auth-token')
        print("Token received:", token[:10] if token and len(token) > 10 else token)
        
        if not token:
            print("No token provided")
            return jsonify({"error": "Unauthorized: No token provided"}), 401
        
        try:
            # Verify token
            payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            print("Token decoded successfully:", payload)
        except jwt.ExpiredSignatureError:
            print("Token expired")
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError as e:
            print("Invalid token:", e)
            return jsonify({"error": f"Invalid token: {str(e)}"}), 401
        
        # Get email from request body
        data = request.get_json()
        print("Request data:", data)
        
        email = data.get('email')
        if not email:
            # Try to get email from token payload
            email = payload.get('email')
            if not email and 'user' in payload and 'email' in payload['user']:
                email = payload['user']['email']
        
        if not email:
            print("No email provided")
            return jsonify({"error": "Email is required"}), 400
        
        print("Using email:", email)
        
        # Generate OTP
        generated_otp = str(random.randint(100000, 999999))
        otp['mailcode'] = generated_otp
        otp['email'] = email
        
        # Set expiration time (current time + 45 seconds)
        expiry_time = datetime.utcnow() + timedelta(seconds=OTP_EXPIRATION_SECONDS)
        otp['expiresAt'] = expiry_time
        
        # Format the expiry time as ISO 8601 for JavaScript
        expiry_iso = expiry_time.isoformat() + 'Z'  # Add Z to indicate UTC
        
        print("Generated OTP:", generated_otp)
        print("Expiry time:", expiry_time)
        print("Expiry ISO:", expiry_iso)
        
        send_otp_email(email, generated_otp)
        print("OTP sent successfully")
        
        # Create response with CORS headers
        response = jsonify({
            'status': 200,
            'message': 'OTP sent successfully. Valid for 45 seconds.',
            'expiresAt': expiry_iso
        })
        
        # Add CORS headers manually
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 200

    except Exception as e:
        print("Server error:", e)
        traceback.print_exc()  # Print full error trace
        
        # Create error response with CORS headers
        response = jsonify({'error': f'Internal server error: {str(e)}'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# -------------------------------
# Verify OTP Route
# -------------------------------
@otp_bp.route('/verify-otp', methods=['POST'])
@token_required
def verify_otp():
    data = request.get_json()
    user_otp = data.get('otp')

    if not otp['mailcode']:
        return jsonify({'status': 500, 'message': 'OTP not generated. Please resend OTP.'}), 500

    if datetime.utcnow() > otp['expiresAt']:
        otp['mailcode'] = None
        return jsonify({'status': 401, 'message': 'OTP has expired. Please request a new one.'}), 401

    if user_otp == otp['mailcode']:
        otp['mailcode'] = None  # Invalidate OTP
        return jsonify({'status': 200, 'message': 'Login successful'}), 200
    else:
        return jsonify({'status': 401, 'message': 'Invalid OTP'}), 401

# -------------------------------
# Test Route
# -------------------------------
@otp_bp.route('/test', methods=['GET'])
def test_route():
    return jsonify({'message': 'OTP routes are working'})
