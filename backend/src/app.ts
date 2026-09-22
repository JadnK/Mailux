import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin === "*" ? true : env.corsOrigin.split(",").map((o) => o.trim()),
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.isProduction ? "combined" : "dev"));

// Unauthenticated - used by systemd/uptime checks and load balancers.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.use("/api", routes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler must be registered last so it catches errors from every
// route above it, including the 404 handler.
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack ?? err);
  res.status(500).json({ message: "Something went wrong" });
});

export default app;
