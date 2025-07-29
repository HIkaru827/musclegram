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

// Firestoreコレクション名
export const COLLECTIONS = {
  USERS: 'users',
  POSTS: 'posts',
  LIKES: 'likes',
  COMMENTS: 'comments',
  FOLLOWS: 'follows'
} as const