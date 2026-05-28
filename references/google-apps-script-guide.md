# 구글 설문지 → TeamPulse 연차 신청 자동 연동 가이드

구글 설문지에 응답이 제출되면 Google Apps Script가 자동으로 TeamPulse에 연차 신청을 전송합니다.

---

## 1단계: 구글 설문지 응답 스프레드시트 열기

1. 구글 설문지 편집 화면에서 **응답** 탭 클릭
2. **스프레드시트 아이콘(초록색)** 클릭 → 새 스프레드시트 생성
3. 스프레드시트가 열리면 상단 메뉴 **확장 프로그램 > Apps Script** 클릭

---

## 2단계: Apps Script 코드 붙여넣기

아래 코드를 Apps Script 편집기에 전체 붙여넣기 후 저장(Ctrl+S)하세요.

```javascript
// =====================================================================
// TeamPulse 연차 신청 자동 연동 스크립트
// 구글 설문지 응답 스프레드시트의 Apps Script에 붙여넣기 하세요.
// =====================================================================

// ⚠️ 아래 두 값을 실제 환경에 맞게 수정하세요
var TEAMPULSE_URL = "https://team.ssakasports.com/api/leave/google-webhook";
var WEBHOOK_SECRET = "teampulse-leave-webhook";

// 설문지 응답 컬럼 순서 (0부터 시작, 타임스탬프 제외)
// 실제 설문지 컬럼 순서에 맞게 조정하세요
var COL = {
  TIMESTAMP: 0,       // 타임스탬프 (자동)
  NAME: 1,            // 이름
  START_DATE: 2,      // 휴가 시작일
  END_DATE: 3,        // 휴가 종료일
  HALF_DAY: 4,        // 반차 선택 (오전/오후/해당없음)
  LEAVE_TYPE: 5,      // 휴가 유형
  MANAGER_APPROVED: 6 // 부서장 승인 확인
};

/**
 * 설문지 제출 시 자동 실행되는 트리거 함수
 */
function onFormSubmit(e) {
  try {
    var sheet = e.range.getSheet();
    var row = e.range.getRow();
    var values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

    // 날짜 파싱 (구글 폼은 Date 객체로 전달됨)
    var startDate = formatDate(values[COL.START_DATE]);
    var endDate = formatDate(values[COL.END_DATE]);
    var halfDayRaw = String(values[COL.HALF_DAY] || "").trim();
    var halfDay = null;
    if (halfDayRaw === "오전" || halfDayRaw === "오전 반차") halfDay = "오전";
    else if (halfDayRaw === "오후" || halfDayRaw === "오후 반차") halfDay = "오후";

    var leaveTypeRaw = String(values[COL.LEAVE_TYPE] || "").trim();
    var managerApproved = String(values[COL.MANAGER_APPROVED] || "").includes("확인");

    var payload = {
      employee_name: String(values[COL.NAME] || "").trim(),
      start_date: startDate,
      end_date: endDate,
      half_day: halfDay,
      leave_type: leaveTypeRaw || "연차",
      manager_approved: managerApproved
    };

    // 필수값 검증
    if (!payload.employee_name || !payload.start_date || !payload.end_date) {
      Logger.log("필수값 누락: " + JSON.stringify(payload));
      return;
    }

    // TeamPulse API 호출
    var options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "x-webhook-secret": WEBHOOK_SECRET
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    var response = UrlFetchApp.fetch(TEAMPULSE_URL, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();

    Logger.log("TeamPulse 응답 [" + statusCode + "]: " + responseText);

    if (statusCode === 201) {
      // 성공: 스프레드시트 해당 행에 처리 완료 표시 (선택사항)
      markRowAsProcessed(sheet, row, "✅ 접수완료");
    } else {
      markRowAsProcessed(sheet, row, "❌ 오류: " + responseText);
    }
  } catch (err) {
    Logger.log("오류 발생: " + err.toString());
  }
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 변환
 */
function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) {
    var y = value.getFullYear();
    var m = String(value.getMonth() + 1).padStart(2, "0");
    var d = String(value.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }
  // 문자열인 경우 그대로 반환 (이미 YYYY-MM-DD 형식이면)
  return String(value).slice(0, 10);
}

/**
 * 처리 결과를 스프레드시트 마지막 열에 기록
 */
function markRowAsProcessed(sheet, row, message) {
  var lastCol = sheet.getLastColumn() + 1;
  sheet.getRange(row, lastCol).setValue(message);
}

/**
 * 수동 테스트용 함수 (Apps Script 편집기에서 직접 실행 가능)
 */
function testWebhook() {
  var testPayload = {
    employee_name: "홍길동",
    start_date: "2026-06-01",
    end_date: "2026-06-02",
    half_day: null,
    leave_type: "개인사유",
    manager_approved: true
  };

  var options = {
    method: "post",
    contentType: "application/json",
    headers: { "x-webhook-secret": WEBHOOK_SECRET },
    payload: JSON.stringify(testPayload),
    muteHttpExceptions: true
  };

  var response = UrlFetchApp.fetch(TEAMPULSE_URL, options);
  Logger.log("테스트 결과 [" + response.getResponseCode() + "]: " + response.getContentText());
}
```

