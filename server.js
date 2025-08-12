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

//let thoughts = JSON.parse(fs.readFileSync('./data.json'));     


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


// Get single thought
app.get("/thoughts/:id", async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (!thought) {
      return res.status(404).json({ error: "Thought not found" });
    }
    res.json(thought);
  } catch {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// Create a new thought
app.post("/thoughts", async (req, res) => {
  try {
    const { message, category } = req.body;
    const newThought = new Thought({ message, category });
    const savedThought = await newThought.save();
    res.status(201).json(savedThought);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a thought
app.put("/thoughts/:id", async (req, res) => {
  try {
    const updatedThought = await Thought.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedThought) {
      return res.status(404).json({ error: "Thought not found" });
    }
    res.json(updatedThought);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a thought
app.delete("/thoughts/:id", async (req, res) => {
  try {
    const deletedThought = await Thought.findByIdAndDelete(req.params.id);
    if (!deletedThought) {
      return res.status(404).json({ error: "Thought not found" });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Like a thought
app.post("/thoughts/:id/like", async (req, res) => {
  try {
    const thought = await Thought.findByIdAndUpdate(
      req.params.id,
      { $inc: { hearts: 1 } },
      { new: true }
    );
    if (!thought) {
      return res.status(404).json({ error: "Thought not found" });
    }
    res.json(thought);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});



