import { NextRequest, NextResponse } from "next/server";

function unauthorizedResponse() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Mini-CRM"',
    },
  });
}

function decodeBasicAuth(header: string) {
  if (!header.startsWith("Basic ")) return null;

  try {
    const encoded = header.slice(6);
    const decoded = atob(encoded);
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    const user = decoded.slice(0, separatorIndex);
    const password = decoded.slice(separatorIndex + 1);
    return { user, password };
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const expectedUser = process.env.BASIC_AUTH_USER;
  const expectedPassword = process.env.BASIC_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return unauthorizedResponse();
  }

  const parsed = decodeBasicAuth(authHeader);
  if (!parsed) {
    return unauthorizedResponse();
  }

  if (parsed.user !== expectedUser || parsed.password !== expectedPassword) {
    return unauthorizedResponse();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
