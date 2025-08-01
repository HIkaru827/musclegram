// Firestoreデータ構造の定義

export interface FirestoreUser {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
  updatedAt: string
}

export interface FirestorePost {
  id: string
  userId: string
  content: string
  exercise: {
    id: number
    name: string
    sets: Array<{
      weight: string
      reps: string
    }>
    memo?: string
    photo?: string
  }
  timestamp: string
  createdAt: string
  updatedAt: string
}

export interface FirestoreLike {
  id: string
  postId: string
  userId: string
  createdAt: string
}

export interface FirestoreComment {
  id: string
  postId: string
  userId: string
  content: string
  parentId?: string
  createdAt: string
  updatedAt: string
}

export interface FirestoreFollow {
  id: string
  followerId: string  // フォローする人
  followingId: string // フォローされる人
  createdAt: string
}

export interface FirestoreCustomExercise {
  id: string
  userId: string
  bodyPart: string
  exerciseName: string
  createdAt: string
  updatedAt: string
}

export interface FirestoreNotification {
  id: string
  userId: string // 通知を受け取るユーザー
  fromUserId: string // 通知を発生させたユーザー
  fromUserName: string // 通知を発生させたユーザーの表示名
  fromUserAvatar: string // 通知を発生させたユーザーのアバター
  type: 'like' | 'follow' | 'comment'
  postId?: string // いいねやコメントの場合の投稿ID
  message: string // 通知メッセージ
  isRead: boolean // 既読フラグ
  createdAt: string
}

export interface FirestoreDaysGoal {
  id: string
  userId: string
  monthlyTarget: number
  createdAt: string
  updatedAt: string
}

// Firestoreコレクション名
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  LIKES: 'likes',
  COMMENTS: 'comments',
  FOLLOWS: 'follows',
  CUSTOM_EXERCISES: 'custom_exercises',
  NOTIFICATIONS: 'notifications',
  DAYS_GOALS: 'days_goals'
} as const