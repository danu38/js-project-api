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


// Start defining routes here
app.get("/", (req, res) => {
  res.send("Welcome to the Happy Thoughts API 💬");
  endpoints: listEndpoints(app)
});

app.get("/thoughts", (req, res) => {
  let result = [...thoughts];
 const { heartsMin, category, sortBy, page, limit } = req.query;

  if (heartsMin) {
    result = result.filter(t => t.hearts >= parseInt(heartsMin));
  }

  if (category) {
    result = result.filter(t => t.category.toLowerCase() === category.toLowerCase());
  }

  if (sortBy === "hearts") {
    result.sort((a, b) => b.hearts - a.hearts);
  } else if (sortBy === "date") {
    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Pagination
  const pageInt = parseInt(page) || 1;
  const limitInt = parseInt(limit) || result.length;
  const start = (pageInt - 1) * limitInt;
  const end = start + limitInt;

  const paginated = result.slice(start, end);

  res.json({
    page: pageInt,
    total: result.length,
    results: paginated
  });
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



