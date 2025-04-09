import requests

model_name = "laion/CLIP-ViT-H-14-laion2B-s32B-b79K"  # Replace with your model
API_URL = f"https://huggingface.co/api/models/{model_name}"

response = requests.get(API_URL)

if response.status_code == 200:
    data = response.json()
    if data.get("pipeline_tag"):
        print(f"✅ {model_name} supports API inference! Pipeline: {data['pipeline_tag']}")
    else:
        print(f"❌ {model_name} does NOT support API inference.")
else:
    print("Error:", response.status_code)
