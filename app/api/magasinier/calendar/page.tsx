"use client";

import { useState } from "react";
import { Mycalendar } from "@/components/admin/Mycalendar";
import { OrdersAndRequests } from "@/components/admin/OrdersAndRequests";
import Wrapper from "@/components/gestionnaire/Wrapper";
import { motion } from "framer-motion";

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
  };

  return (
    <Wrapper>
      <div className=" flex flex-col items-center">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-4xl font-bold bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-transparent font-[Inter,sans-serif] mb-6 text-center"
        >
          Calendrier
        </motion.h1>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-5xl  backdrop-blur-md rounded-xl shadow-lg shadow-[0_0_12px_rgba(55,65,99,0.5)] border border-blue-800/60 p-6 transition-all duration-300 hover:shadow-xl hover:scale-101"
        >
          <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-xl"></div>
          <div className="relative">
            <Mycalendar onClickDay={handleDateChange} />
          </div>
        </motion.div>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="w-full max-w-5xl mt-6 bg-blue-900/60 backdrop-blur-md rounded-xl shadow-lg shadow-[0_0_12px_rgba(55,65,99,0.5)] border border-blue-800/60 p-6 transition-all duration-300 hover:shadow-xl hover:scale-101"
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] bg-repeat opacity-10 rounded-xl"></div>
            <div className="relative">
              <OrdersAndRequests selectedDate={selectedDate} />
            </div>
          </motion.div>
        )}
      </div>
    </Wrapper>
  );
}