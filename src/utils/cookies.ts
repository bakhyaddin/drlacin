import { BASE_URL } from "../configs/app-vars.config";

async function getSessionCookie(): Promise<string> {
  const response = await fetch(BASE_URL);
  const cookies = response.headers.getSetCookie();
  const sessionCookie = cookies.find((cookie) =>
    cookie.startsWith("PHPSESSID=")
  );
  if (!sessionCookie) {
    throw new Error("No PHPSESSID cookie found in response");
  }
  return sessionCookie.split(";")[0];
}

/**
 * Generate a new set of "static" GA cookies:
 *  - _ga    (2-year user ID)
 *  - _gid   (24-hour session ID)
 *  - _gat   (1-minute throttle)
 *  - _ga_<MEASUREMENT_ID> (GA4 session tracker)
 */

function makeGaCookies(measurementId: string) {
  // 1) Client ID: a random 10-digit integer
  const clientId = Math.floor(Math.random() * 1e10);

  // 2) First-visit timestamp (secs since epoch)
  const firstVisit = Math.floor(Date.now() / 1000);

  // 3) Build _ga (lives 2 years)
  const _ga = `GA1.2.${clientId}.${firstVisit}`;

  // 4) Build _gid (new random ID, same firstVisit; expires in 24 hr)
  const sessionId = Math.floor(Math.random() * 1e10);
  const _gid = `GA1.2.${sessionId}.${firstVisit}`;

  // 5) _gat is always "1" (expires in 1 minute)
  const _gat = `1`;

  // 6) GA4 cookie: starts a brand-new session
  const sessionStart = firstVisit;
  const engagementCount = 1;
  const lastHit = Math.floor(Date.now() / 1000);

  // Flags j, l, h usually stay zero
  const _ga4 = [
    `GS2.2`, // protocol version
    `s${sessionStart}`, // session start
    `o1`, // origin count
    `g${engagementCount}`, // engagement count
    `t${lastHit}`, // last-hit timestamp
    `j0`, // reserved
    `l0`, // reserved
    `h0`, // reserved
  ].join("$");

  // full cookie name is `_ga_<MEASUREMENT_ID>=…`
  const ga4Name = `_ga_${measurementId}`;
  return [
    `_ga=${_ga}`,
    `_gid=${_gid}`,
    `_gat=${_gat}`,
    `${ga4Name}=${_ga4}`,
  ].join("; ");
}

async function getRequestCookies() {
  const sessionCookie = await getSessionCookie();
  const gaCookies = makeGaCookies("6YSDZBZ6HX");
  return sessionCookie.concat("; ").concat(gaCookies);
}

export { getRequestCookies };
