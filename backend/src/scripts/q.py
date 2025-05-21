from flask import Blueprint, request, jsonify, Response, stream_with_context
import time
import requests
import hashlib
import io
from io import BytesIO
import os
import base64
import cloudinary
import cloudinary.uploader
import numpy as np
from PIL import Image
from dotenv import load_dotenv
import google.generativeai as genai
from model.image import I
from model.analysis import Analysis
from config.config import FORENSIC_PROMPT_TEMPLATE,get_mongo_connection
from flask_cors import cross_origin
import cv2
from ultralytics import YOLO
mongo = get_mongo_connection()
db = mongo.db
load_dotenv()
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)
def upload_pil(pil_image):
    buffer = BytesIO()
    image = Image.open(pil_image)
    image.save(buffer, format="JPEG")
    buffer.seek(0)  # Important: reset stream to beginning

    upload_result = cloudinary.uploader.upload(buffer)
    return upload_result
def generate():
    if hasattr(response, 'text'):
        text = response.text
    else:
        text = str(response)
        chunks = [text[i:i+100] for i in range(0, len(text), 100)]
        for chunk in chunks:
            yield f"data: {chunk}\n\n"
            time.sleep(0.10)  # Small delay to simulate streaming

def get_context(case_id):
    # Simple one-liner to get all analyses with predicted crime and type for a case
    print("The case id is ",case_id)    
    analyses = list(db.analyses.find(
        {"case_id": case_id}, 
        {"predicted_crime": 1, "predicted_crime_type": 1, "confidence_score": 1}
    ))
    
    # Format the results into a simple string
    context = "CASE ANALYSES:\n"
    for i, analysis in enumerate(analyses, 1):
        context += f"Analysis {i}: {analysis.get('predicted_crime_type', 'Unknown')} - {analysis.get('predicted_crime', 'Unknown')} "
        if analysis.get('confidence_score'):
            confidence = float(analysis.get('confidence_score', 0)) * 100
            context += f"(Confidence: {confidence:.2f}%)"
        context += "\n"
    
    return context

def process(query,case_id): 
    try:
        model = genai.GenerativeModel('gemini-2.0-flash')
        context=get_context(case_id)
        prompt = FORENSIC_PROMPT_TEMPLATE(context,query)
        response = model.generate_content(prompt)
        print("Successfully sent image to the model")
        return response
    except Exception as e:
        print(f"Error with Gemini API: {e}")
        model = genai.GenerativeModel('gemini-2.0-flash-lite')
        response = model.generate_content(prompt)
            
def ask(file):
    """
    Send image to Gemini model to detect objects
    """
    try:
        # Handle both file path strings and file objects
        if isinstance(file, str):
            # If it's a file path, read the file
            with open(file, "rb") as f:
                image_bytes = f.read()
        else:
            # If it's a file object (e.g., from Flask's request.files)
            file.seek(0)  # Reset file pointer to beginning
            image_bytes = file.read()
            file.seek(0)  # Reset file pointer again for potential reuse
        
        # Encode image to base64
        import base64
        image_base64 = base64.b64encode(image_bytes).decode('utf-8')
        
        # Create prompt for object detection
        prompt = "Identify all objects in this image. Return only a comma-separated list of objects."
        
        # Call Gemini model
        model = genai.GenerativeModel('gemini-2.0-flash')
        response = model.generate_content([
            prompt,
            {"mime_type": "image/jpeg", "data": image_base64}
        ])
        
        # Process response to get list of objects
        objects_text = response.text.strip()
        objects_list = [obj.strip() for obj in objects_text.split(',')]
        
        return objects_list
    except Exception as e:
        print(f"Error with Gemini API in ask(): {e}")
        # Fallback to simpler model
        try:
            model = genai.GenerativeModel('gemini-2.0-flash-lite')
            response = model.generate_content(prompt)
            objects_text = response.text.strip()
            objects_list = [obj.strip() for obj in objects_text.split(',')]
            return objects_list
        except:
            return ["Error detecting objects"]
def data(f_h,user_id,case_id,new):
    response = requests.get(f_h)
    file_data = response.content
    file_hash = hashlib.sha256(file_data).hexdigest()
    print(file_hash)
    image_id=I.get_id_by_file_hash(file_hash)
    Analysis.add_detected_object(case_id,user_id,image_id,new)


