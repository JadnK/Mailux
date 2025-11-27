import express from "express";
import router from "./routes/index.js";
import cors from "cors";

const app = express();

//IM prod
//app.use(cors({
//  origin: ["https://jadenk.de"],
//  credentials: true, 
//}));

app.use(cors());
app.use(express.json());

app.use("/api", router);

export default app;
