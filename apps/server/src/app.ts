import express from "express";
import { Response } from "express";

const app = express();

const PORT = 3000;

app.get("/", ( res : Response) => {
  res.send("Hello World!");
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
