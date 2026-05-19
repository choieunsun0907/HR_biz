# TeamPulse Todo

- [x] 기본 HR 대시보드 레이아웃
- [x] 사이드바 네비게이션
- [x] JWT 기반 로그인 인증
- [x] 근태·연차 페이지 (직원/관리자 뷰 분리)
- [x] 소통·협업 페이지 (공지사항, 게시판, 메신저) DB 연동
- [x] 직원 관리 DB 연동 (tp_employees)
- [x] 조직도 페이지
- [x] 보고서 페이지
- [x] 설정 페이지 (연차 정책, 회계연도, 계정 관리)
- [x] 직원 로그인 시 본인 데이터만 표시
- [x] 계정 관리 - 생성/역할변경/비활성화/검색/생성일·마지막로그인
- [x] 공지사항·게시판·메신저 DB 영구 저장
- [x] 직원 관리 내보내기(엑셀/PDF), 엑셀 업로드 버튼 추가
- [x] 조직도 PDF 버튼 활성화
- [x] HR 대시보드 KPI 카드 정리 (이직률·참여점수·신규채용 제거)
- [x] 게시판 글 수정 권한 (본인 글만)
- [x] 근태·연차 캘린더 활성화 (월 이동, 오늘 하이라이트)
- [x] 경조사 지원 증빙서류 업로드 기능
- [x] Copyright 텍스트 변경

## 신규 작업
- [x] PDF 다운로드 기능 수정 (직원관리·조직도)
- [x] 엑셀 직원 추가 필드 활성화 (부서·직급·직책·근무지 등 전체 필드 매핑)
- [x] 설정 페이지에 부서·직급·직책·근무지 관리 탭 추가
- [x] 신규직원 등록 폼에서 보유스킬·초기참여점수 필드 제거
- [x] 아바타 이름 표기 전체 이름 또는 이름만 표시
- [x] 직원 추가 오류 수정
- [x] 조직도 DB 연동 - 직원 추가 시 자동 반영
- [x] 문서관리 탭 활성화 (업로드·목록·다운로드)
- [x] 쿠키 SameSite=None; Secure 설정 (HTTPS 환경 브라우저 인증 오류 수정)

## 버그 수정
- [x] server/index.ts /api/employees GET 라우트 인증 오류 수정 ((req as any).user → getUser(req))

## 조직 마스터 & 직원 폼 DB 연동
- [x] 마스터 데이터 API에 순서 변경(PATCH /api/master/:type/reorder) 엔드포인트 추가 (vite.config.ts + server/index.ts)
- [x] SettingsPage 마스터 데이터 탭에 드래그앤드롭 순서 변경 UI 구현 (@dnd-kit)
- [x] EmployeeFormModal 부서/직급/직책/근무지 선택 필드를 DB 마스터 데이터와 연동
- [x] EmployeesPage 필터 드롭다운(부서/직급)도 DB 마스터 데이터와 연동

## 버그 수정 (2)
- [x] OrgChartPage TypeError 수정 (CEO id=0 없음, e.department→e.dept 필드명, 중복 key 경고)
