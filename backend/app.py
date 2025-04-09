import os
import pandas as pd
from PIL import Image, ImageEnhance
import google.generativeai as genai
from flask import Flask, request, jsonify, Response, stream_with_context
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain.chains import LLMChain
from transformers import CLIPProcessor, CLIPModel
import torch
import time
import io
import base64
import numpy as np
from scipy import ndimage
from dotenv import load_dotenv
import cv2


load_dotenv()
# ✅ Google Gemini API Key
gemini_api_key =os.getenv("GEMINI_API_KEY")
genai.configure(api_key=gemini_api_key)

# Verify API key is valid
try:
    # Test the API key with a simple request
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content("Test connection")
    print("✅ Gemini API connection successful")
except Exception as e:
    print(f"❌ Error connecting to Gemini API: {e}")
    print("Please check your API key and internet connection")

# ✅ Initialize Gemini LLM
llm = ChatGoogleGenerativeAI(model="gemini-2.0-flash", google_api_key=gemini_api_key)

# ✅ Flask Server Initialization
app = Flask(__name__)

# Store the last processed image and its analysis results
last_processed_image = None
last_analysis_results = None

FORENSIC_PROMPT_TEMPLATE = """
You are SceneSolver AI, an intelligent forensic assistant.

The user has uploaded an image. You are given:
- CLIP Model Prediction: "{clip_prediction}"
- Detected Objects: {detected_objects}

However, do NOT use the image context unless the user is clearly referring to it.

---

User Query:
"{user_query}"

Instructions:
1. First, decide if the user is referring to the uploaded image. Look for clues like:
   - Words like: "this image", "scene", "what happened", "objects in the image"
   - Questions about what is visible, detected, or occurring
2. If the user **is** referring to the image:
   - Use the image context (CLIP + detected objects) to generate a forensic-style response.
   - Use the format:
     ```
     [Scene Summary]
     [Objects and Their Role]
     [Hypothesized Events]
     [Forensic Insights or Suggestions]
     ```
3. If the user **is NOT** referring to the image:
   - Ignore the image context.
   - Just respond naturally and appropriately to the user query, like a helpful assistant.

Respond accordingly.
"""

def generate_streaming_response(query):
    # Check if the query is a simple greeting or non-forensic question
    greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "how are you", "what's up", "sup"]
    is_greeting = any(greeting in query.lower() for greeting in greetings)
    
    if is_greeting:
        # Use a more conversational prompt for greetings
        prompt = f"""
        You are SceneSolver AI, an advanced forensic expert specializing in crime scene analysis.
        The user has sent a greeting: "{query}"
        
        Please respond in a friendly, conversational manner. Introduce yourself as a forensic expert assistant.
        Keep your response brief (under 50 words) and don't use the structured format with Key Findings, Analysis, etc.
        """
        
        # Generate the response for greetings
        model = genai.GenerativeModel('gemini-2.0-flash-lite')
        response = model.generate_content(prompt)
        
        if hasattr(response, 'text'):
            text = response.text
        else:
            text = str(response)
    else:
        # Use the forensic prompt template for other queries
        prompt_template = PromptTemplate(
            input_variables=["query"],
            template=FORENSIC_PROMPT_TEMPLATE
        )
        prompt = prompt_template.format(query=query)
        
        # Generate the response for forensic queries
        report_chain = prompt_template | llm
        report = report_chain.invoke({"query": query})
        
        if hasattr(report, "content"):
            text = report.content
        else:
            text = str(report)
    
    # Split the text into chunks for streaming
    words = text.split()
    for word in words:
        yield word + " "
        time.sleep(0.1)  # Adjust this delay to control streaming speed

