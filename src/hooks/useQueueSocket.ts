"use client";

import * as React from "react";
import type { QueueSnapshotDTO, DoctorCabinStatusDTO } from "@/lib/services/QueueService";

interface UseQueueSocketOptions {
  pollingFallbackIntervalMs?: number;
}

export function useQueueSocket(doctorId: string, options?: UseQueueSocketOptions) {
  const [snapshot, setSnapshot] = React.useState<QueueSnapshotDTO | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);
  const [isReconnecting, setIsReconnecting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = React.useState<Date | null>(null);

  // Fetch full authoritative snapshot via REST
  const fetchAuthoritativeSnapshot = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/queue/${doctorId}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setSnapshot(json.data);
        setLastUpdatedAt(new Date());
        setError(null);
      }
    } catch {
      // Ignore background network blip
    }
  }, [doctorId]);

  React.useEffect(() => {
    let isMounted = true;
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let retryDelay = 1000;

    // Fetch initial REST snapshot immediately
    fetchAuthoritativeSnapshot();

    const connectSSE = () => {
      if (!isMounted) return;

      try {
        eventSource = new EventSource(`/api/v1/queue/${doctorId}/stream`);

        eventSource.onopen = () => {
          if (!isMounted) return;
          setIsConnected(true);
          setIsReconnecting(false);
          setError(null);
          retryDelay = 1000; // Reset backoff
        };

        // Initial snapshot sent on stream start
        eventSource.addEventListener("initial", (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(e.data);
            setSnapshot(data);
            setLastUpdatedAt(new Date());
          } catch {}
        });

        // Live diffs and token call events
        const handleDiff = () => {
          if (!isMounted) return;
          fetchAuthoritativeSnapshot();
        };

        eventSource.addEventListener("queue_diff", handleDiff);
        eventSource.addEventListener("call_next", handleDiff);
        eventSource.addEventListener("queue_update", handleDiff);

        // Real-time doctor status updates (On Break / Delayed / Consulting)
        eventSource.addEventListener("doctor_status", (e: MessageEvent) => {
          if (!isMounted) return;
          try {
            const doctorStatus: DoctorCabinStatusDTO = JSON.parse(e.data);
            setSnapshot((prev) => {
              if (!prev) return prev;
              const extraOffset =
                doctorStatus.status === "ON_BREAK" || doctorStatus.status === "DELAYED"
                  ? doctorStatus.delayMinutes
                  : 0;
              const estimatedWaitMinutes = Math.max(
                0,
                prev.waitingCount * prev.avgDurationMinutes + extraOffset
              );

              return {
                ...prev,
                doctorStatus,
                estimatedWaitMinutes,
              };
            });
            setLastUpdatedAt(new Date());
          } catch {}
        });

        eventSource.onerror = () => {
          if (!isMounted) return;
          setIsConnected(false);
          setIsReconnecting(true);
          eventSource?.close();

          // Exponential backoff reconnect (up to 10s max)
          reconnectTimeout = setTimeout(() => {
            retryDelay = Math.min(retryDelay * 1.5, 10000);
            connectSSE();
          }, retryDelay);
        };
      } catch (err) {
        setIsConnected(false);
        setIsReconnecting(true);
      }
    };

    connectSSE();

    // Fallback polling interval in case SSE drops or proxies buffer
    const pollIntervalMs = options?.pollingFallbackIntervalMs || 4000;
    const pollingTimer = setInterval(() => {
      if (!isConnected) {
        fetchAuthoritativeSnapshot();
      }
    }, pollIntervalMs);

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      clearInterval(pollingTimer);
    };
  }, [doctorId, fetchAuthoritativeSnapshot, isConnected, options?.pollingFallbackIntervalMs]);

  return {
    snapshot,
    isConnected,
    isReconnecting,
    error,
    lastUpdatedAt,
    refresh: fetchAuthoritativeSnapshot,
  };
}
