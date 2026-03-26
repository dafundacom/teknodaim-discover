const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "fb_source",
  "gclid",
  "dclid",
  "gb_source",
  "wickedid",
  "wickedsource",
  "wickedmedium",
  "wickedcampaign",
  "wickedterm",
  "wickedcontent",
  "wickedplacement",
  "wickedkeyword",
  "wickedadgroup",
  "wickedad",
  "wt_zmc",
  "wt_mc",
  "mc_cid",
  "mc_eid",
  "ref",
  "source",
  "medium",
  "campaign",
  "content",
  "term",
  "cid",
  "sid",
  "rid",
  "s_kwcid",
  "trk_contact",
  "trk_msg",
  "trk_module",
  "trk_sid",
  "trk_link",
  "gs_lcrp",
  "gs_lcp",
  "gs_lcr",
  "mkt_tok",
  "yclid",
  "pk_campaign",
  "pk_kwd",
  "pk_keyword",
  "pk_source",
  "pk_medium",
  "pk_content",
  "pk_cid",
  "piwik_campaign",
  "piwik_kwd",
  "piwik_keyword",
  "matomo_campaign",
  "matomo_kwd",
  "matomo_keyword",
  "mtm_source",
  "mtm_medium",
  "mtm_campaign",
  "mtm_keyword",
  "mtm_content",
  "mtm_cid",
  "mtm_group",
  "mtm_placement",
  "twclid",
  "li_fat_id",
  "igshid",
  "ttclid",
])

export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url)

    // Remove tracking parameters
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param)
    }

    // Remove fragment (hash)
    parsed.hash = ""

    // Normalize path (remove trailing slash except for root)
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1)
    }

    // Normalize case for hostname
    parsed.hostname = parsed.hostname.toLowerCase()

    // Remove empty search params
    const search = parsed.searchParams.toString()
    if (!search) {
      parsed.search = ""
    }

    return parsed.toString()
  } catch {
    // If URL parsing fails, return as-is
    return url
  }
}

export function extractCanonicalUrl(
  html: string,
  baseUrl: string,
): string | null {
  const canonicalMatch = html.match(
    /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i,
  )
  if (canonicalMatch?.[1]) {
    try {
      return new URL(canonicalMatch[1], baseUrl).href
    } catch {
      return null
    }
  }
  return null
}
