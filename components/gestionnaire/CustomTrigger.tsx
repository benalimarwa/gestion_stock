"use client"

import { useSidebar } from "@/components/ui/sidebar"
import { AlignStartVertical } from "lucide-react"

export function CustomTrigger() {
  const { toggleSidebar } = useSidebar()

  return <button onClick={toggleSidebar}>
    <span>
    <AlignStartVertical className="font-bold size-8 text-red-500" />
    </span>
  </button>
}