import { useCallback, useEffect, useRef, useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { BossBindWizard } from './BossBindWizard'
import { api } from '../../api/client'

type Props = {
  open: boolean
  onClose: () => void
  onComplete: (bossName?: string) => void
}

export function BossBindModal({ open, onClose, onComplete }: Props) {
  const [wizardKey, setWizardKey] = useState(0)
  const connectIdRef = useRef<string | null>(null)
  const wasOpenRef = useRef(false)

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      setWizardKey((k) => k + 1)
    }
    wasOpenRef.current = open
  }, [open])

  const handleClose = useCallback(() => {
    const id = connectIdRef.current
    connectIdRef.current = null
    if (id) void api.cancelBossConnect(id).catch(() => {})
    onClose()
  }, [onClose])

  return (
    <Modal open={open} onClose={handleClose} title="登录 Boss 直聘" maxWidth="max-w-md">
      <p className="mb-4 text-sm text-text-secondary">
        将打开真实 Chrome（DrissionPage）供 Boss App 扫码；弹窗内同步显示二维码预览。登录成功后写入系统。
      </p>
      {open ? (
        <BossBindWizard
          key={wizardKey}
          onConnectId={(id) => {
            connectIdRef.current = id
          }}
          onComplete={(name) => {
            connectIdRef.current = null
            onComplete(name)
          }}
        />
      ) : null}
      <div className="mt-5 flex justify-end">
        <Button variant="secondary" size="sm" onClick={handleClose}>
          稍后再登录
        </Button>
      </div>
    </Modal>
  )
}
