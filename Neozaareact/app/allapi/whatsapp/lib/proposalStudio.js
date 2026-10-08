/**
 * Deep link into the NeoZaar Proposal Studio, carrying whatever context Neo has
 * already gathered so the customer continues rather than restarts (spec §5, §10).
 *
 * Only catalogue / journey context goes in the URL — never personal data
 * (name, email, company). Consuming these params in the Studio / /neo composer
 * is a separate frontend change; unknown params are harmless until then.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_API_WEBSITE || "").replace(/\/+$/, "");
const STUDIO_PATH = "/proposal-studio";

/**
 * @param {object} context  session.context
 * @returns {string|null}   absolute Proposal Studio URL, or null if no site URL
 *                          is configured (caller then points the customer at
 *                          the Studio in plain words)
 */
export function buildStudioLink(context = {}) {
  if (!SITE_URL) return null;

  let url;
  try {
    url = new URL(`${SITE_URL}${STUDIO_PATH}`);
  } catch {
    return null;
  }

  url.searchParams.set("src", "whatsapp-neo");

  const params = {
    solution: context.solution?.name,
    product: context.product?.name,
    service: context.service?.name,
    cloud: context.target_cloud,
    outcome: context.business_outcome,
    route: context.commercial_route,
  };
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, String(value).slice(0, 300));
  }

  return url.toString();
}

/** True when there's enough context that "I already have the starting point" is honest. */
export function hasUsefulContext(context = {}) {
  return Boolean(
    context.business_outcome ||
      context.solution ||
      context.product ||
      context.service ||
      context.target_cloud ||
      context.commercial_route ||
      context.commercial_intent
  );
}

/** Multi-line "starting point" recap shown before sending the customer to the Studio. */
export function startingPointLines(context = {}) {
  const lines = [];
  if (context.business_outcome) lines.push(context.business_outcome);
  if (context.solution?.name) lines.push(`Solution: ${context.solution.name}`);
  if (context.product?.name) lines.push(`Product: ${context.product.name}`);
  if (context.service?.name) lines.push(`Service: ${context.service.name}`);
  if (context.target_cloud) lines.push(`Cloud: ${context.target_cloud}`);
  if (context.commercial_route) lines.push(`Route: ${context.commercial_route}`);
  return lines.join("\n");
}
