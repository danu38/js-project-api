import cors from "cors";
import express from "express";
import listEndpoints from "express-list-endpoints";
import fs from "fs";

// Defines the port the app will run on. Defaults to 8080, but can be overridden
// when starting the server. Example command to overwrite PORT env variable value:
// PORT=9000 npm start
const port = process.env.PORT || 8080;
const app = express();

// Add middlewares to enable cors and json body parsing
app.use(cors());
app.use(express.json());

let thoughts = JSON.parse(fs.readFileSync('./data.json'));

// Start defining routes here
app.get("/", (req, res) => {
  res.send("Welcome to the Happy Thoughts API 💬");
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

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
