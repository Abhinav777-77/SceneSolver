# Import Flask and other necessary modules
from flask import Flask
from flask_cors import CORS

# Import your Blueprints
from routes.authroutes import auth_bp
from routes.otp import otp_bp
from routes.analysis_routes import ana_bp
from routes.case_routes import case_bp
# from routes.report import report_bp
from config.config import init_mail, mail,get_mongo_connection

# Create Flask app
app = Flask(__name__)

# Initialize mail
init_mail(app)

# Configure CORS properly
CORS(app, 
     resources={r"/*": {
         "origins": [
             "http://localhost:8080", 
             "http://127.0.0.1:8080", 
             "http://localhost:3000", 
             "http://127.0.0.1:3000"
         ],
         "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "x-auth-token", "Accept"],
         "supports_credentials": True
     }})

# Disable strict slashes to prevent redirects
app.url_map.strict_slashes = False

# Register Blueprints with correct prefixes
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(otp_bp, url_prefix='/api/otp')
app.register_blueprint(ana_bp, url_prefix='/api/analysis')
app.register_blueprint(case_bp, url_prefix='/api/cases')
# app.register_blueprint(report_bp, url_prefix='/api/reports')
m=get_mongo_connection()
print("The value is ",m.db.name)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