@app.route("/process_query", methods=["POST"])
def process_query():
    global last_processed_image, last_analysis_results
    
    try:
        # Check if the request contains form data with an image
        if 'image' in request.files:
            query = request.form.get("query", "")
            image_file = request.files['image']
            is_analyzed = request.form.get("is_analyzed", "false") == "true"
            
            if not query:
                return jsonify({"error": "Query is required"}), 400
                
            # Process the image
            image_data = image_file.read()
            image = Image.open(io.BytesIO(image_data))
            
            # Store the image for future use
            last_processed_image = image
            
            # Convert image to base64 for Gemini API
            buffered = io.BytesIO()
            image.save(buffered, format="JPEG")
            img_str = base64.b64encode(buffered.getvalue()).decode()
            
            # If the image has been analyzed, get the analysis results
            analysis_context = ""
            if is_analyzed and last_analysis_results:
                analysis_context = f"""
                This image has been analyzed with the following results:
                - Predicted Crime Type: {last_analysis_results['predicted_crime_type']}
                - Description: {last_analysis_results['predicted_crime']}
                - Confidence Score: {last_analysis_results['confidence_score']}
                
                Please use this information to provide more accurate insights.
                """
            
            # Create a prompt that includes the image and analysis results
            prompt = f"""
            You are SceneSolver AI, an advanced forensic expert specializing in crime scene analysis.
            I'm showing you an image related to a crime scene investigation.
            
            {analysis_context}
            
            User Query: "{query}"
            
            Please provide a concise, structured response with the following format:
            
            **Key Findings:**
            - [List 2-3 key findings in bullet points]
            
            **Analysis:**
            - [Brief analysis in 1-2 sentences]
            
            **Recommendations:**
            - [1-2 specific recommendations]
            
            Keep your response under 150 words total.
            """
            
            # Use Gemini's multimodal capabilities
            try:
                model = genai.GenerativeModel('gemini-2.0-flash')
                response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": img_str}])
                print("Successfully sent image to the model")
            except Exception as e:
                print(f"Error with Gemini API: {e}")
                # Fallback to text-only model
                model = genai.GenerativeModel('gemini-2.0-flash-lite')
                response = model.generate_content(prompt)
            
            # Stream the response
            def generate():
                if hasattr(response, 'text'):
                    text = response.text
                else:
                    text = str(response)
                
                # Split the text into chunks for streaming
                chunks = [text[i:i+100] for i in range(0, len(text), 100)]
                for chunk in chunks:
                    yield f"data: {chunk}\n\n"
                    time.sleep(0.05)  # Small delay to simulate streaming
                
            return Response(
                stream_with_context(generate()),
                mimetype='text/event-stream'
            )
        else:
            # Handle regular text query (backward compatibility)
            data = request.get_json()
            query = data.get("query", "")

            if not query:
                return jsonify({"error": "Query is required"}), 400

            # Check if we have a stored image
            if last_processed_image:
                # Convert image to base64 for Gemini API
                buffered = io.BytesIO()
                last_processed_image.save(buffered, format="JPEG")
                img_str = base64.b64encode(buffered.getvalue()).decode()
                
                # Include analysis results if available
                analysis_context = ""
                if last_analysis_results:
                    analysis_context = f"""
                    This image has been analyzed with the following results:
                    - Predicted Crime Type: {last_analysis_results['predicted_crime_type']}
                    - Description: {last_analysis_results['predicted_crime']}
                    - Confidence Score: {last_analysis_results['confidence_score']}
                    
                    Please use this information to provide more accurate insights.
                    """
                
                # Create a prompt that includes the image and analysis results
                prompt = f"""
                You are SceneSolver AI, an advanced forensic expert specializing in crime scene analysis.
                
                I'm showing you an image related to a crime scene investigation.
                {analysis_context}
                
                User Query: "{query}"
                
                If the user's query is a simple greeting or not related to the image, respond in a friendly, conversational manner without using the structured format.
                
                If the user's query is about the image or related to forensic analysis, provide a concise, structured response with the following format:
                
                **Key Findings:**
                - [List 2-3 key findings in bullet points]
                
                **Analysis:**
                - [Brief analysis in 1-2 sentences]
                
                **Recommendations:**
                - [1-2 specific recommendations]
                
                Keep your response under 150 words total.
                """
                
                # Use Gemini's multimodal capabilities
                try:
                    model = genai.GenerativeModel('gemini-2.0-flash')
                    response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": img_str}])
                    print("Successfully sent stored image to the model")
                except Exception as e:
                    print(f"Error with Gemini API: {e}")
                    # Fallback to text-only model
                    model = genai.GenerativeModel('gemini-2.0-flash-lite')
                    response = model.generate_content(prompt)
                
                # Stream the response
                def generate():
                    if hasattr(response, 'text'):
                        text = response.text
                    else:
                        text = str(response)
                    
                    # Split the text into chunks for streaming
                    chunks = [text[i:i+100] for i in range(0, len(text), 100)]
                    for chunk in chunks:
                        yield f"data: {chunk}\n\n"
                        time.sleep(0.05)  # Small delay to simulate streaming
                    
                return Response(
                    stream_with_context(generate()),
                    mimetype='text/event-stream'
                )
            else:
                # No stored image, use text-only response
                return Response(
                    stream_with_context(generate_streaming_response(query)),
                    mimetype='text/event-stream'
                )
    except Exception as e:
        print(f"Error processing query: {e}")
        import traceback
        traceback.print_exc()  # Print the full stack trace
        return jsonify({
            "error": "Internal server error", 
            "details": str(e),
            "stack": traceback.format_exc() if app.debug else None
        }), 500

