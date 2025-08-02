"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Search, User, MessageCircle, UserPlus, UserMinus } from "lucide-react"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

interface UserSearchProps {
  isOpen: boolean
  onClose: () => void
  currentUser: UserAccount
  onUserClick: (user: UserAccount) => void
}

export function UserSearch({ isOpen, onClose, currentUser, onUserClick }: UserSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserAccount[]>([])
  const [allUsers, setAllUsers] = useState<UserAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [following, setFollowing] = useState<Set<string>>(new Set())

  // 全ユーザーとフォロー関係を取得
  useEffect(() => {
    if (isOpen) {
      const loadUsers = async () => {
        try {
          // Firestoreから全ユーザーを取得
          const { firestoreUsers, firestoreFollows } = await import('@/lib/firestore-utils')
          const users = await firestoreUsers.getAll()
          
          // 現在のユーザーを除外
          const otherUsers = users.filter((user: UserAccount) => user.id !== currentUser.id)
          setAllUsers(otherUsers)
          setSearchResults(otherUsers) // 初期表示は全ユーザー

          // フォロー関係をFirestoreから読み込み
          const followingIds = await firestoreFollows.getFollowing(currentUser.id)
          setFollowing(new Set(followingIds))
        } catch (error) {
          console.error('Failed to load users:', error)
          setAllUsers([])
          setSearchResults([])
        }
      }

      loadUsers()
    }
  }, [isOpen, currentUser.id])

  // 検索処理
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(allUsers)
      return
    }

    setIsLoading(true)
    const query = searchQuery.toLowerCase()
    
    const filtered = allUsers.filter((user) => 
      user.displayName.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    )

    setSearchResults(filtered)
    setIsLoading(false)
  }, [searchQuery, allUsers])

  const handleUserClick = (user: UserAccount) => {
    onUserClick(user)
    onClose()
  }

  const handleFollow = async (user: UserAccount) => {
    try {
      // バリデーション: 必要なIDが存在することを確認
      if (!currentUser?.id || !user?.id) {
        console.error('[UserSearch] Missing required IDs:', { 
          currentUser: currentUser, 
          currentUserId: currentUser?.id, 
          user: user, 
          userId: user?.id 
        })
        alert('フォロー操作に必要な情報が不足しています')
        return
      }

      const { firestoreFollows } = await import('@/lib/firestore-utils')
      const isCurrentlyFollowing = following.has(user.id)
      const newFollowing = new Set(following)
      
      if (isCurrentlyFollowing) {
        // アンフォロー
        await firestoreFollows.remove(currentUser.id, user.id)
        newFollowing.delete(user.id)
      } else {
        // フォロー
        await firestoreFollows.add(currentUser.id, user.id)
        newFollowing.add(user.id)
      }
      
      // ローカル状態を更新
      setFollowing(newFollowing)
      
      // フォロー関係更新のイベントを発火
      window.dispatchEvent(new CustomEvent('followingUpdated', {
        detail: { followerId: currentUser.id, followedId: user.id, isFollowing: !isCurrentlyFollowing }
      }))
      
    } catch (error) {
      console.error('Failed to update follow status:', error)
      alert('フォロー状態の更新に失敗しました')
    }
  }

  const handleMessage = (user: UserAccount) => {
    // メッセージ機能を後で実装
  }

  const resetSearch = () => {
    setSearchQuery("")
    setSearchResults(allUsers)
  }

  const handleClose = () => {
    resetSearch()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-br from-white via-gray-50 to-white border border-red-200/30 text-gray-900 max-w-md max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl shadow-red-500/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-black flex items-center gap-2">
            <Search className="h-6 w-6" />
            ユーザー検索
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* 検索入力 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="ユーザー名または表示名で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 bg-white border-red-300 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 rounded-lg transition-all duration-300 text-base py-3"
            />
          </div>

          {/* 検索結果 */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center py-8 text-gray-600">
                検索中...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-4 p-4 bg-white hover:bg-red-50 rounded-xl border border-red-200 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-[1.02]"
                >
                  {/* ユーザー情報 */}
                  <button
                    onClick={() => handleUserClick(user)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <Avatar className="h-14 w-14 border-2 border-red-300 shadow-lg">
                      <AvatarImage src={user.avatar} alt={user.displayName} />
                      <AvatarFallback className="bg-red-100 text-red-600 font-bold">
                        {user.displayName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-gray-900 truncate">
                        {user.displayName}
                      </h3>
                      <p className="text-sm text-gray-700 font-medium truncate">
                        @{user.username}
                      </p>
                      {user.bio && (
                        <p className="text-sm text-gray-600 truncate mt-1">
                          {user.bio}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* アクションボタン */}
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleFollow(user)}
                      className={`h-10 w-10 p-0 rounded-lg transition-all duration-300 hover:scale-110 ${
                        following.has(user.id)
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-100'
                          : 'text-green-600 hover:text-green-700 hover:bg-green-100'
                      }`}
                      title={following.has(user.id) ? "アンフォロー" : "フォロー"}
                    >
                      {following.has(user.id) ? 
                        <UserMinus className="h-5 w-5" /> : 
                        <UserPlus className="h-5 w-5" />
                      }
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMessage(user)}
                      className="h-10 w-10 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-all duration-300 hover:scale-110"
                      title="メッセージ"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-600">
                <User className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-sm">
                  {searchQuery.trim() ? 
                    `"${searchQuery}" に一致するユーザーが見つかりません` : 
                    "他のユーザーが見つかりません"
                  }
                </p>
              </div>
            )}
          </div>

          {/* 統計情報 */}
          {searchResults.length > 0 && (
            <div className="text-center text-xs text-gray-500 border-t border-red-900/30 pt-3">
              {searchQuery.trim() ? 
                `${searchResults.length}人のユーザーが見つかりました` :
                `${allUsers.length}人のユーザーが登録されています`
              }
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}