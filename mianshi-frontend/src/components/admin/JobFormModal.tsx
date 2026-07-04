import { useEffect, useState } from 'react'

import { api, type JobPosting, type JobPostingStatus } from '../../api/client'

import { adminCx } from './adminTheme'

import { AdminSelect } from './AdminToolbar'

import { AdminFormField } from './AdminFormField'

import { Button } from '../ui/Button'

import { Modal } from '../ui/Modal'



type FormData = {

  company: string

  title: string

  position: string

  city: string

  salary: string

  experience: string

  education: string

  jd: string

  tags: string

  status: JobPostingStatus

}



const emptyForm: FormData = {

  company: '',

  title: '',

  position: '',

  city: '',

  salary: '面议',

  experience: '不限',

  education: '本科',

  jd: '',

  tags: '',

  status: 'published',

}



type Props = {

  open: boolean

  onClose: () => void

  onSaved: () => void

  editing?: JobPosting | null

}



const inputCls = adminCx.input + ' w-full'

const textareaCls = adminCx.textarea + ' w-full'



export function JobFormModal({ open, onClose, onSaved, editing }: Props) {

  const [form, setForm] = useState<FormData>(emptyForm)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState<string | null>(null)



  useEffect(() => {

    if (!open) return

    setError(null)

    if (editing) {

      setForm({

        company: editing.company,

        title: editing.title,

        position: editing.position,

        city: editing.city,

        salary: editing.salary,

        experience: editing.experience,

        education: editing.education,

        jd: editing.jd,

        tags: editing.tags.join(', '),

        status: editing.status,

      })

    } else {

      setForm(emptyForm)

    }

  }, [open, editing])



  const payload = () => ({

    company: form.company.trim(),

    title: form.title.trim(),

    position: form.position.trim(),

    city: form.city.trim(),

    salary: form.salary.trim() || '面议',

    experience: form.experience.trim() || '不限',

    education: form.education.trim() || '本科',

    jd: form.jd.trim(),

    tags: form.tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean),

    status: form.status,

  })



  const handleSave = async () => {

    setSaving(true)

    setError(null)

    try {

      const body = payload()

      if (editing) {

        await api.updateAdminJob(editing.id, body)

      } else {

        await api.createAdminJob(body)

      }

      onSaved()

      onClose()

    } catch (e) {

      setError(e instanceof Error ? e.message : '保存失败')

    } finally {

      setSaving(false)

    }

  }



  return (

    <Modal open={open} onClose={onClose} title={editing ? '编辑岗位' : '发布岗位'}>

      <div className="space-y-4">

        {error && (

          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>

        )}

        <div className="grid gap-4 sm:grid-cols-2">

          <AdminFormField label="公司" required>

            <input

              className={inputCls}

              value={form.company}

              onChange={(e) => setForm({ ...form, company: e.target.value })}

            />

          </AdminFormField>

          <AdminFormField label="岗位标题" required>

            <input

              className={inputCls}

              value={form.title}

              onChange={(e) => setForm({ ...form, title: e.target.value })}

            />

          </AdminFormField>

          <AdminFormField label="职位方向" required>

            <input

              className={inputCls}

              value={form.position}

              onChange={(e) => setForm({ ...form, position: e.target.value })}

            />

          </AdminFormField>

          <AdminFormField label="城市">

            <input

              className={inputCls}

              value={form.city}

              onChange={(e) => setForm({ ...form, city: e.target.value })}

            />

          </AdminFormField>

          <AdminFormField label="薪资">

            <input

              className={inputCls}

              value={form.salary}

              onChange={(e) => setForm({ ...form, salary: e.target.value })}

            />

          </AdminFormField>

          <AdminFormField label="发布状态">

            <AdminSelect

              value={form.status}

              onChange={(v) => setForm({ ...form, status: v as JobPostingStatus })}

            >

              <option value="draft">草稿</option>

              <option value="published">已发布</option>

              <option value="closed">已关闭</option>

            </AdminSelect>

          </AdminFormField>

        </div>

        <AdminFormField label="职位描述" required hint="至少 10 字">

          <textarea

            className={textareaCls}

            rows={5}

            value={form.jd}

            onChange={(e) => setForm({ ...form, jd: e.target.value })}

          />

        </AdminFormField>

        <AdminFormField label="标签" required hint="逗号分隔">

          <input

            className={inputCls}

            value={form.tags}

            onChange={(e) => setForm({ ...form, tags: e.target.value })}

          />

        </AdminFormField>

        <div className="flex justify-end gap-2 border-t border-admin-border/60 pt-4">

          <Button variant="secondary" onClick={onClose}>取消</Button>

          <Button disabled={saving} onClick={handleSave}>{saving ? '保存中...' : '保存'}</Button>

        </div>

      </div>

    </Modal>

  )

}


