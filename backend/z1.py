import faiss
import pandas as pd
import numpy as np
import base64
import requests

# Load FAISS index (no need to recreate it)
faiss_index_path = "C:\\Users\\Dell\\Desktop\\pro\\backend\\crime_descriptions_faiss.index"
index = faiss.read_index(faiss_index_path)

# Load crime descriptions (mapping index → text)
df = pd.read_csv("C:\\Users\\Dell\\Desktop\\pro\\backend\\expanded_crime_dataset.csv")
crime_descriptions = df["Crime Description"].dropna().tolist()

# Hugging Face API details
API_URL = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-large-patch14"
headers = {"Authorization": "Bearer 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"}  # Add your Hugging Face token

def get_image_embedding(image_path):
    """Sends an image to Hugging Face CLIP API and gets the embedding."""
    with open(image_path, "rb") as f:
        img = f.read()

    payload = {
        "inputs": base64.b64encode(img).decode("utf-8")
    }
    response = requests.post(API_URL, headers=headers, json=payload)

    if response.status_code != 200:
        print(f"Error: {response.status_code}, {response.text}")
        return None

    try:
        return response.json()["embedding"]  # Extract CLIP embedding
    except:
        print("Error: Invalid response from API")
        return None

def find_best_match(image_embedding):
    """Searches FAISS for the most similar crime description to the given image embedding."""
    query_vector = np.array([image_embedding], dtype=np.float32)  # Convert to correct format
    _, indices = index.search(query_vector, k=1)  # Find the closest match
    best_match_index = indices[0][0]  # Get top match
    return crime_descriptions[best_match_index]  # Return the crime description

# Image path
image_path = "C:\\Users\\Dell\\Desktop\\crime\\crime 6.jpg"

# Get image embedding from Hugging Face API
image_embedding = get_image_embedding(image_path)

if image_embedding:
    # Find best matching crime description
    best_crime_description = find_best_match(image_embedding)
    print("🔍 Best Matched Crime Description:", best_crime_description)
