import cors from "cors";
import express from "express";
import listEndpoints from "express-list-endpoints";
import fs from "fs";
import mongoose from 'mongoose';
import dotenv from "dotenv";


// Load environment variables from .env file
// This allows you to set environment variables like PORT and MONGO_URL
// in a .env file for local development
dotenv.config();

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 80;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

let thoughts = JSON.parse(fs.readFileSync('./data.json'));     


const mongoUrl = process.env.MONGO_URL || "mongodb://localhost:27017/happythoughts";

// Connect to MongoDB
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

// ----- Mongoose Schema -----
const thoughtSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, "Message is required"],
    minlength: [5, "Message must be at least 5 characters"],
    maxlength: [140, "Message must be max 140 characters"]
  },
  hearts: {
    type: Number,
    default: 0
  },
  category: {
    type: String,
    default: "General"
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  }
});

const Thought = mongoose.model("Thought", thoughtSchema);


// API Docs----- Routes -----
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Happy Thoughts API 💬",
    endpoints: listEndpoints(app)
  });
});

// Get all thoughts (with filtering, sorting, pagination)
app.get("/thoughts", async (req, res) => {
  try {
    const { heartsMin, category, sortBy, page, limit } = req.query;
    let query = {};

    if (heartsMin) {
      query.hearts = { $gte: parseInt(heartsMin) };
    }
    if (category) {
      query.category = category;
    }

    let sort = {};
    if (sortBy === "hearts") sort.hearts = -1;
    if (sortBy === "date") sort.createdAt = -1;

    const pageInt = parseInt(page) || 1;
    const limitInt = parseInt(limit) || 20;
    const skip = (pageInt - 1) * limitInt;

    const thoughts = await Thought.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitInt);

    res.json({
      page: pageInt,
      results: thoughts
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch thoughts" });
  }
});


app.get("/thoughts/:id", (req, res) => {
  const { id } = req.params;
  const thought = thoughts.find(t => t.id === parseInt(id));

  if (!thought) {
    return res.status(404).json({ error: "Thought not found." });
  }

  res.json(thought);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});



