/**
 * useLeaveNotification
 * 관리자 전용: SSE 스트림을 구독하여 구글폼 연차 신청이 들어오면
 * - toast 알림 표시
 * - 미처리 신청 수(badge) 상태 관리
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";

export interface LeaveNotificationEvent {
  type: "new_leave_request";
  id: number;
  employee_name: string;
  start_date: string;
  end_date: string;
  half_day: string | null;
  leave_type: string;
  source: string;
  created_at: number;
}

// 전역 미처리 뱃지 카운트 (SSE 연결 전 초기값은 API로 가져옴)
let globalBadgeCount = 0;
const badgeListeners = new Set<(count: number) => void>();

export function useLeaveBadgeCount() {
  const [count, setCount] = useState(globalBadgeCount);
  useEffect(() => {
    badgeListeners.add(setCount);
    return () => { badgeListeners.delete(setCount); };
  }, []);
  return count;
}

function setBadgeCount(count: number) {
  globalBadgeCount = count;
  badgeListeners.forEach(fn => fn(count));
}

export function useLeaveNotification(isAdmin: boolean) {
  const esRef = useRef<EventSource | null>(null);

  // 초기 미처리 신청 수 로드
  const loadPendingCount = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/leave-requests");
      if (!res.ok) return;
      const data = await res.json();
      const pending = (data.requests || []).filter(
        (r: { status: string; source: string }) => r.status === "대기"
      ).length;
      setBadgeCount(pending);
    } catch {}
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;

    // 초기 카운트 로드
    loadPendingCount();

    // SSE 연결
    const es = new EventSource("/api/leave/sse");
    esRef.current = es;

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as { type: string } & Partial<LeaveNotificationEvent>;
        if (data.type !== "new_leave_request") return;
        {
          // 뱃지 카운트 증가
          setBadgeCount(globalBadgeCount + 1);

          // 날짜 포맷
          const start = data.start_date;
          const end = data.end_date;
          const dateStr = start === end ? start : `${start} ~ ${end}`;
          const halfStr = data.half_day ? ` (${data.half_day})` : "";

          // 토스트 알림 (sonner)
          toast("📋 새 연차 신청 (구글폼)", {
            description: `${data.employee_name} · ${data.leave_type}${halfStr} · ${dateStr}`,
            duration: 8000,
          });
        }
      } catch {}
    };

    es.onerror = () => {
      // 연결 오류 시 5초 후 재연결
      es.close();
      setTimeout(() => {
        if (esRef.current === es) {
          esRef.current = null;
        }
      }, 5000);
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [isAdmin, loadPendingCount]);

  return { loadPendingCount };
}
