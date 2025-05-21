from flask import Flask
from flask_pymongo import PyMongo
from datetime import datetime
from bson import ObjectId
from config.config import get_mongo_connection

mongo = get_mongo_connection()

# Case Model (MongoDB)
class Case:
    def __init__(self, title, user_id, description='', case_type='Unspecified', status='New', location='', date_of_incident=None, tags=None):
        self.title = title
        self.user_id = user_id
        self.description = description
        self.case_type = case_type
        self.status = status
        self.location = location
        self.date_of_incident = date_of_incident if date_of_incident else datetime.utcnow()
        self.tags = tags if tags else []
        self.date = datetime.utcnow()
        self.last_updated = datetime.utcnow()
        self.images = []  # List of Image ObjectIds
    def save(self):
        # Before save: Update lastUpdated timestamp
        self.last_updated = datetime.utcnow()
        
        # Save case to MongoDB
        case_data = self.__dict__
        case_data['_id'] = ObjectId()  # Ensure that MongoDB assigns an ObjectId
        mongo.db.cases.insert_one(case_data)
        
        # Post-save logic: Update the user (add case reference to the user)
        self.update_user_with_case()
        return case_data['_id']

    def update_user_with_case(self):
        try:
            # Update the user with the case reference
            mongo.db.users.update_one(
                {'_id': ObjectId(self.user_id)},
                {
                    '$addToSet': {'cases': self.__dict__['_id']},  # Add case to the user's cases array
                    '$set': {'lastActive': datetime.utcnow()}  # Update last active timestamp
                }
            )
        except Exception as error:
            print(f"Error updating user with case: {error}")

    def delete_related_data(self):
        # Delete related evidence, analyses, reports
        mongo.db.evidence.delete_many({'case_id': str(self._id)})
        mongo.db.analyses.delete_many({'case_id': str(self._id)})
        mongo.db.reports.delete_many({'case_id': str(self._id)})
        mongo.db.cases.delete_one({'_id': self._id})
    
    @staticmethod
    def find_by_id(case_id):
        """Find a case by its ID"""
        try:
            case_data = mongo.db.cases.find_one({'_id': ObjectId(case_id)})
            return case_data
        except Exception as error:
            print(f"Error finding case by ID: {error}")
            return None
    
    @staticmethod
    def find_by_user_id(user_id):
        """Find all cases for a user by their ID"""
        try:
            cases = list(mongo.db.cases.find({'user_id': user_id}))
            return cases
        except Exception as error:
            print(f"Error finding cases by user ID: {error}")
            return []
    @staticmethod
    def add_image_to_case(case_id, image_id):
        try:
            result = mongo.db.cases.update_one(
                {'_id': ObjectId(case_id)},
                {
                    '$addToSet': {'images': image_id},
                    '$set': {'last_updated': datetime.utcnow()}
                }
            )
            return result.modified_count > 0
        except Exception as error:
            print(f"Error adding image to case: {error}")
            return False