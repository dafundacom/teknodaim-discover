interface Shingle {
  hash: number
  text: string
}

function djb2Hash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
  }
  return hash >>> 0
}

function createShingles(text: string, k: number): Shingle[] {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)

  const shingles: Shingle[] = []
  for (let i = 0; i <= words.length - k; i++) {
    const shingle = words.slice(i, i + k).join(" ")
    shingles.push({
      hash: djb2Hash(shingle),
      text: shingle,
    })
  }

  return shingles
}

export function generateFingerprint(text: string, shingleSize = 5): string {
  const shingles = createShingles(text, shingleSize)

  if (shingles.length === 0) {
    return ""
  }

  const hashes = shingles.map((s) => s.hash)
  const numHashes = 128
  const signature: number[] = []

  for (let i = 0; i < numHashes; i++) {
    let minHash = Number.MAX_SAFE_INTEGER
    for (const hash of hashes) {
      const combined = djb2Hash(`${i}:${hash}`)
      if (combined < minHash) {
        minHash = combined
      }
    }
    signature.push(minHash)
  }

  return signature.map((h) => h.toString(36)).join("")
}

export function compareFingerprints(fp1: string, fp2: string): number {
  if (!fp1 || !fp2 || fp1.length !== fp2.length) {
    return 0
  }

  const hashes1 = fp1.match(/.{1,10}/g) ?? []
  const hashes2 = fp2.match(/.{1,10}/g) ?? []

  if (hashes1.length !== hashes2.length) {
    return 0
  }

  let matches = 0
  for (let i = 0; i < hashes1.length; i++) {
    if (hashes1[i] === hashes2[i]) {
      matches++
    }
  }

  return matches / hashes1.length
}

export function isDuplicate(
  fp1: string,
  fp2: string,
  threshold = 0.85,
): boolean {
  return compareFingerprints(fp1, fp2) >= threshold
}
