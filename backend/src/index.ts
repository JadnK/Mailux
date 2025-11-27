import express from "express";
import cors from "cors";
import mailRoutes from "./email-service/routes/mailRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/mail", mailRoutes);

app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from backend!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));