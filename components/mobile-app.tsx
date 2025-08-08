"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
// import { firestoreNotifications } from "@/lib/firestore-utils" // まだ無効のまま
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

  // グローバルなPromise rejectionハンドラー
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason)
      // 本番環境ではユーザーに優しいエラーメッセージを表示
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error details:', event.reason)
      }
      // エラーを防ぐ
      event.preventDefault()
    }

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error)
      // 本番環境ではユーザーに優しいエラーメッセージを表示
      if (process.env.NODE_ENV === 'development') {
        console.error('Full error details:', event.error)
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // Firebase認証状態の監視
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null
    let unsubscribe: (() => void) | null = null
    
    console.log('Initializing Firebase auth...')
    
    // 15秒後に強制的にローディングを終了（フォールバック）
    timeoutId = setTimeout(() => {
      console.warn('Authentication check timed out, using offline mode...')
      // タイムアウト時はダミーユーザーを設定
      const fallbackUser: UserAccount = {
        id: 'offline-user',
        email: 'offline@example.com',
        displayName: 'オフラインユーザー',
        username: 'offline',
        bio: 'オフラインモードで使用中',
        avatar: 'https://ui-avatars.com/api/?name=オフライン&background=dc2626&color=ffffff&size=80',
        createdAt: new Date().toISOString()
      }
      setCurrentUser(fallbackUser)
      setIsAuthChecking(false)
    }, 15000)
    
    try {
      unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        console.log('Auth state changed:', firebaseUser ? 'User logged in' : 'No user')
        
        // タイムアウトをクリア
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        
        try {
          if (firebaseUser) {
            console.log('Loading user data from Firestore...')
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
            
            if (userDoc.exists()) {
              const userData = userDoc.data()
              const userAccount: UserAccount = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: userData.displayName || firebaseUser.displayName || '',
                username: userData.username || firebaseUser.email?.split('@')[0] || 'user',
                bio: userData.bio || '',
                avatar: userData.avatar || firebaseUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(userData.displayName || firebaseUser.displayName || '新規ユーザー') + '&background=dc2626&color=ffffff&size=80',
                createdAt: userData.createdAt || new Date().toISOString()
              }
              setCurrentUser(userAccount)
              console.log('User data loaded successfully')
            } else {
              console.log('Creating new user document...')
              const newUserAccount: UserAccount = {
                id: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || 'ユーザー',
                username: firebaseUser.email?.split('@')[0] || 'user',
                bio: '',
                avatar: firebaseUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(firebaseUser.displayName || 'ユーザー') + '&background=dc2626&color=ffffff&size=80',
                createdAt: new Date().toISOString()
              }
              
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
              console.log('New user created successfully')
            }
          } else {
            console.log('No user authenticated')
            setCurrentUser(null)
          }
        } catch (error) {
          console.error('Error in authentication flow:', error)
          setCurrentUser(null)
        }
        
        setIsAuthChecking(false)
      }, (error) => {
        console.error('Firebase auth state change error:', error)
        setIsAuthChecking(false)
        setCurrentUser(null)
      })
    } catch (error) {
      console.error('Failed to initialize Firebase auth:', error)
      // 初期化に失敗した場合はオフラインモードに
      const offlineUser: UserAccount = {
        id: 'offline-user',
        email: 'offline@example.com',
        displayName: 'オフラインユーザー',
        username: 'offline',
        bio: 'Firebase接続エラーのため、オフラインモードで使用中',
        avatar: 'https://ui-avatars.com/api/?name=オフライン&background=dc2626&color=ffffff&size=80',
        createdAt: new Date().toISOString()
      }
      setCurrentUser(offlineUser)
      setIsAuthChecking(false)
    }

    return () => {
      if (unsubscribe) unsubscribe()
      if (timeoutId) clearTimeout(timeoutId)
    }
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
    // 一時的に無効化
    console.log('Notification loading disabled for debugging')
    setUnreadNotificationCount(0)
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
      console.log('Logout successful')
    } catch (error) {
      console.error('Logout error:', error)
      // エラーが発生してもログアウト状態にする
      setCurrentUser(null)
      setExercises([])
      setActiveTab("home")
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
      <div className="flex flex-col h-full w-full overflow-hidden bg-gradient-to-br from-slate-900 via-red-950 to-black items-center justify-center relative">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="text-center relative z-10">
          <div className="h-20 w-20 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-red-500/25 animate-bounce">
            <Dumbbell className="h-10 w-10 text-white animate-pulse" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent mb-3">MuscleGram</h1>
          <div className="flex items-center gap-2 justify-center mb-4">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent"></div>
            <p className="text-gray-300 text-sm">読み込み中...</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">認証状態を確認しています</p>
            <button 
              onClick={() => {
                console.log('Force skip loading...')
                setIsAuthChecking(false)
              }}
              className="text-xs text-red-400 hover:text-red-300 underline"
            >
              読み込みをスキップ
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 未認証の場合はFirebase認証画面を表示
  if (!currentUser) {
    return <FirebaseAuthScreen onAuthSuccess={handleAuthSuccess} />
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 to-white text-black">
      {/* メインコンテンツ - フル高さでスクロール可能 */}
      {viewingUser ? (
        // 他のユーザーのプロフィール表示
        <div className="flex-1 overflow-y-auto" style={{maxHeight: 'calc(100vh - 64px)'}}>
          {/* Header */}
          <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
            headerVisible ? 'translate-y-0' : '-translate-y-full'
          } flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4`}>
            <div>
              <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">MuscleGram</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(true)}
                className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
              >
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNotificationClick}
                  className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                >
                  <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
                {unreadNotificationCount > 0 && (
                  <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
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
          // タブ切り替え時にワークアウトデータを再読み込み
          if (value === 'workout') {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
            }, 100)
          }
        }} className="flex flex-col flex-1">
          {/* Content - フル高さでスクロール可能 */}
          <div className="flex-1 overflow-y-auto pb-20" style={{maxHeight: 'calc(100vh - 64px)'}}>
            <TabsContent value="home" className="m-0 p-0">
              {/* Header */}
              <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${
                headerVisible ? 'translate-y-0' : '-translate-y-full'
              } flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4`}>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotificationClick}
                      className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
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
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotificationClick}
                      className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
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
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotificationClick}
                      className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
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
                  <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-red-600 to-red-800 bg-clip-text text-transparent">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                  </Button>
                  <div className="relative">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNotificationClick}
                      className="bg-transparent hover:bg-red-600/20 text-white border-none transition-all duration-300 hover:scale-105 p-2 rounded-xl"
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                    </Button>
                    {unreadNotificationCount > 0 && (
                      <div className="absolute -top-1 -right-1 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold shadow-lg animate-pulse">
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
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-red-200/30 shadow-2xl shadow-red-500/10 h-20">
        <div className="flex h-full">
          <button
            onClick={() => {
              setActiveTab("home")
              setViewingUser(null)
              localStorage.setItem('musclegram_activeTab', 'home')
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              activeTab === "home" 
                ? "text-red-600 bg-gradient-to-t from-red-50 to-transparent scale-105" 
                : "text-gray-500 hover:text-red-500 hover:bg-red-50/50 hover:scale-105"
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
              // ワークアウトタブに切り替えた時にデータを再読み込み
              setTimeout(() => {
                window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
              }, 100)
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              activeTab === "workout" 
                ? "text-red-600 bg-gradient-to-t from-red-50 to-transparent scale-105" 
                : "text-gray-500 hover:text-red-500 hover:bg-red-50/50 hover:scale-105"
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
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              activeTab === "analytics" 
                ? "text-red-600 bg-gradient-to-t from-red-50 to-transparent scale-105" 
                : "text-gray-500 hover:text-red-500 hover:bg-red-50/50 hover:scale-105"
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
            className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all duration-300 ${
              activeTab === "profile" 
                ? "text-red-600 bg-gradient-to-t from-red-50 to-transparent scale-105" 
                : "text-gray-500 hover:text-red-500 hover:bg-red-50/50 hover:scale-105"
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
