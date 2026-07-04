/** Boss 直聘城市 code，见 zhipin.com URL 参数 city= */
export const BOSS_CITY_CODES: Record<string, string> = {
  北京: '101010100',
  上海: '101020100',
  广州: '101280100',
  深圳: '101280600',
  杭州: '101210100',
  成都: '101270100',
  南京: '101190100',
  武汉: '101200100',
  西安: '101110100',
  苏州: '101190400',
}

export function resolveBossCityCode(cityName: string): string {
  const trimmed = cityName.trim()
  if (/^\d+$/.test(trimmed)) return trimmed
  return BOSS_CITY_CODES[trimmed] ?? BOSS_CITY_CODES['北京']
}

export function resolveBossCityName(cityCode: string): string {
  const entry = Object.entries(BOSS_CITY_CODES).find(([, code]) => code === cityCode)
  return entry?.[0] ?? cityCode
}

export function buildBossSearchUrl(query: string, cityName: string): string {
  const city = resolveBossCityCode(cityName)
  const params = new URLSearchParams({ query: query.trim(), city })
  return `https://www.zhipin.com/web/geek/job?${params.toString()}`
}

export type BossSearchFilters = {
  query: string
  city: string
  salaryMin?: number
  salaryMax?: number
  experience?: string
  education?: string
  scale?: string
}

const EXPERIENCE_MAP: Record<string, string> = {
  应届: '102',
  '1年以内': '103',
  '1-3年': '104',
  '3-5年': '105',
  '5-10年': '106',
  '10年以上': '107',
}

const DEGREE_MAP: Record<string, string> = {
  初中: '209',
  高中: '208',
  大专: '206',
  本科: '202',
  硕士: '203',
  博士: '204',
}

const SCALE_MAP: Record<string, string> = {
  '0-20人': '301',
  '20-99人': '302',
  '100-499人': '303',
  '500-999人': '304',
  '1000-9999人': '305',
  '10000人以上': '306',
}

export function buildBossSearchUrlWithFilters(f: BossSearchFilters): string {
  const city = resolveBossCityCode(f.city)
  const params = new URLSearchParams({ query: f.query.trim(), city })
  if (f.salaryMin != null) {
    params.set('salary', `${f.salaryMin},${f.salaryMax ?? Math.max(f.salaryMin + 10, f.salaryMin * 2)}`)
  }
  if (f.experience && EXPERIENCE_MAP[f.experience]) params.set('experience', EXPERIENCE_MAP[f.experience])
  if (f.education && DEGREE_MAP[f.education]) params.set('degree', DEGREE_MAP[f.education])
  if (f.scale && SCALE_MAP[f.scale]) params.set('scale', SCALE_MAP[f.scale])
  return `https://www.zhipin.com/web/geek/job?${params.toString()}`
}

export function buildBossJobUrl(externalId: string): string {
  return `https://www.zhipin.com/job_detail/${externalId}.html`
}
