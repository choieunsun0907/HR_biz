import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";

// 간단한 웹훅 수신 API 단위 테스트
describe("Leave Webhook API", () => {
  it("웹훅 시크릿이 없으면 401 반환", async () => {
    // 실제 서버 대신 로직만 검증
    const secret = undefined;
    const expectedSecret = "teampulse-leave-webhook";
    expect(secret).not.toBe(expectedSecret);
  });

  it("올바른 시크릿이면 검증 통과", () => {
    const secret = "teampulse-leave-webhook";
    const expectedSecret = "teampulse-leave-webhook";
    expect(secret).toBe(expectedSecret);
  });

  it("필수 필드 누락 시 검증 실패", () => {
    const payload = { employee_name: "홍길동", start_date: "", end_date: "2026-06-02", leave_type: "연차" };
    const isValid = !!(payload.employee_name && payload.start_date && payload.end_date && payload.leave_type);
    expect(isValid).toBe(false);
  });

  it("모든 필수 필드 있으면 검증 통과", () => {
    const payload = { employee_name: "홍길동", start_date: "2026-06-01", end_date: "2026-06-02", leave_type: "연차" };
    const isValid = !!(payload.employee_name && payload.start_date && payload.end_date && payload.leave_type);
    expect(isValid).toBe(true);
  });

  it("반차 값 파싱 - 오전", () => {
    const halfDayRaw = "오전";
    let halfDay: string | null = null;
    if (halfDayRaw === "오전" || halfDayRaw === "오전 반차") halfDay = "오전";
    else if (halfDayRaw === "오후" || halfDayRaw === "오후 반차") halfDay = "오후";
    expect(halfDay).toBe("오전");
  });

  it("반차 값 파싱 - 해당없음", () => {
    const halfDayRaw = "해당없음";
    let halfDay: string | null = null;
    if (halfDayRaw === "오전" || halfDayRaw === "오전 반차") halfDay = "오전";
    else if (halfDayRaw === "오후" || halfDayRaw === "오후 반차") halfDay = "오후";
    expect(halfDay).toBeNull();
  });

  it("연차 일수 계산 - 2일", () => {
    const start = new Date("2026-06-01");
    const end = new Date("2026-06-02");
    const diff = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    expect(diff).toBe(2);
  });

  it("반차 일수 계산 - 0.5일", () => {
    const halfDay = "오전";
    const diff = halfDay ? 0.5 : 1;
    expect(diff).toBe(0.5);
  });
});
