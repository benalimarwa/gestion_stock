// components/demandeur/notification/NotificationIndicator.tsx
"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

export default function NotificationIndicator() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/demandeurUser/dashboard/notification/unread");
        
        if (!response.ok) {
          throw new Error("Failed to fetch notifications");
        }
        
        const data = await response.json();
        setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error("Error fetching notification count:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Optional: Set up polling for real-time updates
    const intervalId = setInterval(fetchUnreadCount, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Link href="/demandeurUser/dashboard/notification" className="relative">
      <Bell className="h-6 w-6 text-gray-600 hover:text-gray-900" />
      {!loading && unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}