import { useCMSStore } from '../store/useCMSStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAuthStore } from '../store/useAuthStore';

export type LiveEventType =
  | 'CMS_UPDATED'
  | 'PRODUCT_UPDATED'
  | 'REVIEW_UPDATED'
  | 'ORDER_UPDATED'
  | 'SETTINGS_UPDATED'
  | 'NOTIFICATION_ADMIN'
  | 'NOTIFICATION_USER'
  | 'NOTIFICATION_BROADCAST'
  | 'NOTIFICATION_DELETED';

export interface LiveSyncMessage {
  type: LiveEventType;
  payload?: any;
  timestamp: number;
}

// 1. Cross-tab BroadcastChannel for 0ms same-browser sync
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('novise_live_sync_bus');
  }
} catch (e) {
  console.warn('[RealtimeSync] BroadcastChannel unsupported:', e);
}

/**
 * Emit a live update event across all browser tabs & local storage
 * Instantly notifies open storefront tabs with zero page reload
 */
export const emitLiveEvent = (type: LiveEventType, payload?: any) => {
  const message: LiveSyncMessage = {
    type,
    payload,
    timestamp: Date.now(),
  };

  // 1. BroadcastChannel (0ms instant cross-tab sync in same browser)
  try {
    if (broadcastChannel) {
      broadcastChannel.postMessage(message);
    }
  } catch (err) {
    console.warn('[RealtimeSync] BroadcastChannel post error:', err);
  }

  // 2. LocalStorage StorageEvent fallback (for browsers/tabs without BroadcastChannel)
  try {
    localStorage.setItem('novise_live_sync_event', JSON.stringify(message));
  } catch (err) {
    // Ignore quota errors
  }
};

/**
 * Dispatch handler for processing incoming live sync events
 */
export const handleIncomingLiveEvent = (type: LiveEventType, payload?: any) => {
  console.log(`[RealtimeSync] Live Event Received: ${type}`, payload);

  switch (type) {
    case 'CMS_UPDATED':
    case 'SETTINGS_UPDATED': {
      if (payload?.cms) {
        useCMSStore.getState().updateCMSState(payload.cms);
      } else {
        useCMSStore.getState().fetchCMS();
      }
      break;
    }

    case 'PRODUCT_UPDATED': {
      // Notify all listening components (HomePage, ShopPage, ProductDetailPage)
      window.dispatchEvent(new CustomEvent('novise:product-updated', { detail: payload }));
      // Also refresh CMS so hero slider prices or badges remain synchronized
      useCMSStore.getState().fetchCMS();
      break;
    }

    case 'REVIEW_UPDATED': {
      window.dispatchEvent(new CustomEvent('novise:review-updated', { detail: payload }));
      break;
    }

    case 'ORDER_UPDATED': {
      window.dispatchEvent(new CustomEvent('novise:order-updated', { detail: payload }));
      break;
    }

    case 'NOTIFICATION_ADMIN': {
      if (payload) {
        useNotificationStore.getState().handleIncomingAdminNotification(payload);
      }
      break;
    }

    case 'NOTIFICATION_BROADCAST': {
      if (payload) {
        const currentUser = useAuthStore.getState().user;
        if (currentUser?.createdAt && payload.createdAt) {
          const userJoined = new Date(currentUser.createdAt).getTime() - 5000;
          const notifTime = new Date(payload.createdAt).getTime();
          if (notifTime < userJoined) {
            // Drop broadcast notifications created before customer registered
            break;
          }
        }
        useNotificationStore.getState().handleIncomingNotification(payload);
      }
      break;
    }

    case 'NOTIFICATION_USER': {
      if (payload) {
        const currentUser = useAuthStore.getState().user;
        const currentEmail = currentUser?.email?.toLowerCase().trim();
        const currentId = (currentUser?.id || currentUser?._id) ? String(currentUser.id || currentUser._id) : null;
        const targetEmail = payload.targetEmail?.toLowerCase().trim();
        const targetUserId = payload.targetUserId ? String(payload.targetUserId) : null;

        // Verify notification is meant for this customer
        if (
          (currentEmail && targetEmail && currentEmail === targetEmail) ||
          (currentId && targetUserId && currentId === targetUserId)
        ) {
          useNotificationStore.getState().handleIncomingNotification(payload);
        }
      }
      break;
    }

    case 'NOTIFICATION_DELETED': {
      if (payload?.clearAll) {
        useNotificationStore.setState({ notifications: [], unreadCount: 0 });
      } else if (payload?.id) {
        useNotificationStore.getState().handleNotificationDeleted(payload.id);
        window.dispatchEvent(new CustomEvent('novise:notification-deleted', { detail: payload }));
      }
      break;
    }

    default:
      useCMSStore.getState().fetchCMS();
      break;
  }
};

