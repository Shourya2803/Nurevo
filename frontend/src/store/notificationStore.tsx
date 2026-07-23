import { create } from 'zustand';
import { api } from '../lib/api';
import { toast } from 'sonner';

const playNotificationSound = () => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.04);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    playNote(659.25, now, 0.35); // E5 note
    playNote(987.77, now + 0.08, 0.5); // B5 note
  } catch (err) {
    console.warn('Audio chime feedback failed to play:', err);
  }
};

export interface Notification {
  id: string;
  recipient_id: string;
  sender_id?: string | null;
  workspace_id: string;
  team_id?: string | null;
  type: string;
  title: string;
  message: string;
  priority: 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'UNREAD' | 'READ';
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  ws: WebSocket | null;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  connectWebSocket: (token: string) => void;
  disconnectWebSocket: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  return {
    notifications: [],
    unreadCount: 0,
    loading: false,
    ws: null,

    fetchNotifications: async () => {
      set({ loading: true });
      try {
        const response = await api.get<Notification[]>('/notifications');
        set({ notifications: response.data, loading: false });
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
        set({ loading: false });
      }
    },

    fetchUnreadCount: async () => {
      try {
        const response = await api.get<{ unread_count: number }>('/notifications/unread-count');
        set({ unreadCount: response.data.unread_count });
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    },

    markAsRead: async (id) => {
      try {
        await api.patch(`/notifications/${id}/read`);
        set((state) => {
          const updated = state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true, status: 'READ' as const } : n
          );
          const newUnread = Math.max(0, state.unreadCount - 1);
          return { notifications: updated, unreadCount: newUnread };
        });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },

    markAllAsRead: async () => {
      try {
        await api.patch('/notifications/read-all');
        set((state) => {
          const updated = state.notifications.map((n) => ({
            ...n,
            is_read: true,
            status: 'READ' as const,
          }));
          return { notifications: updated, unreadCount: 0 };
        });
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    },

    deleteNotification: async (id) => {
      try {
        await api.delete(`/notifications/${id}`);
        set((state) => {
          const n = state.notifications.find((notif) => notif.id === id);
          const updated = state.notifications.filter((notif) => notif.id !== id);
          const wasUnread = n ? !n.is_read : false;
          return {
            notifications: updated,
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
          };
        });
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    },

    connectWebSocket: (token) => {
      // Disconnect existing socket if any
      const existingWs = get().ws;
      if (existingWs) {
        (existingWs as any).wasIntentionallyClosed = true;
        existingWs.close();
      }

      // Convert api baseURL to websocket protocol base URL dynamically
      const baseApiUrl = api.defaults.baseURL || 'http://localhost:8000/api/v1';
      const wsBase = baseApiUrl.replace(/^http/, 'ws');
      const wsUrl = `${wsBase}/notifications/ws?token=${token}`;

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('Notification WebSocket connected');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle heartbeat
          if (data.type === 'pong') return;

          // Resolve notification payload (handle nested 'notification' property from backend)
          let notificationData: Notification | null = null;
          if (data.event === 'notification' && data.notification) {
            notificationData = data.notification;
          } else if (data.id) {
            notificationData = data;
          }

          if (notificationData && notificationData.id) {
            const newNotification = notificationData;
            
            // Prepend new notification and increment count
            set((state) => ({
              notifications: [newNotification, ...state.notifications],
              unreadCount: state.unreadCount + 1,
            }));

            // Play premium chime sound
            playNotificationSound();

            // Show a premium glassmorphic interactive toast popup
            toast.custom((t) => (
              <div className="flex flex-col gap-3 p-4 bg-white/95 backdrop-blur-md border border-amber-900/10 rounded-2xl shadow-xl max-w-sm w-full transition-all duration-300 pointer-events-auto">
                <div className="flex items-start gap-3 text-left">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200/50 shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[9px] font-extrabold tracking-wider uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        {newNotification.type.replace(/_/g, ' ')}
                      </span>
                      {(newNotification.priority === 'HIGH' || newNotification.priority === 'URGENT') && (
                        <span className="text-[9px] font-extrabold tracking-wider uppercase text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                          {newNotification.priority}
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 mt-1.5">{newNotification.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">{newNotification.message}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button 
                    onClick={() => toast.dismiss(t)}
                    className="px-3 py-1.5 text-[10px] font-semibold text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Dismiss
                  </button>
                  {newNotification.data?.redirect_url && (
                    <button 
                      onClick={async () => {
                        toast.dismiss(t);
                        try {
                          await get().markAsRead(newNotification.id);
                        } catch (err) {
                          console.error('Failed to mark notification as read:', err);
                        }
                        window.location.href = newNotification.data?.redirect_url;
                      }}
                      className="px-3 py-1.5 text-[10px] font-bold bg-amber-800 hover:bg-amber-900 text-white rounded-lg shadow-sm hover:shadow transition-all"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            ), {
              duration: 8000,
              position: 'bottom-right',
            });
          }
        } catch (error) {
          console.error('Error handling WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        if (!(socket as any).wasIntentionallyClosed) {
          console.log('Notification WebSocket closed:', event.reason);
        }
        set({ ws: null });
      };

      socket.onerror = (error) => {
        if ((socket as any).wasIntentionallyClosed) return;
        console.error('Notification WebSocket error:', error);
      };

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);

      set({ ws: socket });
    },

    disconnectWebSocket: () => {
      const socket = get().ws;
      if (socket) {
        (socket as any).wasIntentionallyClosed = true;
        socket.close();
        set({ ws: null });
      }
    },
  };
});
