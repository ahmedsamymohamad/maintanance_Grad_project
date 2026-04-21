import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get('app_session')?.value)
  const pathname = request.nextUrl.pathname

  if (pathname.startsWith('/dashboard') && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith('/auth/login') && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next({ request })
}
