import dotenv from 'dotenv';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { db } from "@db";
import { sql } from "drizzle-orm";
import { setupAuth } from "./auth";
import { createServer } from "http";
import path from "path";
import fs from 'fs/promises';
import cors from 'cors';

// Load environment variables from .env file
dotenv.config();

const app = express();

// Parse allowed origins from environment or use permissive setting in development
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',') 
  : true; // In development, allow all origins

// Add CORS configuration
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

// Increase body parser limits substantially for larger file uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add request timeout middleware
app.use((req, res, next) => {
  // Set timeout to 2 minutes
  req.setTimeout(120000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// Add error handling for aborted requests
app.use((req, res, next) => {
  req.on('aborted', () => {
    log(`Request aborted: ${req.method} ${req.path}`);
    // Clean up any temporary resources if needed
  });
  next();
});

// Serve static files from attached_assets and client/public directories
app.use('/videos', express.static(path.join('client', 'public', 'videos'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4')) {
      res.set('Content-Type', 'video/mp4');
    }
  }
}));
app.use('/images', express.static(path.join('client', 'public', 'images')));
app.use('/attached_assets', express.static('attached_assets'));

// Add static file serving for uploaded profile images
app.use('/uploads', express.static('uploads'));

// Add logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to initialize database and start server
async function initializeApp() {
  try {
    // Test database connection with retry logic
    let retries = 5;
    while (retries > 0) {
      try {
        log("Testing database connection...");
        await db.execute(sql`SELECT 1`);
        log("✅ Database connection successful");
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw error;
        }
        log(`Database connection failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'uploads');
    try {
      await fs.mkdir(uploadsDir, { recursive: true });
      log("✅ Uploads directory created");
    } catch (error) {
      console.error('Error creating uploads directory:', error);
    }

    // Create HTTP server and register routes
    const server = createServer(app);

    // Setup authentication before routes
    setupAuth(app);

    // Register routes after auth setup
    registerRoutes(app);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error("Server error:", err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
    });

    // Setup Vite or static serving
    if (app.get("env") === "development") {
      await setupVite(app, server);
      log("Development server setup complete");
    } else {
      serveStatic(app);
      log("Production static serving enabled");
    }

    // Get port from environment variable or use 5000 as default to match .replit config
    const PORT = parseInt(process.env.PORT || "5000", 10);
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running at http://0.0.0.0:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    if (error instanceof Error) {
      console.error("Error details:", error.message);
      console.error("Stack trace:", error.stack);
    }
    process.exit(1);
  }
}

// Start the application
initializeApp();