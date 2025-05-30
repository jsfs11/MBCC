import express, { Request, Response, NextFunction, Application } from 'express';
import { pipeline } from '@xenova/transformers';
import { fileURLToPath } from 'url';
import { dirname, resolve as pathResolve } from 'path'; // Import resolve

// ES module equivalents for __filename and __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Type definitions for the application
 */
interface SentimentRequest {
  text: string;
}

interface SentimentResponse {
  sentiment: 'positive' | 'negative';
  confidence: number;
  text: string;
}

interface MoodEntry {
  id: string;
  text: string;
  sentiment: 'positive' | 'negative';
  confidence: number;
  timestamp: string;
}

interface ErrorResponse {
  error: string;
  message: string;
  timestamp: string;
}

/**
 * Environment configuration
 */
const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'), // 100 requests per window
};

/**
 * In-memory storage for mood entries (replace with database in production)
 */
const moodEntries: MoodEntry[] = [];

/**
 * Sentiment analysis pipeline - initialized lazily
 */
let sentimentPipeline: any = null;

/**
 * Initialize the sentiment analysis pipeline
 */
async function initializeSentimentPipeline(): Promise<void> {
  try {
    console.log('Initializing sentiment analysis pipeline...');
    sentimentPipeline = await pipeline(
      'sentiment-analysis',
      'Xenova/distilbert-base-uncased-finetuned-sst-2-english' // Trying a model from the library authors
    );
    console.log('Sentiment analysis pipeline initialized successfully');
  } catch (error) {
    console.error('Failed to initialize sentiment analysis pipeline:', error);
    throw new Error('Sentiment analysis service unavailable');
  }
}

/**
 * Perform sentiment analysis on text
 */
async function analyzeSentiment(text: string): Promise<SentimentResponse> {
  if (!sentimentPipeline) {
    await initializeSentimentPipeline();
  }

  try {
    const result = await sentimentPipeline(text);
    const sentiment = result[0];
    
    // Normalize the sentiment label to our expected format
    const normalizedSentiment = sentiment.label.toLowerCase() === 'positive' ? 'positive' : 'negative';
    
    return {
      sentiment: normalizedSentiment,
      confidence: Math.round(sentiment.score * 100) / 100,
      text: text.trim()
    };
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    throw new Error('Failed to analyze sentiment');
  }
}

/**
 * Input validation middleware
 */
function validateSentimentInput(req: Request, res: Response, next: NextFunction): void {
  const { text } = req.body as SentimentRequest;
  
  if (!text || typeof text !== 'string') {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Text field is required and must be a string',
      timestamp: new Date().toISOString()
    } as ErrorResponse);
    return;
  }
  
  if (text.trim().length === 0) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Text cannot be empty',
      timestamp: new Date().toISOString()
    } as ErrorResponse);
    return;
  }
  
  if (text.length > 1000) {
    res.status(400).json({
      error: 'Validation Error',
      message: 'Text must be less than 1000 characters',
      timestamp: new Date().toISOString()
    } as ErrorResponse);
    return;
  }
  
  next();
}

/**
 * Request logging middleware
 */
