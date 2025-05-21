from flask import Flask
from flask_pymongo import PyMongo
from config.config import get_mongo_connection
from datetime import datetime
from bson import ObjectId
from config.config import MONGODB_URI

# Initialize Flask app and extensions
# Replace with your MongoDB URI
mongo = get_mongo_connection()

# Analysis Model (MongoDB)
class Analysis:
    def __init__(self, case_id, user_id, image_id, predicted_crime, predicted_crime_type, confidence_score, detected_objects=None):
        self.case_id = case_id
        self.user_id = user_id
        self.image_id = image_id
        self.predicted_crime = predicted_crime
        self.predicted_crime_type = predicted_crime_type
        self.confidence_score = confidence_score
        self.detected_objects = detected_objects or []
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def save(self):
        try:
            # 1. Check if an analysis already exists for this user, case, and image
            existing_analysis = mongo.db.analyses.find_one({
                'user_id': self.user_id,
                'case_id': self.case_id,
                'image_id': self.image_id
            })

            if existing_analysis:
                print("Analysis already exists for this image, case, and user with _id:", existing_analysis['_id'])
                self._id = existing_analysis['_id']  # Set it on instance if needed
                return self._id

            # 2. Create new analysis
            self._id = ObjectId()
            analysis_data = self.__dict__.copy()
            analysis_data['_id'] = self._id

            mongo.db.analyses.insert_one(analysis_data)

            # 3. Post-save updates
            self.update_image_with_analysis()
            # self.update_user_with_analysis() if needed

            print("New analysis inserted with _id:", self._id)
            return self._id

        except Exception as error:
            print(f"Error saving analysis: {error}")
            return None

    def update_image_with_analysis(self):
        try:
            # Update the image with the analysis reference
            mongo.db.images.update_one(
                {'_id': ObjectId(self.image_id)},
                {
                    '$addToSet': {'analyses': self.__dict__['_id']},  # Add analysis to the image's analyses array
                    '$set': {
                        'updated_at': datetime.utcnow(),
                        'predicted_crime': self.predicted_crime,
                        'predicted_crime_type': self.predicted_crime_type,
                        'confidence_score': self.confidence_score,
                        'detected_objects': self.detected_objects
                    }
                }
            )
        except Exception as error:
            print(f"Error updating image with analysis: {error}")

    def update(self, updated_data):
        try:
            # Update the analysis fields
            for key, value in updated_data.items():
                if hasattr(self, key):
                    setattr(self, key, value)
            
            self.updated_at = datetime.utcnow()
            
            # Update in MongoDB
            mongo.db.analyses.update_one(
                {'_id': self.__dict__['_id']},
                {'$set': {**updated_data, 'updated_at': self.updated_at}}
            )
            return True
        except Exception as error:
            print(f"Error updating analysis: {error}")
            return False

    def delete(self):
        try:
            # Delete the analysis from MongoDB
            mongo.db.analyses.delete_one({'_id': self.__dict__['_id']})
            
            # Remove analysis reference from case
            mongo.db.cases.update_one(
                {'_id': ObjectId(self.case_id)},
                {
                    '$pull': {'analyses': self.__dict__['_id']},
                    '$set': {'last_updated': datetime.utcnow()}
                }
            )
            
            # Remove analysis reference from image
            mongo.db.images.update_one(
                {'_id': ObjectId(self.image_id)},
                {
                    '$pull': {'analyses': self.__dict__['_id']},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )
            
            # Remove analysis reference from user
            mongo.db.users.update_one(
                {'_id': ObjectId(self.user_id)},
                {
                    '$pull': {'analyses': self.__dict__['_id']},
                    '$set': {'last_updated': datetime.utcnow()}
                }
            )
            
            return True
        except Exception as error:
            print(f"Error deleting analysis: {error}")
            return False

    @staticmethod
    def get_by_id(analysis_id):
        try:
            # Find analysis by ID
            analysis_data = mongo.db.analyses.find_one({'_id': ObjectId(analysis_id)})
            if not analysis_data:
                return None
                
            # Create Analysis instance from data
            analysis = Analysis(
                case_id=analysis_data.get('case_id'),
                user_id=analysis_data.get('user_id'),
                image_id=analysis_data.get('image_id'),
                predicted_crime=analysis_data.get('predicted_crime'),
                predicted_crime_type=analysis_data.get('predicted_crime_type'),
                confidence_score=analysis_data.get('confidence_score'),
                detected_objects=analysis_data.get('detected_objects', [])
            )
            
            # Add the _id field and timestamps
            analysis.__dict__['_id'] = analysis_data.get('_id')
            analysis.__dict__['created_at'] = analysis_data.get('created_at')
            analysis.__dict__['updated_at'] = analysis_data.get('updated_at')
            
            return analysis
        except Exception as error:
            print(f"Error getting analysis by ID: {error}")
            return None

    @staticmethod
    def get_by_case_id(case_id):
        try:
            # Find all analyses for a case
            analyses_data = mongo.db.analyses.find({'case_id': case_id})
            return list(analyses_data)
        except Exception as error:
            print(f"Error getting analyses by case ID: {error}")
            return []

    @staticmethod
    def get_by_image_id(image_id):
        try:
            # Find all analyses for an image
            analyses_data = mongo.db.analyses.find({'image_id': image_id})
            return list(analyses_data)
        except Exception as error:
            print(f"Error getting analyses by image ID: {error}")
            return []

    @staticmethod
    def get_by_user_id(user_id):
        try:
            # Find all analyses for a user
            analyses_data = mongo.db.analyses.find({'user_id': user_id})
            return list(analyses_data)
        except Exception as error:
            print(f"Error getting analyses by user ID: {error}")
        # Post-save logic: Update the parent case with the analysis refere
    @staticmethod
    def add_detected_object(case_id, user_id, image_id, new_object):
        try:
            # 1. Find the existing analysis
            if isinstance(image_id, str):
                image_id = ObjectId(image_id)
            analysis = mongo.db.analyses.find_one({
                'user_id': user_id,
                'case_id': case_id,
                'image_id':image_id
            })

            if not analysis:
                print("No analysis found for given case, user, and image.")
                print(case_id)
                print(user_id)
                print(image_id)
                return False

            # 2. Add object to analysis (avoid duplicates)
            mongo.db.analyses.update_one(
                {'_id': analysis['_id']},
                {
                    '$addToSet': {'detected_objects': new_object},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )

            # 3. Add object to image document too
            mongo.db.images.update_one(
                {'_id': ObjectId(image_id)},
                {
                    '$addToSet': {'detected_objects': new_object},
                    '$set': {'updated_at': datetime.utcnow()}
                }
            )

            print(f"Detected object '{new_object}' added to analysis and image.")
            return True

        except Exception as error:
            print(f"Error in add_detected_object: {error}")
            return False

