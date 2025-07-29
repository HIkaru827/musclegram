import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  setDoc
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import { 
  FirestoreUser, 
  FirestorePost, 
  FirestoreLike, 
  FirestoreComment, 
  FirestoreFollow, 
  COLLECTIONS 
} from "@/lib/firestore-schema"

// ユーザー関連操作
export const firestoreUsers = {
  // ユーザー作成
  async create(userData: Omit<FirestoreUser, 'createdAt' | 'updatedAt'>) {
    const docRef = doc(db, COLLECTIONS.USERS, userData.id)
    const now = new Date().toISOString()
    
    const user: FirestoreUser = {
      ...userData,
      createdAt: now,
      updatedAt: now
    }
    
    await setDoc(docRef, user as any)
    return user
  },

  // ユーザー取得
  async get(userId: string): Promise<FirestoreUser | null> {
    const docRef = doc(db, COLLECTIONS.USERS, userId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreUser
    }
    return null
  },

  // ユーザー更新
  async update(userId: string, updateData: Partial<FirestoreUser>) {
    const docRef = doc(db, COLLECTIONS.USERS, userId)
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: new Date().toISOString()
    })
  }
}

// 投稿関連操作
export const firestorePosts = {
  // 投稿作成
  async create(postData: Omit<FirestorePost, 'id' | 'createdAt' | 'updatedAt'>) {
    const collectionRef = collection(db, COLLECTIONS.POSTS)
    const now = new Date().toISOString()
    
    const post: Omit<FirestorePost, 'id'> = {
      ...postData,
      createdAt: now,
      updatedAt: now
    }
    
    const docRef = await addDoc(collectionRef, post)
    return { ...post, id: docRef.id } as FirestorePost
  },

  // 全投稿取得（最新順）
  async getAll(limitCount: number = 50): Promise<FirestorePost[]> {
    const q = query(
      collection(db, COLLECTIONS.POSTS),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestorePost[]
  },

  // ユーザーの投稿取得（インデックス不要版）
  async getByUser(userId: string): Promise<FirestorePost[]> {
    const q = query(
      collection(db, COLLECTIONS.POSTS),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    const posts = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestorePost[]
    
    // クライアント側でソート
    return posts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  // フォロー中ユーザーの投稿取得
  async getByFollowing(userIds: string[]): Promise<FirestorePost[]> {
    if (userIds.length === 0) return []
    
    const q = query(
      collection(db, COLLECTIONS.POSTS),
      where('userId', 'in', userIds),
      orderBy('createdAt', 'desc')
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestorePost[]
  },

  // 投稿削除
  async delete(postId: string) {
    const docRef = doc(db, COLLECTIONS.POSTS, postId)
    await deleteDoc(docRef)
  },

  // リアルタイム監視
  onSnapshot(callback: (posts: FirestorePost[]) => void) {
    const q = query(
      collection(db, COLLECTIONS.POSTS),
      orderBy('createdAt', 'desc'),
      limit(50)
    )
    
    return onSnapshot(q, (querySnapshot) => {
      const posts = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FirestorePost[]
      callback(posts)
    })
  }
}

// いいね関連操作
export const firestoreLikes = {
  // いいね追加
  async add(postId: string, userId: string) {
    const collectionRef = collection(db, COLLECTIONS.LIKES)
    const like: Omit<FirestoreLike, 'id'> = {
      postId,
      userId,
      createdAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collectionRef, like)
    return { ...like, id: docRef.id } as FirestoreLike
  },

  // いいね削除
  async remove(postId: string, userId: string) {
    const q = query(
      collection(db, COLLECTIONS.LIKES),
      where('postId', '==', postId),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    querySnapshot.docs.forEach(async (doc) => {
      await deleteDoc(doc.ref)
    })
  },

  // 投稿のいいね取得
  async getByPost(postId: string): Promise<FirestoreLike[]> {
    const q = query(
      collection(db, COLLECTIONS.LIKES),
      where('postId', '==', postId)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreLike[]
  }
}

// フォロー関連操作
export const firestoreFollows = {
  // フォロー追加
  async add(followerId: string, followingId: string) {
    const collectionRef = collection(db, COLLECTIONS.FOLLOWS)
    const follow: Omit<FirestoreFollow, 'id'> = {
      followerId,
      followingId,
      createdAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collectionRef, follow)
    return { ...follow, id: docRef.id } as FirestoreFollow
  },

  // フォロー削除
  async remove(followerId: string, followingId: string) {
    const q = query(
      collection(db, COLLECTIONS.FOLLOWS),
      where('followerId', '==', followerId),
      where('followingId', '==', followingId)
    )
    
    const querySnapshot = await getDocs(q)
    querySnapshot.docs.forEach(async (doc) => {
      await deleteDoc(doc.ref)
    })
  },

  // フォロワー取得
  async getFollowers(userId: string): Promise<string[]> {
    const q = query(
      collection(db, COLLECTIONS.FOLLOWS),
      where('followingId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => doc.data().followerId)
  },

  // フォロー中取得
  async getFollowing(userId: string): Promise<string[]> {
    const q = query(
      collection(db, COLLECTIONS.FOLLOWS),
      where('followerId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => doc.data().followingId)
  }
}

// コメント関連操作
export const firestoreComments = {
  // コメント追加
  async add(postId: string, userId: string, content: string, parentId?: string) {
    const collectionRef = collection(db, COLLECTIONS.COMMENTS)
    const comment: Omit<FirestoreComment, 'id'> = {
      postId,
      userId,
      content,
      parentId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    const docRef = await addDoc(collectionRef, comment)
    return { ...comment, id: docRef.id } as FirestoreComment
  },

  // 投稿のコメント取得
  async getByPost(postId: string): Promise<FirestoreComment[]> {
    const q = query(
      collection(db, COLLECTIONS.COMMENTS),
      where('postId', '==', postId),
      orderBy('createdAt', 'asc')
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreComment[]
  },

  // コメント削除
  async delete(commentId: string) {
    const docRef = doc(db, COLLECTIONS.COMMENTS, commentId)
    await deleteDoc(docRef)
  }
}