def compute_file_hash(file):
    if isinstance(file, str):  # File path
        with open(file, "rb") as f:
            file_data = f.read()
    elif hasattr(file, "read"):  # File-like object (e.g., from Flask)
        file_data = file.read()
    elif isinstance(file, bytes):  # Already bytes
        file_data = file
    else:
        raise ValueError("Unsupported file type for hashing.")

    return hashlib.sha256(file_data).hexdigest()
def yolo(file,user_id,case_id):
    try:
        # If file is a path string, open it
        temp=upload_pil(file)
        if isinstance(file, str):

            image = Image.open(file)
        # If file is a FileStorage object from Flask
        else:
            image = Image.open(file)
        
        # Convert PIL Image to numpy array for YOLO processing
        img_array = np.array(image)
        
        # Load YOLO model
        model = YOLO("yolov8n.pt")  # Use the default YOLOv8 nano model
        
        # Run inference
        results = model(img_array)
        
        # Get detected objects from Gemini for better labels
        detected_objects = ask(file)
        data(temp["secure_url"],user_id,case_id,detected_objects)
        # Define a list of distinct colors for different objects
        colors = [
            (255, 0, 0),     # Red
            (0, 255, 0),     # Green
            (0, 0, 255),     # Blue
            (255, 255, 0),   # Yellow
            (255, 0, 255),   # Magenta
            (0, 255, 255),   # Cyan
            (128, 0, 0),     # Maroon
            (0, 128, 0),     # Dark Green
            (0, 0, 128),     # Navy
            (128, 128, 0),   # Olive
            (128, 0, 128),   # Purple
            (0, 128, 128),   # Teal
            (255, 165, 0),   # Orange
            (255, 192, 203), # Pink
            (173, 216, 230)  # Light Blue
        ]
        
        # Process results to get bounding boxes
        boxes = []
        class_color_map = {}  # Map class names to colors
        color_index = 0
        
        for r in results:
            for box in r.boxes:
                x1, y1, x2, y2 = box.xyxy[0].tolist()  # Get box coordinates
                conf = float(box.conf[0])  # Get confidence
                cls = int(box.cls[0])  # Get class
                class_name = model.names[cls]  # Get class name
                
                # Assign a color to this class if not already assigned
                if class_name not in class_color_map:
                    class_color_map[class_name] = colors[color_index % len(colors)]
                    color_index += 1
                
                boxes.append({
                    "x1": int(x1),
                    "y1": int(y1),
                    "x2": int(x2),
                    "y2": int(y2),
                    "confidence": conf,
                    "class": class_name
                })
        
        # Draw bounding boxes on the image
        img_with_boxes = img_array.copy()
        for box in boxes:
            # Get color for this class
            color = class_color_map[box['class']]
            
            # Draw rectangle with thicker border
            cv2.rectangle(
                img_with_boxes, 
                (box["x1"], box["y1"]), 
                (box["x2"], box["y2"]), 
                color, 
                3  # Thicker line
            )
            
            # Create a background for the text to make it more readable
            text = f"{box['class']} ({box['confidence']:.2f})"
            text_size, _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
            cv2.rectangle(
                img_with_boxes,
                (box["x1"], box["y1"] - text_size[1] - 10),
                (box["x1"] + text_size[0], box["y1"]),
                color,
                -1  # Filled rectangle
            )
            
            # Add label with larger font and white text
            cv2.putText(
                img_with_boxes, 
                text, 
                (box["x1"], box["y1"] - 5), 
                cv2.FONT_HERSHEY_SIMPLEX, 
                0.7,  # Larger font
                (255, 255, 255),  # White text
                2  # Thicker text
            )
        
        # Convert numpy array back to PIL Image
        annotated_image = Image.fromarray(img_with_boxes)
        
        # Convert to base64 for sending to frontend
        buffered = io.BytesIO()
        annotated_image.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode()
        
        # Create a data URL for the image
        img_data_url = f"data:image/jpeg;base64,{img_str}"
        
        print(f"Generated annotated image with {len(boxes)} boxes")
        return {
            "detected_objects": detected_objects,
            "boxes": boxes,
            "annotated_image": img_data_url,
            "processing_time": 0.5  # seconds
        }
    except Exception as e:
        print(f"Error in YOLO processing: {e}")
        import traceback
        traceback.print_exc()
        return None