# ✅ Load Crime Dataset
data_path = "crime_dataset.csv"
if os.path.exists(data_path):
    df = pd.read_csv(data_path)
    print("✅ Crime dataset loaded successfully")
else:
    print(f"❌ Error: Dataset not found at {data_path}")
    df = None

# ✅ Load CLIP Model and Processor
model_name = "openai/clip-vit-base-patch16"
model = CLIPModel.from_pretrained(model_name)
processor = CLIPProcessor.from_pretrained(model_name)

def process_image(image_data):
    try:
        # Convert base64 to image
        if isinstance(image_data, str):
            if image_data.startswith('data:image'):
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(io.BytesIO(image_bytes))
        elif isinstance(image_data, Image.Image):
            # Already a PIL Image
            image = image_data
        else:
            # Assume it's a file object
            # Create a copy of the file data to avoid reading it twice
            file_data = image_data.read()
            image = Image.open(io.BytesIO(file_data))
            # Reset the file pointer for future reads
            image_data.seek(0)

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

        return {
            "predicted_crime": predicted_crime,
            "predicted_crime_type": predicted_crime_type,
            "confidence_score": float(similarity[best_match_idx])
        }
    except Exception as e:
        print(f"Error processing image: {e}")
        import traceback
        traceback.print_exc()  # Print the full stack trace
        return None

@app.route("/analyze", methods=["POST"])
def analyze():
    global last_processed_image, last_analysis_results
    
    try:
        if "images" not in request.files:
            return jsonify({"error": "No images provided"}), 400

        files = request.files.getlist("images")
        results = []

        for file in files:
            if file.filename:
                # Process the image with CLIP
                result = process_image(file)
                if result:
                    results.append(result)
                    
                    # Store the first image and its analysis results for future use
                    if len(results) == 1:
                        # Read the image data
                        file.seek(0)  # Reset file pointer
                        image_data = file.read()
                        image = Image.open(io.BytesIO(image_data))
                        
                        # Store the image for future use
                        last_processed_image = image
                        
                        # Store the analysis results for future use
                        last_analysis_results = result
                        
                        print("Stored image and analysis results for future use")

        if not results:
            return jsonify({"error": "Failed to process any images"}), 500

        return jsonify({
            "results": results,
            "message": f"Successfully analyzed {len(results)} image(s)"
        })

    except Exception as e:
        print(f"Error in analyze endpoint: {e}")
        import traceback
        traceback.print_exc()  # Print the full stack trace
        return jsonify({"error": str(e)}), 500

@app.route("/evidence-guide", methods=["POST"])
def evidence_guide():
    try:
        if "images" not in request.files:
            return jsonify({"error": "No images provided"}), 400

        file = request.files["images"]
        result = process_image(file)

        if not result:
            return jsonify({"error": "Failed to process image"}), 500

        # Generate evidence collection guide based on crime type
        prompt = f"""Generate a detailed evidence collection guide for a {result['predicted_crime_type']} case.
        Include:
        1. Types of evidence to look for
        2. Proper collection methods
        3. Documentation requirements
        4. Safety precautions
        """

        guide_chain = LLMChain(llm=llm, prompt=PromptTemplate(
            input_variables=["query"],
            template=prompt
        ))
        
        guide = guide_chain.run({"query": prompt})

        return jsonify({
            "crime_type": result["predicted_crime_type"],
            "evidence_guide": guide
        })

    except Exception as e:
        print(f"Error in evidence-guide endpoint: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/generate_report", methods=["POST"])
def generate_report():
    try:
        if "images" not in request.files:
            return jsonify({"error": "No images provided"}), 400

        files = request.files.getlist("images")
        results = []

        for file in files:
            if file.filename:
                result = process_image(file)
                if result:
                    results.append(result)

        if not results:
            return jsonify({"error": "Failed to process any images"}), 500

        # Generate comprehensive report
        report_prompt = f"""Generate a detailed forensic report for the following findings:
        Crime Types: {', '.join(r['predicted_crime_type'] for r in results)}
        Descriptions: {', '.join(r['predicted_crime'] for r in results)}
        
        Include:
        1. Case Summary
        2. Evidence Analysis
        3. Key Findings
        4. Recommendations
        """

        report_chain = LLMChain(llm=llm, prompt=PromptTemplate(
            input_variables=["query"],
            template=report_prompt
        ))
        
        report = report_chain.run({"query": report_prompt})

        return jsonify({
            "report": report,
            "analysis_results": results
        })

    except Exception as e:
        print(f"Error in generate-report endpoint: {e}")
        return jsonify({"error": str(e)}), 500

