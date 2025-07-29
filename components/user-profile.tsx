"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dumbbell, ArrowLeft, UserPlus, UserMinus, Heart, MessageCircle, Share2, FileText } from "lucide-react"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

interface UserProfileProps {
  isOpen: boolean
  onClose: () => void
  targetUser: UserAccount | null
  currentUser: UserAccount
}

export function UserProfile({ isOpen, onClose, targetUser, currentUser }: UserProfileProps) {
  const [userExercises, setUserExercises] = useState<any[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // ユーザーデータを読み込み
  useEffect(() => {
    if (isOpen && targetUser) {
      setIsLoading(true)
      loadUserData()
      setIsLoading(false)
    }
  }, [isOpen, targetUser])

  const loadUserData = () => {
    if (!targetUser) return

    try {
      // ユーザーの投稿を読み込み
      const globalPosts = JSON.parse(localStorage.getItem('musclegram_global_posts') || '[]')
      const userPosts = globalPosts.filter((post: any) => post.userId === targetUser.id)
      const exercises = userPosts.map((post: any) => ({
        ...post.exercise,
        id: post.exercise.id,
        timestamp: post.timestamp
      }))
      setUserExercises(exercises)

      // フォロワー・フォロー中数を読み込み
      const followers = JSON.parse(localStorage.getItem(`musclegram_followers_${targetUser.id}`) || '[]')
      const following = JSON.parse(localStorage.getItem(`musclegram_following_${targetUser.id}`) || '[]')
      setFollowersCount(followers.length)
      setFollowingCount(following.length)

      // 現在のフォロー状況を確認
      const currentUserFollowing = JSON.parse(localStorage.getItem(`musclegram_following_${currentUser.id}`) || '[]')
      setIsFollowing(currentUserFollowing.includes(targetUser.id))

    } catch (error) {
      console.error('Failed to load user data:', error)
      setUserExercises([])
      setFollowersCount(0)
      setFollowingCount(0)
      setIsFollowing(false)
    }
  }

  const handleFollow = () => {
    if (!targetUser) return

    try {
      const currentFollowing = JSON.parse(localStorage.getItem(`musclegram_following_${currentUser.id}`) || '[]')
      const newFollowing = [...currentFollowing]
      
      if (isFollowing) {
        // アンフォロー
        const index = newFollowing.indexOf(targetUser.id)
        if (index > -1) {
          newFollowing.splice(index, 1)
        }
        
        // フォロワーからも削除
        const userFollowers = JSON.parse(localStorage.getItem(`musclegram_followers_${targetUser.id}`) || '[]')
        const updatedFollowers = userFollowers.filter((id: string) => id !== currentUser.id)
        localStorage.setItem(`musclegram_followers_${targetUser.id}`, JSON.stringify(updatedFollowers))
        setFollowersCount(updatedFollowers.length)
      } else {
        // フォロー
        if (!newFollowing.includes(targetUser.id)) {
          newFollowing.push(targetUser.id)
        }
        
        // フォロワーに追加
        const userFollowers = JSON.parse(localStorage.getItem(`musclegram_followers_${targetUser.id}`) || '[]')
        if (!userFollowers.includes(currentUser.id)) {
          userFollowers.push(currentUser.id)
        }
        localStorage.setItem(`musclegram_followers_${targetUser.id}`, JSON.stringify(userFollowers))
        setFollowersCount(userFollowers.length)
      }
      
      // フォロー関係を更新
      setIsFollowing(!isFollowing)
      localStorage.setItem(`musclegram_following_${currentUser.id}`, JSON.stringify(newFollowing))
      
      // フォロー関係更新のイベントを発火
      window.dispatchEvent(new CustomEvent('followingUpdated', {
        detail: { followerId: currentUser.id, followedId: targetUser.id, isFollowing: !isFollowing }
      }))
      
    } catch (error) {
      console.error('Failed to update follow status:', error)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-red-900/50 text-white max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-red-400 flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-0 h-auto text-red-400 hover:text-red-300"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            プロフィール
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {!targetUser ? (
            <div className="text-center py-8 text-gray-400">
              ユーザー情報が見つかりません
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-gray-400">
              読み込み中...
            </div>
          ) : (
            <>
              {/* プロフィール情報 */}
              <div className="p-4 border-b border-red-900/50">
                <div className="flex items-center gap-4 mb-4">
                  <Avatar className="h-16 w-16 border-2 border-red-500">
                    <AvatarImage src={targetUser.avatar} alt={targetUser.displayName} />
                    <AvatarFallback className="bg-red-950 text-red-200">
                      {targetUser.displayName.substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h2 className="text-lg font-bold text-white">{targetUser.displayName}</h2>
                    <p className="text-sm text-gray-400">@{targetUser.username}</p>
                    <div className="flex gap-4 mt-2 text-xs">
                      <div>
                        <span className="font-bold text-white">{userExercises.length}</span> 
                        <span className="text-gray-400"> 投稿</span>
                      </div>
                      <div>
                        <span className="font-bold text-white">{followersCount}</span>
                        <span className="text-gray-400"> フォロワー</span>
                      </div>
                      <div>
                        <span className="font-bold text-white">{followingCount}</span>
                        <span className="text-gray-400"> フォロー中</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 自己紹介 */}
                {targetUser.bio && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-300">{targetUser.bio}</p>
                  </div>
                )}

                {/* フォローボタン（自分以外） */}
                {targetUser.id !== currentUser.id && (
                  <Button
                    onClick={handleFollow}
                    className={`w-full ${
                      isFollowing
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserMinus className="h-4 w-4 mr-2" />
                        フォロー中
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        フォロー
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* タブコンテンツ */}
              <Tabs defaultValue="posts" className="flex-1 flex flex-col">
                <div className="border-b border-red-900/50">
                  <TabsList className="w-full bg-transparent h-12">
                    <TabsTrigger
                      value="posts"
                      className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:text-white rounded-none text-gray-400"
                    >
                      投稿
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="posts" className="h-full m-0 p-0">
                    <ScrollArea className="h-96">
                      <div className="p-4">
                        {userExercises.length > 0 ? (
                          <div className="space-y-4">
                            {userExercises.slice().reverse().map((exercise) => (
                              <div
                                key={exercise.id}
                                className="border border-gray-600 rounded-lg p-4 bg-gray-900/50 hover:bg-gray-900/70 transition-colors"
                              >
                                {/* ヘッダー部分 */}
                                <div className="flex items-start gap-3 mb-3">
                                  <Avatar className="h-10 w-10 border border-red-500">
                                    <AvatarImage src={targetUser.avatar} alt={targetUser.displayName} />
                                    <AvatarFallback className="bg-red-950 text-red-200">
                                      {targetUser.displayName.substring(0, 2)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-semibold text-sm text-white">{targetUser.displayName}</h4>
                                      <span className="text-xs text-gray-400">@{targetUser.username}</span>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-400">{exercise.timestamp}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* 投稿内容 */}
                                <div className="mb-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Dumbbell className="h-4 w-4 text-red-400" />
                                    <span className="font-medium text-sm text-white">
                                      {exercise.memo || `${exercise.name}を投稿しました！`}
                                    </span>
                                  </div>
                                  
                                  {/* セット詳細 */}
                                  <div className="bg-gray-800/50 rounded-lg p-3 mb-3 border border-gray-700">
                                    <div className="text-xs text-gray-400 mb-2 font-medium">トレーニング詳細</div>
                                    <div className="space-y-1">
                                      {exercise.sets.map((set: any, setIndex: number) => (
                                        <div key={setIndex} className="flex items-center gap-2 text-xs">
                                          <span className="w-12 text-red-400 font-medium">セット{setIndex + 1}:</span>
                                          <span className="text-gray-300">{set.weight}kg × {set.reps}回</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* メモ表示 */}
                                  {exercise.memo && (
                                    <div className="mb-3 p-2 bg-gray-800/30 rounded-md border border-gray-700">
                                      <div className="flex items-center gap-1 mb-1">
                                        <FileText className="h-3 w-3 text-red-400" />
                                        <span className="text-xs text-red-400">メモ</span>
                                      </div>
                                      <p className="text-xs text-gray-300">{exercise.memo}</p>
                                    </div>
                                  )}

                                  {/* 写真 */}
                                  {exercise.photo && (
                                    <div className="rounded-lg overflow-hidden border border-gray-700">
                                      <img
                                        src={exercise.photo}
                                        alt={exercise.name}
                                        className="w-full max-h-60 object-cover"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* アクション部分（いいね、コメントなど） */}
                                <div className="flex items-center gap-6 pt-2 border-t border-gray-700">
                                  <button className="flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors">
                                    <Heart className="h-4 w-4" />
                                    <span className="text-xs">{Math.floor(Math.random() * 20) + 5}</span>
                                  </button>
                                  <button className="flex items-center gap-1 text-gray-400 hover:text-blue-400 transition-colors">
                                    <MessageCircle className="h-4 w-4" />
                                    <span className="text-xs">{Math.floor(Math.random() * 8) + 1}</span>
                                  </button>
                                  <button className="flex items-center gap-1 text-gray-400 hover:text-green-400 transition-colors">
                                    <Share2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center text-gray-400 py-16">
                            <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                            <p className="text-sm">まだ投稿がありません</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}