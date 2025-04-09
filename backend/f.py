import faiss
import pandas as pd
from sentence_transformers import SentenceTransformer
import numpy as np

# Load crime descriptions from CSV
df = pd.read_csv("C:\\Users\\Dell\\Desktop\\pro\\backend\\expanded_crime_dataset.csv")

# Extract only "Crime Description" column
crime_descriptions = df["Crime Description"].dropna().tolist()

# Load a text embedding model (BERT-based)
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

# Convert crime descriptions to embeddings
embeddings = model.encode(crime_descriptions, convert_to_numpy=True)

# Define FAISS index (L2 distance search)
dimension = embeddings.shape[1]
index = faiss.IndexFlatL2(dimension)

# Add embeddings to FAISS index
index.add(embeddings)

# Save FAISS index to disk
faiss.write_index(index, "crime_descriptions_faiss.index")

print(f"Stored {len(crime_descriptions)} crime descriptions in FAISS!")
