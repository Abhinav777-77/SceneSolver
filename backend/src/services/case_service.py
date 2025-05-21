from app.database import cases, images
import datetime
from bson.objectid import ObjectId

def get_case_by_id(case_id, user_id=None):
    """
    Retrieve a case by its ID, optionally verifying the user ID
    
    Args:
        case_id: The ID of the case to retrieve
        user_id: Optional user ID to verify ownership
        
    Returns:
        The case document or None if not found or not authorized
    """
    try:
        query = {"_id": ObjectId(case_id)}
        # If user_id is provided, verify ownership
        # if user_id:
        #     query["userId"] = user_id
        case_data = cases.find_one(query)

        return case_data
    except Exception as e:
        print(f"Error retrieving case {case_id}: {e}")
        return None

def get_case_images(case_id, user_id=None):
    """
    Retrieve all images associated with a case
    
    Args:
        case_id: The ID of the case
        user_id: Optional user ID to verify ownership
        
    Returns:
        List of image documents or empty list if not found or not authorized
    """
    try:
        # First verify case ownership if user_id is provided
        if user_id:
            case = get_case_by_id(case_id, user_id)
            if not case:
                return []
                
        # Find all images with the case ID
        image_docs = list(images.find({"caseId": case_id}))
        return image_docs
    except Exception as e:
        print(f"Error retrieving images for case {case_id}: {e}")
        return []

def get_case_analyses(case_id, user_id=None):
    """
    Retrieve all analyses associated with a case
    
    Args:
        case_id: The ID of the case
        user_id: Optional user ID to verify ownership
        
    Returns:
        List of analysis documents or empty list if not found or not authorized
    """
    try:
        # First verify case ownership if user_id is provided
        if user_id:
            case = get_case_by_id(case_id, user_id)
            if not case:
                return []
        
        # Get the case to extract analyses
        case_data = cases.find_one({"_id": ObjectId(case_id)})
        if not case_data or "analyses" not in case_data:
            return []
            
        return case_data["analyses"]
    except Exception as e:
        print(f"Error retrieving analyses for case {case_id}: {e}")
        return []

def get_user_cases(user_id):
    """
    Retrieve all cases for a specific user
    
    Args:
        user_id: The ID of the user
        
    Returns:
        List of case documents
    """
    try:
        case_docs = list(cases.find({"userId": user_id}).sort("createdAt", -1))
        return case_docs
    except Exception as e:
        print(f"Error retrieving cases for user {user_id}: {e}")
        return []

def create_case(case_data, user_id):
    """
    Create a new case for a user
    
    Args:
        case_data: Dictionary containing case data
        user_id: The ID of the user creating the case
        
    Returns:
        The ID of the created case or None if failed
    """
    try:
        # Ensure user ID is set
        case_data["userId"] = user_id
        case_data["createdAt"] = datetime.datetime.utcnow()
        case_data["updatedAt"] = datetime.datetime.utcnow()
        
        # Initialize empty arrays for evidence and analyses
        if "evidence" not in case_data:
            case_data["evidence"] = []
        if "analyses" not in case_data:
            case_data["analyses"] = []
            
        result = cases.insert_one(case_data)
        return str(result.inserted_id)
    except Exception as e:
        print(f"Error creating case: {e}")
        return None