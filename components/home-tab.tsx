"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { firestorePosts, firestoreUsers } from "@/lib/firestore-utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, MessageCircle, Share2, Dumbbell, Trash2, MoreVertical } from "lucide-react"
import { UserProfile } from "@/components/user-profile"
import { LikesList } from "@/components/likes-list"
import { CommentsModal } from "@/components/comments-modal"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

export function HomeTab({ 
  currentUser,
  globalLikesCount,
  globalUserLikes,
  globalCommentsCount,
  onLikeUpdate,
  onCommentUpdate
}: { 
  currentUser: UserAccount
  globalLikesCount: {[postId: string]: number}
  globalUserLikes: Set<string>
  globalCommentsCount: {[postId: string]: number}
  onLikeUpdate: (postId: string, isLiked: boolean, likesCount: number) => void
  onCommentUpdate: (postId: string, count: number) => void
}) {
  const [activeTab, setActiveTab] = useState("all")
  const [globalPosts, setGlobalPosts] = useState<Post[]>([])
  const [followingPosts, setFollowingPosts] = useState<Post[]>([])
  const [userProfile, setUserProfile] = useState({
    avatar: currentUser.avatar,
    displayName: currentUser.displayName,
    username: currentUser.username,
  })
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [isLikesListOpen, setIsLikesListOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false)
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null)

  // Firestoreから投稿データを読み込む関数
  const loadGlobalPosts = async () => {
      try {
        console.log('Loading posts from Firestore...')
        // Firestoreから投稿を取得
        const firebasePosts = await firestorePosts.getAll()
        console.log('Firestore posts loaded:', firebasePosts)
        
        // ユーザー情報を付加
        const postsWithUsers = await Promise.all(
          firebasePosts.map(async (post) => {
            try {
              const user = await firestoreUsers.get(post.userId)
              console.log('User data for post:', { postId: post.id, user })
              return {
                id: post.id,
                userId: post.userId,
                user: {
                  name: user?.displayName || "Unknown User",
                  avatar: user?.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user?.displayName || 'Unknown') + '&background=dc2626&color=ffffff&size=80',
                  username: user?.username || "unknown",
                },
                content: post.content,
                memo: (post.exercise && post.exercise.memo) ? post.exercise.memo : null,
                workout: post.workout ? {
                  // Hevyスタイルのワークアウトデータ処理
                  totalExercises: post.workout.totalExercises || 0,
                  totalSets: post.workout.totalSets || 0,
                  totalReps: post.workout.totalReps || 0,
                  totalVolume: post.workout.totalVolume || 0,
                  duration: post.workout.duration || 'N/A',
                  exercises: (post.workout.exercises || []).map((ex: any) => ({
                    name: ex.name,
                    sets: ex.sets || [],
                    photo: ex.photo,
                    bodyPart: ex.bodyPart || 'その他',
                    maxWeight: ex.maxWeight || 0,
                    totalReps: ex.totalReps || 0,
                    totalVolume: ex.totalVolume || 0
                  }))
                } : {
                  // 旧形式との互換性を保持
                  type: (post.exercise && post.exercise.name) ? post.exercise.name : '不明な種目',
                  details: ((post.exercise && post.exercise.sets && Array.isArray(post.exercise.sets)) ? post.exercise.sets.map((set: any, index: number) => {
                    const weight = parseFloat(set.weight) || 0
                    const reps = parseFloat(set.reps) || 0
                    const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
                    return `セット${index + 1}: ${set.weight}kg × ${set.reps}回 (1RM: ${oneRM > 0 ? oneRM.toFixed(1) : '0'}kg)`
                  }) : []).join('\n'),
                  sets: (post.exercise && post.exercise.sets) ? post.exercise.sets : []
                },
                image: (post.exercise && post.exercise.photo) ? post.exercise.photo : undefined,
                time: post.timestamp ? new Date(post.timestamp).toLocaleString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }).replace(/\//g, '-') : "先ほど",
              }
            } catch (userError) {
              console.error('Failed to load user data for post:', post.id, userError)
              // ユーザーデータが取得できない場合のフォールバック
              return {
                id: post.id,
                userId: post.userId,
                user: {
                  name: "Unknown User",
                  avatar: 'https://ui-avatars.com/api/?name=Unknown&background=dc2626&color=ffffff&size=80',
                  username: "unknown",
                },
                content: post.content,
                memo: (post.exercise && post.exercise.memo) ? post.exercise.memo : null,
                workout: post.workout ? {
                  totalExercises: post.workout.totalExercises || 0,
                  totalSets: post.workout.totalSets || 0,
                  totalReps: post.workout.totalReps || 0,
                  totalVolume: post.workout.totalVolume || 0,
                  duration: post.workout.duration || 'N/A',
                  exercises: (post.workout.exercises || []).map((ex: any) => ({
                    name: ex.name,
                    sets: ex.sets || [],
                    photo: ex.photo,
                    bodyPart: ex.bodyPart || 'その他',
                    maxWeight: ex.maxWeight || 0,
                    totalReps: ex.totalReps || 0,
                    totalVolume: ex.totalVolume || 0
                  }))
                } : {
                  type: (post.exercise && post.exercise.name) ? post.exercise.name : '不明な種目',
                  details: ((post.exercise && post.exercise.sets && Array.isArray(post.exercise.sets)) ? post.exercise.sets.map((set: any, index: number) => {
                    const weight = parseFloat(set.weight) || 0
                    const reps = parseFloat(set.reps) || 0
                    const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
                    return `セット${index + 1}: ${set.weight}kg × ${set.reps}回 (1RM: ${oneRM > 0 ? oneRM.toFixed(1) : '0'}kg)`
                  }) : []).join('\n'),
                  sets: (post.exercise && post.exercise.sets) ? post.exercise.sets : []
                },
                image: (post.exercise && post.exercise.photo) ? post.exercise.photo : undefined,
                time: post.timestamp ? new Date(post.timestamp).toLocaleString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                }).replace(/\//g, '-') : "先ほど",
              }
            }
          })
        )
        
        setGlobalPosts(postsWithUsers)
        await loadLikesData(postsWithUsers)
        loadFollowingPosts(postsWithUsers)
        
      } catch (error) {
        console.error('Failed to load posts:', error)
        setGlobalPosts([])
        setFollowingPosts([])
      }
    }

    const loadFollowingPosts = async (posts: any[]) => {
      try {
        // Firestoreからフォロー情報を取得
        const following = await firestoreUsers.get(currentUser.id)
        // TODO: フォロー機能はFirestoreに移行後に実装
        setFollowingPosts([])
      } catch (error) {
        console.error('Failed to load following posts:', error)
        setFollowingPosts([])
      }
    }

  // Firestoreから投稿データを読み込んで表示
  useEffect(() => {
    loadGlobalPosts()

    // プロフィールデータの読み込み（Firebaseから）
    const loadUserProfile = () => {
      setUserProfile({
        avatar: currentUser.avatar,
        displayName: currentUser.displayName,
        username: currentUser.username,
      })
    }

    loadUserProfile()

    // グローバル投稿の変更を監視
    const handleGlobalPostsUpdate = () => {
      loadGlobalPosts()
    }

    const handleFollowingUpdate = () => {
      loadGlobalPosts() // フォロー関係が変更されたら投稿も再読み込み
    }

    const handleProfileUpdate = (e: CustomEvent) => {
      const profile = e.detail
      setUserProfile({
        avatar: profile.avatar,
        displayName: profile.displayName,
        username: profile.username,
      })
      
      // プロフィール変更時に投稿も再読み込み（最新のユーザー情報を反映）
      loadGlobalPosts()
    }

    window.addEventListener('globalPostsUpdated', handleGlobalPostsUpdate)
    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener)
    window.addEventListener('followingUpdated', handleFollowingUpdate)

    return () => {
      window.removeEventListener('globalPostsUpdated', handleGlobalPostsUpdate)
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener)
      window.removeEventListener('followingUpdated', handleFollowingUpdate)
    }
  }, [currentUser.id])

  // Firestoreからいいねデータとコメント数を読み込む関数
  const loadLikesData = async (posts: any[]) => {
    try {
      const { firestoreLikes, firestoreComments } = await import('@/lib/firestore-utils')
      
      await Promise.all(posts.map(async (post) => {
        try {
          // グローバル状態に既にデータがある場合はスキップ
          if (globalLikesCount[post.id] !== undefined && globalCommentsCount[post.id] !== undefined) {
            return
          }

          // いいねデータを取得
          const likes = await firestoreLikes.getByPost(post.id)
          const likesCount = likes.length
          
          // 現在のユーザーがいいねしているかチェック
          const userLiked = likes.some(like => like.userId === currentUser.id)
          
          // コメント数を取得
          const comments = await firestoreComments.getByPost(post.id)
          const commentsCount = comments.length

          // グローバル状態を更新
          onLikeUpdate(post.id, userLiked, likesCount)
          onCommentUpdate(post.id, commentsCount)
        } catch (likeError) {
          console.error('Failed to load like/comment data for post:', post.id, likeError)
          // エラーが発生した場合はデフォルト値を設定
          onLikeUpdate(post.id, false, 0)
          onCommentUpdate(post.id, 0)
        }
      }))
    } catch (error) {
      console.error('Failed to load likes data:', error)
    }
  }

  // いいねボタンのハンドラー
  const handleLike = async (postId: string) => {
    try {
      const { firestoreLikes, firestoreNotifications } = await import('@/lib/firestore-utils')
      const isCurrentlyLiked = globalUserLikes.has(postId)
      
      if (isCurrentlyLiked) {
        // いいねを取り消し
        await firestoreLikes.remove(postId, currentUser.id)
        const newCount = Math.max(0, (globalLikesCount[postId] || 0) - 1)
        onLikeUpdate(postId, false, newCount)
      } else {
        // いいねを追加
        await firestoreLikes.add(postId, currentUser.id)
        const newCount = (globalLikesCount[postId] || 0) + 1
        onLikeUpdate(postId, true, newCount)
        
        // 通知を作成（自分の投稿以外の場合）
        const post = globalPosts.find(p => p.id === postId)
        if (post && post.userId !== currentUser.id) {
          await firestoreNotifications.create({
            userId: post.userId, // 通知を受け取るユーザー（投稿者）
            fromUserId: currentUser.id, // 通知を発生させたユーザー（いいねした人）
            fromUserName: currentUser.displayName,
            fromUserAvatar: currentUser.avatar,
            type: 'like',
            postId: postId,
            message: 'からイイネされました',
            isRead: false
          })
          
          // 通知更新イベントを発火
          window.dispatchEvent(new CustomEvent('notificationUpdated'))
        }
      }
    } catch (error) {
      console.error('Failed to update like status:', error)
      alert('いいねの更新に失敗しました')
    }
  }

  // コメントボタンのハンドラー
  const handleCommentClick = (postId: string) => {
    setSelectedPostForComments(postId)
    setIsCommentsModalOpen(true)
  }

  // 投稿削除機能
  const handleDeletePost = async (postId: string) => {
    try {
      await firestorePosts.delete(postId)
      
      // ローカル状態から削除（UIを先に更新）
      setGlobalPosts(prev => prev.filter(post => post.id !== postId))
      
      // グローバル投稿更新のイベントを発火
      window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
      
      setDeleteConfirmation(null)
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('投稿の削除に失敗しました')
    }
  }

  // コメント数更新のイベントリスナー
  useEffect(() => {
    const handleCommentsUpdate = (e: CustomEvent) => {
      const { postId, count } = e.detail
      onCommentUpdate(postId, count)
    }

    window.addEventListener('commentsUpdated', handleCommentsUpdate as EventListener)
    
    return () => {
      window.removeEventListener('commentsUpdated', handleCommentsUpdate as EventListener)
    }
  }, [onCommentUpdate])

  // ユーザーアイコンクリック時のハンドラー
  const handleUserIconClick = async (postUserId: string, username: string) => {
    try {
      // Firestoreからユーザー情報を取得
      const user = await firestoreUsers.get(postUserId)
      
      if (user) {
        const userAccount: UserAccount = {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          username: user.username,
          bio: user.bio,
          avatar: user.avatar,
          createdAt: user.createdAt
        }
        setSelectedUser(userAccount)
        setIsUserProfileOpen(true)
      } else {
        console.error('User not found:', postUserId)
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  // タブ変更時の処理（再読み込み機能付き）
  const handleTabChange = (newTab: string) => {
    if (newTab === "all" && activeTab === "all") {
      // 既に「みんなの投稿」タブにいる場合は再読み込み
      loadGlobalPosts()
    }
    setActiveTab(newTab)
  }

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="all" value={activeTab} onValueChange={handleTabChange} className="w-full h-full flex flex-col">
        <div className="p-2 md:p-4 border-b border-red-900/50">
          <TabsList className="w-full bg-transparent h-10 md:h-12 lg:h-14">
            <TabsTrigger value="all" className="flex-1 bg-white text-red-500 border border-red-500 data-[state=active]:bg-red-500 data-[state=active]:text-white text-xs">
              みんなの投稿
            </TabsTrigger>
            <TabsTrigger value="following" className="flex-1 bg-white text-red-500 border border-red-500 data-[state=active]:bg-red-500 data-[state=active]:text-white text-xs">
              フォロー中
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-hidden">
          <TabsContent value="all" className="m-0 p-0 h-full overflow-y-auto">
            <div className="p-4">
              {globalPosts.length > 0 ? (
                <div className="space-y-4">
                  {globalPosts.map((post) => (
                    <div
                      key={post.id}
                      className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                    >
                      
                      {/* ヘッダー部分 */}
                      <div className="flex items-start gap-3 mb-3">
                        <button
                          onClick={() => handleUserIconClick(post.userId, post.user.username)}
                          className="cursor-pointer"
                        >
                          <Avatar className="h-10 w-10 border border-red-500 hover:border-red-400 transition-colors">
                            <AvatarImage src={post.user.avatar} alt={post.user.name} />
                            <AvatarFallback className="bg-red-950 text-red-200">
                              {post.user.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-black">{post.user.name}</h4>
                            <span className="text-xs text-gray-500">@{post.user.username}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">{post.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* 投稿内容 */}
                      <div className="mb-3">
                        <div className="mb-2">
                          <span className="font-medium text-sm text-black">
                            {post.content}
                          </span>
                        </div>
                        
                        {/* メモ表示 */}
                        {(post.memo || post.exercise?.memo) && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border-l-4 border-red-400 ml-6">
                              {post.memo || post.exercise.memo}
                            </p>
                          </div>
                        )}
                        
                        {/* Hevyスタイルのワークアウト詳細 */}
                        {post.workout && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3 border">
                            {post.workout.exercises && post.workout.exercises.length > 0 ? (
                              // 新しいHevyスタイル表示
                              <div>
                                {/* ワークアウト統計 */}
                                <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Dumbbell className="h-3 w-3" />
                                    <span>{post.workout.totalExercises}種目</span>
                                  </div>
                                  <div>{post.workout.totalSets}セット</div>
                                  <div>{post.workout.totalReps}回</div>
                                  <div>{post.workout.totalVolume?.toFixed(0)}kg</div>
                                </div>
                                
                                {/* 種目別詳細 */}
                                <div className="space-y-3">
                                  {post.workout.exercises.map((exercise: any, exerciseIndex: number) => (
                                    <div key={`${post.id}-exercise-${exerciseIndex}`} className="border-l-2 border-red-400 pl-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-semibold text-sm text-black">{exercise.name}</h4>
                                        <div className="text-xs text-gray-500">
                                          {exercise.bodyPart && `${exercise.bodyPart} • `}
                                          最大重量 {exercise.maxWeight}kg
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        {exercise.sets.map((set: any, setIndex: number) => {
                                          const weight = parseFloat(set.weight) || 0
                                          const reps = parseInt(set.reps) || 0
                                          const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
                                          return (
                                            <div key={`${post.id}-${exerciseIndex}-set-${setIndex}`} 
                                                 className="flex items-center justify-between text-xs">
                                              <span className="text-gray-600">セット{setIndex + 1}</span>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono">{set.weight}kg × {set.reps}回</span>
                                                {oneRM > 0 && (
                                                  <span className="text-red-500 font-medium">
                                                    (1RM: {oneRM.toFixed(1)}kg)
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              // 旧形式との互換性
                              <div>
                                <div className="text-xs text-gray-600 mb-2 font-medium">トレーニング詳細</div>
                                <div className="space-y-1">
                                  {post.workout.details && post.workout.details.split('\n').map((detail: string, index: number) => (
                                    <div key={`${post.id}-detail-${index}`} className="text-xs text-gray-700">{detail}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 写真 */}
                        {post.image && (
                          <div className="rounded-lg overflow-hidden border">
                            <img
                              src={post.image}
                              alt={post.workout?.type || "ワークアウト"}
                              className="w-full max-h-80 object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* アクション部分（いいね、コメントなど） */}
                      <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                        <button 
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1 transition-colors ${
                            globalUserLikes.has(post.id) 
                              ? 'text-red-500' 
                              : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${
                            globalUserLikes.has(post.id) ? 'fill-current' : ''
                          }`} />
                          <span className="text-xs">{globalLikesCount[post.id] || 0}</span>
                        </button>
                        <button 
                          onClick={() => handleCommentClick(post.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{globalCommentsCount[post.id] || 0}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
                          <Share2 className="h-4 w-4" />
                        </button>
                        {/* 削除ボタン - 自分の投稿のみ表示 */}
                        {post.userId === currentUser.id && (
                          <button 
                            onClick={() => setDeleteConfirmation(post.id)}
                            className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-16">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-sm">まだ投稿がありません</p>
                  <p className="text-xs mt-1">記録タブでトレーニングを記録してみましょう</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="following" className="m-0 p-0 h-full overflow-y-auto">
            <div className="p-4">
              {followingPosts.length > 0 ? (
                <div className="space-y-4">
                  {followingPosts.map((post) => (
                    <div
                      key={post.id}
                      className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                    >
                      
                      {/* ヘッダー部分 */}
                      <div className="flex items-start gap-3 mb-3">
                        <button
                          onClick={() => handleUserIconClick(post.userId, post.user.username)}
                          className="cursor-pointer"
                        >
                          <Avatar className="h-10 w-10 border border-red-500 hover:border-red-400 transition-colors">
                            <AvatarImage src={post.user.avatar} alt={post.user.name} />
                            <AvatarFallback className="bg-red-950 text-red-200">
                              {post.user.name.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-black">{post.user.name}</h4>
                            <span className="text-xs text-gray-500">@{post.user.username}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">{post.time}</span>
                          </div>
                        </div>
                      </div>

                      {/* 投稿内容 */}
                      <div className="mb-3">
                        <div className="mb-2">
                          <span className="font-medium text-sm text-black">
                            {post.content}
                          </span>
                        </div>
                        
                        {/* メモ表示 */}
                        {(post.memo || post.exercise?.memo) && (
                          <div className="mb-2">
                            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border-l-4 border-red-400 ml-6">
                              {post.memo || post.exercise.memo}
                            </p>
                          </div>
                        )}
                        
                        {/* Hevyスタイルのワークアウト詳細 */}
                        {post.workout && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3 border">
                            {post.workout.exercises && post.workout.exercises.length > 0 ? (
                              // 新しいHevyスタイル表示
                              <div>
                                {/* ワークアウト統計 */}
                                <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
                                  <div className="flex items-center gap-1">
                                    <Dumbbell className="h-3 w-3" />
                                    <span>{post.workout.totalExercises}種目</span>
                                  </div>
                                  <div>{post.workout.totalSets}セット</div>
                                  <div>{post.workout.totalReps}回</div>
                                  <div>{post.workout.totalVolume?.toFixed(0)}kg</div>
                                </div>
                                
                                {/* 種目別詳細 */}
                                <div className="space-y-3">
                                  {post.workout.exercises.map((exercise: any, exerciseIndex: number) => (
                                    <div key={`${post.id}-exercise-${exerciseIndex}`} className="border-l-2 border-red-400 pl-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-semibold text-sm text-black">{exercise.name}</h4>
                                        <div className="text-xs text-gray-500">
                                          {exercise.bodyPart && `${exercise.bodyPart} • `}
                                          最大重量 {exercise.maxWeight}kg
                                        </div>
                                      </div>
                                      <div className="space-y-1">
                                        {exercise.sets.map((set: any, setIndex: number) => {
                                          const weight = parseFloat(set.weight) || 0
                                          const reps = parseInt(set.reps) || 0
                                          const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
                                          return (
                                            <div key={`${post.id}-${exerciseIndex}-set-${setIndex}`} 
                                                 className="flex items-center justify-between text-xs">
                                              <span className="text-gray-600">セット{setIndex + 1}</span>
                                              <div className="flex items-center gap-2">
                                                <span className="font-mono">{set.weight}kg × {set.reps}回</span>
                                                {oneRM > 0 && (
                                                  <span className="text-red-500 font-medium">
                                                    (1RM: {oneRM.toFixed(1)}kg)
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              // 旧形式との互換性
                              <div>
                                <div className="text-xs text-gray-600 mb-2 font-medium">トレーニング詳細</div>
                                <div className="space-y-1">
                                  {post.workout.details && post.workout.details.split('\n').map((detail: string, index: number) => (
                                    <div key={`${post.id}-detail-${index}`} className="text-xs text-gray-700">{detail}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 写真 */}
                        {post.image && (
                          <div className="rounded-lg overflow-hidden border">
                            <img
                              src={post.image}
                              alt={post.workout?.type || "ワークアウト"}
                              className="w-full max-h-80 object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* アクション部分（いいね、コメントなど） */}
                      <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                        <button 
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1 transition-colors ${
                            globalUserLikes.has(post.id) 
                              ? 'text-red-500' 
                              : 'text-gray-500 hover:text-red-500'
                          }`}
                        >
                          <Heart className={`h-4 w-4 ${
                            globalUserLikes.has(post.id) ? 'fill-current' : ''
                          }`} />
                          <span className="text-xs">{globalLikesCount[post.id] || 0}</span>
                        </button>
                        <button 
                          onClick={() => handleCommentClick(post.id)}
                          className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{globalCommentsCount[post.id] || 0}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
                          <Share2 className="h-4 w-4" />
                        </button>
                        {/* 削除ボタン - 自分の投稿のみ表示 */}
                        {post.userId === currentUser.id && (
                          <button 
                            onClick={() => setDeleteConfirmation(post.id)}
                            className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 py-16">
                  <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p className="text-sm">フォロー中のユーザーの投稿がありません</p>
                  <p className="text-xs mt-1">検索からユーザーをフォローしてみましょう</p>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* ユーザープロフィールモーダル */}
      <UserProfile
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
        targetUser={selectedUser}
        currentUser={currentUser}
      />

      {/* いいねリストモーダル */}
      <LikesList
        isOpen={isLikesListOpen}
        onClose={() => setIsLikesListOpen(false)}
        postId={selectedPostId || ''}
        currentUser={currentUser}
        onUserClick={(user) => {
          setSelectedUser(user)
          setIsLikesListOpen(false)
          setIsUserProfileOpen(true)
        }}
      />

      {/* コメントモーダル */}
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => setIsCommentsModalOpen(false)}
        postId={selectedPostForComments || ''}
        currentUser={currentUser}
        onUserClick={(user) => {
          setSelectedUser(user)
          setIsCommentsModalOpen(false)
          setIsUserProfileOpen(true)
        }}
      />

      {/* 削除確認ダイアログ */}
      {deleteConfirmation && (
        <Dialog open={true} onOpenChange={() => setDeleteConfirmation(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>投稿を削除</DialogTitle>
              <DialogDescription>
                この投稿を削除しますか？削除した投稿は復元できません。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex gap-2 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setDeleteConfirmation(null)}
                >
                  キャンセル
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDeletePost(deleteConfirmation)}
                >
                  削除
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

interface Post {
  id: string
  userId: string
  user: {
    name: string
    avatar: string
    username: string
  }
  content: string
  workout?: {
    type: string
    details: string
  }
  exercise?: {
    id: number
    name: string
    sets: Array<{
      weight: string
      reps: string
    }>
    memo?: string
    photo?: string
  }
  exercises?: Array<{
    id: number
    name: string
    sets: Array<{
      weight: string
      reps: string
    }>
    photo?: string
  }>
  image?: string
  time: string
}