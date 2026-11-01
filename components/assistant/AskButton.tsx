'use client'

import { MessageSquareText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAssistant } from './AssistantProvider'

/** Opens the assistant; when `question` is given it is sent straight away. */
export default function AskButton({
  question,
  children,
  variant = 'outline',
  size = 'sm',
  className,
  icon = true,
}: {
  question?: string
  children: React.ReactNode
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  className?: string
  icon?: boolean
}) {
  const { ask, setOpen } = useAssistant()
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => (question ? ask(question) : setOpen(true))}
    >
      {icon && <MessageSquareText />}
      {children}
    </Button>
  )
}
