// components/demandeur/notification/NotificationContainer.tsx
"use client";

import { useState, useEffect } from "react";
import { Notification } from "@prisma/client";
import NotificationList from "./NotificationList";
import { Loader2 } from "lucide-react";

export default function NotificationContainer() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/demandeurUser/dashboard/notification");
      
      if (!response.ok) {
        throw new Error("Erreur lors de la récupération des notifications");
      }
      
      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
      setError("Impossible de charger les notifications. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/demandeurUser/dashboard/notification/markAsRead", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ notificationId }),
      });

      if (!response.ok) {
        throw new Error("Erreur lors du marquage de la notification comme lue");
      }

      // Update the local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (err) {
      console.error("Error marking notification as read:", err);
      setError("Erreur lors du marquage de la notification comme lue.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-red-500 bg-red-50 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <NotificationList 
      notifications={notifications} 
      onMarkAsRead={handleMarkAsRead} 
    />
  );
}