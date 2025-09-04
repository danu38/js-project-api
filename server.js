import cors from "cors";
import express from "express";
import listEndpoints from "express-list-endpoints";
import fs, { access } from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import crypto from "crypto";

// Load environment variables from .env file
// This allows  to set environment variables like PORT and MONGO_URL
// in a .env file for local development
dotenv.config();

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors({
  origin: ["https://happythoughtsappbydanu.netlify.app/"], // add your deployed FE origin here later
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  // credentials: true, // only if you ever use cookies
}));
app.use(express.json());

//let thoughts = JSON.parse(fs.readFileSync('./data.json'));

const mongoUrl =
  process.env.MONGO_URL || "mongodb://localhost:27017/happythoughts";

// Connect to MongoDB
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

// ----- Mongoose Schema -----
const thoughtSchema = new mongoose.Schema({
  message: {
    type: String,
    required: [true, "Message is required"],
    minlength: [5, "Message must be at least 5 characters"],
    maxlength: [140, "Message must be max 140 characters"],
  },
  hearts: {
    type: Number,
    default: 0,
  },
  category: {
    type: String,
    default: "General",
  },
  createdBy: { 
    type: String, 
    required: true },
  createdAt: {
    type: Date,
    default: () => new Date(),
  },
});

const Thought = mongoose.model("Thought", thoughtSchema);
//User model
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [20, "Username must be max 20 characters"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(16).toString("hex"),
  },
});

const User = mongoose.model("User", userSchema);

// ----- Middleware for authentication -----
const authenticateUser = async (req, res, next) => {
  const raw = req.header("Authorization") || "";
  // accept "Bearer <token>" OR raw "<token>"
  const accessToken = raw.startsWith("Bearer ") ? raw.slice(7) : raw;

  try {
    const user = await User.findOne({ accessToken });
    if (user) {
      req.user = user;
      next();
    } else {
      res.status(401).json({ message: "Please log in" });
    }
  } catch (err) {
    res.status(403).json({ message: "Access denied" });
  }
};

// ----- User Registration -----
app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (password.length < 5) {
      return res
        .status(400)
        .json({ message: "Password must be at least 5 characters long" });
    }

    const salt = bcrypt.genSaltSync();
    const hashedPassword = bcrypt.hashSync(password, salt);

    const newUser = await new User({
      username,
      password: hashedPassword,
    }).save();

    res.status(201).json({
      username: newUser.username,
      accessToken: newUser.accessToken,
    });
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ message: "That username already exists" });
    } else {
      res.status(500).json({ message: "Internal server error", error: err });
    }
  }
});
// ----- User Login -----
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });

  if (!user) {
    return res
      .status(400)
      .json({ message: "Username or password is incorrect" });
  }

  if (bcrypt.compareSync(password, user.password)) {
    res.json({
      username: user.username,
      accessToken: user.accessToken,
    });
  } else {
    res.status(400).json({ message: "Username or password is incorrect" });
  }
});

// API Docs----- Routes -----
app.get("/", (req, res) => {
  res.json({
    message: "Welcome to the Happy Thoughts API 💬",
    endpoints: listEndpoints(app),
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
      results: thoughts,
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

// Create new thought (authenticated)
app.post("/thoughts", authenticateUser, async (req, res) => {
  try {
    const { message, category } = req.body;
    const newThought = new Thought({
      message,
      category,
      createdBy: req.user.username,
    });

    const savedThought = await newThought.save();
    res.status(201).json(savedThought);
  } catch (err) {
    res.status(400).json({ message: "Could not save thought", error: err });
  }
});

// Update a thought
app.patch("/thoughts/:id", authenticateUser, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);

    if (!thought) {
      return res.status(404).json({ message: "Thought not found" });
    }

    if (thought.createdBy !== req.user.username) {
      return res
        .status(403)
        .json({ message: "Not allowed to edit this thought" });
    }

    thought.message = req.body.message || thought.message;
    await thought.save();
    res.json(thought);
  } catch (err) {
    res.status(400).json({ message: "Could not update thought", error: err });
  }
});

// Delete a thought
app.delete("/thoughts/:id", authenticateUser, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);

    if (!thought) {
      return res.status(404).json({ message: "Thought not found" });
    }

    if (thought.createdBy !== req.user.username) {
      return res
        .status(403)
        .json({ message: "Not allowed to delete this thought" });
    }

    await thought.deleteOne();
    res.json({ message: "Thought deleted successfully" });
  } catch (err) {
    res.status(400).json({ message: "Could not delete thought", error: err });
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
