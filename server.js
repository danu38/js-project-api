import cors from "cors";
import express from "express";

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
  res.json([
    { id: 1, name: "Alice" },
    { id: 2, name: "Bob" },
    { id: 3, name: "Charlie" },
  ]);
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
