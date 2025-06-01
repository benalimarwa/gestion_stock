"use client"

import { useState } from "react"
import { Mycalendar } from "@/components/admin/Mycalendar"
import { OrdersAndRequests } from "@/components/admin/OrdersAndRequests"
import Wrapper from "@/components/admin/Wrapper"

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  
  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }
  
  return (
    <Wrapper>
      <div className="p-12 bg-gradient-to-r from-blue-50 via-white to-blue-100 min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-5xl font-semibold text-blue-900 mb-8 uppercase tracking-wide text-center transition-all duration-300 ease-in-out transform hover:text-blue-800 hover:scale-110 hover:drop-shadow-xl hover:bg-blue-100 p-2 rounded-lg">
          🗓️ Calendar
        </h1>
        <div className="w-full max-w-4xl p-8 bg-white rounded-xl shadow-lg border border-blue-200 transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-blue-400">
          <div className="p-6 bg-white rounded-lg shadow-md border border-blue-100">
            <Mycalendar onClickDay={handleDateChange} />
          </div>
        </div>
        
        {selectedDate && (
          <div className="w-full max-w-4xl mt-6 p-6 bg-white rounded-xl shadow-lg border border-blue-200 animate-fade-in">
            <OrdersAndRequests selectedDate={selectedDate} />
          </div>
        )}
      </div>
    </Wrapper>
  )
}