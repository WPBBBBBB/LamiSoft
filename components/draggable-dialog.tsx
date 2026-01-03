"use client"

import { ReactNode, useRef, useState } from "react"
import Draggable from "react-draggable"
import { Dialog, DialogContent } from "@/components/ui/dialog"

interface DraggableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
  className?: string
}

export function DraggableDialog({
  open,
  onOpenChange,
  children,
  className,
}: DraggableDialogProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Draggable
        nodeRef={nodeRef}
        handle=".drag-handle"
        onStart={() => setIsDragging(true)}
        onStop={() => setIsDragging(false)}
        bounds="parent"
      >
        <div ref={nodeRef} className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
          <DialogContent 
            className={`pointer-events-auto ${isDragging ? 'cursor-grabbing' : ''} ${className || ''}`}
            onPointerDownOutside={(e) => {
              if (isDragging) {
                e.preventDefault()
              }
            }}
          >
            {children}
          </DialogContent>
        </div>
      </Draggable>
    </Dialog>
  )
}
