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

  await conn.end();
  console.log('✅ DB 초기화 완료');
}

init().catch(err => {
  console.error('DB 초기화 실패:', err);
  process.exit(1);
});
