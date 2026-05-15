# TeamPulse 디자인 아이디어 브레인스토밍

## 프로젝트 개요
HR 플랫폼 TeamPulse: HR 대시보드, 근태/연차 관리, 소통/협업 기능을 갖춘 내부 도구.
색상 지침: 흰색, 부드러운 청록색(teal), 코랄 강조색.
스타일 지침: 미니멀리즘, 둥근 모서리.

---

<response>
<probability>0.07</probability>
<idea>

## 아이디어 A: "Soft Teal Clarity" — 스칸디나비아 미니멀리즘

**Design Movement**: 스칸디나비아 미니멀리즘 + 소프트 UI (Neumorphism 경량 버전)

**Core Principles**:
1. 공기감 있는 여백 — 콘텐츠 밀도를 낮추고 숨 쉬는 공간 확보
2. 기능 우선 계층 — 정보 위계를 색상이 아닌 크기와 무게로 표현
3. 부드러운 깊이감 — 그림자와 배경색 변화로 레이어 표현
4. 일관된 둥근 모서리 — radius-xl 기반 카드 시스템

**Color Philosophy**:
- 배경: 순백(#FFFFFF) + 아이보리 섹션(#F8FAFB)
- 주색: 청록색 teal-500(#14B8A6) — 신뢰, 안정, 전문성
- 강조: 코랄(#FF6B6B) — 알림, CTA, 중요 지표
- 텍스트: 차콜 슬레이트(#1E293B)
- 보조: 연한 teal-50(#F0FDFA) 배경 패널

**Layout Paradigm**:
- 왼쪽 고정 사이드바(240px) + 오른쪽 콘텐츠 영역
- 콘텐츠는 비대칭 그리드: 좌측 2/3 메인 + 우측 1/3 보조 패널
- 상단 헤더 없음 — 사이드바가 전체 네비게이션 담당

**Signature Elements**:
1. 청록색 그라디언트 사이드바 상단 로고 영역
2. KPI 카드: 좌측 컬러 바(4px) + 아이콘 + 수치 레이아웃
3. 코랄 도트 알림 배지

**Interaction Philosophy**:
- 호버 시 카드 미세 상승(translateY -2px) + 그림자 강화
- 사이드바 메뉴 선택 시 청록색 배경 pill 슬라이드 애니메이션
- 데이터 로드 시 스켈레톤 → 페이드인

**Animation**:
- 페이지 전환: 200ms fade + slight translateY(8px) ease-out
- 차트 진입: 좌→우 드로우 애니메이션 (800ms)
- KPI 숫자: count-up 애니메이션 (1000ms)
- 사이드바 활성 항목: 150ms ease-out background-color 전환

**Typography System**:
- 헤더/제목: Pretendard Bold (700) — 한국어 최적화
- 본문: Pretendard Regular (400)
- 수치/데이터: JetBrains Mono — 숫자 가독성 강화
- 계층: 24px 섹션 제목 / 16px 카드 제목 / 14px 본문 / 12px 레이블

</idea>
</response>

<response>
<probability>0.06</probability>
<idea>

## 아이디어 B: "Geometric Pulse" — 구성주의 + 데이터 중심

**Design Movement**: 스위스 타이포그래피 + 구성주의(Constructivism)

**Core Principles**:
1. 격자 기반 정밀성 — 8px 그리드 시스템 엄격 적용
2. 타이포그래피 주도 계층 — 폰트 크기 대비로 정보 위계 표현
3. 색상 코딩 시스템 — 각 모듈별 색상 구분
4. 데이터 밀도 최적화 — 공간 효율성과 가독성 균형

**Color Philosophy**:
- 배경: 연회색(#F5F7FA) 기반
- 주색: 딥 teal(#0D9488)
- 강조: 선명한 코랄(#F43F5E)
- 섹션 구분: 미묘한 배경색 변화

**Layout Paradigm**:
- 좁은 아이콘 전용 사이드바(64px) + 확장 패널(200px) 이중 구조
- 대시보드: 마소리(Masonry) 레이아웃으로 카드 크기 다양화
- 상단 컨텍스트 브레드크럼 바

**Signature Elements**:
1. 아이콘 전용 미니 사이드바 + 호버 시 레이블 팝아웃
2. 데이터 카드 상단 컬러 그라디언트 헤더
3. 인라인 미니 차트 (스파크라인)

**Interaction Philosophy**:
- 사이드바 아이콘 호버: 툴팁 + 확장 레이블
- 카드 클릭: 드릴다운 모달
- 필터 적용: 즉각적 차트 리애니메이션

**Animation**:
- 데이터 업데이트: 숫자 플립 애니메이션
- 차트: 스태거 바 애니메이션
- 모달: 스케일 0.95→1 + 페이드인

**Typography System**:
- 헤더: Pretendard ExtraBold (800)
- 데이터: Space Grotesk
- 본문: Pretendard Regular

</idea>
</response>

<response>
<probability>0.05</probability>
<idea>

## 아이디어 C: "Organic Flow" — 바이오모픽 미니멀리즘

**Design Movement**: 바이오모픽 디자인 + 소프트 그라디언트

**Core Principles**:
1. 유기적 형태 — 비대칭 둥근 모서리, 물결 구분선
2. 빛과 그림자 — 부드러운 그림자로 입체감 표현
3. 색상 그라디언트 — 단색 대신 미묘한 그라디언트 전환
4. 감성적 데이터 시각화 — 차트에 감성적 색상 적용

**Color Philosophy**:
- 배경: 따뜻한 흰색(#FEFEFE)
- 주색: 민트-teal 그라디언트(#2DD4BF → #0D9488)
- 강조: 살구-코랄 그라디언트(#FB7185 → #F97316)
- 카드: 유리 효과(glassmorphism lite)

**Layout Paradigm**:
- 곡선 사이드바 + 물결 구분선
- 카드: 다양한 크기와 비율 혼합
- 배경: 미묘한 노이즈 텍스처

**Signature Elements**:
1. 사이드바 상단 물결 모양 로고 영역
2. 반투명 글래스모피즘 카드
3. 그라디언트 진행 바

**Interaction Philosophy**:
- 마우스 추적 미묘한 카드 기울기
- 버튼 리플 효과
- 스크롤 연동 패럴랙스

**Animation**:
- 페이지 진입: 블러 해제 + 페이드인
- 카드: 3D 틸트 호버
- 차트: 물결 그리기 애니메이션

**Typography System**:
- 헤더: Pretendard Bold + 그라디언트 텍스트
- 본문: Pretendard Light
- 강조: 이탤릭 활용

</idea>
</response>

---

## 선택된 디자인: 아이디어 A — "Soft Teal Clarity"

스칸디나비아 미니멀리즘 접근법을 선택. 사용자가 요청한 흰색/청록색/코랄 색상 조합과 미니멀리즘 원칙에 가장 충실하며, HR 내부 도구로서 정보 가독성과 전문성을 최우선으로 한다.
