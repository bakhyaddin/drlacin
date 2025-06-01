import qs from "qs";

// utils
import { getRequestCookies } from "./cookies";

// entities
import { SessionCookie } from "../entities/session-cookies.entity";

// lib
import { prisma } from "../lib/prisma";

// configs
import { BASE_URL, PASSWORD, USERNAME } from "../configs/app-vars.config";

interface RequestOptions {
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body?: Record<string, any>;
}

async function updateCookies(
  cookieString: string
): Promise<SessionCookie | null> {
  return prisma.sessionCookies.create({
    data: {
      cookies: cookieString,
    },
  });
}

async function getCookies(): Promise<string | null> {
  try {
    const sessionCookies = await prisma.sessionCookies.findFirst({
      orderBy: {
        createdAt: "desc",
      },
    });
    return sessionCookies?.cookies ?? null;
  } catch {
    return null;
  }
}

async function authenticate(): Promise<string> {
  console.log("Authenticating...");
  const loginData = {
    operator_user: USERNAME,
    operator_pass: PASSWORD,
    recaptcha_response: "",
  };
  const cookies = await getRequestCookies();

  await fetch(BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      Origin: BASE_URL,
      Referer: BASE_URL,
      Cookie: cookies,
    },
    body: qs.stringify(loginData),
  });
  updateCookies(cookies);
  return cookies;
}

async function makeRequest(
  url: string,
  options: RequestOptions = {}
): Promise<Response> {
  let cookies = await getCookies();
  if (!cookies) {
    cookies = await authenticate();
  }

  const headers = {
    ...options.headers,
    Cookie: cookies,
  };

  const response = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? qs.stringify(options.body) : undefined,
  });

  const text = await response.text();

  if (text.includes("<script> top.location='/' ;</script>")) {
    console.log("Session expired, reauthenticating...");
    cookies = await authenticate();

    // retry the request with new cookies
    const retryHeaders = {
      ...options.headers,
      Cookie: cookies,
    };

    const retryResponse = await fetch(url, {
      method: options.method || "GET",
      headers: retryHeaders,
      body: options.body ? qs.stringify(options.body) : undefined,
    });

    return retryResponse;
  }

  return new Response(text, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

async function get(
  url: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  return makeRequest(url, { method: "GET", headers });
}

async function post(
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: Record<string, any>,
  headers: Record<string, string> = {}
): Promise<Response> {
  return makeRequest(url, { method: "POST", headers, body });
}

export { post, get };
