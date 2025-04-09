import base64
import requests
import pandas as pd
from datasets import load_dataset

# Hugging Face API URL and Authorization
API_URL = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-large-patch14"
headers = {"Authorization": "Bearer  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"}  # 🔹 Replace with your API token

# Step 1: Load Dataset from Hugging Face
dataset = load_dataset("varlaabhinav/crime")

# Step 2: Extract only the "Crime Description" column
df = dataset["train"].to_pandas()
candidate_labels = df["Crime Description"].tolist()  # 🔹 Use only Crime Descriptions

def query(data):
    """ Sends an image to the CLIP model and returns the highest scoring label. """
    with open(data["image_path"], "rb") as f:
        img = f.read()
    
    payload = {
        "parameters": {"candidate_labels": data["candidate_labels"]},  # Send extracted labels
        "inputs": base64.b64encode(img).decode("utf-8")
    }

    response = requests.post(API_URL, headers=headers, json=payload)

    if response.status_code != 200:
        print(f"Error: {response.status_code}, {response.text}")  # Debugging
        return None

    if not response.text.strip():  # Check if response is empty
        print("Error: Empty response from API")
        return None

    try:
        predictions = response.json()
        if isinstance(predictions, list) and predictions:
            highest_prediction = max(predictions, key=lambda x: x["score"])  # Get highest score
            return highest_prediction
        else:
            print("Error: Unexpected response format")
            return None
    except requests.exceptions.JSONDecodeError:
        print("Error: Response is not valid JSON")
        return None

# Step 3: Call API with Image & Labels
output = query({
    "image_path": "C:\\Users\\Dell\\Desktop\\crime\\crime 6.jpg",
    "candidate_labels": candidate_labels,  # Send only "Crime Description" values
})

print(output)