/**
 * Initializes full real-time synchronization engine:
 * 1. BroadcastChannel listener (0ms cross-tab sync in same browser)
 * 2. Window storage event listener (cross-tab fallback)
 * 3. Server-Sent Events (SSE) listener (cross-browser / cross-device live sync)
 * 4. Visibilitychange & Focus listener (instant fresh state when user switches tabs)
 */
export const initRealtimeSync = () => {
  if (typeof window === 'undefined') return () => { };

  // 1. Setup BroadcastChannel listener
  if (broadcastChannel) {
    broadcastChannel.onmessage = (event) => {
      if (event.data?.type) {
        handleIncomingLiveEvent(event.data.type, event.data.payload);
      }
    };
  }

  // 2. Setup LocalStorage storage event listener
  const onStorage = (event: StorageEvent) => {
    if (event.key === 'novise_live_sync_event' && event.newValue) {
      try {
        const parsed: LiveSyncMessage = JSON.parse(event.newValue);
        if (parsed?.type) {
          handleIncomingLiveEvent(parsed.type, parsed.payload);
        }
      } catch (e) {
        // Ignore parse error
      }
    }
  };
  window.addEventListener('storage', onStorage);

  // 3. Tab Visibility & Focus listener
  // Whenever user switches back to any Novise tab, quietly revalidate CMS data & live order state
  const onVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      useCMSStore.getState().fetchCMS();
      window.dispatchEvent(new CustomEvent('novise:product-updated'));
      window.dispatchEvent(new CustomEvent('novise:order-updated'));
    }
  };
  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('focus', onVisibilityChange);

  // 4. Server-Sent Events (SSE) for Network-Wide / Multi-Device Sync
  let eventSource: EventSource | null = null;
  let isCleaningUp = false;

  const connectSSE = () => {
    if (isCleaningUp) return;

    try {
      const serverUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      const sseUrl = `${serverUrl}/realtime/stream`;

      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('CMS_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingLiveEvent('CMS_UPDATED', data);
        } catch {
          handleIncomingLiveEvent('CMS_UPDATED');
        }
      });

      eventSource.addEventListener('PRODUCT_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingLiveEvent('PRODUCT_UPDATED', data);
        } catch {
          handleIncomingLiveEvent('PRODUCT_UPDATED');
        }
      });

      eventSource.addEventListener('REVIEW_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingLiveEvent('REVIEW_UPDATED', data);
        } catch {
          handleIncomingLiveEvent('REVIEW_UPDATED');
        }
      });

      eventSource.addEventListener('ORDER_UPDATED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingLiveEvent('ORDER_UPDATED', data);
        } catch {
          handleIncomingLiveEvent('ORDER_UPDATED');
        }
      });

      eventSource.addEventListener('NOTIFICATION_ADMIN', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingLiveEvent('NOTIFICATION_ADMIN', data);
        } catch {
          // ignore
        }
      });

      eventSource.addEventListener('NOTIFICATION_USER', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingLiveEvent('NOTIFICATION_USER', data);
        } catch {
          // ignore
        }
      });

      eventSource.addEventListener('NOTIFICATION_BROADCAST', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingLiveEvent('NOTIFICATION_BROADCAST', data);
        } catch {
          // ignore
        }
      });

      eventSource.addEventListener('NOTIFICATION_DELETED', (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handleIncomingLiveEvent('NOTIFICATION_DELETED', data);
        } catch {
          // ignore
        }
      });

      eventSource.onerror = () => {
        // Native EventSource automatically retries connection
        console.debug('[RealtimeSync] SSE connection interrupted. Native auto-retry active.');
      };
    } catch (err) {
      console.warn('[RealtimeSync] SSE setup failed:', err);
    }
  };

  connectSSE();

  // Return comprehensive cleanup function
  return () => {
    isCleaningUp = true;
    window.removeEventListener('storage', onStorage);
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('focus', onVisibilityChange);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
};

