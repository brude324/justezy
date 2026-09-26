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

export default clerkMiddleware((auth, req) => {
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

  const { sessionClaims } = auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  for (const { matcher, allowedRoles } of matchers) {
    if (matcher(req) && !allowedRoles.includes(role!)) {
      const redirectRes = NextResponse.redirect(new URL(`/${role}`, req.url));
      redirectRes.headers.set("x-request-id", requestId);
      return redirectRes;
    }
  }

  const res = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  res.headers.set("x-request-id", requestId);
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
