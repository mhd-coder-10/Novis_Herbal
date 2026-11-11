/**
 * Realtime Event Service using Server-Sent Events (SSE)
 * Provides instant real-time synchronization between Admin Panel and Storefront
 * across all connected browser tabs, devices, and visitors without requiring page reload.
 */
class RealtimeService {
  constructor() {
    this.clients = new Set();
  }

  /**
   * Handle incoming SSE connection from frontend
   */
  handleConnection(req, res) {
    // SSE Headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // Initial connection ack
    res.write(`event: handshake\ndata: ${JSON.stringify({ status: 'connected', time: Date.now() })}\n\n`);

    this.clients.add(res);

    // Heartbeat ping every 25 seconds to keep connection alive through proxies
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (err) {
        clearInterval(heartbeat);
        this.clients.delete(res);
      }
    }, 25000);

    // Clean up when client disconnects
    req.on('close', () => {
      clearInterval(heartbeat);
      this.clients.delete(res);
    });
  }

  /**
   * Broadcast an event to all connected clients
   * @param {string} eventType - e.g. 'CMS_UPDATED', 'PRODUCT_UPDATED', 'ORDER_UPDATED', 'REVIEW_UPDATED'
   * @param {object} payload - Event data
   */
  broadcast(eventType, payload = {}) {
    const dataString = JSON.stringify({
      ...payload,
      timestamp: Date.now()
    });

    const message = `event: ${eventType}\ndata: ${dataString}\n\n`;

    for (const client of this.clients) {
      try {
        client.write(message);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  /**
   * Get active connected clients count
   */
  getActiveCount() {
    return this.clients.size;
  }
}

export const realtimeService = new RealtimeService();

