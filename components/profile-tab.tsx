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
import { Dumbbell, Settings, FileText, Heart, MessageCircle, Share2, Trash2, LogOut, ChevronLeft, ChevronRight } from "lucide-react"
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
  onCommentUpdate,
  onLogout
}: { 
  currentUser: UserAccount
  globalLikesCount?: {[postId: string]: number}
  globalUserLikes?: Set<string>
  globalCommentsCount?: {[postId: string]: number}
  onLikeUpdate?: (postId: string, isLiked: boolean, likesCount: number) => void
  onCommentUpdate?: (postId: string, count: number) => void
  onLogout?: () => void
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
  
  // カレンダー関連の状態
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDateExercises, setSelectedDateExercises] = useState<any[]>([])
  const [isDateDetailOpen, setIsDateDetailOpen] = useState(false)

  // カレンダー関連のヘルパー
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]
  
  const dayNames = ['日', '月', '火', '水', '木', '金', '土']

  // 月の日付を取得する関数
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const today = new Date()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDay = firstDay.getDay()
    
    const days = []
    
    // 前月の最後の週の日々
    const prevMonth = new Date(year, month - 1, 0)
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, prevMonth.getDate() - i)
      const dateStr = prevDate.toISOString().split('T')[0]
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: false,
        hasWorkout: workoutDates.has(dateStr)
      })
    }
    
    // 当月の日々
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day)
      const dateStr = currentDate.toISOString().split('T')[0]
      const isToday = currentDate.toDateString() === today.toDateString()
      days.push({
        date: currentDate,
        isCurrentMonth: true,
        isToday: isToday,
        hasWorkout: workoutDates.has(dateStr)
      })
    }
    
    // 次月の最初の日々（42日になるまで）
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      const dateStr = nextDate.toISOString().split('T')[0]
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: false,
        hasWorkout: workoutDates.has(dateStr)
      })
    }
    
    return days
  }

  // 月の移動
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  // 日付クリック処理
  const handleDateClick = (date: Date, hasWorkout: boolean) => {
    if (!hasWorkout) return
    
    const dateStr = date.toLocaleDateString('ja-JP')
    const isoDateStr = date.toISOString().split('T')[0]
    
    // その日のエクササイズを取得
    const dayExercises = userExercises.filter(exercise => {
      if (!exercise || !exercise.timestamp) return false
      try {
        const exerciseDate = new Date(exercise.timestamp).toISOString().split('T')[0]
        return exerciseDate === isoDateStr
      } catch (error) {
        console.error('Error parsing exercise timestamp:', error)
        return false
      }
    })
    
    setSelectedDate(dateStr)
    setSelectedDateExercises(dayExercises)
    setIsDateDetailOpen(true)
  }

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
      if (onCommentUpdate) {
        onCommentUpdate(postId, count)
      }
    }

    window.addEventListener('commentsUpdated', handleCommentsUpdate as EventListener)
    
    return () => {
      window.removeEventListener('commentsUpdated', handleCommentsUpdate as EventListener)
    }
  }, [onCommentUpdate])

  // Firestoreからユーザーの投稿を読み込み
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const userPosts = await firestorePosts.getByUser(currentUser.id)
        
        const userExercises = userPosts.map((post: any) => ({
          // Hevyスタイルのワークアウト投稿に対応
          ...(post.exercise || {}), // 旧形式の互換性
          id: post.id,
          postId: post.id,
          exerciseId: post.exercise?.id,
          timestamp: post.timestamp,
          createdAt: post.createdAt,
          content: post.content,
          memo: post.memo,
          workout: post.workout, // 新しいHevyスタイルのワークアウトデータ
          type: post.type || 'exercise' // 投稿タイプ
        }))
        setUserExercises(userExercises)
        
        // ワークアウト日付を更新
        const workoutDateSet = new Set<string>()
        userExercises.forEach(exercise => {
          const date = new Date(exercise.timestamp).toISOString().split('T')[0]
          workoutDateSet.add(date)
        })
        setWorkoutDates(workoutDateSet)
        
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
            <DialogContent className="bg-gradient-to-br from-white via-gray-50 to-white border border-red-200/30 text-gray-900 max-w-md rounded-2xl shadow-2xl shadow-red-500/10 backdrop-blur-xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-black">プロフィール設定</DialogTitle>
              </DialogHeader>
              <form className="space-y-4">
                {/* アバター写真アップロード */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-black">プロフィール写真</Label>
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-red-300 shadow-lg">
                      <AvatarImage src={tempProfile.avatar} alt="プロフィール" />
                      <AvatarFallback className="bg-gray-100 text-black">
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
                        className="inline-block px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-lg text-sm text-white cursor-pointer transition-all duration-300 hover:scale-105 shadow-lg shadow-red-500/25"
                      >
                        写真を変更
                      </label>
                    </div>
                  </div>
                </div>

                {/* 表示名 */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-sm font-semibold text-black">表示名</Label>
                  <Input
                    id="displayName"
                    value={tempProfile.displayName}
                    onChange={(e) => setTempProfile(prev => ({ ...prev, displayName: e.target.value }))}
                    className="bg-white border-red-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 rounded-lg transition-all duration-300"
                    placeholder="表示名を入力"
                  />
                </div>

                {/* ユーザーネーム */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-semibold text-black">ユーザーネーム</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 font-semibold">@</span>
                    <Input
                      id="username"
                      value={tempProfile.username}
                      onChange={(e) => setTempProfile(prev => ({ ...prev, username: e.target.value }))}
                      className="bg-white border-red-300 text-gray-900 pl-8 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 rounded-lg transition-all duration-300"
                      placeholder="ユーザーネームを入力"
                    />
                  </div>
                </div>

                {/* 自己紹介 */}
                <div className="space-y-2">
                  <Label htmlFor="bio" className="text-sm font-semibold text-black">自己紹介</Label>
                  <Textarea
                    id="bio"
                    value={tempProfile.bio}
                    onChange={(e) => setTempProfile(prev => ({ ...prev, bio: e.target.value }))}
                    className="bg-white border-red-300 text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 rounded-lg transition-all duration-300"
                    placeholder="自己紹介を入力"
                    rows={3}
                  />
                </div>

                {/* メールアドレス表示 */}
                <div className="space-y-2 pt-4 border-t border-red-200">
                  <Label className="text-sm font-semibold text-gray-600">登録メールアドレス</Label>
                  <div className="text-sm text-gray-700 bg-gray-100 px-3 py-2 rounded-lg border border-gray-300">
                    {currentUser.email}
                  </div>
                </div>

                {/* ログアウトボタン */}
                <div className="pt-4 border-t border-red-200">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-red-300 text-red-600 hover:bg-red-500 hover:text-white flex items-center gap-2 transition-all duration-300 hover:scale-105 rounded-lg"
                    onClick={() => {
                      if (onLogout) {
                        onLogout()
                        setIsSettingsOpen(false)
                      }
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    ログアウト
                  </Button>
                </div>

                {/* ボタン */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50 bg-white rounded-lg transition-all duration-300"
                    onClick={handleCancel}
                  >
                    キャンセル
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-600/30 transition-all duration-300 hover:scale-105 rounded-lg"
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

      {/* メインコンテンツエリア */}
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
              value="images"
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:text-black rounded-none text-xs md:text-sm lg:text-base text-black"
            >
              画像
            </TabsTrigger>
            <TabsTrigger
              value="calendar"
              className="flex-1 data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-red-500 data-[state=active]:text-black rounded-none text-xs md:text-sm lg:text-base text-black"
            >
              カレンダー
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="posts" className="h-full m-0 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {userExercises.length > 0 ? (
                  <div key={refreshKey} className="space-y-4">
                    {userExercises.filter(exercise => exercise && exercise.postId).map((exercise) => (
                      <div
                        key={exercise.postId}
                        className="border border-gray-200 rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors"
                      >
                        {/* ヘッダー部分 */}
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar className="h-10 w-10 border border-red-500">
                            <AvatarImage src={userProfile.avatar} alt={userProfile.displayName} />
                            <AvatarFallback className="bg-gray-100 text-black">
                              {userProfile.displayName.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-sm text-black">{userProfile.displayName}</h4>
                              <span className="text-xs text-gray-500">@{userProfile.username}</span>
                              <span className="text-xs text-gray-500">•</span>
                              <span className="text-xs text-gray-500">
                                {exercise.timestamp ? new Date(exercise.timestamp).toLocaleString('ja-JP', {
                                  timeZone: 'Asia/Tokyo',
                                  year: 'numeric',
                                  month: '2-digit',
                                  day: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: false
                                }).replace(/\//g, '-') : "先ほど"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 投稿内容 */}
                        <div className="mb-3">
                          <div className="mb-2">
                            <span className="font-medium text-sm text-black">
                              {exercise.content || (exercise.memo || (exercise.name ? `${exercise.name}を投稿しました！` : '💪 今日のワークアウト完了！'))}
                            </span>
                          </div>
                          
                          {/* メモ表示 */}
                          {exercise.memo && (
                            <div className="mb-2">
                              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border-l-4 border-red-400 ml-6">
                                {exercise.memo}
                              </p>
                            </div>
                          )}
                          
                          {/* Hevyスタイルのワークアウト詳細 */}
                          {exercise.workout && exercise.workout.exercises ? (
                            <div className="bg-gray-50 rounded-lg p-3 mb-3 border">
                              {/* ワークアウト統計 */}
                              <div className="flex items-center gap-4 mb-3 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Dumbbell className="h-3 w-3" />
                                  <span>{exercise.workout.totalExercises}種目</span>
                                </div>
                                <div>{exercise.workout.totalSets}セット</div>
                                <div>{exercise.workout.totalReps}回</div>
                                <div>{exercise.workout.totalVolume?.toFixed(0)}kg</div>
                              </div>
                              
                              {/* 種目別詳細 */}
                              <div className="space-y-3">
                                {exercise.workout.exercises.map((ex: any, exerciseIndex: number) => (
                                  <div key={`${exercise.postId}-exercise-${exerciseIndex}`} className="border-l-2 border-red-400 pl-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <h4 className="font-semibold text-sm text-black">{ex.name}</h4>
                                      <div className="text-xs text-gray-500">
                                        {ex.bodyPart && `${ex.bodyPart} • `}
                                        最大重量 {ex.maxWeight}kg
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      {ex.sets.map((set: any, setIndex: number) => {
                                        const weight = parseFloat(set.weight) || 0
                                        const reps = parseInt(set.reps) || 0
                                        const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
                                        return (
                                          <div key={`${exercise.postId}-${exerciseIndex}-set-${setIndex}`} 
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
                          ) : exercise.sets && exercise.sets.length > 0 ? (
                            // 旧形式との互換性
                            <div className="bg-gray-50 rounded-lg p-3 mb-3 border">
                              <div className="text-xs text-gray-600 mb-2 font-medium">トレーニング詳細</div>
                              <div className="space-y-1">
                                {exercise.sets.map((set: any, setIndex: number) => {
                                  const weight = parseFloat(set.weight) || 0
                                  const reps = parseFloat(set.reps) || 0
                                  const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
                                  
                                  return (
                                    <div key={setIndex} className="flex items-center gap-2 text-xs">
                                      <span className="w-12 text-red-400 font-medium">セット{setIndex + 1}:</span>
                                      <span className="text-gray-700">{set.weight}kg × {set.reps}回</span>
                                      <span className="text-blue-600 font-medium ml-2">
                                        1RM: {oneRM > 0 ? `${oneRM.toFixed(1)}kg` : '0kg'}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : null}


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

          <TabsContent value="images" className="h-full m-0 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4">
                {(() => {
                  // 画像を含む投稿のみをフィルタリング
                  const postsWithImages = userExercises.filter(exercise => exercise && exercise.photo)
                  
                  if (postsWithImages.length === 0) {
                    return (
                      <div className="text-center text-gray-400 py-16">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                        <p className="text-sm">まだ画像付きの投稿がありません</p>
                        <p className="text-xs mt-1">トレーニング記録に写真を追加してみましょう</p>
                      </div>
                    )
                  }
                  
                  return (
                    <div className="grid grid-cols-3 gap-2 auto-rows-min">
                      {postsWithImages.map((exercise, index) => {
                        // 配置ロジック: 1,2,3番目は通常配置、4番目は1番目の下、5番目は2番目の下...
                        let gridColumn = (index % 3) + 1
                        let gridRow = Math.floor(index / 3) + 1
                        
                        // 4番目以降の特別な配置
                        if (index >= 3) {
                          const offset = index - 3
                          gridColumn = (offset % 3) + 1
                          gridRow = Math.floor(offset / 3) + 2
                        }
                        
                        return (
                          <div
                            key={exercise.postId}
                            className="aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity cursor-pointer"
                            style={{
                              gridColumn: gridColumn,
                              gridRow: gridRow
                            }}
                          >
                            <img
                              src={exercise.photo}
                              alt={exercise.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="calendar" className="h-full m-0 p-0 overflow-hidden">
            <div className="h-full bg-white">
              {/* カレンダーヘッダー */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-800">トレーニング履歴</h2>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="h-10 w-10 p-0 border-gray-300 text-gray-600 hover:text-red-500 hover:border-red-300 hover:bg-red-50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <span className="text-xl font-semibold text-gray-800 min-w-32 text-center">
                      {currentDate.getFullYear()}年{monthNames[currentDate.getMonth()]}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="h-10 w-10 p-0 border-gray-300 text-gray-600 hover:text-red-500 hover:border-red-300 hover:bg-red-50"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>

              <ScrollArea className="h-full">
                <div className="p-6">
                  {/* カレンダー */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="space-y-6">
                      {/* 曜日ヘッダー */}
                      <div className="grid grid-cols-7 gap-2">
                        {dayNames.map(day => (
                          <div key={day} className="h-12 flex items-center justify-center text-sm font-semibold text-gray-600 bg-gray-50 rounded-lg">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* 日付グリッド */}
                      <div className="grid grid-cols-7 gap-2">
                        {getDaysInMonth(currentDate).map((day, index) => (
                          <button
                            key={index}
                            onClick={() => handleDateClick(day.date, day.hasWorkout)}
                            className={`
                              h-12 flex items-center justify-center text-sm font-medium rounded-lg transition-all duration-200
                              ${day.isCurrentMonth ? 'text-gray-800' : 'text-gray-300'}
                              ${day.isToday ? 'bg-red-500 text-white font-bold shadow-lg' : ''}
                              ${day.hasWorkout && !day.isToday ? 'bg-red-100 text-red-800 font-bold border-2 border-red-300 shadow-sm' : ''}
                              ${day.hasWorkout ? 'cursor-pointer hover:bg-red-200 hover:scale-105' : 'cursor-default'}
                              ${!day.hasWorkout && day.isCurrentMonth ? 'hover:bg-gray-100' : ''}
                              ${!day.isCurrentMonth ? 'hover:bg-transparent' : ''}
                            `}
                          >
                            {day.date.getDate()}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 凡例 */}
                  <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">凡例</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-red-500 rounded-lg shadow-sm"></div>
                        <span className="text-sm text-gray-600">今日</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded-lg"></div>
                        <span className="text-sm text-gray-600">トレーニング記録あり</span>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* 日付詳細モーダル */}
      <Dialog open={isDateDetailOpen} onOpenChange={setIsDateDetailOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden flex flex-col bg-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-black">{selectedDate}のトレーニング</DialogTitle>
            <DialogDescription className="text-gray-600">
              この日のトレーニング記録を確認できます
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {selectedDateExercises.length > 0 ? (
                selectedDateExercises.map((exercise, index) => (
                  <div key={(exercise && exercise.id) ? exercise.id : index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Dumbbell className="h-4 w-4 text-red-500" />
                      <span className="font-medium text-sm text-black">{(exercise && exercise.name) ? exercise.name : '不明な種目'}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      {(exercise && exercise.sets && Array.isArray(exercise.sets)) ? exercise.sets.map((set: any, setIndex: number) => {
                        const weight = parseFloat(set.weight) || 0
                        const reps = parseFloat(set.reps) || 0
                        const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
                        
                        return (
                          <div key={setIndex} className="flex items-center gap-2">
                            <span className="w-12 text-red-500 font-medium">セット{setIndex + 1}:</span>
                            <span className="text-gray-700">{set.weight}kg × {set.reps}回</span>
                            <span className="text-blue-600 font-medium ml-auto">
                              1RM: {oneRM > 0 ? `${oneRM.toFixed(1)}kg` : '0kg'}
                            </span>
                          </div>
                        )
                      }) : (
                        <div className="text-xs text-gray-500">セット情報がありません</div>
                      )}
                    </div>
                    {(exercise && exercise.memo) && (
                      <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-600 font-medium mb-1">メモ:</div>
                        <div className="text-xs text-gray-800">{exercise.memo}</div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <Dumbbell className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm">この日のトレーニング記録はありません</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

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

