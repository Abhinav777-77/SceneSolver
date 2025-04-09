import requests

API_URL = "https://api-inference.huggingface.co/models/laion/CLIP-ViT-H-14-laion2B-s32B-b79KK"
# API_URL = "https://huggingface.co/laion/CLIP-ViT-H-14-laion2B-s32B-b79KK"
HEADERS = {"Authorization": "Bearer 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"}  # Replace with actual Hugging Face token

def query_clip(image_url, text):
    """Send request to Hugging Face CLIP model using an image URL."""
    payload = {
        "inputs": {
            "image": image_url,
            "text": text
        }
    }
    response = requests.post(API_URL, headers=HEADERS, json=payload)

    print("Status Code:", response.status_code)
    print("Response Text:", response.text)

    try:
        return response.json()
    except requests.exceptions.JSONDecodeError:
        return {"error": "Invalid JSON response from API"}

# Test with a publicly accessible image URL
image_url = "https://res.cloudinary.com/dwfelau7t/image/upload/v1742832744/mllpd7w60jnmybh6ftek.jpg"  # Replace with a working image URL
text = ["a dog", "a cat", "a car"]

result = query_clip(image_url, text)
print(result)
