from flask import Flask
from flask_pymongo import PyMongo
from flask_bcrypt import Bcrypt
from datetime import datetime
from bson import ObjectId
import bcrypt
from config.config import get_mongo_connection
from werkzeug.security import check_password_hash, generate_password_hash

mongo = get_mongo_connection()

# User Model (MongoDB)
class User:
    def __init__(self, email, password, role='investigator', profile_picture='', created_at=None, last_active=None):
        self.email = email
        self.password = password
        self.role = role
        self.profile_picture = profile_picture
        self.created_at = created_at if created_at else datetime.utcnow()
        self.last_active = last_active if last_active else datetime.utcnow()

    # Password hashing and comparison
    @staticmethod
    def hash_password(password):
        return generate_password_hash(password, method='scrypt')
    
    def check_password(p1, password):
       # return bcrypt.checkpw(self.password, password)
        return check_password_hash(p1, password)

     

    @staticmethod
    def find_one(query):
        """Find a user by query (e.g., {'email': 'user@example.com'})"""
        return mongo.db.users.find_one(query)


    def save(self):
        # Save user to MongoDB
        mongo.db.users.insert_one(self.__dict__)

    def get_cases(self, populate=False):
        if populate:
            return list(mongo.db.cases.find({'user_id': str(self._id)}))  # Populate related cases
        return list(mongo.db.cases.find({'user_id': str(self._id)}).sort('last_updated', -1))

    def delete_related_data(self):
        # Deleting related cases, evidence, analyses, reports
        cases = mongo.db.cases.find({'user_id': str(self._id)})
        for case in cases:
            case.delete_related_data()  # Assuming similar methods on Case, Evidence, etc.
        mongo.db.users.delete_one({'_id': self._id})