function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  
  console.log(JSON.stringify({
    timestamp,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  }));
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`
    }));
  });
  
  next();
}

/**
 * Basic CORS middleware (replace with proper cors package when available)
 */
function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  res.header('Access-Control-Allow-Origin', config.corsOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}

/**
 * Basic rate limiting middleware (replace with express-rate-limit when available)
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowStart = now - config.rateLimitWindow;
  
  // Clean up old entries
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
  
  const clientData = rateLimitStore.get(clientId);
  
  if (!clientData || clientData.resetTime < now) {
    rateLimitStore.set(clientId, {
      count: 1,
      resetTime: now + config.rateLimitWindow
    });
    next();
    return;
  }
  
  if (clientData.count >= config.rateLimitMax) {
    res.status(429).json({
      error: 'Rate Limit Exceeded',
      message: `Too many requests. Limit: ${config.rateLimitMax} requests per ${config.rateLimitWindow / 1000} seconds`,
      timestamp: new Date().toISOString()
    } as ErrorResponse);
    return;
  }
  
  clientData.count++;
  next();
}

/**
 * Error handling middleware
 */
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  console.error(JSON.stringify({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    method: req.method,
    url: req.url,
    body: req.body
  }));
  
  if (res.headersSent) {
    return next(err);
  }
  
  const statusCode = err.message.includes('Validation') ? 400 : 
                    err.message.includes('unavailable') ? 503 : 500;
  
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
    message: statusCode === 500 ? 'An unexpected error occurred' : err.message,
    timestamp: new Date().toISOString()
  } as ErrorResponse);
}

/**
 * Create and configure Express application
 */
function createApp(): Application {
  const app = express();
  
  // Trust proxy for accurate IP addresses
  app.set('trust proxy', 1);
  
  // Basic security headers (replace with helmet when available)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  
  // Middleware stack
  app.use(corsMiddleware);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(requestLogger);
  app.use(rateLimitMiddleware);
  
  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.nodeEnv,
      services: {
        sentimentAnalysis: sentimentPipeline ? 'ready' : 'initializing'
      }
    });
  });
  
  // Sentiment analysis endpoint
  app.post('/api/sentiment', validateSentimentInput, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body as SentimentRequest;
      const result = await analyzeSentiment(text);
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
  
  // Store mood entry endpoint
  app.post('/api/moods', validateSentimentInput, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { text } = req.body as SentimentRequest;
      const sentimentResult = await analyzeSentiment(text);
      
      const moodEntry: MoodEntry = {
        id: `mood_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: sentimentResult.text,
        sentiment: sentimentResult.sentiment,
        confidence: sentimentResult.confidence,
        timestamp: new Date().toISOString()
      };
      
      moodEntries.push(moodEntry);
      
      // Keep only the last 1000 entries to prevent memory issues
      if (moodEntries.length > 1000) {
        moodEntries.splice(0, moodEntries.length - 1000);
      }
      
      res.status(201).json(moodEntry);
    } catch (error) {
      next(error);
    }
  });
  
  // Retrieve mood history endpoint
  app.get('/api/moods', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    const paginatedEntries = moodEntries
      .slice()
      .reverse() // Most recent first
      .slice(offset, offset + limit);
    
    res.json({
      moods: paginatedEntries,
      total: moodEntries.length,
      limit,
      offset
    });
  });
  
  // 404 handler
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: 'Not Found',
      message: `Route ${req.method} ${req.originalUrl} not found`,
      timestamp: new Date().toISOString()
    } as ErrorResponse);
  });
  
  // Error handling middleware (must be last)
  app.use(errorHandler);
  
  return app;
}

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    console.log('Starting Mood-Based Content Curator Server...');
    
    // Initialize sentiment analysis pipeline
    await initializeSentimentPipeline();
    
    // Create Express app
    const app = createApp();
    
    // Start server
    const server = app.listen(config.port, () => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        message: 'Server started successfully',
        port: config.port,
        environment: config.nodeEnv,
        pid: process.pid
      }));
    });
    
    // Graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        message: `Received ${signal}, starting graceful shutdown...`
      }));
      
      server.close((err?: Error) => {
        if (err) {
          console.error('Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log(JSON.stringify({
          timestamp: new Date().toISOString(),
          message: 'Server shut down gracefully'
        }));
        
        process.exit(0);
      });
    };
    
    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        error: 'Uncaught Exception',
        message: error.message,
        stack: error.stack
      }));
      process.exit(1);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        error: 'Unhandled Promise Rejection',
        reason: reason,
        promise: promise
      }));
      process.exit(1);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server if this file is run directly
// Debugging the condition for starting the server
const scriptPath = fileURLToPath(import.meta.url);
const entryPointPath = pathResolve(process.argv[1]);

if (scriptPath === entryPointPath) {
  // Script identified as main entry point. Starting server...
  startServer().catch((error) => {
    console.error('Server startup failed:', error);
    process.exit(1);
  });
}

export { createApp, startServer };