import { appendRow, getSheetValues, updateRow } from './sheets'

const RANGE = 'users!A:D'

export interface User {
  email: string
  name: string
  image: string
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
  // rowIndex + 1 (1-based), header row at index 0
  const range = `users!A${rowIndex + 1}:D${rowIndex + 1}`
  await updateRow(range, [updated.email, updated.name, updated.image, updated.createdAt])
  return updated
}
