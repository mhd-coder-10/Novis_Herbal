import express from 'express';
import { realtimeService } from '../services/realtimeService.js';

const router = express.Router();

/**
 * @route GET /api/realtime/stream
 * @desc Server-Sent Events (SSE) stream for real-time live data synchronization
 * @access Public
 */
router.get('/stream', (req, res) => {
  realtimeService.handleConnection(req, res);
});

/**
 * @route GET /api/realtime/status
 * @desc Get status of realtime connections
 * @access Public
 */
router.get('/status', (req, res) => {
  res.json({
    success: true,
    activeConnections: realtimeService.getActiveCount(),
    timestamp: new Date().toISOString()
  });
});

export default router;