def detect_fingerprints(image):
    """Detect fingerprints in the image using basic image processing"""
    # Convert to grayscale
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    
    # Apply adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 11, 2
    )
    
    # Find contours
    contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Filter contours based on area and shape
    fingerprint_contours = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if 100 < area < 10000:  # Adjust these thresholds based on your needs
            fingerprint_contours.append(contour)
    
    # Calculate quality score based on contrast and clarity
    quality_score = np.mean(gray) / 255.0
    
    return {
        "count": len(fingerprint_contours),
        "quality_score": float(quality_score),
        "details": f"Detected {len(fingerprint_contours)} potential fingerprint patterns"
    }

def enhance_image(image):
    """Enhance image quality using various techniques"""
    # Convert to PIL Image if needed
    if not isinstance(image, Image.Image):
        image = Image.fromarray(image)
    
    # Apply various enhancements
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.5)
    
    enhancer = ImageEnhance.Brightness(image)
    image = enhancer.enhance(1.2)
    
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.3)
    
    # Convert back to base64
    buffered = io.BytesIO()
    image.save(buffered, format="JPEG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    
    return {"enhanced_image": f"data:image/jpeg;base64,{img_str}"}

def analyze_patterns(image):
    """Analyze patterns in the image using basic image processing"""
    # Convert to grayscale
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY)
    
    # Apply edge detection
    edges = cv2.Canny(gray, 100, 200)
    
    # Apply Hough transform for line detection
    lines = cv2.HoughLinesP(edges, 1, np.pi/180, 50, minLineLength=30, maxLineGap=10)
    
    patterns = []
    
    # Analyze line patterns
    if lines is not None:
        line_patterns = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            angle = np.arctan2(y2 - y1, x2 - x1) * 180 / np.pi
            line_patterns.append(angle)
        
        # Group similar angles
        angle_groups = {}
        for angle in line_patterns:
            group = round(angle / 45) * 45
            if group not in angle_groups:
                angle_groups[group] = 0
            angle_groups[group] += 1
        
        # Add dominant patterns
        for angle, count in angle_groups.items():
            if count > len(line_patterns) * 0.2:  # More than 20% of lines
                patterns.append({
                    "type": "Linear Pattern",
                    "description": f"Dominant lines at {angle}° angle",
                    "confidence": count / len(line_patterns)
                })
    
    # Analyze texture patterns
    texture = cv2.Laplacian(gray, cv2.CV_64F).var()
    if texture > 100:
        patterns.append({
            "type": "Texture Pattern",
            "description": "High texture variation detected",
            "confidence": min(texture / 500, 1.0)
        })
    
    return {"patterns": patterns}

@app.route("/fingerprint", methods=["POST"])
def fingerprint():
    if "images" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files["images"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    
    try:
        # Read and process the image
        image_data = file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Detect fingerprints
        results = detect_fingerprints(image)
        
        return jsonify(results)
    except Exception as e:
        print(f"Error in fingerprint detection: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/enhance", methods=["POST"])
def enhance():
    if "images" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    file = request.files["images"]
    if file.filename == "":
        return jsonify({"error": "No selected file"}), 400
    
    try:
        # Read and process the image
        image_data = file.read()
        image = Image.open(io.BytesIO(image_data))
        
        # Enhance the image
        results = enhance_image(image)
        
        return jsonify(results)
    except Exception as e:
        print(f"Error in image enhancement: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/patterns", methods=["POST"])
def patterns():
    if "images" not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    files = request.files.getlist("images")
    if not files or files[0].filename == "":
        return jsonify({"error": "No selected file"}), 400
    
    try:
        all_patterns = []
        for file in files:
            # Read and process each image
            image_data = file.read()
            image = Image.open(io.BytesIO(image_data))
            
            # Analyze patterns
            results = analyze_patterns(image)
            all_patterns.extend(results["patterns"])
        
        return jsonify({"patterns": all_patterns})
    except Exception as e:
        print(f"Error in pattern analysis: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ✅ Run Flask App
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
