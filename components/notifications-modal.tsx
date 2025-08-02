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
      <DialogContent className="bg-gradient-to-br from-white via-gray-50 to-white border border-red-200/30 text-gray-900 max-w-md max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl shadow-red-500/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-black flex items-center gap-2">
            <Bell className="h-5 w-5" />
            通知
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 通知リスト */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-600">
                読み込み中...
              </div>
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                    notification.isRead 
                      ? 'bg-white hover:bg-red-50 border-red-200 shadow-sm hover:shadow-md' 
                      : 'bg-red-50 hover:bg-red-100 border-red-300 shadow-md hover:shadow-lg'
                  }`}
                >
                  {/* アバター */}
                  <Avatar className="h-12 w-12 border-2 border-red-300 shadow-lg flex-shrink-0">
                    <AvatarImage src={notification.fromUserAvatar} alt={notification.fromUserName} />
                    <AvatarFallback className="bg-red-100 text-red-600 font-bold">
                      {notification.fromUserName.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>

                  {/* 通知内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-bold text-black">
                            {notification.fromUserName}
                          </span>
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          {formatDate(notification.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-600">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm">通知はありません</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}