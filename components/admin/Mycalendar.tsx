"use client";

import * as React from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";

interface MycalendarProps {
  onClickDay?: (date: Date) => void;
}

export function Mycalendar({ onClickDay }: MycalendarProps) {
  const [date, setDate] = React.useState<Date | undefined>(new Date());

  const handleDateSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate);
    if (selectedDate && onClickDay) {
      onClickDay(selectedDate);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative max-w-lg mx-auto w-full"
    >
      <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10"></div>
      <Card className="relative bg-gradient-to-br from-blue-600/60 to-purple-900/60 backdrop-blur-md border border-blue-800/60 shadow-lg shadow-[0_0_10px_rgba(55,65,99,0.5)] rounded-lg overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-800 to-purple-300 bg-clip-text text-transparent font-[Inter,sans-serif]">
            Calendrier
          </CardTitle>
          <CardDescription className="text-blue-300 text-base">
            Sélectionnez une date pour voir les événements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            className="rounded-md border border-blue-800/30 bg-blue-900/50 p-6"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4 w-full",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-xl font-semibold text-blue-200 bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent",
              nav: "space-x-1 flex items-center",
              nav_button: "h-10 w-10 bg-blue-900/60 hover:bg-purple-800/80 text-blue-200 rounded-md flex items-center justify-center",
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse",
              head_row: "flex",
              head_cell: "text-blue-300 rounded-md w-12 font-medium text-base",
              row: "flex w-full mt-2",
              cell: "text-center text-base p-1 relative w-12 h-12 flex items-center justify-center",
              day: "h-12 w-12 rounded-md hover:bg-blue-700/40 hover:text-blue-100 transition-all duration-200",
              day_selected: "bg-blue-800 text-blue-100 rounded-md shadow-[0_0_8px_rgba(55,65,99,0.7)] animate-pulse",
              day_today: "bg-blue-700/40 text-blue-200 rounded-md",
              day_outside: "text-blue-500 opacity-50",
              day_disabled: "text-blue-500 opacity-30",
              day_range_middle: "bg-blue-700/30 text-blue-200",
            }}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}