import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/auth/login", "/auth/register"];

// Rate limiting en memoria por IP (complementa el de Caddy)
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

// Limpieza periódica para evitar memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 5 * 60 * 1000); // cada 5 minutos

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

function getClientIP(request: NextRequest): string {
  // Caddy pasa la IP real en x-forwarded-for
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth API — rate limit en login/sign-in
  if (pathname.startsWith("/api/auth")) {
    if (pathname.includes("/sign-in") || pathname.includes("/login")) {
      const ip = getClientIP(request);
      if (!checkRateLimit(ip)) {
        return new NextResponse(
          JSON.stringify({ error: "Demasiados intentos. Espera 1 minuto." }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "60",
            },
          }
        );
      }
    }
    return NextResponse.next();
  }

  // Rutas públicas
  if (PUBLIC_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Archivos estáticos — protegidos por la API route con su propia auth
  if (pathname.startsWith("/api/files")) {
    return NextResponse.next();
  }

  // Verificar sesión
  const sessionToken =
    request.cookies.get("better-auth.session_token")?.value ||
    request.cookies.get("__Secure-better-auth.session_token")?.value;

  // Sin sesión en páginas → login
  if (!sessionToken && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sin sesión en APIs → 401
  if (!sessionToken && pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Añadir cabeceras de seguridad
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  response.headers.set("X-DNS-Prefetch-Control", "off");

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.jpg|.*\\.jpeg|.*\\.png|.*\\.gif|.*\\.svg|.*\\.ico|.*\\.webp|.*\\.riv).*)",
  ],
};