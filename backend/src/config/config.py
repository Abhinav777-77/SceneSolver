import os
import pandas as pd
from transformers import CLIPProcessor, CLIPModel
from dotenv import load_dotenv
import google.generativeai as genai
from langchain_google_genai import ChatGoogleGenerativeAI
from pymongo   import MongoClient
from flask_mail import Mail

# Load environment variables
load_dotenv()
mail = Mail()

def init_mail(app):
    app.config.update(
        MAIL_SERVER='smtp.gmail.com',
        MAIL_PORT=587,
        MAIL_USE_TLS=True,
        MAIL_USE_SSL=False,
        MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
        MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
        MAIL_DEFAULT_SENDER=os.getenv("MAIL_USERNAME")
    )
    mail.init_app(app)
# API Keys and Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=GEMINI_API_KEY)
MONGODB_URI = os.getenv("MONGODB_UR")  # MongoDB URI from .env file
JWT_SECRET = os.getenv("JWT_SECRET")
# Initialize Gemini LLM
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=GEMINI_API_KEY)


def get_mongo_connection():
    try:
        # Establish connection with MongoDB
        client = MongoClient(MONGODB_URI)
        return client
    except Exception as e:
        print(f"❌ Error: Failed to connect to MongoDB - {str(e)}")
        return None

# Load Crime Dataset
data_path = "C:\\Users\\Dell\\Desktop\\pro\\scenesolver\\backend\\crime_dataset.csv"
def data_set():
    if os.path.exists(data_path):
        df = pd.read_csv(data_path)
        print("✅ Crime dataset loaded successfully")
        return df
    else:
        print(f"❌ Error: Dataset not found at {data_path}")
        df = None

    # Load CLIP Model and Processor
model_name = "openai/clip-vit-base-patch16"
model = CLIPModel.from_pretrained(model_name)
processor = CLIPProcessor.from_pretrained(model_name)
print("✅ CLIP model loaded successfully")
context=""  
query=""
# Forensic prompt template
def  FORENSIC_PROMPT_TEMPLATE (context,query):
    prompt=f"""
    You are SceneSolver AI — a smart assistant specialized in forensic analysis but capable of answering general questions too.

    You will receive:
    1. A context (usually forensic-related),
    2. A user query.

    Your job is:
    - If the query is related to the context, answer using the context.
    - If the query is general and unrelated to the context, ignore the context and answer using your own knowledge.

    ---

    Context:
    {context}

    Query:
    {query}

    Answer:
    """
    return prompt