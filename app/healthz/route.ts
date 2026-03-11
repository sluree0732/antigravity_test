import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '-'
  console.info(`INFO:     ${ip}:0 - "GET /healthz HTTP/1.1" 200 OK`)
  return new Response('OK', { status: 200 })
}

export async function HEAD(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? '-'
  console.info(`INFO:     ${ip}:0 - "HEAD /healthz HTTP/1.1" 200 OK`)
  return new Response(null, { status: 200 })
}
