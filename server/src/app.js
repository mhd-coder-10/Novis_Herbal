import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';

// Import aggregated routes from routes/index.js
import routes from './routes/index.js';

const app = express();

// Global Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded product photos & assets statically
app.use('/uploads', express.static(path.resolve('uploads')));

// Mount all API routes from routes/index.js
app.use('/api', routes);

// System Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    brand: 'Novis Herbal API',
    timestamp: new Date().toISOString()
  });
});

// Centralized Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error('[API Server Error]:', err);
  res.status(err.statusCode || err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

export default app;