---

## 3단계: 트리거 설정

1. Apps Script 편집기 좌측 메뉴에서 **시계 아이콘(트리거)** 클릭
2. 우측 하단 **+ 트리거 추가** 클릭
3. 아래와 같이 설정:

| 항목 | 설정값 |
|------|--------|
| 실행할 함수 | `onFormSubmit` |
| 배포에서 실행 | `Head` |
| 이벤트 소스 | `스프레드시트에서` |
| 이벤트 유형 | `양식 제출 시` |

4. **저장** 클릭 → Google 계정 권한 허용

---

## 4단계: 설문지 컬럼 순서 확인

스프레드시트를 열어 1행(헤더)의 컬럼 순서를 확인하고, 스크립트 상단의 `COL` 객체 숫자를 실제 순서에 맞게 수정하세요.

예시 (실제 설문지 기준):

| 열 번호 | 헤더명 | COL 변수 |
|---------|--------|----------|
| A (0) | 타임스탬프 | `TIMESTAMP: 0` |
| B (1) | 이름 | `NAME: 1` |
| C (2) | 휴가 시작일 | `START_DATE: 2` |
| D (3) | 휴가 종료일 | `END_DATE: 3` |
| E (4) | 반차 선택 | `HALF_DAY: 4` |
| F (5) | 휴가 유형 | `LEAVE_TYPE: 5` |
| G (6) | 부서장 승인 확인 | `MANAGER_APPROVED: 6` |

---

## 5단계: 테스트

1. Apps Script 편집기에서 `testWebhook` 함수 선택
2. **실행(▶)** 버튼 클릭
3. 하단 **실행 로그**에서 `[201]` 응답 확인
4. TeamPulse 근태·연차 > 관리자 뷰에서 "홍길동" 테스트 신청 확인

---

## 웹훅 보안 시크릿 변경 (선택사항)

기본 시크릿 값(`teampulse-leave-webhook`)을 변경하려면:

1. TeamPulse 관리자 설정 > 환경 변수에서 `GOOGLE_WEBHOOK_SECRET` 값 변경
2. Apps Script 코드 상단의 `WEBHOOK_SECRET` 값도 동일하게 변경

---

## 문제 해결

| 증상 | 원인 | 해결 |
|------|------|------|
| 401 오류 | 시크릿 불일치 | `WEBHOOK_SECRET` 값 확인 |
| 400 오류 | 필수 필드 누락 | `COL` 번호 확인, 이름/날짜 컬럼 맞추기 |
| 직원 ID 없음 | 이름 불일치 | TeamPulse 직원 이름과 설문지 이름 동일하게 입력 |
| 날짜 형식 오류 | 날짜 파싱 실패 | 설문지 날짜 필드를 "날짜" 형식으로 설정 |
