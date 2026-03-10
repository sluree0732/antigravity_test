import bcrypt from 'bcryptjs'
import { appendRow, getSheetValues, updateRow } from './sheets'

// users 시트 구조: A=userId | B=passwordHash | C=name | D=createdAt
const RANGE = 'users!A:D'

export interface User {
  userId: string
  name: string
  createdAt: string
}

function rowToUser(row: string[]): User {
  return {
    userId: row[0] ?? '',
    name: row[2] ?? '',
    createdAt: row[3] ?? '',
  }
}

export async function findUserById(userId: string): Promise<User | null> {
  const rows = await getSheetValues(RANGE)
  const row = rows.find((r) => r[0] === userId)
  return row ? rowToUser(row) : null
}

// OAuth 로그인 시 사용자 저장 (passwordHash 없음)
export async function upsertOAuthUser(userId: string, name: string): Promise<User> {
  const rows = await getSheetValues(RANGE)
  const rowIndex = rows.findIndex((r) => r[0] === userId)

  if (rowIndex === -1) {
    const createdAt = new Date().toISOString()
    await appendRow(RANGE, [userId, '', name, createdAt])
    return { userId, name, createdAt }
  }

  const existing = rowToUser(rows[rowIndex])
  const range = `users!C${rowIndex + 1}`
  await updateRow(range, [name])
  return { ...existing, name }
}

// 자체 회원가입
export async function createLocalUser(
  userId: string,
  name: string,
  password: string
): Promise<User> {
  const existing = await findUserById(userId)
  if (existing) throw new Error('이미 사용 중인 아이디입니다.')

  const passwordHash = await bcrypt.hash(password, 10)
  const createdAt = new Date().toISOString()
  await appendRow(RANGE, [userId, passwordHash, name, createdAt])
  return { userId, name, createdAt }
}

// 자체 로그인 검증
export async function verifyLocalUser(
  userId: string,
  password: string
): Promise<User | null> {
  const rows = await getSheetValues(RANGE)
  const row = rows.find((r) => r[0] === userId)
  if (!row || !row[1]) return null
  const ok = await bcrypt.compare(password, row[1])
  if (!ok) return null
  return rowToUser(row)
}
