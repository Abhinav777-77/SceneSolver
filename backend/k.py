import requests
import json

# URL of the Flask server (make sure the Flask app is running locally)
url = "http://127.0.0.1:5000/analyze"

# Path to the image you want to analyze
image_path = "C:\\Users\\Dell\\Desktop\\crime\\crime 7.jpg"  # Update with the correct path to your image

# Prepare the payload for the request (in this case, we send the image path)
payload = {
    "image_path": image_path
}

# Set headers (if needed)
headers = {
    "Content-Type": "application/json"
}

# Make the POST request to the Flask server
try:
    response = requests.post(url, json=payload, headers=headers)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse and print the JSON response
        response_data = response.json()
        print("Response from server:")
        print(json.dumps(response_data, indent=2))
    else:
        print(f"Error: {response.status_code}")
        print(response.text)
except Exception as e:
    print(f"Error making the request: {e}")
