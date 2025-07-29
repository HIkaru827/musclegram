"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, UserMinus } from "lucide-react"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

interface FollowListProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserAccount
  type: 'followers' | 'following'
  onUserClick: (user: UserAccount) => void
}

export function FollowList({ isOpen, onClose, currentUser, type, onUserClick }: FollowListProps) {
  const [users, setUsers] = useState<UserAccount[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  // ユーザーリストとフォロー関係を読み込み
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true)
      try {
        // 全ユーザーを取得
        const allUsers = JSON.parse(localStorage.getItem('musclegram_users') || '[]')
        
        // フォロー関係を読み込み
        const userIds = type === 'followers' 
          ? JSON.parse(localStorage.getItem(`musclegram_followers_${currentUser.id}`) || '[]')
          : JSON.parse(localStorage.getItem(`musclegram_following_${currentUser.id}`) || '[]')
        
        // ユーザーIDからユーザー情報を取得
        const targetUsers = allUsers.filter((user: UserAccount) => 
          userIds.includes(user.id)
        )
        
        setUsers(targetUsers)
        
        // 現在のフォロー状況を読み込み
        const currentFollowing = JSON.parse(localStorage.getItem(`musclegram_following_${currentUser.id}`) || '[]')
        setFollowing(new Set(currentFollowing))
        
      } catch (error) {
        console.error('Failed to load follow list:', error)
        setUsers([])
      }
      setIsLoading(false)
    }
  }, [isOpen, type, currentUser.id])

  const handleFollow = (user: UserAccount) => {
    try {
      const isCurrentlyFollowing = following.has(user.id)
      const newFollowing = new Set(following)
      
      if (isCurrentlyFollowing) {
        // アンフォロー
        newFollowing.delete(user.id)
        
        // フォロワーからも削除
        const userFollowers = JSON.parse(localStorage.getItem(`musclegram_followers_${user.id}`) || '[]')
        const updatedFollowers = userFollowers.filter((id: string) => id !== currentUser.id)
        localStorage.setItem(`musclegram_followers_${user.id}`, JSON.stringify(updatedFollowers))
      } else {
        // フォロー
        newFollowing.add(user.id)
        
        // フォロワーに追加
        const userFollowers = JSON.parse(localStorage.getItem(`musclegram_followers_${user.id}`) || '[]')
        if (!userFollowers.includes(currentUser.id)) {
          userFollowers.push(currentUser.id)
        }
        localStorage.setItem(`musclegram_followers_${user.id}`, JSON.stringify(userFollowers))
      }
      
      // フォロー関係を更新
      setFollowing(newFollowing)
      localStorage.setItem(`musclegram_following_${currentUser.id}`, JSON.stringify(Array.from(newFollowing)))
      
      // フォロー関係更新のイベントを発火
      window.dispatchEvent(new CustomEvent('followingUpdated', {
        detail: { followerId: currentUser.id, followedId: user.id, isFollowing: !isCurrentlyFollowing }
      }))
      
    } catch (error) {
      console.error('Failed to update follow status:', error)
    }
  }

  const title = type === 'followers' ? 'フォロワー' : 'フォロー中'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-red-900/50 text-white max-w-md max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <Users className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* ユーザーリスト */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-400">
                読み込み中...
              </div>
            ) : users.length > 0 ? (
              users.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-gray-900/50 hover:bg-gray-900/70 rounded-lg border border-red-900/30 transition-colors"
                >
                  {/* ユーザー情報 */}
                  <button
                    onClick={() => onUserClick(user)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left hover:bg-gray-800/50 rounded-lg p-1 transition-colors"
                  >
                    <Avatar className="h-12 w-12 border-2 border-red-500">
                      <AvatarImage src={user.avatar} alt={user.displayName} />
                      <AvatarFallback className="bg-red-950 text-red-200">
                        {user.displayName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-white truncate">
                        {user.displayName}
                      </h3>
                      <p className="text-xs text-gray-400 truncate">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* フォローボタン（自分自身は除外） */}
                  {user.id !== currentUser.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFollow(user)}
                      className={`h-8 w-8 p-0 transition-colors ${
                        following.has(user.id)
                          ? 'text-red-400 hover:text-red-300 hover:bg-red-950/30'
                          : 'text-green-400 hover:text-green-300 hover:bg-green-950/30'
                      }`}
                      title={following.has(user.id) ? "アンフォロー" : "フォロー"}
                    >
                      {following.has(user.id) ? 
                        <UserMinus className="h-4 w-4" /> : 
                        <UserPlus className="h-4 w-4" />
                      }
                    </Button>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-sm">
                  {type === 'followers' ? 
                    'フォロワーがいません' : 
                    'まだ誰もフォローしていません'
                  }
                </p>
              </div>
            )}
          </div>

          {/* 統計情報 */}
          {users.length > 0 && (
            <div className="text-center text-xs text-gray-500 border-t border-red-900/30 pt-3">
              {users.length}人の{title}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}