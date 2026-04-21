import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin
  return NextResponse.redirect(`${origin}/auth/login`)
}
