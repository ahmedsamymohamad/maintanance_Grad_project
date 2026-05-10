export function inferBrandFromModel(modelLabel: string): string | null {
  if (!modelLabel) return null
  const s = String(modelLabel).toLowerCase()

  // Direct keyword matches
  if (/\bhp\b|laserjet|officejet|deskjet|scanjet/.test(s)) return 'HP'
  if (/\bcanon\b|pixma|imageformula|imageclass/.test(s)) return 'Canon'
  if (/\bbrother\b/.test(s)) return 'Brother'
  if (/\bepson\b|ecotank|workforce/.test(s)) return 'Epson'
  if (/\bxerox\b|phaser|workcentre/.test(s)) return 'Xerox'
  if (/\bfujitsu\b/.test(s)) return 'Fujitsu'
  if (/\bkonica\b|\bminolta\b/.test(s)) return 'Konica Minolta'
  if (/\bkyocera\b/.test(s)) return 'Kyocera'
  if (/\bpanasonic\b/.test(s)) return 'Panasonic'

  // Some models include common HP model tokens
  if (/\bm404\b|\bm428\b|\bm254\b|\bm281\b|\bm132\b/.test(s)) return 'HP'

  // Try first token heuristics
  const tokens = s.split(/[\s\-_,]+/).filter(Boolean)
  if (tokens.length > 0) {
    const first = tokens[0]
    const map: Record<string, string> = {
      hp: 'HP', canon: 'Canon', brother: 'Brother', epson: 'Epson', xerox: 'Xerox', fujitsu: 'Fujitsu', konica: 'Konica Minolta', minolta: 'Konica Minolta', kyocera: 'Kyocera', panasonic: 'Panasonic'
    }
    if (map[first]) return map[first]
  }

  return null
}

export default inferBrandFromModel
