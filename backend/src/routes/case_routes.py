from flask import Blueprint, request, jsonify
from bson.json_util import dumps
import json
import traceback
from middleware.auth import require_jwt as token_required
from model.case import Case  # Import your Case model

# Create Blueprint without a trailing slash
case_bp = Blueprint('cases', __name__)

# Define the route at the root path
@case_bp.route('', methods=['GET'])  # Note: no slash here
@token_required
def get_cases():
    try:
        # Get user_id from query parameters
        user_id = request.args.get('user_id')
        print("the id is " ,user_id)
        # If no user_id in query params, try to get from token
        if not user_id and hasattr(request, 'user') and hasattr(request.user, 'user_id'):
            user_id = request.user.user_id
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        
        # Find cases by user_id
        cases = list(Case.find_by_user_id(user_id))
        
        # Convert ObjectId to string for JSON serialization
        cases_json = json.loads(dumps(cases))
        
        return jsonify(cases_json), 200
    except Exception as e:
        print(f"Error getting cases: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@case_bp.route('/create', methods=['POST'])
@token_required
def create_case():
    try:
        data = request.get_json()
        
        # Get user_id from request body or query parameters
        user_id = data.get('user_id') or request.args.get('user_id')
        
        # If no user_id in request, try to get from token
        if not user_id and hasattr(request, 'user') and hasattr(request.user, 'user_id'):
            user_id = request.user.user_id
        
        if not user_id:
            return jsonify({"error": "User ID is required"}), 400
        
        # Create new case
        new_case = Case(
            title=data.get('title'),
            user_id=user_id,
            description=data.get('description', ''),
            case_type=data.get('type', 'Unspecified'),
            status=data.get('status', 'New'),
            location=data.get('location', ''),
            date_of_incident=data.get('dateOfIncident'),
            tags=data.get('tags', [])
        )
        
        # Save the case
        case_id = new_case.save()
        
        return jsonify({
            "message": "Case created successfully", 
            "case_id": str(case_id)
        }), 201
    except Exception as e:
        print(f"Error creating case: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@case_bp.route('/<case_id>', methods=['GET'])
@token_required
def get_case(case_id):
    try:
        # Find case by ID
        case = Case.find_by_id(case_id)
        
        if not case:
            return jsonify({"error": "Case not found"}), 404
        
        # Convert ObjectId to string for JSON serialization
        case_json = json.loads(dumps(case))
        
        return jsonify(case_json), 200
    except Exception as e:
        print(f"Error getting case: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@case_bp.route('/<case_id>', methods=['PUT'])
@token_required
def update_case(case_id):
    try:
        data = request.get_json()
        
        # Find case by ID
        case = Case.find_by_id(case_id)
        
        if not case:
            return jsonify({"error": "Case not found"}), 404
        
        # Update case fields
        updates = {}
        if 'title' in data:
            updates['title'] = data['title']
        if 'description' in data:
            updates['description'] = data['description']
        if 'type' in data:
            updates['case_type'] = data['type']
        if 'status' in data:
            updates['status'] = data['status']
        if 'location' in data:
            updates['location'] = data['location']
        if 'dateOfIncident' in data:
            updates['date_of_incident'] = data['dateOfIncident']
        if 'tags' in data:
            updates['tags'] = data['tags']
        
        # Always update last_updated timestamp
        updates['last_updated'] = datetime.utcnow()
        
        # Update case in database
        result = Case.update(case_id, updates)
        
        if result:
            return jsonify({"message": "Case updated successfully"}), 200
        else:
            return jsonify({"error": "Failed to update case"}), 500
    except Exception as e:
        print(f"Error updating case: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

@case_bp.route('/<case_id>', methods=['DELETE'])
@token_required
def delete_case(case_id):
    try:
        # Find case by ID
        case = Case.find_by_id(case_id)
        
        if not case:
            return jsonify({"error": "Case not found"}), 404
        
        # Delete case and related data
        result = Case.delete(case_id)
        
        if result:
            return jsonify({"message": "Case deleted successfully"}), 200
        else:
            return jsonify({"error": "Failed to delete case"}), 500
    except Exception as e:
        print(f"Error deleting case: {e}")
        traceback.print_exc()
        return jsonify({"error": "Server error"}), 500

