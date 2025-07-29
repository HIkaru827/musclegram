"use client"

import { useState, useEffect } from "react"
import { HomeTab } from "@/components/home-tab"
import { WorkoutTab } from "@/components/workout-tab"
import { ProfileTab } from "@/components/profile-tab"
import { AuthScreen } from "@/components/auth-screen"
import { UserSearch } from "@/components/user-search"
import { OtherProfileTab } from "@/components/other-profile-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, Dumbbell, User, LogOut, Search } from "lucide-react"
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

export function MobileApp() {
  const [activeTab, setActiveTab] = useState("home")
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<UserAccount | null>(null)

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    // 認証状態をチェック
    const checkAuth = () => {
      const savedUser = localStorage.getItem('musclegram_current_user')
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser)
          setCurrentUser(user)
          
          // ユーザー固有のデータを読み込む
          loadUserData(user.id)
        } catch (error) {
          console.error('Failed to parse user data:', error)
          localStorage.removeItem('musclegram_current_user')
        }
      }
      setIsAuthChecking(false)
    }
    
    checkAuth()
  }, [])

  // ユーザー固有のデータを読み込む
  const loadUserData = (userId: string) => {
    const savedExercises = localStorage.getItem(`workoutExercises_${userId}`)
    if (savedExercises) {
      setExercises(JSON.parse(savedExercises))
    }
    
  }

  // 認証成功時の処理
  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user)
    loadUserData(user.id)
  }

  // ログアウト処理
  const handleLogout = () => {
    localStorage.removeItem('musclegram_current_user')
    setCurrentUser(null)
    setExercises([])
    setActiveTab("home")
  }

  // ユーザークリック処理
  const handleUserClick = (user: UserAccount) => {
    setViewingUser(user)
  }

  // プロフィール表示から戻る処理
  const handleBackToMain = () => {
    setViewingUser(null)
  }

  // ストレージ変更監視（認証後のみ）
  useEffect(() => {
    if (!currentUser) return

    const handleStorageChange = () => {
      const savedExercises = localStorage.getItem(`workoutExercises_${currentUser.id}`)
      if (savedExercises) {
        setExercises(JSON.parse(savedExercises))
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    // 同一タブ内での変更を検出するためのカスタムイベント
    const handleCustomStorageChange = (e: CustomEvent) => {
      const savedExercises = localStorage.getItem(`workoutExercises_${currentUser.id}`)
      if (savedExercises) {
        setExercises(JSON.parse(savedExercises))
      }
    }

    const handleWorkoutUpdate = (e: CustomEvent) => {
      const savedExercises = localStorage.getItem(`workoutExercises_${currentUser.id}`)
      if (savedExercises) {
        setExercises(JSON.parse(savedExercises))
      }
    }

    const handleGlobalPostsUpdate = () => {
      // ホームタブにグローバル投稿更新を通知
    }
    
    window.addEventListener('localStorageUpdate', handleCustomStorageChange as EventListener)
    window.addEventListener('workoutDataUpdated', handleWorkoutUpdate as EventListener)
    window.addEventListener('globalPostsUpdated', handleGlobalPostsUpdate)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('localStorageUpdate', handleCustomStorageChange as EventListener)
      window.removeEventListener('workoutDataUpdated', handleWorkoutUpdate as EventListener)
      window.removeEventListener('globalPostsUpdated', handleGlobalPostsUpdate)
    }
  }, [currentUser])

  // 認証チェック中は読み込み画面を表示
  if (isAuthChecking) {
    return (
      <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-br from-red-950 to-black items-center justify-center">
        <div className="text-center">
          <div className="h-16 w-16 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="h-8 w-8 text-white animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-red-400 mb-2">MuscleGram</h1>
          <p className="text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }

  // 未認証の場合は認証画面を表示
  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white text-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-4 md:p-6">
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-red-500">MuscleGram</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-red-300 hidden md:block">@{currentUser.username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
            className="text-red-300 hover:text-white hover:bg-red-800/50 flex items-center gap-1"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:block text-xs">検索</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-red-300 hover:text-white hover:bg-red-800/50"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* メインコンテンツ */}
      {viewingUser ? (
        // 他のユーザーのプロフィール表示
        <OtherProfileTab 
          targetUser={viewingUser}
          currentUser={currentUser}
          onBack={handleBackToMain}
        />
      ) : (
        // 通常のタブ表示
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          {/* Content */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <TabsContent value="home" className="h-full m-0 p-0">
              <HomeTab currentUser={currentUser} />
            </TabsContent>
            <TabsContent value="workout" className="h-full m-0 p-0">
              <WorkoutTab currentUser={currentUser} />
            </TabsContent>
            <TabsContent value="profile" className="h-full m-0 p-0">
              <ProfileTab currentUser={currentUser} />
            </TabsContent>
          </div>

          {/* Bottom Navigation */}
          <div className="flex-shrink-0 border-t border-red-800 bg-gradient-to-r from-red-800 to-red-950">
            <TabsList className="w-full bg-transparent h-10 md:h-11 lg:h-12">
              <TabsTrigger
                value="home"
                className={`flex-1 flex flex-col items-center justify-center space-y-0.5 data-[state=active]:text-red-500 data-[state=active]:bg-red-950/20`}
              >
                <Home size={16} className="md:w-4 md:h-4 lg:w-5 lg:h-5" />
                <span className="text-xs">ホーム</span>
              </TabsTrigger>
              <TabsTrigger
                value="workout"
                className={`flex-1 flex flex-col items-center justify-center space-y-0.5 data-[state=active]:text-red-500 data-[state=active]:bg-red-950/20`}
              >
                <Dumbbell size={16} className="md:w-4 md:h-4 lg:w-5 lg:h-5" />
                <span className="text-xs">記録</span>
                {exercises.length > 0 && (
                  <span className="text-xs text-red-400">({exercises.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className={`flex-1 flex flex-col items-center justify-center space-y-0.5 data-[state=active]:text-red-500 data-[state=active]:bg-red-950/20`}
              >
                <User size={16} className="md:w-4 md:h-4 lg:w-5 lg:h-5" />
                <span className="text-xs">マイページ</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      )}

      {/* ユーザー検索モーダル */}
      <UserSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentUser={currentUser}
        onUserClick={handleUserClick}
      />

    </div>
  )
}

interface Exercise {
  id: number
  name: string
  sets: Array<{
    weight: string
    reps: string
  }>
  timestamp: string
}
