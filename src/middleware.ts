import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { routeAccessMap } from "./lib/settings";
import { NextResponse } from "next/server";

const matchers = Object.keys(routeAccessMap).map((route) => ({
  matcher: createRouteMatcher([route]),
  allowedRoles: routeAccessMap[route],
}));

const isPublicRoute = createRouteMatcher([
  "/api/webhooks(.*)",
  "/api/health(.*)",
  "/sw.js",
  "/manifest.webmanifest",
  "/offline(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Generate or forward request correlation ID
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  // Allow public routes (webhooks, health checks, PWA assets) without Clerk redirection
  if (isPublicRoute(req)) {
    const res = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
    res.headers.set("x-request-id", requestId);
    return res;
  }

  const { userId, sessionClaims } = auth();
  const claims = sessionClaims as Record<string, any> | undefined;
  let role =
    claims?.metadata?.role ||
    claims?.public_metadata?.role ||
    claims?.publicMetadata?.role ||
    claims?.role ||
    req.cookies.get("user_role")?.value;

  // If user is authenticated but role is missing from claims/cookie, resolve from Clerk API
  if (!role && userId && process.env.CLERK_SECRET_KEY) {
    try {
      const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      });
      if (clerkRes.ok) {
        const clerkUser = await clerkRes.json();
        role = clerkUser.public_metadata?.role;
      }
    } catch {
      // ignore network errors
    }
  }

  // If user is already authenticated and visits /sign-in, redirect to their role dashboard
  const isSignInPage = req.nextUrl.pathname.startsWith("/sign-in");
  if (isSignInPage && userId && role) {
    const redirectRes = NextResponse.redirect(new URL(`/${role}`, req.url));
    redirectRes.headers.set("x-request-id", requestId);
    redirectRes.cookies.set("user_role", role, { path: "/", maxAge: 86400, sameSite: "lax" });
    return redirectRes;
  }

  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req)) {
      // 1. Unauthenticated users cannot access protected routes
      if (!userId) {
        const redirectRes = NextResponse.redirect(new URL("/sign-in", req.url));
        redirectRes.headers.set("x-request-id", requestId);
        return redirectRes;
      }

      // 2. Authenticated users with known role cannot access other role routes
      if (role && !allowedRoles.includes(role)) {
        const redirectRes = NextResponse.redirect(new URL(`/${role}`, req.url));
        redirectRes.headers.set("x-request-id", requestId);
        return redirectRes;
      }
    }
  }

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.headers.set("x-request-id", requestId);
  if (role) {
    res.cookies.set("user_role", role, { path: "/", maxAge: 86400, sameSite: "lax" });
  } else if (!userId) {
    res.cookies.delete("user_role");
  }
  return res;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
