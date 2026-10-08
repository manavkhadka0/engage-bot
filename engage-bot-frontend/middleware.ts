import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isPlatformRole } from "@/lib/roles";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

async function fetchSession(request: NextRequest) {
  try {
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
      headers: {
        cookie: request.headers.get("cookie") ?? "",
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as {
      user?: { role?: string | null };
      session?: { activeOrganizationId?: string | null };
    } | null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdmin = pathname.startsWith("/admin");
  const isBrand = pathname.startsWith("/app");
  const isLogin = pathname === "/login";

  if (!isAdmin && !isBrand && !isLogin) {
    return NextResponse.next();
  }

  const session = await fetchSession(request);
  const user = session?.user;

  if (isLogin) {
    if (user) {
      if (isPlatformRole(user.role)) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return NextResponse.next();
  }

  if (!user) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  if (isAdmin && !isPlatformRole(user.role)) {
    return NextResponse.redirect(new URL("/app", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/app", "/app/:path*", "/login"],
};
