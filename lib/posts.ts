import { appendRow, deleteRow, getSheetId, getSheetValues, updateRow } from './sheets'

const RANGE = 'posts!A:G'

export interface Post {
  id: string
  title: string
  content: string
  authorEmail: string
  authorName: string
  createdAt: string
  updatedAt: string
}

export interface PostListResult {
  posts: Post[]
  total: number
  page: number
  limit: number
}

function rowToPost(row: string[]): Post {
  return {
    id: row[0] ?? '',
    title: row[1] ?? '',
    content: row[2] ?? '',
    authorEmail: row[3] ?? '',
    authorName: row[4] ?? '',
    createdAt: row[5] ?? '',
    updatedAt: row[6] ?? '',
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2)
}

export async function getPosts(
  page = 1,
  limit = 10,
  search = ''
): Promise<PostListResult> {
  const rows = await getSheetValues(RANGE)
  let posts = rows.map(rowToPost).filter((p) => p.id)

  if (search) {
    const q = search.toLowerCase()
    posts = posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q)
    )
  }

  posts = [...posts].reverse()
  const total = posts.length
  const start = (page - 1) * limit
  const sliced = posts.slice(start, start + limit)

  return { posts: sliced, total, page, limit }
}

export async function getPostById(id: string): Promise<Post | null> {
  const rows = await getSheetValues(RANGE)
  const row = rows.find((r) => r[0] === id)
  return row ? rowToPost(row) : null
}

export async function createPost(
  data: Pick<Post, 'title' | 'content' | 'authorEmail' | 'authorName'>
): Promise<Post> {
  const post: Post = {
    id: generateId(),
    ...data,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  await appendRow(RANGE, [
    post.id, post.title, post.content,
    post.authorEmail, post.authorName,
    post.createdAt, post.updatedAt,
  ])
  return post
}

export async function updatePost(
  id: string,
  data: Pick<Post, 'title' | 'content'>
): Promise<Post | null> {
  const rows = await getSheetValues(RANGE)
  const rowIndex = rows.findIndex((r) => r[0] === id)
  if (rowIndex === -1) return null

  const existing = rowToPost(rows[rowIndex])
  const updated: Post = {
    ...existing,
    title: data.title,
    content: data.content,
    updatedAt: new Date().toISOString(),
  }
  const range = `posts!A${rowIndex + 1}:G${rowIndex + 1}`
  await updateRow(range, [
    updated.id, updated.title, updated.content,
    updated.authorEmail, updated.authorName,
    updated.createdAt, updated.updatedAt,
  ])
  return updated
}

export async function deletePost(id: string): Promise<boolean> {
  const rows = await getSheetValues(RANGE)
  const rowIndex = rows.findIndex((r) => r[0] === id)
  if (rowIndex === -1) return false

  const sheetId = await getSheetId('posts')
  await deleteRow(sheetId, rowIndex)
  return true
}

export async function getPostsByAuthor(email: string): Promise<Post[]> {
  const rows = await getSheetValues(RANGE)
  return rows
    .map(rowToPost)
    .filter((p) => p.id && p.authorEmail === email)
    .reverse()
}
