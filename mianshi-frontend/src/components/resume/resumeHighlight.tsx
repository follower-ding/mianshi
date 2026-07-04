import type { ReactNode } from 'react'

const TECH_KEYWORDS = [
  'Java', 'Python', 'Go', 'Golang', 'C\\+\\+', 'C#', 'JavaScript', 'TypeScript',
  'Spring', 'Boot', 'SpringBoot', 'MyBatis', 'MySQL', 'PostgreSQL', 'Redis',
  'Kafka', 'RabbitMQ', 'Docker', 'Kubernetes', 'K8s', 'Git', 'Linux', 'Nginx',
  'Vue', 'React', 'Node', '微服务', '分布式', '高并发', 'JVM', 'MongoDB',
  'Elasticsearch', 'AWS', 'Azure', 'CI/CD', 'Agile', 'Scrum',
]

const KEYWORD_RE = new RegExp(`(${TECH_KEYWORDS.join('|')})`, 'gi')

export function highlightKeywords(text: string): ReactNode[] {
  if (!text) return []
  const parts = text.split(KEYWORD_RE)
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <mark key={i} className="resume-kw">
        {part}
      </mark>
    ) : (
      part
    ),
  )
}

export function stripHtmlToText(html: string): string {
  if (!html) return ''
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent ?? div.innerText ?? ''
}
