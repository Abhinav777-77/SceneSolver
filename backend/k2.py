import requests

API_KEY = "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"
response = requests.get("https://api-inference.huggingface.co/models/openai/clip-vit-large-patch14",
                        headers={"Authorization": f"Bearer {API_KEY}"})

print(response.json())  # Should return model status
