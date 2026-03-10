import bcrypt from 'bcryptjs'
import { appendRow, getSheetValues, updateRow } from './sheets'

const RANGE = 'users!A:F'

export interface User {
  email: string
  name: string
  image: string
  createdAt: string
}

export interface LocalUser {
  userId: string
  name: string
  passwordHash: string
  createdAt: string
}

function rowToUser(row: string[]): User {
  return {
    email: row[0] ?? '',
    name: row[1] ?? '',
    image: row[2] ?? '',
    createdAt: row[3] ?? '',
  }
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const rows = await getSheetValues(RANGE)
  const row = rows.find((r) => r[0] === email)
  return row ? rowToUser(row) : null
}

export async function upsertUser(user: Omit<User, 'createdAt'>): Promise<User> {
  const rows = await getSheetValues(RANGE)
  const rowIndex = rows.findIndex((r) => r[0] === user.email)

  if (rowIndex === -1) {
    const newUser: User = { ...user, createdAt: new Date().toISOString() }
    await appendRow(RANGE, [newUser.email, newUser.name, newUser.image, newUser.createdAt])
    return newUser
  }

  const existing = rowToUser(rows[rowIndex])
  const updated: User = { ...existing, name: user.name, image: user.image }
  const range = `users!A${rowIndex + 1}:D${rowIndex + 1}`
  await updateRow(range, [updated.email, updated.name, updated.image, updated.createdAt])
  return updated
}

// 자체 회원가입/로그인 (users 시트 E=userId, F=passwordHash 컬럼 활용)
export async function findLocalUser(userId: string): Promise<LocalUser | null> {
  const rows = await getSheetValues(RANGE)
  const row = rows.find((r) => r[4] === userId)
  if (!row) return null
  return { userId: row[4], name: row[1], passwordHash: row[5], createdAt: row[3] }
}

export async function createLocalUser(
  userId: string,
  name: string,
  password: string
): Promise<LocalUser> {
  const existing = await findLocalUser(userId)
  if (existing) throw new Error('이미 사용 중인 아이디입니다.')

  const passwordHash = await bcrypt.hash(password, 10)
  const createdAt = new Date().toISOString()
  // A=email(빈값), B=name, C=image(빈값), D=createdAt, E=userId, F=passwordHash
  await appendRow(RANGE, ['', name, '', createdAt, userId, passwordHash])
  return { userId, name, passwordHash, createdAt }
}

export async function verifyLocalUser(
  userId: string,
  password: string
): Promise<LocalUser | null> {
  const user = await findLocalUser(userId)
  if (!user) return null
  const ok = await bcrypt.compare(password, user.passwordHash)
  return ok ? user : null
}
