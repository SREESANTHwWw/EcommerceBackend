const express = require("express");
const mongoose = require("mongoose");

const Router = express.Router();

Router.get("/health", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;

    const dbStatusMap = {
      0: "disconnected",
      1: "connected",
      2: "connecting",
      3: "disconnecting",
    };

    const dbStatus = dbStatusMap[dbState] || "unknown";

    // If DB is not connected → service unavailable
    if (dbState !== 1) {
      return res.status(503).json({
        status: false,
        server: "running",
        database: dbStatus,
        uptime: process.uptime(),
      });
    }

    // Healthy
    return res.status(200).json({
      status: true,
      server: "running",
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error("Health check failed:", error);

    return res.status(500).json({
      status: false,
      server: "error",
      message: "Health check failed",
    });
  }
});

module.exports = Router;
