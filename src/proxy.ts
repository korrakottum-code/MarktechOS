import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/auth/callback");
  const isStaticFile = pathname.match(/\.(.*)$/) || pathname.startsWith("/_next");

  // Skip auth logic for static files to save execution time
  if (isStaticFile) return NextResponse.next();

  // Defensive check for Environment Variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing Supabase Environment Variables");
    // If auth pages, allow them to render (they should have their own error handling)
    if (isAuthPage) return NextResponse.next();
    // Otherwise redirect to login as a safe fallback or allow Next.js to handle the error
    return NextResponse.next();
  }

  // Create an unmodified response for potential cookie updates
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // This will refresh session if expired - required for Server Components
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Auth Protection Logic
    if (!user && !isAuthPage) {
      const loginUrl = new URL("/login", request.url);
      if (pathname !== "/") {
        loginUrl.searchParams.set("next", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    if (user && isAuthPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  } catch (error) {
    console.error("🛡️ Auth Proxy Error:", error);
    // Allow the request to proceed; individual pages will handle their own data-fetching errors
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
