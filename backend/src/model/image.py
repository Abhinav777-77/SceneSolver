from flask import Flask
import hashlib
from flask_pymongo import PyMongo
from config.config import get_mongo_connection
from datetime import datetime
from bson import ObjectId
import requests
from config.config import MONGODB_URI

# Initialize Flask app and extensions
# Replace with your MongoDB URI
mongo = get_mongo_connection()

# Image Model (MongoDB)
class I:
    def __init__(self, case_id, user_id, file_path=None, metadata=None, analysis_results=None):
        self.case_id = case_id
        self.user_id = user_id
        self.file_path = file_path
        self.metadata = metadata or {}
        self.analysis_results = analysis_results or {}
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()
       
    def save(self):
        # Save image to MongoDB
        try:
            # Download image from Cloudinary URL
            response = requests.get(self.file_path)
            response.raise_for_status()
            file_data = response.content

            # Compute hash of image
            file_hash = hashlib.sha256(file_data).hexdigest()

            # Check if image with the same hash already exists
            existing_image = mongo.db.images.find_one({'file_hash': file_hash})
            if existing_image:
                print("Image already exists with _id:", existing_image['_id'])
                return existing_image['_id']

            # Insert image metadata
            image_data = self.__dict__.copy()
            image_data['_id'] = ObjectId()
            image_data['file_hash'] = file_hash

            mongo.db.images.insert_one(image_data)
            self.update_case_with_image(image_data['_id'])
            print("New image inserted with _id:", image_data['_id'])
            return image_data['_id']
        except requests.RequestException as e:
            print(f"Error downloading image: {e}")
            return None

    def update_case_with_image(self, image_id):
        try:
            # Update the case with the image reference
            mongo.db.cases.update_one(
                {'_id': ObjectId(self.case_id)},
                {
                    '$addToSet': {'images': image_id},  # Add image ID to the case's images array
                    '$set': {'last_updated': datetime.utcnow()}  # Update last updated timestamp
                }
            )
        except Exception as error:
            print(f"Error updating case with image: {error}")

    def update_user_with_image(self, image_id):
        try:
            # Update the user with the image reference
            mongo.db.users.update_one(
                {'_id': ObjectId(self.user_id)},
                {
                    '$addToSet': {'images': image_id},  # Add image ID to the user's images array
                    '$set': {'last_updated': datetime.utcnow()}  # Update last updated timestamp
                }
            )
        except Exception as error:
            print(f"Error updating user with image: {error}")
    def delete(self):
        try:
            # Delete the image from MongoDB
            mongo.db.images.delete_one({'_id': self.__dict__['_id']})
            
            # Remove image reference from case
            mongo.db.cases.update_one(
                {'_id': ObjectId(self.case_id)},
                {
                    '$pull': {'images': self.__dict__['_id']},
                    '$set': {'last_updated': datetime.utcnow()}
                }
            )
            
            # Remove image reference from user
            mongo.db.users.update_one(
                {'_id': ObjectId(self.user_id)},
                {
                    '$pull': {'images': self.__dict__['_id']},
                    '$set': {'last_updated': datetime.utcnow()}
                }
            )
            
            return True
        except Exception as error:
            print(f"Error deleting image: {error}")
            return False

    @staticmethod
    def get_by_id(image_id):
        try:
            # Find image by ID
            image_data = mongo.db.images.find_one({'_id': ObjectId(image_id)})
            if not image_data:
                return None
                
            # Create Image instance from data
            image = Image(
                case_id=image_data.get('case_id'),
                user_id=image_data.get('user_id'),
                file_path=image_data.get('file_path'),
                metadata=image_data.get('metadata', {}),
                analysis_results=image_data.get('analysis_results', {})
            )
            
            # Add the _id field
            image.__dict__['_id'] = image_data.get('_id')
            image.__dict__['created_at'] = image_data.get('created_at')
            image.__dict__['updated_at'] = image_data.get('updated_at')
            
            return image
        except Exception as error:
            print(f"Error getting image by ID: {error}")
            return None

    @staticmethod
    def get_by_case_id(case_id):
        try:
            # Find all images for a case
            images_data = mongo.db.images.find({'case_id': case_id})
            return list(images_data)
        except Exception as error:
            print(f"Error getting images by case ID: {error}")
            return []

    @staticmethod
    def get_by_user_id(user_id):
        try:
            # Find all images for a user
            images_data = mongo.db.images.find({'user_id': user_id})
            return list(images_data)
        except Exception as error:
            print(f"Error getting images by user ID: {error}")
            return []
    @staticmethod
    def get_id_by_file_hash(file_hash):
        try:
            image_data = mongo.db.images.find_one({'file_hash': file_hash})
            if image_data:
                return str(image_data['_id'])  # Return as string for consistency
            return None
        except Exception as error:
            print(f"Error getting image ID by file hash: {error}")
            return None


