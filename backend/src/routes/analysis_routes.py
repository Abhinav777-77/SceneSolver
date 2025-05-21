from flask import request, jsonify
from flask import Blueprint, request, jsonify, Response, stream_with_context
from scripts.analyze_image import process_image
from scripts.q import process, yolo
import time
# Assuming process_image and save_analyzed_image are already defined
# Also assuming Flask route is properly decorated   
ana_bp = Blueprint('analysis', __name__)
@ana_bp.route("/analyze", methods=["POST", "OPTIONS"])
def analyze():
    print("reavhed here ")
    if request.method == 'OPTIONS':
        return '', 204
    try:
        if "images" not in request.files:
            return jsonify({"error": "No images provided"}), 400
        files = request.files.getlist("images")
        results = []
        for file in files:
            if file.filename:
                result = process_image(file,request.form.get("case_id"),request.form.get("user_id"))
                if result:
                    results.append(result)
        if not results:
            return jsonify({"error": "Failed to process any images"}), 500

        return jsonify({
            "results": results,

        })

    except Exception as e:
        print(f"Error in analyze endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500












@ana_bp.route("/process_query", methods=["POST", "OPTIONS"])
def process_query():
    # Handle OPTIONS request for CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        query = request.form.get("query")
        case_id = request.form.get("case_id")
        print("case_id from the p_q is :",case_id)
        if not query:
            return jsonify({"error": "Missing 'query' in form data"}), 400
        
        # Import time module for streaming
        import time
        
        # Call the process function from scripts.q
        response = process(query,case_id)
        
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
    except Exception as e:
        print(f"Error processing query: {e}")
        import traceback
        traceback.print_exc()  # Print the full stack trace
        return jsonify({
            "error": "Internal server error", 
            "details": str(e),
            "stack": traceback.format_exc()
        }), 500



@ana_bp.route("/analyze_images", methods=["POST", "OPTIONS"])
def analyze_images():
    if request.method == 'OPTIONS':
        return '', 204
    try:
        if "images" not in request.files:
            return jsonify({"error": "No images provided"}), 400
        
        files = request.files.getlist("images")
        results = []
        
        case_id = request.form.get("case_id")
        user_id = request.form.get("user_id")
        
        for file in files:
            if file.filename:
                # Pass the file directly to the yolo function
                yolo_results = yolo(file,user_id,case_id)
                
                # Process the results and add to the response
                if yolo_results:
                    # Format the results for frontend
                    formatted_result = {
                        "filename": file.filename,
                        "case_id": case_id,
                        "user_id": user_id,
                        "detected_objects": yolo_results,
                        "timestamp": time.time()
                    }
                    results.append(formatted_result)
        
        if not results:
            return jsonify({"error": "Failed to process any images"}), 500

        return jsonify({
            "results": results,
            "message": f"Successfully analyzed {len(results)} image(s)"
        })

    except Exception as e:
        print(f"Error in analyze_images endpoint: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
