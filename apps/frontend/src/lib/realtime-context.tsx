'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'sonner';
import type { AppNotification } from '@sentinel-desk/types';
import { apiClient } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/use-current-user';

interface RealtimeContextValue {
  socket: Socket | null;
  onlineUserIds: Set<string>;
}

const RealtimeContext = createContext<RealtimeContextValue>({ socket: null, onlineUserIds: new Set() });

export function useRealtime() {
  return useContext(RealtimeContext);
}

export function useIsOnline(userId: string | undefined) {
  const { onlineUserIds } = useRealtime();
  return !!userId && onlineUserIds.has(userId);
}

const WS_URL = process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    const s = io(WS_URL, { withCredentials: true });
    setSocket(s);

    apiClient
      .get<{ onlineUserIds: string[] }>('/realtime/presence')
      .then(({ data }) => setOnlineUserIds(new Set(data.onlineUserIds)))
      .catch(() => undefined);

    s.on('presence:update', ({ userId, online }: { userId: string; online: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (online) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    s.on('notification:new', (notification: AppNotification) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      toast(notification.title, { description: notification.body });
    });

    s.on('ticket:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['sla'], exact: false });
    });
    s.on('ticket:created', () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['sla'], exact: false });
    });

    return () => {
      s.disconnect();
      setSocket(null);
      setOnlineUserIds(new Set());
    };
  }, [user?.id, queryClient]);

  return <RealtimeContext.Provider value={{ socket, onlineUserIds }}>{children}</RealtimeContext.Provider>;
}
