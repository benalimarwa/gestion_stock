// components/demandeur/notification/NotificationList.tsx
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Bell } from 'lucide-react';
import { Notification } from '@prisma/client';

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (notificationId: string) => void;
}

export default function NotificationList({ notifications, onMarkAsRead }: NotificationListProps) {
  if (!notifications.length) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gray-50 rounded-lg">
        <Bell size={48} className="text-gray-400 mb-4" />
        <p className="text-gray-500 text-center">Vous n'avez pas de notifications pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 ${
            notification.isRead ? "bg-white" : "bg-blue-50"
          } hover:bg-gray-50 transition-colors`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className={`text-sm ${notification.isRead ? "text-gray-700" : "text-gray-900 font-medium"}`}>
                {notification.message}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {formatDistanceToNow(new Date(notification.dateEnvoi), {
                  addSuffix: true,
                  locale: fr,
                })}
              </p>
            </div>
            {!notification.isRead && (
              <button
                onClick={() => onMarkAsRead(notification.id)}
                className="ml-4 text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Marquer comme lu
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}