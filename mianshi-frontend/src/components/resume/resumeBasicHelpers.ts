import type { ResumeContent } from '../../api/client'

export type AvatarShape = 'circle' | 'square' | 'rounded'

export type ResumeBasicFieldVisibility = {
  avatar?: boolean
  title?: boolean
  phone?: boolean
  email?: boolean
  city?: boolean
}

export type ResumeBasicFields = NonNullable<ResumeContent['basic']>

const DEFAULT_VISIBILITY: Required<ResumeBasicFieldVisibility> = {
  avatar: true,
  title: true,
  phone: true,
  email: true,
  city: true,
}

export function resolveFieldVisibility(basic?: ResumeBasicFields | null): Required<ResumeBasicFieldVisibility> {
  return { ...DEFAULT_VISIBILITY, ...basic?.fieldVisibility }
}

export function avatarShapeClass(shape?: AvatarShape): string {
  switch (shape) {
    case 'circle':
      return 'resume-doc__avatar--shape-circle'
    case 'square':
      return 'resume-doc__avatar--shape-square'
    case 'rounded':
      return 'resume-doc__avatar--shape-rounded'
    default:
      return ''
  }
}

export function formatContactLine(
  basic: ResumeBasicFields | undefined,
  vis: Required<ResumeBasicFieldVisibility>,
): string {
  return [
    vis.phone ? basic?.phone?.trim() : '',
    vis.email ? basic?.email?.trim() : '',
    vis.city ? basic?.city?.trim() : '',
  ]
    .filter(Boolean)
    .join('  ·  ')
}

export const AVATAR_SHAPE_OPTIONS: { id: AvatarShape; label: string }[] = [
  { id: 'rounded', label: '圆角' },
  { id: 'circle', label: '圆形' },
  { id: 'square', label: '方形' },
]

export const FIELD_VISIBILITY_OPTIONS: { key: keyof ResumeBasicFieldVisibility; label: string }[] = [
  { key: 'avatar', label: '头像' },
  { key: 'title', label: '岗位' },
  { key: 'phone', label: '手机' },
  { key: 'email', label: '邮箱' },
  { key: 'city', label: '城市' },
]
