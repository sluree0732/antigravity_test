import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '-'
  const now = new Date().toISOString()
  console.info(`[healthz] ${now} - GET /healthz - 200 OK - ${ip}`)
  return new Response('OK', { status: 200 })
}

export async function HEAD(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '-'
  const now = new Date().toISOString()
  console.info(`[healthz] ${now} - HEAD /healthz - 200 OK - ${ip}`)
  return new Response(null, { status: 200 })
}
