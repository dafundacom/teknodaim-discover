interface Cookie {
  name: string
  value: string
  domain: string
  path: string
  expires?: Date
  secure?: boolean
  httpOnly?: boolean
}

export class CookieJar {
  private cookies: Map<string, Cookie[]> = new Map()

  private getDomainKey(domain: string): string {
    return domain.toLowerCase()
  }

  setCookie(domain: string, cookieString: string): void {
    const key = this.getDomainKey(domain)
    const cookies = this.cookies.get(key) ?? []

    const parsed = this.parseCookie(cookieString)
    if (!parsed) return

    const existingIndex = cookies.findIndex(
      (c) => c.name === parsed.name && c.path === parsed.path,
    )

    if (existingIndex >= 0) {
      cookies[existingIndex] = parsed
    } else {
      cookies.push(parsed)
    }

    this.cookies.set(key, cookies)
  }

  getCookies(domain: string, path = "/"): string {
    const key = this.getDomainKey(domain)
    const cookies = this.cookies.get(key) ?? []
    const now = new Date()

    return cookies
      .filter((c) => {
        if (c.expires && c.expires < now) return false
        return path.startsWith(c.path)
      })
      .map((c) => `${c.name}=${c.value}`)
      .join("; ")
  }

  private parseCookie(cookieString: string): Cookie | null {
    const parts = cookieString.split(";").map((p) => p.trim())
    const [nameValue] = parts
    const [name, value] = nameValue.split("=")

    if (!name || value === undefined) return null

    const cookie: Cookie = {
      name: name.trim(),
      value: value.trim(),
      domain: "",
      path: "/",
    }

    for (const part of parts.slice(1)) {
      const [key, val] = part.split("=").map((s) => s.trim().toLowerCase())

      switch (key) {
        case "domain":
          cookie.domain = val ?? ""
          break
        case "path":
          cookie.path = val ?? "/"
          break
        case "expires":
          if (val) {
            cookie.expires = new Date(val)
          }
          break
        case "secure":
          cookie.secure = true
          break
        case "httponly":
          cookie.httpOnly = true
          break
      }
    }

    return cookie
  }

  setCookiesFromHeaders(domain: string, headers: Headers): void {
    const setCookie = headers.getSetCookie()
    for (const cookie of setCookie) {
      this.setCookie(domain, cookie)
    }
  }
}
