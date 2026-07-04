/** Shared full-text match for question list search (PG + JSON stores). */
export function matchesQuestionSearch(
  row: {
    title: string
    content: string
    tags?: string[]
    reference_answer?: string
    referenceAnswer?: string
    key_points?: string[]
    keyPoints?: string[]
    scoring_rubric?: string
    scoringRubric?: string
    follow_up_templates?: string[]
    followUpTemplates?: string[]
  },
  search: string,
): boolean {
  const s = search.trim().toLowerCase()
  if (!s) return true

  const ref = (row.reference_answer ?? row.referenceAnswer ?? '').toLowerCase()
  const rubric = (row.scoring_rubric ?? row.scoringRubric ?? '').toLowerCase()
  const keyPoints = row.key_points ?? row.keyPoints ?? []
  const followUps = row.follow_up_templates ?? row.followUpTemplates ?? []

  return (
    row.title.toLowerCase().includes(s) ||
    row.content.toLowerCase().includes(s) ||
    (row.tags ?? []).some((t) => t.toLowerCase().includes(s)) ||
    ref.includes(s) ||
    rubric.includes(s) ||
    keyPoints.some((p) => p.toLowerCase().includes(s)) ||
    followUps.some((p) => p.toLowerCase().includes(s))
  )
}
