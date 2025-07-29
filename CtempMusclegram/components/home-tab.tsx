"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Heart, MessageCircle, Share2, Dumbbell } from "lucide-react"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

export function HomeTab({ currentUser }: { currentUser: UserAccount }) {
  const [activeTab, setActiveTab] = useState("all")
  const [globalPosts, setGlobalPosts] = useState<Post[]>([])
  const [followingPosts, setFollowingPosts] = useState<Post[]>([])
  const [userProfile, setUserProfile] = useState({
    avatar: currentUser.avatar,
    displayName: currentUser.displayName,
    username: currentUser.username,
  })

  // ローカルストレージからトレーニングデータを読み込んで投稿として表示
  useEffect(() => {
    const loadGlobalPosts = () => {
      const savedPosts = localStorage.getItem('musclegram_global_posts')
      
      if (savedPosts) {
        const posts = JSON.parse(savedPosts)
        
        const formattedPosts = posts.map((post: any) => ({
          id: post.id,
          user: {
            name: post.user.name,
            avatar: post.user.avatar,
            username: post.user.username,
          },
          content: post.content,
          workout: {
            type: post.exercise.name,
            details: post.exercise.sets.map((set: any, index: number) => 
              `セット${index + 1}: ${set.weight}kg × ${set.reps}回`
            ).join('\n'),
          },
          image: post.exercise.photo || undefined,
          likes: Math.floor(Math.random() * 20) + 5,
          comments: Math.floor(Math.random() * 8) + 1,
          time: post.timestamp || "先ほど",
        }))
        
        setGlobalPosts(formattedPosts)

        // フォロー中のユーザーの投稿をフィルタ
        loadFollowingPosts(posts)
      } else {
        setGlobalPosts([])
        setFollowingPosts([])
      }
    }

    const loadFollowingPosts = (posts: any[]) => {
      try {
        const following = JSON.parse(localStorage.getItem(`musclegram_following_${currentUser.id}`) || '[]')
        
        // フォロー中のユーザーの投稿のみをフィルタ
        const followingUserPosts = posts.filter((post: any) => 
          following.includes(post.userId)
        )

        const formattedFollowingPosts = followingUserPosts.map((post: any) => ({
          id: post.id,
          user: {
            name: post.user.name,
            avatar: post.user.avatar,
            username: post.user.username,
          },
          content: post.content,
          workout: {
            type: post.exercise.name,
            details: post.exercise.sets.map((set: any, index: number) => 
              `セット${index + 1}: ${set.weight}kg × ${set.reps}回`
            ).join('\n'),
          },
          image: post.exercise.photo || undefined,
          likes: Math.floor(Math.random() * 20) + 5,
          comments: Math.floor(Math.random() * 8) + 1,
          time: post.timestamp || "先ほど",
        }))

        setFollowingPosts(formattedFollowingPosts)
      } catch (error) {
        console.error('Failed to load following posts:', error)
        setFollowingPosts([])
      }
    }

    loadGlobalPosts()

    // プロフィールデータの読み込み
    const loadUserProfile = () => {
      const savedProfile = localStorage.getItem('userProfile')
      if (savedProfile) {
        const profile = JSON.parse(savedProfile)
        setUserProfile({
          avatar: profile.avatar,
          displayName: profile.displayName,
          username: profile.username,
        })
      }
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
    }

    window.addEventListener('globalPostsUpdated', handleGlobalPostsUpdate)
    window.addEventListener('userProfileUpdated', handleProfileUpdate as EventListener)
    window.addEventListener('followingUpdated', handleFollowingUpdate)

    return () => {
      window.removeEventListener('globalPostsUpdated', handleGlobalPostsUpdate)
      window.removeEventListener('userProfileUpdated', handleProfileUpdate as EventListener)
      window.removeEventListener('followingUpdated', handleFollowingUpdate)
    }
  }, [])

  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full h-full flex flex-col">
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
                        <Avatar className="h-10 w-10 border border-red-500">
                          <AvatarImage src={post.user.avatar} alt={post.user.name} />
                          <AvatarFallback className="bg-red-950 text-red-200">
                            {post.user.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
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
                        <div className="flex items-center gap-2 mb-2">
                          <Dumbbell className="h-4 w-4 text-red-400" />
                          <span className="font-medium text-sm text-black">
                            {post.content}
                          </span>
                        </div>
                        
                        {/* セット詳細 */}
                        {post.workout && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3 border">
                            <div className="text-xs text-gray-600 mb-2 font-medium">トレーニング詳細</div>
                            <div className="space-y-1">
                              {post.workout.details.split('\n').map((detail, index) => (
                                <div key={index} className="text-xs text-gray-700">{detail}</div>
                              ))}
                            </div>
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
                        <button className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
                          <Heart className="h-4 w-4" />
                          <span className="text-xs">{post.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{post.comments}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
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
                        <Avatar className="h-10 w-10 border border-red-500">
                          <AvatarImage src={post.user.avatar} alt={post.user.name} />
                          <AvatarFallback className="bg-red-950 text-red-200">
                            {post.user.name.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
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
                        <div className="flex items-center gap-2 mb-2">
                          <Dumbbell className="h-4 w-4 text-red-400" />
                          <span className="font-medium text-sm text-black">
                            {post.content}
                          </span>
                        </div>
                        
                        {/* セット詳細 */}
                        {post.workout && (
                          <div className="bg-gray-50 rounded-lg p-3 mb-3 border">
                            <div className="text-xs text-gray-600 mb-2 font-medium">トレーニング詳細</div>
                            <div className="space-y-1">
                              {post.workout.details.split('\n').map((detail, index) => (
                                <div key={index} className="text-xs text-gray-700">{detail}</div>
                              ))}
                            </div>
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
                        <button className="flex items-center gap-1 text-gray-500 hover:text-red-500 transition-colors">
                          <Heart className="h-4 w-4" />
                          <span className="text-xs">{post.likes}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-blue-500 transition-colors">
                          <MessageCircle className="h-4 w-4" />
                          <span className="text-xs">{post.comments}</span>
                        </button>
                        <button className="flex items-center gap-1 text-gray-500 hover:text-green-500 transition-colors">
                          <Share2 className="h-4 w-4" />
                        </button>
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
    </div>
  )
}

interface Post {
  id: string
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
  image?: string
  likes: number
  comments: number
  time: string
}