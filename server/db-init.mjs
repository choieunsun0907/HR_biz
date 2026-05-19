import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

async function init() {
  const conn = await mysql.createConnection(DATABASE_URL);

  // users 테이블 생성
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS tp_users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(320) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role ENUM('admin', 'employee') NOT NULL DEFAULT 'employee',
      department VARCHAR(100),
      position VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ tp_users 테이블 생성 완료');

  // 기존 계정 확인
  const [existing] = await conn.execute('SELECT email FROM tp_users WHERE email IN (?, ?)', [
    'admin@ssakasports.com',
    'employee@ssakasports.com',
  ]);

  if (existing.length === 0) {
    const adminHash = await bcrypt.hash('admin1234', 10);
    const empHash = await bcrypt.hash('emp1234', 10);

    await conn.execute(
      `INSERT INTO tp_users (email, password, name, role, department, position) VALUES
        (?, ?, ?, 'admin', '인사팀', 'HR Manager'),
        (?, ?, ?, 'employee', '개발팀', '선임 개발자')`,
      [
        'admin@ssakasports.com', adminHash, '관리자',
        'employee@ssakasports.com', empHash, '김직원',
      ]
    );
    console.log('✅ 초기 계정 생성 완료');
    console.log('   관리자: admin@ssakasports.com / admin1234');
    console.log('   직원:   employee@ssakasports.com / emp1234');
  } else {
    console.log('ℹ️  초기 계정이 이미 존재합니다');
  }

  // tp_employees 테이블 생성
  await conn.execute(`
    CREATE TABLE IF NOT EXISTS tp_employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      avatar VARCHAR(10),
      dept VARCHAR(50),
      role VARCHAR(100),
      grade VARCHAR(20),
      status ENUM('재직','휴직','수습') DEFAULT '재직',
      email VARCHAR(100),
      phone VARCHAR(20),
      location VARCHAR(100),
      join_date VARCHAR(20),
      birth_date VARCHAR(20),
      manager VARCHAR(50),
      engagement_score INT DEFAULT 80,
      leave_balance INT DEFAULT 15,
      leave_used INT DEFAULT 0,
      attendance_rate INT DEFAULT 100,
      skills TEXT,
      recent_activity TEXT,
      color VARCHAR(60),
      memo TEXT,
      created_at BIGINT,
      updated_at BIGINT
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  console.log('✅ tp_employees 테이블 생성 완료');

  // 초기 직원 데이터 시딩
  const [empRows] = await conn.execute('SELECT COUNT(*) as cnt FROM tp_employees');
  if (empRows[0].cnt === 0) {
    const now = Date.now();
    const employees = [
      { name: '이준혁', avatar: '이준', dept: '개발팀', role: 'Frontend Engineer', grade: '선임', status: '재직', email: 'junhyuk.lee@teampulse.kr', phone: '010-1234-5678', location: '서울 강남구', join_date: '2022.03.07', birth_date: '1993.06.15', manager: '김태호', engagement_score: 92, leave_balance: 9, leave_used: 6, attendance_rate: 98, skills: 'React,TypeScript,Next.js,Figma', recent_activity: JSON.stringify([{date:'05.15',content:'React 19 마이그레이션 가이드 게시판 공유'},{date:'05.14',content:'외근 체크인 — 판교 오피스'},{date:'05.12',content:'연차 신청 (05.19~05.21)'}]), color: 'oklch(0.65 0.14 185)', memo: '' },
      { name: '박소연', avatar: '박소', dept: '마케팅', role: 'Brand Manager', grade: '책임', status: '재직', email: 'soyeon.park@teampulse.kr', phone: '010-2345-6789', location: '서울 마포구', join_date: '2020.08.17', birth_date: '1990.11.03', manager: '최지현', engagement_score: 88, leave_balance: 7, leave_used: 8, attendance_rate: 96, skills: 'Brand Strategy,Copywriting,Adobe CC,SNS 마케팅', recent_activity: JSON.stringify([{date:'05.14',content:'Q2 브랜드 캠페인 결과 보고서 공유'},{date:'05.10',content:'입사 5주년 기념일'},{date:'05.08',content:'워크샵 참가 신청 완료'}]), color: 'oklch(0.65 0.20 300)', memo: '' },
      { name: '정하은', avatar: '정하', dept: '디자인', role: 'UX Designer', grade: '선임', status: '재직', email: 'haeun.jung@teampulse.kr', phone: '010-3456-7890', location: '서울 성동구', join_date: '2021.11.22', birth_date: '1995.02.28', manager: '최지원', engagement_score: 95, leave_balance: 11, leave_used: 4, attendance_rate: 99, skills: 'Figma,Prototyping,User Research,Motion Design', recent_activity: JSON.stringify([{date:'05.13',content:'2025 UI 가이드라인 v2.0 배포'},{date:'05.11',content:'UX 리서치 인터뷰 진행'},{date:'05.09',content:'디자인 시스템 컴포넌트 업데이트'}]), color: 'oklch(0.65 0.18 340)', memo: '' },
      { name: '김태호', avatar: '김태', dept: '개발팀', role: 'Backend Engineer', grade: '수석', status: '재직', email: 'taeho.kim@teampulse.kr', phone: '010-4567-8901', location: '경기 성남시', join_date: '2018.05.14', birth_date: '1988.09.20', manager: '박민준', engagement_score: 85, leave_balance: 6, leave_used: 9, attendance_rate: 97, skills: 'Java,Spring Boot,Kubernetes,PostgreSQL', recent_activity: JSON.stringify([{date:'05.15',content:'API 성능 최적화 배포 완료'},{date:'05.13',content:'코드 리뷰 — 이준혁 PR 승인'},{date:'05.10',content:'사내 기술 세미나 발표'}]), color: 'oklch(0.55 0.15 240)', memo: '' },
      { name: '홍길동', avatar: '홍길', dept: '영업팀', role: 'Sales Lead', grade: '책임', status: '재직', email: 'gildong.hong@teampulse.kr', phone: '010-5678-9012', location: '서울 여의도', join_date: '2019.02.11', birth_date: '1991.04.07', manager: '이수진', engagement_score: 78, leave_balance: 5, leave_used: 10, attendance_rate: 94, skills: 'B2B 영업,CRM,협상,고객 관리', recent_activity: JSON.stringify([{date:'05.15',content:'5월 영업 목표 달성 현황 공유'},{date:'05.12',content:'신규 고객사 미팅 — A사 계약 체결'},{date:'05.08',content:'분기 영업 전략 회의 참석'}]), color: 'oklch(0.65 0.18 60)', memo: '' },
      { name: '최지원', avatar: '최지', dept: '디자인', role: 'Visual Designer', grade: '선임', status: '재직', email: 'jiwon.choi@teampulse.kr', phone: '010-6789-0123', location: '서울 강남구', join_date: '2021.06.01', birth_date: '1994.12.10', manager: '정하은', engagement_score: 91, leave_balance: 10, leave_used: 5, attendance_rate: 98, skills: 'Illustrator,Photoshop,Brand Identity,3D', recent_activity: JSON.stringify([{date:'05.14',content:'신규 브랜드 에셋 제작 완료'},{date:'05.12',content:'마케팅팀 협업 — 캠페인 비주얼'},{date:'05.07',content:'디자인 피드백 세션 진행'}]), color: 'oklch(0.65 0.20 25)', memo: '' },
      { name: '이수진', avatar: '이수', dept: '마케팅', role: 'Content Writer', grade: '주임', status: '재직', email: 'sujin.lee@teampulse.kr', phone: '010-7890-1234', location: '서울 마포구', join_date: '2023.01.09', birth_date: '1997.07.22', manager: '박소연', engagement_score: 82, leave_balance: 12, leave_used: 3, attendance_rate: 97, skills: '콘텐츠 기획,SEO,카피라이팅,영상 편집', recent_activity: JSON.stringify([{date:'05.15',content:'5월 뉴스레터 발행'},{date:'05.13',content:'블로그 포스팅 3건 업로드'},{date:'05.10',content:'콘텐츠 캘린더 6월분 작성'}]), color: 'oklch(0.60 0.15 160)', memo: '' },
      { name: '박민준', avatar: '박민', dept: '개발팀', role: 'DevOps Engineer', grade: '책임', status: '휴직', email: 'minjun.park@teampulse.kr', phone: '010-8901-2345', location: '경기 수원시', join_date: '2019.09.23', birth_date: '1989.03.14', manager: '김태호', engagement_score: 76, leave_balance: 15, leave_used: 0, attendance_rate: 0, skills: 'AWS,Docker,CI/CD,Terraform', recent_activity: JSON.stringify([{date:'04.30',content:'육아 휴직 시작'},{date:'04.29',content:'인수인계 문서 작성 완료'},{date:'04.25',content:'인프라 모니터링 대시보드 구축'}]), color: 'oklch(0.55 0.10 220)', memo: '' },
      { name: '강다은', avatar: '강다', dept: '인사팀', role: 'HR Specialist', grade: '주임', status: '수습', email: 'daeun.kang@teampulse.kr', phone: '010-9012-3456', location: '서울 강남구', join_date: '2025.04.07', birth_date: '1999.01.30', manager: '김인사', engagement_score: 88, leave_balance: 11, leave_used: 0, attendance_rate: 100, skills: '채용,온보딩,노무,Excel', recent_activity: JSON.stringify([{date:'05.15',content:'신입사원 온보딩 자료 검토'},{date:'05.13',content:'채용 공고 3건 등록'},{date:'05.09',content:'수습 1개월 평가 완료'}]), color: 'oklch(0.65 0.14 185)', memo: '' },
      { name: '윤재원', avatar: '윤재', dept: '재무팀', role: 'Financial Analyst', grade: '선임', status: '재직', email: 'jaewon.yoon@teampulse.kr', phone: '010-0123-4567', location: '서울 여의도', join_date: '2020.11.30', birth_date: '1992.08.17', manager: '오세진', engagement_score: 80, leave_balance: 8, leave_used: 7, attendance_rate: 96, skills: '재무 분석,Excel,SAP,회계', recent_activity: JSON.stringify([{date:'05.15',content:'Q1 재무 보고서 최종 검토'},{date:'05.12',content:'예산 집행 현황 보고'},{date:'05.08',content:'세무 신고 서류 제출'}]), color: 'oklch(0.60 0.12 80)', memo: '' },
      { name: '오세진', avatar: '오세', dept: '재무팀', role: 'CFO', grade: '임원', status: '재직', email: 'sejin.oh@teampulse.kr', phone: '010-1111-2222', location: '서울 여의도', join_date: '2015.03.02', birth_date: '1980.05.25', manager: '대표이사', engagement_score: 83, leave_balance: 20, leave_used: 5, attendance_rate: 95, skills: '재무 전략,M&A,투자,리더십', recent_activity: JSON.stringify([{date:'05.15',content:'이사회 보고 자료 준비'},{date:'05.13',content:'투자사 미팅 — 시리즈 B 논의'},{date:'05.10',content:'전사 예산 조정 회의 주재'}]), color: 'oklch(0.45 0.10 240)', memo: '' },
      { name: '신예린', avatar: '신예', dept: '영업팀', role: 'Sales Representative', grade: '사원', status: '수습', email: 'yerin.shin@teampulse.kr', phone: '010-2222-3333', location: '서울 여의도', join_date: '2025.05.02', birth_date: '2000.09.11', manager: '홍길동', engagement_score: 90, leave_balance: 15, leave_used: 0, attendance_rate: 100, skills: '고객 응대,제안서 작성,PPT,영어', recent_activity: JSON.stringify([{date:'05.15',content:'신규 고객사 콜드콜 20건 진행'},{date:'05.14',content:'영업 교육 프로그램 이수'},{date:'05.12',content:'첫 고객 미팅 동행 참여'}]), color: 'oklch(0.65 0.18 60)', memo: '' },
    ];
    for (const e of employees) {
      await conn.execute(
        `INSERT INTO tp_employees (name,avatar,dept,role,grade,status,email,phone,location,join_date,birth_date,manager,engagement_score,leave_balance,leave_used,attendance_rate,skills,recent_activity,color,memo,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [e.name,e.avatar,e.dept,e.role,e.grade,e.status,e.email,e.phone,e.location,e.join_date,e.birth_date,e.manager,e.engagement_score,e.leave_balance,e.leave_used,e.attendance_rate,e.skills,e.recent_activity,e.color,e.memo,now,now]
      );
    }
    console.log('✅ 초기 직원 데이터 시딩 완료 (12명)');
  } else {
    console.log('ℹ️  직원 데이터가 이미 존재합니다');
  }

  await conn.end();
  console.log('✅ DB 초기화 완료');
}

init().catch(err => {
  console.error('DB 초기화 실패:', err);
  process.exit(1);
});
