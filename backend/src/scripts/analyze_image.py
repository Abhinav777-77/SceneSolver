from config.config import data_set
import os
import pandas as pd
from io import BytesIO
from PIL import Image
import torch
from scripts.q import process
from transformers import CLIPProcessor, CLIPModel
from dotenv import load_dotenv
from model.image import I
from model.analysis import Analysis
from model.case import Case
import traceback
import cloudinary
import cloudinary.uploader
import time
load_dotenv()
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)
# Load CLIP Model and Processor
model_name = "openai/clip-vit-base-patch16"
model = CLIPModel.from_pretrained(model_name)
processor = CLIPProcessor.from_pretrained(model_name)



def upload_pil_image_to_cloudinary(pil_image):
    buffer = BytesIO()
    pil_image.save(buffer, format="JPEG")
    buffer.seek(0)  # Important: reset stream to beginning

    upload_result = cloudinary.uploader.upload(buffer)
    return upload_result

# # Load Crime Dataset
# data_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "crime_dataset.csv")
# if os.path.exists(data_path):
#     df = pd.read_csv(data_path)
#     # Use stderr for logging instead of stdout
#     print("Crime dataset loaded successfully", file=sys.stderr)
# else:
#     print(f"Error: Dataset not found at {data_path}", file=sys.stderr)
#     df = pd.DataFrame({"Crime Type": ["Property Crime"], "Crime Description": ["Burglary"]})
df=data_set()
def process_image(image_path, case_id=None,user_id=None):
    """
    Process an image using CLIP model to predict crime type
    """
    try:
        # Load image
        image = Image.open(image_path)
        
        # Preprocess image for CLIP
        inputs = processor(images=image, return_tensors="pt", padding=True)
        image_features = model.get_image_features(**inputs)

        # Get crime descriptions from dataset
        crime_descriptions = df["Crime Description"].tolist()
        text_inputs = processor(text=crime_descriptions, return_tensors="pt", padding=True)
        text_features = model.get_text_features(**text_inputs)

        # Calculate similarity scores
        similarity = torch.nn.functional.cosine_similarity(image_features, text_features)
        best_match_idx = torch.argmax(similarity).item()

        # Get the best matching crime description and type
        predicted_crime = crime_descriptions[best_match_idx]
        predicted_crime_type = df[df["Crime Description"] == predicted_crime]["Crime Type"].values[0]
        print(predicted_crime_type)
        # Upload image to Cloudinary
        upload_result = upload_pil_image_to_cloudinary(image)
        
        # Get image metadata
        width, height = image.size
        

        #image uploading to the mongodb
        image_one = I(case_id, user_id,upload_result['secure_url'])
        image_id=image_one.save()
        Case.add_image_to_case(case_id,image_id)
        Analysis(case_id, user_id, image_id, predicted_crime, predicted_crime_type, float(similarity[best_match_idx])).save()
        # Create result object
        result = {
            "predicted_crime": predicted_crime,
            "predicted_crime_type": predicted_crime_type,
            "confidence_score": float(similarity[best_match_idx]),
            "image_url": upload_result['secure_url'],
            "cloudinary_public_id": upload_result['public_id'],
            "metadata": {
                "image_size": [width, height],
                "format": image.format,
                "mode": image.mode
            }
        }
        
        # Add case_id if provided
        if case_id:
            result["case_id"] = case_id
            
        return result
    except Exception as e:
        print(f"Error processing image: {e}")
        traceback.print_exc()
        return {"error": str(e), "traceback": traceback.format_exc()}


