"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageCircle, Send, Heart, Reply } from "lucide-react"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

interface Comment {
  id: string
  postId: string
  userId: string
  content: string
  timestamp: string
  user: {
    id: string
    displayName: string
    username: string
    avatar: string
  }
  likes: string[]
  parentId?: string
}

interface CommentsModalProps {
  isOpen: boolean
  onClose: () => void
  postId: string
  currentUser: UserAccount
  onUserClick: (user: UserAccount) => void
}

export function CommentsModal({ isOpen, onClose, postId, currentUser, onUserClick }: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // コメントを読み込み
  useEffect(() => {
    if (isOpen && postId) {
      loadComments()
    }
  }, [isOpen, postId])

  const loadComments = async () => {
    try {
      const { firestoreComments, firestoreUsers } = await import('@/lib/firestore-utils')
      
      // Firestoreからコメントを取得
      const firestoreCommentsList = await firestoreComments.getByPost(postId)
      
      // ユーザー情報を付加
      const commentsWithUsers = await Promise.all(
        firestoreCommentsList.map(async (comment) => {
          const user = await firestoreUsers.get(comment.userId)
          return {
            id: comment.id,
            postId: comment.postId,
            userId: comment.userId,
            content: comment.content,
            timestamp: comment.createdAt,
            user: user ? {
              id: user.id,
              displayName: user.displayName,
              username: user.username,
              avatar: user.avatar
            } : {
              id: comment.userId,
              displayName: 'Unknown User',
              username: 'unknown',
              avatar: 'https://ui-avatars.com/api/?name=Unknown&background=dc2626&color=ffffff&size=80'
            },
            likes: [], // 後で実装
            parentId: comment.parentId
          }
        })
      )
      
      setComments(commentsWithUsers)
    } catch (error) {
      console.error('Failed to load comments:', error)
      setComments([])
    }
  }

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const { firestoreComments, firestorePosts, firestoreNotifications } = await import('@/lib/firestore-utils')
      
      // Firestoreにコメントを保存
      const savedComment = await firestoreComments.add(postId, currentUser.id, newComment.trim())
      
      const newCommentObj: Comment = {
        id: savedComment.id,
        postId: savedComment.postId,
        userId: savedComment.userId,
        content: savedComment.content,
        timestamp: savedComment.createdAt,
        user: {
          id: currentUser.id,
          displayName: currentUser.displayName,
          username: currentUser.username,
          avatar: currentUser.avatar
        },
        likes: []
      }

      const updatedComments = [...comments, newCommentObj]
      setComments(updatedComments)
      
      // コメント数を更新するためのイベントを発火
      window.dispatchEvent(new CustomEvent('commentsUpdated', {
        detail: { postId, count: updatedComments.length }
      }))
      
      // 投稿者に通知を送信（自分の投稿以外の場合）
      try {
        const firebasePosts = await firestorePosts.getAll()
        const post = firebasePosts.find(p => p.id === postId)
        if (post && post.userId !== currentUser.id) {
          await firestoreNotifications.create({
            userId: post.userId, // 通知を受け取るユーザー（投稿者）
            fromUserId: currentUser.id, // 通知を発生させたユーザー（コメントした人）
            fromUserName: currentUser.displayName,
            fromUserAvatar: currentUser.avatar,
            type: 'comment',
            postId: postId,
            message: 'からコメントされました',
            isRead: false
          })
          
          // 通知更新イベントを発火
          window.dispatchEvent(new CustomEvent('notificationUpdated'))
        }
      } catch (notificationError) {
        console.error('Failed to create comment notification:', notificationError)
      }
      
      setNewComment("")
    } catch (error) {
      console.error('Failed to submit comment:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSubmitReply = async () => {
    if (!replyContent.trim() || !replyTo || isSubmitting) return

    setIsSubmitting(true)
    try {
      const replyId = `${currentUser.id}_${postId}_${Date.now()}_reply`
      const newReply: Comment = {
        id: replyId,
        postId,
        userId: currentUser.id,
        content: replyContent.trim(),
        timestamp: new Date().toLocaleString('ja-JP'),
        user: {
          id: currentUser.id,
          displayName: currentUser.displayName,
          username: currentUser.username,
          avatar: currentUser.avatar
        },
        likes: [],
        parentId: replyTo
      }

      const updatedComments = [...comments, newReply]
      setComments(updatedComments)
      
      // ローカルストレージに保存
      const commentsToSave = updatedComments.map(comment => ({
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        content: comment.content,
        timestamp: comment.timestamp,
        likes: comment.likes,
        parentId: comment.parentId
      }))
      localStorage.setItem(`comments_${postId}`, JSON.stringify(commentsToSave))
      
      // コメント数を更新
      window.dispatchEvent(new CustomEvent('commentsUpdated', {
        detail: { postId, count: updatedComments.length }
      }))
      
      setReplyContent("")
      setReplyTo(null)
    } catch (error) {
      console.error('Failed to submit reply:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLikeComment = (commentId: string) => {
    try {
      const updatedComments = comments.map(comment => {
        if (comment.id === commentId) {
          const isLiked = comment.likes.includes(currentUser.id)
          const newLikes = isLiked 
            ? comment.likes.filter(id => id !== currentUser.id)
            : [...comment.likes, currentUser.id]
          return { ...comment, likes: newLikes }
        }
        return comment
      })
      
      setComments(updatedComments)
      
      // ローカルストレージに保存
      const commentsToSave = updatedComments.map(comment => ({
        id: comment.id,
        postId: comment.postId,
        userId: comment.userId,
        content: comment.content,
        timestamp: comment.timestamp,
        likes: comment.likes,
        parentId: comment.parentId
      }))
      localStorage.setItem(`comments_${postId}`, JSON.stringify(commentsToSave))
    } catch (error) {
      console.error('Failed to like comment:', error)
    }
  }

  const handleUserClick = async (userId: string) => {
    try {
      const allUsers = JSON.parse(localStorage.getItem('musclegram_users') || '[]')
      const user = allUsers.find((u: UserAccount) => u.id === userId)
      if (user) {
        onUserClick(user)
        onClose()
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  // メインコメント（返信ではない）を取得
  const mainComments = comments.filter(comment => !comment.parentId)
  
  // 返信を取得する関数
  const getReplies = (parentId: string) => {
    return comments.filter(comment => comment.parentId === parentId)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-white via-gray-50 to-white border border-red-200/30 text-black max-w-2xl max-h-[80vh] overflow-hidden rounded-2xl shadow-2xl shadow-red-500/10 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-black">
            <MessageCircle className="h-5 w-5" />
            コメント ({comments.length})
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-[600px]">
          {/* コメント一覧 */}
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-4">
              {mainComments.length > 0 ? (
                mainComments.map((comment) => (
                  <div key={comment.id} className="space-y-2">
                    {/* メインコメント */}
                    <div className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                      <button
                        onClick={() => handleUserClick(comment.userId)}
                        className="cursor-pointer"
                      >
                        <Avatar className="h-10 w-10 border border-gray-300">
                          <AvatarImage src={comment.user.avatar} alt={comment.user.displayName} />
                          <AvatarFallback className="bg-gray-200 text-gray-700">
                            {comment.user.displayName.substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <button
                            onClick={() => handleUserClick(comment.userId)}
                            className="font-semibold text-sm text-black hover:underline"
                          >
                            {comment.user.displayName}
                          </button>
                          <span className="text-xs text-gray-500">@{comment.user.username}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{comment.timestamp}</span>
                        </div>
                        <p className="text-sm text-black mb-2">{comment.content}</p>
                        
                        {/* コメントアクション */}
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleLikeComment(comment.id)}
                            className={`flex items-center gap-1 text-xs transition-colors ${
                              comment.likes.includes(currentUser.id)
                                ? 'text-red-500'
                                : 'text-gray-500 hover:text-red-500'
                            }`}
                          >
                            <Heart className={`h-3 w-3 ${
                              comment.likes.includes(currentUser.id) ? 'fill-current' : ''
                            }`} />
                            <span>{comment.likes.length}</span>
                          </button>
                          <button
                            onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                            className="flex items-center gap-1 text-xs text-gray-500 hover:text-blue-500 transition-colors"
                          >
                            <Reply className="h-3 w-3" />
                            返信
                          </button>
                        </div>
                        
                        {/* 返信入力フォーム */}
                        {replyTo === comment.id && (
                          <div className="mt-3 pl-4 border-l-2 border-blue-200">
                            <div className="flex gap-2">
                              <Avatar className="h-8 w-8 border border-gray-300">
                                <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
                                <AvatarFallback className="bg-gray-200 text-gray-700">
                                  {currentUser.displayName.substring(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <Textarea
                                  value={replyContent}
                                  onChange={(e) => setReplyContent(e.target.value)}
                                  placeholder={`@${comment.user.username} に返信`}
                                  className="min-h-[60px] text-sm resize-none border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setReplyTo(null)
                                      setReplyContent("")
                                    }}
                                    className="text-xs"
                                  >
                                    キャンセル
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={handleSubmitReply}
                                    disabled={!replyContent.trim() || isSubmitting}
                                    className="text-xs bg-blue-600 hover:bg-blue-700"
                                  >
                                    <Send className="h-3 w-3 mr-1" />
                                    返信
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* 返信コメント */}
                    {getReplies(comment.id).map((reply) => (
                      <div key={reply.id} className="ml-8 flex gap-3 p-3 bg-blue-50 rounded-lg border-l-2 border-blue-200">
                        <button
                          onClick={() => handleUserClick(reply.userId)}
                          className="cursor-pointer"
                        >
                          <Avatar className="h-8 w-8 border border-gray-300">
                            <AvatarImage src={reply.user.avatar} alt={reply.user.displayName} />
                            <AvatarFallback className="bg-gray-200 text-gray-700">
                              {reply.user.displayName.substring(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <button
                              onClick={() => handleUserClick(reply.userId)}
                              className="font-semibold text-sm text-black hover:underline"
                            >
                              {reply.user.displayName}
                            </button>
                            <span className="text-xs text-gray-500">@{reply.user.username}</span>
                            <span className="text-xs text-gray-500">•</span>
                            <span className="text-xs text-gray-500">{reply.timestamp}</span>
                          </div>
                          <p className="text-sm text-black mb-2">{reply.content}</p>
                          
                          {/* 返信アクション */}
                          <div className="flex items-center gap-4">
                            <button
                              onClick={() => handleLikeComment(reply.id)}
                              className={`flex items-center gap-1 text-xs transition-colors ${
                                reply.likes.includes(currentUser.id)
                                  ? 'text-red-500'
                                  : 'text-gray-500 hover:text-red-500'
                              }`}
                            >
                              <Heart className={`h-3 w-3 ${
                                reply.likes.includes(currentUser.id) ? 'fill-current' : ''
                              }`} />
                              <span>{reply.likes.length}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm">まだコメントがありません</p>
                  <p className="text-xs mt-1">最初のコメントを投稿してみましょう</p>
                </div>
              )}
            </div>
          </ScrollArea>
          
          {/* コメント入力フォーム */}
          <div className="border-t border-gray-200 pt-4 mt-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 border border-gray-300">
                <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
                <AvatarFallback className="bg-gray-200 text-gray-700">
                  {currentUser.displayName.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="コメントを入力..."
                  className="min-h-[80px] resize-none border-gray-300 bg-white text-black focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? '投稿中...' : 'コメント'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}