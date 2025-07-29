"use client"

import { useState, useEffect } from "react"
import { firestorePosts } from "@/lib/firestore-utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dumbbell, Settings, BarChart3, FlameIcon as Fire, TrendingUp, Calendar, FileText, Heart, MessageCircle, Share2, Trash2 } from "lucide-react"
import { FollowList } from "@/components/follow-list"
import { UserProfile as UserProfileModal } from "@/components/user-profile"
import { LikesList } from "@/components/likes-list"
import { CommentsModal } from "@/components/comments-modal"

interface UserProfile {
  avatar: string
  displayName: string
  username: string
  bio: string
}

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

export function ProfileTab({ 
  currentUser,
  globalLikesCount,
  globalUserLikes,
  globalCommentsCount,
  onLikeUpdate,
  onCommentUpdate
}: { 
  currentUser: UserAccount
  globalLikesCount?: {[postId: string]: number}
  globalUserLikes?: Set<string>
  globalCommentsCount?: {[postId: string]: number}
  onLikeUpdate?: (postId: string, isLiked: boolean, likesCount: number) => void
  onCommentUpdate?: (postId: string, count: number) => void
}) {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    avatar: currentUser.avatar,
    displayName: currentUser.displayName,
    username: currentUser.username,
    bio: currentUser.bio
  })
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [tempProfile, setTempProfile] = useState<UserProfile>(userProfile)
  const [userExercises, setUserExercises] = useState<any[]>([])
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowListOpen, setIsFollowListOpen] = useState(false)
  const [followListType, setFollowListType] = useState<'followers' | 'following'>('followers')
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null)
  const [isLikesListOpen, setIsLikesListOpen] = useState(false)
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null)
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false)
  const [selectedPostForComments, setSelectedPostForComments] = useState<string | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // プロフィールデータをcurrentUser（Firestore）から読み込み
  useEffect(() => {
    // currentUserの情報を直接使用（Firestoreから最新情報が取得済み）
    const profile = {
      avatar: currentUser.avatar,
      displayName: currentUser.displayName,
      username: currentUser.username,
      bio: currentUser.bio
    }
    setUserProfile(profile)
    setTempProfile(profile)
    
    // ローカルストレージも更新しておく（オフライン対応）
    localStorage.setItem(`userProfile_${currentUser.id}`, JSON.stringify(profile))

    // 筋トレデータの読み込み（現在のユーザーの投稿のみ）
    const loadExercises = () => {
      const globalPosts = JSON.parse(localStorage.getItem('musclegram_global_posts') || '[]')
      const userPosts = globalPosts.filter((post: any) => post.userId === currentUser.id)
      const userExercises = userPosts.map((post: any) => ({
        ...post.exercise,
        id: post.exercise.id,
        timestamp: post.timestamp
      }))
      setUserExercises(userExercises)
    }

    loadExercises()

    // フォロー関係の読み込み
    const loadFollowCounts = async () => {
      try {
        const { firestoreFollows } = await import('@/lib/firestore-utils')
        const followers = await firestoreFollows.getFollowers(currentUser.id)
        const following = await firestoreFollows.getFollowing(currentUser.id)
        setFollowersCount(followers.length)
        setFollowingCount(following.length)
      } catch (error) {
        console.error('Failed to load follow counts:', error)
        setFollowersCount(0)
        setFollowingCount(0)
      }
    }

    loadFollowCounts()

    // データ更新の監視
    const handleDataUpdate = () => {
      loadExercises()
    }

    const handleFollowingUpdate = () => {
      loadFollowCounts()
    }

    window.addEventListener('globalPostsUpdated', handleDataUpdate)
    window.addEventListener('followingUpdated', handleFollowingUpdate)

    return () => {
      window.removeEventListener('globalPostsUpdated', handleDataUpdate)
      window.removeEventListener('followingUpdated', handleFollowingUpdate)
    }
  }, [currentUser.id]) // Add currentUser.id back to dependency array

  // いいねデータとコメント数を読み込む関数（グローバル状態使用）
  const loadLikesData = async (posts: any[]) => {
    if (!onLikeUpdate || !onCommentUpdate) return

    try {
      const { firestoreLikes, firestoreComments } = await import('@/lib/firestore-utils')
      
      await Promise.all(posts.map(async (post) => {
        // グローバル状態に既にデータがある場合はスキップ
        if (globalLikesCount?.[post.id] !== undefined && globalCommentsCount?.[post.id] !== undefined) {
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
      }))
    } catch (error) {
      console.error('Failed to load likes data:', error)
    }
  }

  // いいねボタンのハンドラー（グローバル状態使用）
  const handleLike = async (postId: string) => {
    if (!onLikeUpdate || !globalUserLikes) return

    try {
      const { firestoreLikes } = await import('@/lib/firestore-utils')
      const isCurrentlyLiked = globalUserLikes.has(postId)
      
      if (isCurrentlyLiked) {
        // いいねを取り消し
        await firestoreLikes.remove(postId, currentUser.id)
        const newCount = Math.max(0, (globalLikesCount?.[postId] || 0) - 1)
        onLikeUpdate(postId, false, newCount)
      } else {
        // いいねを追加
        await firestoreLikes.add(postId, currentUser.id)
        const newCount = (globalLikesCount?.[postId] || 0) + 1
        onLikeUpdate(postId, true, newCount)
      }
    } catch (error) {
      console.error('Failed to update like status:', error)
      alert('いいねの更新に失敗しました')
    }
  }

  // いいね数をクリックしてユーザーリストを表示
  const handleLikesClick = (postId: string) => {
    setSelectedPostId(postId)
    setIsLikesListOpen(true)
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
      
      // 即座にローカル状態から削除（UIを先に更新）
      setUserExercises(prev => prev.filter(exercise => exercise.postId !== postId))
      
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
      setCommentsCount(prev => ({
        ...prev,
        [postId]: count
      }))
    }

    window.addEventListener('commentsUpdated', handleCommentsUpdate as EventListener)
    
    return () => {
      window.removeEventListener('commentsUpdated', handleCommentsUpdate as EventListener)
    }
  }, [])

  // Firestoreからユーザーの投稿を読み込み
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const userPosts = await firestorePosts.getByUser(currentUser.id)
        
        const userExercises = userPosts.map((post: any) => ({
          ...post.exercise,
          id: post.id, // 投稿IDを使用（一意性が保証される）
          postId: post.id,
          exerciseId: post.exercise.id, // 元のエクササイズIDも保持
          timestamp: post.timestamp,
          createdAt: post.createdAt // ソート用
        }))
        setUserExercises(userExercises)
        
        // いいねデータも読み込む
        if (onLikeUpdate && onCommentUpdate) {
          loadLikesData(userPosts)
        }
      } catch (error) {
        console.error('Failed to load user posts:', error)
        setUserExercises([])
      }
    }

    loadExercises()
  }, [currentUser.id])

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 画像サイズを制限（300KBまで）
      if (file.size > 300 * 1024) {
        alert('画像サイズは300KB以下にしてください')
        return
      }
      
      // 画像をリサイズして圧縮
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // プロフィール写真は150pxに制限
        const maxSize = 150
        let { width, height } = img
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        ctx?.drawImage(img, 0, 0, width, height)
        
        // 品質を下げて圧縮（0.7 = 70%品質）
        const compressedDataURL = canvas.toDataURL('image/jpeg', 0.7)
        setTempProfile(prev => ({
          ...prev,
          avatar: compressedDataURL
        }))
      }
      
      img.src = URL.createObjectURL(file)
    }
  }

  const handleSaveProfile = async () => {
    try {
      // Firestoreにプロフィール情報を保存
      const { firestoreUsers } = await import('@/lib/firestore-utils')
      await firestoreUsers.update(currentUser.id, {
        displayName: tempProfile.displayName,
        username: tempProfile.username,
        bio: tempProfile.bio,
        avatar: tempProfile.avatar
      })

      // ローカル状態も更新
      setUserProfile(tempProfile)
      localStorage.setItem(`userProfile_${currentUser.id}`, JSON.stringify(tempProfile))
      
      // カスタムイベントを発火して他のコンポーネントに通知
      window.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: tempProfile
      }))
      
      setIsSettingsOpen(false)
    } catch (error) {
      console.error('Failed to update profile:', error)
      alert('プロフィールの更新に失敗しました')
    }
  }

  const handleCancel = () => {
    setTempProfile(userProfile)
    setIsSettingsOpen(false)
  }

  const handleFollowListClick = (type: 'followers' | 'following') => {
    setFollowListType(type)
    setIsFollowListOpen(true)
  }

  const handleUserClick = (user: UserAccount) => {
    setSelectedUser(user)
    setIsFollowListOpen(false)
    setIsUserProfileOpen(true)
  }
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 md:p-4 lg:p-5 border-b border-red-900/50">
        <div className="flex items-center gap-3 md:gap-4">
          <Avatar className="h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 border-2 border-red-500">
            <AvatarImage src={userProfile.avatar} alt="ユーザー" />
            <AvatarFallback className="bg-red-950 text-red-200">{userProfile.displayName.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold">{userProfile.displayName}</h2>
            <p className="text-xs md:text-sm lg:text-base text-gray-400">@{userProfile.username}</p>
            <div className="flex gap-3 md:gap-4 mt-1 text-xs md:text-sm">
              <div>
                <span className="font-bold">{userExercises.length}</span> 投稿
              </div>
              <button 
                onClick={() => handleFollowListClick('followers')}
                className="hover:underline transition-all hover:text-red-500"
              >
                <span className="font-bold">{followersCount}</span> フォロワー
              </button>
              <button 
                onClick={() => handleFollowListClick('following')}
                className="hover:underline transition-all hover:text-red-500"
              >
                <span className="font-bold">{followingCount}</span> フォロー中
              </button>
            </div>
          </div>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" className="border-red-900/50 hover:bg-red-950/30 bg-transparent h-8 w-8 md:h-10 md:w-10">
                <Settings className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black border-red-900/50 text-white max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-400">プロフィール設定</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                {/* アバター写真アップロード */}
                <div className="space-y-2">
                  <Label className="text-sm text-red-400">プロフィール写真</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-red-500">
                      <AvatarImage src={tempProfile.avatar} alt="プロフィール" />
                      <AvatarFallback className="bg-red-950 text-red-200">
                        {tempProfile.displayName.substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        id="avatar-upload"
                      />
                      <label
                        htmlFor="avatar-upload"
                        className="inline-block px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm cursor-pointer transition-colors"
                      >
                        写真を変更
                      </label>
                    </div>
                  </div>
                </div>

                {/* 表示名 */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm text-red-400">表示名</Label>
                  <Input
                    id="displayName"
                    value={tempProfile.displayName}
                    onChange={(e) => setTempProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    className="bg-gray-900 border-red-900/50 text-white"
                    placeholder="表示名を入力"
                  />
                </div>

                {/* ユーザーネーム */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm text-red-400">ユーザーネーム</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                    <Input
                      id="username"
                      value={tempProfile.username}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, username: e.target.value }))}
                      className="bg-gray-900 border-red-900/50 text-white pl-8"
                      placeholder="ユーザーネームを入力"
                    />
                  </div>
                </div>

                {/* 自己紹介 */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm text-red-400">自己紹介</Label>
                  <Textarea
                    id="bio"
                    value={tempProfile.bio}
                    onChange={(e) => setTempProfile(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-gray-900 border-red-900/50 text-white resize-none"
                    placeholder="自己紹介を入力"
                    rows={3}
                  />
                </div>

                {/* メールアドレス表示 */}
                <div className="space-y-2 pt-2 border-t border-gray-700">
                  <Label className="text-sm text-gray-500">登録メールアドレス</Label>
                  <div className="text-sm text-gray-300 bg-gray-800/50 px-3 py-2 rounded border border-gray-700">
                    {currentUser.email}
                  </div>
                </div>

                {/* ボタン */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
                    onClick={handleCancel}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    onClick={handleSaveProfile}
                  >
                    保存
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        <div className="mt-2 text-xs md:text-sm">{userProfile.bio}</div>
      </div>

      <Tabs defaultValue="posts" className="flex-1 flex flex-col min-h-0">
        <div className="border-b border-red-900/50">
          <TabsList className="w-full bg-transparent h-12 md:h-14 lg:h-16">
            <TabsTrigger
              value="posts"
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:text-black rounded-none text-xs md:text-sm lg:text-base text-black"
            >
              投稿
            </TabsTrigger>
            <TabsTrigger
              value="stats"
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:text-black rounded-none text-xs md:text-sm lg:text-base text-black"
            >
              分析
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="posts" className="h-full m-0 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {userExercises.length > 0 ? (
                  <div key={refreshKey} className="space-y-4">
                    {userExercises.map((exercise) => (
                      <div
                        key={exercise.postId}
                        className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                      >
                        {/* ヘッダー部分 */}
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-10 w-10 border border-red-500">
                            <AvatarImage src={userProfile.avatar} alt={userProfile.displayName} />
                            <AvatarFallback className="bg-red-950 text-red-200">
                              {userProfile.displayName.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-black">{userProfile.displayName}</h4>
                              <span className="text-xs text-gray-500">@{userProfile.username}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">{exercise.timestamp}</span>
                            </div>
                          </div>
                        </div>

                        {/* 投稿内容 */}
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Dumbbell className="h-4 w-4 text-red-400" />
                            <span className="font-medium text-sm text-black">
                              {exercise.memo || `${exercise.name}を投稿しました！`}
                            </span>
                          </div>
                          
                          {/* セット詳細 */}
                          <div className="bg-gray-50 rounded-lg p-3 mb-3 border">
                            <div className="text-xs text-gray-600 mb-2 font-medium">トレーニング詳細</div>
                            <div className="space-y-1">
                              {exercise.sets.map((set: any, setIndex: number) => (
                                <div key={setIndex} className="flex items-center gap-2 text-xs">
                                  <span className="w-12 text-red-400 font-medium">セット{setIndex + 1}:</span>
                                  <span className="text-gray-700">{set.weight}kg × {set.reps}回</span>
                                </div>
                              ))}
                            </div>
                          </div>


                          {/* 写真 */}
                          {exercise.photo && (
                            <div className="rounded-lg overflow-hidden border">
                              <img
                                src={exercise.photo}
                                alt={exercise.name}
                                className="w-full max-h-80 object-cover"
                              />
                            </div>
                          )}
                        </div>

                        {/* アクション部分（いいね、コメントなど） */}
                        <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                          <button 
                            onClick={() => handleLike(exercise.postId)}
                            className={`flex items-center gap-1 transition-colors ${
                              globalUserLikes?.has(exercise.postId) 
                                ? 'text-red-500' 
                                : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart className={`h-4 w-4 ${
                              globalUserLikes?.has(exercise.postId) ? 'fill-current' : ''
                            }`} />
                            <span className="text-xs">{globalLikesCount?.[exercise.postId] || 0}</span>
                          </button>
                          <button 
                            onClick={() => handleCommentClick(exercise.postId)}
                            className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span className="text-xs">{globalCommentsCount?.[exercise.postId] || 0}</span>
                          </button>
                          <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
                            <Share2 className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => setDeleteConfirmation(exercise.postId)}
                            className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors ml-auto"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats" className="h-full m-0 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 md:p-6 lg:p-8">
                <Card className="bg-gradient-to-br from-gray-900 to-black border-red-900/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="h-5 w-5 text-red-500" />
                      <span>トレーニング分析</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white border border-red-900/30 rounded-md p-3 flex flex-col items-center">
                          <Fire className="h-6 w-6 text-red-500 mb-1" />
                          <div className="text-lg font-bold">24</div>
                          <div className="text-xs text-gray-400">今月のトレーニング</div>
                        </div>
                        <div className="bg-white border border-red-900/30 rounded-md p-3 flex flex-col items-center">
                          <TrendingUp className="h-6 w-6 text-red-500 mb-1" />
                          <div className="text-lg font-bold">+15%</div>
                          <div className="text-xs text-gray-400">先月比</div>
                        </div>
                        <div className="bg-white border border-red-900/30 rounded-md p-3 flex flex-col items-center">
                          <Dumbbell className="h-6 w-6 text-red-500 mb-1" />
                          <div className="text-lg font-bold">120kg</div>
                          <div className="text-xs text-gray-400">最大ベンチプレス</div>
                        </div>
                        <div className="bg-white border border-red-900/30 rounded-md p-3 flex flex-col items-center">
                          <Calendar className="h-6 w-6 text-red-500 mb-1" />
                          <div className="text-lg font-bold">156</div>
                          <div className="text-xs text-gray-400">年間トレーニング日数</div>
                        </div>
                      </div>

                      <div className="bg-white border border-red-900/30 rounded-md p-3">
                        <h3 className="font-semibold text-xs mb-2">トレーニング頻度</h3>
                        <div className="h-24 flex items-end gap-1">
                          {trainingFrequency.map((day, index) => (
                            <div
                              key={index}
                              className="flex-1 bg-red-900/50 rounded-t-sm"
                              style={{ height: `${day.percentage}%` }}
                            ></div>
                          ))}
                        </div>
                        <div className="flex text-xs text-gray-400 mt-1 justify-between">
                          {trainingFrequency.map((day) => (
                            <div key={day.day}>{day.day}</div>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white border border-red-900/30 rounded-md p-3">
                        <h3 className="font-semibold text-xs mb-2">部位別トレーニング</h3>
                        <div className="space-y-2">
                          {bodyPartTraining.map((part) => (
                            <div key={part.name} className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>{part.name}</span>
                                <span>{part.percentage}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-gradient-to-r from-red-700 to-red-500 h-2 rounded-full"
                                  style={{ width: `${part.percentage}%` }}
                                ></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </div>
      </Tabs>

      {/* フォローリストモーダル */}
      <FollowList
        isOpen={isFollowListOpen}
        onClose={() => setIsFollowListOpen(false)}
        currentUser={currentUser}
        type={followListType}
        onUserClick={handleUserClick}
      />

      {/* ユーザープロフィールモーダル */}
      <UserProfileModal
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

// サンプルデータ
const userPosts = [
  { id: 1, image: "/placeholder.svg?height=200&width=200", workout: "胸トレーニング" },
  { id: 2, image: "/placeholder.svg?height=200&width=200", workout: "背中トレーニング" },
  { id: 3, image: "/placeholder.svg?height=200&width=200", workout: "脚トレーニング" },
  { id: 4, image: "/placeholder.svg?height=200&width=200", workout: "肩トレーニング" },
  { id: 5, image: "/placeholder.svg?height=200&width=200", workout: "腕トレーニング" },
  { id: 6, image: "/placeholder.svg?height=200&width=200" },
]

const trainingFrequency = [
  { day: "月", percentage: 80 },
  { day: "火", percentage: 30 },
  { day: "水", percentage: 90 },
  { day: "木", percentage: 40 },
  { day: "金", percentage: 70 },
  { day: "土", percentage: 100 },
  { day: "日", percentage: 20 },
]

const bodyPartTraining = [
  { name: "胸", percentage: 85 },
  { name: "背中", percentage: 70 },
  { name: "脚", percentage: 60 },
  { name: "肩", percentage: 50 },
  { name: "腕", percentage: 40 },
]
