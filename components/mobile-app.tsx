"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { firestoreNotifications } from "@/lib/firestore-utils"
import { HomeTab } from "@/components/home-tab"
import { WorkoutTab } from "@/components/workout-tab"
import { AnalyticsTab } from "@/components/analytics-tab"
import { ProfileTab } from "@/components/profile-tab"
import { FirebaseAuthScreen } from "@/components/firebase-auth-screen"
import { UserSearch } from "@/components/user-search"
import { OtherProfileTab } from "@/components/other-profile-tab"
import { NotificationsModal } from "@/components/notifications-modal"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, Dumbbell, User, Search, Bell, BarChart3 } from "lucide-react"
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

interface Exercise {
  id: number
  name: string
  sets: Array<{
    weight: string
    reps: string
  }>
  timestamp: string
  photo?: string
  memo?: string
}

export function MobileApp() {
  // ページリロード時にタブ状態を復元
  const getInitialTab = () => {
    try {
      if (typeof window !== 'undefined') {
        return localStorage.getItem('musclegram_activeTab') || "home"
      }
      return "home"
    } catch (error) {
      console.error('Error getting initial tab:', error)
      return "home"
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [isAuthChecking, setIsAuthChecking] = useState(true) // 認証チェック中
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<UserAccount | null>(null)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  
  // グローバルないいね・コメント状態
  const [globalLikesCount, setGlobalLikesCount] = useState<{[postId: string]: number}>({})
  const [globalUserLikes, setGlobalUserLikes] = useState<Set<string>>(new Set())
  const [globalCommentsCount, setGlobalCommentsCount] = useState<{[postId: string]: number}>({})

  // Firebase認証状態の監視
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthChecking(true)
      
      if (firebaseUser) {
        try {
          // Firestoreからユーザー情報を取得
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
          
          if (userDoc.exists()) {
            const userData = userDoc.data()
            const userAccount: UserAccount = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: userData.displayName || firebaseUser.displayName || '',
              username: userData.username || '',
              bio: userData.bio || '',
              avatar: userData.avatar || firebaseUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userData.displayName || firebaseUser.displayName || '新規ユーザー') + '&background=dc2626&color=ffffff&size=80',
              createdAt: userData.createdAt || new Date().toISOString()
            }
            setCurrentUser(userAccount)
            // 通知数も読み込み
            loadUnreadNotificationCount(userAccount.id)
          } else {
            // ユーザードキュメントが存在しない場合は新規作成
            const newUserAccount: UserAccount = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'ユーザー',
              username: firebaseUser.email?.split('@')[0] || 'user',
              bio: '',
              avatar: firebaseUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(firebaseUser.displayName || 'ユーザー') + '&background=dc2626&color=ffffff&size=80',
              createdAt: new Date().toISOString()
            }
            
            // Firestoreにユーザー情報を保存
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              displayName: newUserAccount.displayName,
              username: newUserAccount.username,
              bio: newUserAccount.bio,
              avatar: newUserAccount.avatar,
              email: newUserAccount.email,
              createdAt: newUserAccount.createdAt,
              updatedAt: new Date().toISOString()
            })
            
            setCurrentUser(newUserAccount)
          }
        } catch (error) {
          console.error('Error loading user data:', error)
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
      
      setIsAuthChecking(false)
    })

    return () => unsubscribe()
  }, [])

  // プロフィール更新イベントの監視
  useEffect(() => {
    const handleProfileUpdate = (e: CustomEvent) => {
      const updatedProfile = e.detail
      if (currentUser) {
        const updatedUser: UserAccount = {
          ...currentUser,
          displayName: updatedProfile.displayName,
          username: updatedProfile.username,
          bio: updatedProfile.bio,
          avatar: updatedProfile.avatar
        }
        setCurrentUser(updatedUser)
      }
    }

    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener)
    
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener)
    }
  }, [currentUser])

  // グローバルないいね状態更新関数
  const updateGlobalLikeState = (postId: string, isLiked: boolean, likesCount: number) => {
    setGlobalUserLikes(prev => {
      const newSet = new Set(prev)
      if (isLiked) {
        newSet.add(postId)
      } else {
        newSet.delete(postId)
      }
      return newSet
    })
    setGlobalLikesCount(prev => ({
      ...prev,
      [postId]: likesCount
    }))
  }

  // グローバルなコメント数更新関数
  const updateGlobalCommentsCount = (postId: string, count: number) => {
    setGlobalCommentsCount(prev => ({
      ...prev,
      [postId]: count
    }))
  }

  // ユーザー固有のデータを読み込む（Firebase移行により簡略化）
  const loadUserData = (userId: string) => {
    // Firebase移行により、運動データもFirestoreに移行済み
    setExercises([])
  }

  // 未読通知数を読み込む
  const loadUnreadNotificationCount = async (userId: string) => {
    try {
      const count = await firestoreNotifications.getUnreadCount(userId)
      setUnreadNotificationCount(count)
    } catch (error) {
      console.error('Failed to load unread notification count:', error)
      setUnreadNotificationCount(0)
    }
  }

  // 認証成功時の処理
  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user)
    loadUserData(user.id)
    loadUnreadNotificationCount(user.id)
  }

  // ログアウト処理
  const handleLogout = async () => {
    try {
      await signOut(auth)
      setCurrentUser(null)
      setExercises([])
      setActiveTab("home")
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // ユーザークリック処理
  const handleUserClick = (user: UserAccount) => {
    setViewingUser(user)
  }


  // プロフィール表示から戻る処理
  const handleBackToMain = () => {
    setViewingUser(null)
  }

  // 通知ボタンクリック処理
  const handleNotificationClick = () => {
    setIsNotificationsOpen(true)
    setUnreadNotificationCount(0) // カウントをリセット
  }

  // 通知更新リスナー
  useEffect(() => {
    const handleNotificationUpdate = () => {
      if (currentUser) {
        loadUnreadNotificationCount(currentUser.id)
      }
    }

    window.addEventListener('notificationUpdated', handleNotificationUpdate)
    
    return () => {
      window.removeEventListener('notificationUpdated', handleNotificationUpdate)
    }
  }, [currentUser])



  // スクロール監視でヘッダー表示制御
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      if (currentScrollY < lastScrollY || currentScrollY <= 100) {
        // 上にスクロールまたは上部にいる場合はヘッダーを表示
        setHeaderVisible(true)
      } else {
        // 下にスクロールしている場合はヘッダーを隠す
        setHeaderVisible(false)
      }
      
      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY])

  // Firebase移行により、LocalStorageイベント監視は不要


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

  // 未認証の場合はFirebase認証画面を表示
  if (!currentUser) {
    return <FirebaseAuthScreen onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-white text-black">
      {/* メインコンテンツ - フル高さでスクロール可能 */}
      {viewingUser ? (
        // 他のユーザーのプロフィール表示
        <div className="flex-1 overflow-y-auto" style={{maxHeight: 'calc(100vh - 64px)'}}>
          {/* Header */}
          <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
            headerVisible ? 'translate-y-0' : '-translate-y-full'
          } flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4`}>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
              >
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNotificationClick}
                  className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                >
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                {unreadNotificationCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </div>
                )}
              </div>
            </div>
          </div>
          <OtherProfileTab 
            targetUser={viewingUser}
            currentUser={currentUser}
            onBack={handleBackToMain}
          />
        </div>
      ) : (
        // 通常のタブ表示
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value)
          localStorage.setItem('musclegram_activeTab', value)
        }} className="flex flex-col flex-1">
          {/* Content - フル高さでスクロール可能 */}
          <div className="flex-1 overflow-y-auto pb-16" style={{maxHeight: 'calc(100vh - 64px)'}}>
            <TabsContent value="home" className="m-0 p-0">
              {/* Header */}
              <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
                headerVisible ? 'translate-y-0' : '-translate-y-full'
              } flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4`}>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotificationClick}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-16">
                <HomeTab 
                  currentUser={currentUser} 
                  globalLikesCount={globalLikesCount}
                  globalUserLikes={globalUserLikes}
                  globalCommentsCount={globalCommentsCount}
                  onLikeUpdate={updateGlobalLikeState}
                  onCommentUpdate={updateGlobalCommentsCount}
                />
              </div>
            </TabsContent>
            <TabsContent value="workout" className="m-0 p-0">
              {/* Header */}
              <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
                headerVisible ? 'translate-y-0' : '-translate-y-full'
              } flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4`}>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotificationClick}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-16">
                <WorkoutTab currentUser={currentUser} />
              </div>
            </TabsContent>
            <TabsContent value="analytics" className="m-0 p-0">
              {/* Header */}
              <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
                headerVisible ? 'translate-y-0' : '-translate-y-full'
              } flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4`}>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotificationClick}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-16">
                <AnalyticsTab currentUser={currentUser} />
              </div>
            </TabsContent>
            <TabsContent value="profile" className="m-0 p-0">
              {/* Header */}
              <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
                headerVisible ? 'translate-y-0' : '-translate-y-full'
              } flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4`}>
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotificationClick}
                      className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 p-2"
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-16">
                <ProfileTab 
                  currentUser={currentUser}
                  globalLikesCount={globalLikesCount}
                  globalUserLikes={globalUserLikes}
                  globalCommentsCount={globalCommentsCount}
                  onLikeUpdate={updateGlobalLikeState}
                  onCommentUpdate={updateGlobalCommentsCount}
                  onLogout={handleLogout}
                />
              </div>
            </TabsContent>
          </div>

        </Tabs>
      )}

      {/* 下部ナビゲーション */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-r from-red-950 to-red-800 border-t border-red-800 h-16">
        <div className="flex h-full">
          <button
            onClick={() => {
              setActiveTab("home")
              setViewingUser(null)
              localStorage.setItem('musclegram_activeTab', 'home')
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-white transition-colors ${
              activeTab === "home" ? "bg-red-700" : "hover:bg-red-800"
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-xs font-medium">ホーム</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("workout")
              setViewingUser(null)
              localStorage.setItem('musclegram_activeTab', 'workout')
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-white transition-colors ${
              activeTab === "workout" ? "bg-red-700" : "hover:bg-red-800"
            }`}
          >
            <Dumbbell className="h-5 w-5" />
            <span className="text-xs font-medium">記録</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("analytics")
              setViewingUser(null)
              localStorage.setItem('musclegram_activeTab', 'analytics')
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-white transition-colors ${
              activeTab === "analytics" ? "bg-red-700" : "hover:bg-red-800"
            }`}
          >
            <BarChart3 className="h-5 w-5" />
            <span className="text-xs font-medium">分析</span>
          </button>
          <button
            onClick={() => {
              setActiveTab("profile")
              setViewingUser(null)
              localStorage.setItem('musclegram_activeTab', 'profile')
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 text-white transition-colors ${
              activeTab === "profile" ? "bg-red-700" : "hover:bg-red-800"
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-xs font-medium">マイページ</span>
          </button>
        </div>
      </div>

      {/* ユーザー検索モーダル */}
      <UserSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        currentUser={currentUser}
        onUserClick={handleUserClick}
      />

      {/* 通知モーダル */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        currentUser={currentUser}
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
