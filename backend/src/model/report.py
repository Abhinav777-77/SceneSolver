from flask import Flask
from flask_pymongo import PyMongo
from datetime import datetime
from bson import ObjectId
from config.config import MONGODB_URI

mongo = PyMongo()

# Report Model (MongoDB)
class Report:
    def __init__(self, case_id, user_id, content, status='draft'):
        self.case_id = case_id
        self.user_id = user_id
        self.content = content
        self.status = status
        self.created_at = datetime.utcnow()
        self.updated_at = datetime.utcnow()

    def save(self):
        # Before save: Update the updatedAt timestamp
        self.updated_at = datetime.utcnow()

        # Save report to MongoDB
        report_data = self.__dict__
        report_data['_id'] = ObjectId()  # Ensure that MongoDB assigns an ObjectId
        mongo.db.reports.insert_one(report_data)

        # Post-save logic: Update the parent case with the report reference
        self.update_case_with_report()

    def update_case_with_report(self):
        try:
            # Update the case with the report reference
            mongo.db.cases.update_one(
                {'_id': ObjectId(self.case_id)},
                {
                    '$addToSet': {'reports': self.__dict__['_id']},  # Add report to the case's reports array
                    '$set': {'lastUpdated': datetime.utcnow()}  # Update last updated timestamp
                }
            )
        except Exception as error:
            print(f"Error updating case with report: {error}")

    def delete_related_data(self):
        # Delete the report from MongoDB
        mongo.db.reports.delete_one({'_id': ObjectId(self._id)})

