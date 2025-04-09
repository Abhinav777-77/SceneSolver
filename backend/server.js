const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const axios = require("axios");
const multer = require("multer");
const FormData = require("form-data");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());
const FLASK_SERVER_URL = "http://localhost:5001";
const PORT = process.env.PORT || 5000;

// Configure multer for handling file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

// Import Routes
const authRoutes = require("./auth");
const userRoutes = require("./user");
app.use("/auth", authRoutes);
app.use("/user", userRoutes);

// AI Query Route with streaming
app.post("/query", upload.single('image'), async (req, res) => {
  try {
    // Check if the request contains form data with an image
    if (req.file) {
      const query = req.body.query;
      const isAnalyzed = req.body.is_analyzed === 'true';
      
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send the image to the Flask server
      const formData = new FormData();
      formData.append('query', query);
      formData.append('image', req.file.buffer, req.file.originalname);
      formData.append('is_analyzed', isAnalyzed.toString());

      const flaskResponse = await axios.post(`${FLASK_SERVER_URL}/process_query`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        responseType: 'stream'
      });

      flaskResponse.data.pipe(res);
    } else {
      // Handle JSON request (backward compatibility)
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ error: "Query is required" });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      // Send the query to the Flask server without an image
      // The Flask server will use the last processed image if available
      const flaskResponse = await axios.post(`${FLASK_SERVER_URL}/process_query`, {
        query: query
      }, {
        responseType: 'stream'
      });

      flaskResponse.data.pipe(res);
    }
  } catch (error) {
    console.error("Error calling Flask server:", error);
    res.status(500).json({ 
      error: "Internal server error", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Analyze Evidence Route
app.post("/analyze", upload.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images uploaded." });
    }

    const formData = new FormData();
    req.files.forEach((file) => {
      formData.append("images", file.buffer, file.originalname);
    });

    const response = await axios.post(`${FLASK_SERVER_URL}/analyze`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error analyzing evidence:", error);
    res.status(500).json({ error: "Failed to analyze evidence." });
  }
});

// Evidence Guide Route
app.post("/evidence-guide", upload.single("images"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded." });
    }

    const formData = new FormData();
    formData.append("images", req.file.buffer, req.file.originalname);

    const response = await axios.post(`${FLASK_SERVER_URL}/evidence-guide`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error generating evidence guide:", error);
    res.status(500).json({ error: "Failed to generate evidence guide." });
  }
});

// Case Report Route
app.post("/case-report", upload.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images uploaded." });
    }

    const formData = new FormData();
    req.files.forEach((file) => {
      formData.append("images", file.buffer, file.originalname);
    });

    const response = await axios.post(`${FLASK_SERVER_URL}/generate_report`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error generating case report:", error);
    res.status(500).json({ error: "Failed to generate case report." });
  }
});

// Add these new routes after the existing routes
app.post("/fingerprint", upload.single("images"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const formData = new FormData();
    formData.append("images", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${FLASK_SERVER_URL}/fingerprint`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error in fingerprint detection:", error);
    res.status(500).json({ error: "Failed to process fingerprint detection" });
  }
});

app.post("/enhance", upload.single("images"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const formData = new FormData();
    formData.append("images", req.file.buffer, {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });

    const response = await axios.post(`${FLASK_SERVER_URL}/enhance`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error in image enhancement:", error);
    res.status(500).json({ error: "Failed to process image enhancement" });
  }
});

app.post("/patterns", upload.array("images"), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No images provided" });
    }

    const formData = new FormData();
    req.files.forEach((file) => {
      formData.append("images", file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });
    });

    const response = await axios.post(`${FLASK_SERVER_URL}/patterns`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });

    res.json(response.data);
  } catch (error) {
    console.error("Error in pattern analysis:", error);
    res.status(500).json({ error: "Failed to process pattern analysis" });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
