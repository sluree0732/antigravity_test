import { appendRow, deleteRow, getSheetId, getSheetValues } from './sheets'

const RANGE = 'comments!A:F'

export interface Comment {
  id: string
  postId: string
  content: string
  authorEmail: string
  authorName: string
  createdAt: string
}

function rowToComment(row: string[]): Comment {
  return {
    id: row[0] ?? '',
    postId: row[1] ?? '',
    content: row[2] ?? '',
    authorEmail: row[3] ?? '',
    authorName: row[4] ?? '',
    createdAt: row[5] ?? '',
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export async function getCommentsByPostId(postId: string): Promise<Comment[]> {
  const rows = await getSheetValues(RANGE)
  return rows
    .map(rowToComment)
    .filter((c) => c.id && c.postId === postId)
}

export async function createComment(
  data: Pick<Comment, 'postId' | 'content' | 'authorEmail' | 'authorName'>
): Promise<Comment> {
  const comment: Comment = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
  }
  await appendRow(RANGE, [
    comment.id, comment.postId, comment.content,
    comment.authorEmail, comment.authorName, comment.createdAt,
  ])
  return comment
}

export async function deleteComment(id: string, authorEmail: string): Promise<boolean> {
  const rows = await getSheetValues(RANGE)
  const rowIndex = rows.findIndex((r) => r[0] === id && r[3] === authorEmail)
  if (rowIndex === -1) return false

  const sheetId = await getSheetId('comments')
  await deleteRow(sheetId, rowIndex)
  return true
}
