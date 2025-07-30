"use client"

import { useState, useEffect } from "react"
import { onAuthStateChanged, signOut } from "firebase/auth"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { HomeTab } from "@/components/home-tab"
import { WorkoutTab } from "@/components/workout-tab"
import { ProfileTab } from "@/components/profile-tab"
import { FirebaseAuthScreen } from "@/components/firebase-auth-screen"
import { UserSearch } from "@/components/user-search"
import { OtherProfileTab } from "@/components/other-profile-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Home, Dumbbell, User, Search } from "lucide-react"
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
  const [isAuthChecking, setIsAuthChecking] = useState(true) // 認証チェック中
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [viewingUser, setViewingUser] = useState<UserAccount | null>(null)
  
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

  // 認証成功時の処理
  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user)
    loadUserData(user.id)
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
          <div className="flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4">
            <div>
              <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsSearchOpen(true)}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-2"
              >
                <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">ユーザー検索</span>
              </Button>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1">
          {/* Content - フル高さでスクロール可能 */}
          <div className="flex-1 overflow-y-auto" style={{maxHeight: 'calc(100vh - 64px)'}}>
            <TabsContent value="home" className="m-0 p-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-2"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">ユーザー検索</span>
                  </Button>
                </div>
              </div>
              <HomeTab 
                currentUser={currentUser} 
                globalLikesCount={globalLikesCount}
                globalUserLikes={globalUserLikes}
                globalCommentsCount={globalCommentsCount}
                onLikeUpdate={updateGlobalLikeState}
                onCommentUpdate={updateGlobalCommentsCount}
              />
            </TabsContent>
            <TabsContent value="workout" className="m-0 p-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-2"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">ユーザー検索</span>
                  </Button>
                </div>
              </div>
              <WorkoutTab currentUser={currentUser} />
            </TabsContent>
            <TabsContent value="profile" className="m-0 p-0">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-red-800 bg-gradient-to-r from-red-950 to-red-800 p-3 sm:p-4">
                <div>
                  <h1 className="text-base sm:text-lg font-bold text-red-500">MuscleGram</h1>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSearchOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white border-red-600 hover:border-red-700 flex items-center gap-2 px-2 py-1 sm:px-3 sm:py-2"
                  >
                    <Search className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">ユーザー検索</span>
                  </Button>
                </div>
              </div>
              <ProfileTab 
                currentUser={currentUser}
                globalLikesCount={globalLikesCount}
                globalUserLikes={globalUserLikes}
                globalCommentsCount={globalCommentsCount}
                onLikeUpdate={updateGlobalLikeState}
                onCommentUpdate={updateGlobalCommentsCount}
                onLogout={handleLogout}
              />
            </TabsContent>
          </div>

          {/* Bottom Navigation - 固定・大きく */}
          <div className="flex-shrink-0 border-t border-red-800 bg-gradient-to-r from-red-800 to-red-950 safe-area-inset-bottom">
            <TabsList className="w-full bg-transparent h-16 sm:h-18 md:h-20">
              <TabsTrigger
                value="home"
                className="flex-1 flex flex-col items-center justify-center gap-1 data-[state=active]:text-red-400 data-[state=active]:bg-red-950/30 text-red-200"
              >
                <Home size={20} className="sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm font-medium">ホーム</span>
              </TabsTrigger>
              <TabsTrigger
                value="workout"
                className="flex-1 flex flex-col items-center justify-center gap-1 data-[state=active]:text-red-400 data-[state=active]:bg-red-950/30 text-red-200"
              >
                <Dumbbell size={20} className="sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm font-medium">記録</span>
                {exercises.length > 0 && (
                  <span className="text-xs text-red-400">({exercises.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="flex-1 flex flex-col items-center justify-center gap-1 data-[state=active]:text-red-400 data-[state=active]:bg-red-950/30 text-red-200"
              >
                <User size={20} className="sm:w-6 sm:h-6" />
                <span className="text-xs sm:text-sm font-medium">マイページ</span>
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
