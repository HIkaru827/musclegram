"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Heart, UserPlus, MessageCircle, Bell } from "lucide-react"
import { firestoreNotifications } from "@/lib/firestore-utils"
import { FirestoreNotification } from "@/lib/firestore-schema"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

interface NotificationsModalProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserAccount
}

export function NotificationsModal({ isOpen, onClose, currentUser }: NotificationsModalProps) {
  const [notifications, setNotifications] = useState<FirestoreNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 通知を読み込む
  useEffect(() => {
    if (isOpen) {
      loadNotifications()
    }
  }, [isOpen, currentUser.id])

  const loadNotifications = async () => {
    setIsLoading(true)
    try {
      const userNotifications = await firestoreNotifications.getByUser(currentUser.id)
      setNotifications(userNotifications)
    } catch (error) {
      console.error('Failed to load notifications:', error)
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  // モーダルを開いた時に全ての通知を既読にする
  const handleModalOpen = async () => {
    if (isOpen && notifications.some(n => !n.isRead)) {
      try {
        await firestoreNotifications.markAllAsRead(currentUser.id)
        // ローカル状態も更新
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      } catch (error) {
        console.error('Failed to mark notifications as read:', error)
      }
    }
  }

  useEffect(() => {
    if (isOpen) {
      handleModalOpen()
    }
  }, [isOpen, notifications])

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-red-500" />
      case 'follow':
        return <UserPlus className="h-4 w-4 text-green-500" />
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const formatDate = (dateString: string) => {
    const now = new Date()
    const notificationDate = new Date(dateString)
    const diffMs = now.getTime() - notificationDate.getTime()
    const diffMinutes = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMinutes < 1) {
      return "たった今"
    } else if (diffMinutes < 60) {
      return `${diffMinutes}分前`
    } else if (diffHours < 24) {
      return `${diffHours}時間前`
    } else if (diffDays < 7) {
      return `${diffDays}日前`
    } else {
      return notificationDate.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-red-900/50 text-white max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 通知リスト */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">
                読み込み中...
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    notification.isRead 
                      ? 'bg-gray-900/30 border-red-900/20' 
                      : 'bg-red-950/20 border-red-900/50'
                  }`}
                >
                  {/* アバター */}
                  <Avatar className="h-10 w-10 border-2 border-red-500 flex-shrink-0">
                    <AvatarImage src={notification.fromUserAvatar} alt={notification.fromUserName} />
                    <AvatarFallback className="bg-red-950 text-red-200">
                      {notification.fromUserName.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  {/* 通知内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <p className="text-sm text-white">
                          <span className="font-semibold text-red-300">
                            {notification.fromUserName}
                          </span>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-sm">通知はありません</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}