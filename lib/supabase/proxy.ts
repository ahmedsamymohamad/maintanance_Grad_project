import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // Server Actions are POST requests with internal headers; redirecting them
  // causes the client to receive an invalid action response envelope.
  if (request.headers.has('next-action')) {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get('app_session')?.value)
  const pathname = request.nextUrl.pathname
  const isPageNavigation = request.method === 'GET'

  if (isPageNavigation && pathname.startsWith('/dashboard') && !hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  if (isPageNavigation && pathname.startsWith('/auth/login') && hasSession) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
