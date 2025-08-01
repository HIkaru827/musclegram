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
  FirestoreCustomExercise,
  FirestoreNotification,
  FirestoreDaysGoal,
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
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as FirestoreUser
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
  },

  // 全ユーザー取得
  async getAll(limitCount: number = 50): Promise<FirestoreUser[]> {
    const q = query(
      collection(db, COLLECTIONS.USERS),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreUser[]
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

  // 投稿更新
  async update(postId: string, updateData: Partial<Omit<FirestorePost, 'id' | 'createdAt' | 'updatedAt'>>) {
    const docRef = doc(db, COLLECTIONS.POSTS, postId)
    const updatedData = {
      ...updateData,
      updatedAt: new Date().toISOString()
    }
    await updateDoc(docRef, updatedData)
    return updatedData
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
    // バリデーション: 必要なパラメータが存在することを確認
    if (!followerId || !followingId) {
      throw new Error(`Invalid follow parameters: followerId=${followerId}, followingId=${followingId}`)
    }
    
    // 自分自身をフォローしようとした場合はエラー
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself')
    }

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
    // バリデーション: 必要なパラメータが存在することを確認
    if (!followerId || !followingId) {
      throw new Error(`Invalid unfollow parameters: followerId=${followerId}, followingId=${followingId}`)
    }

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
      where('postId', '==', postId)
    )
    
    const querySnapshot = await getDocs(q)
    const comments = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreComment[]
    
    // クライアント側でソート
    return comments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  },

  // コメント削除
  async delete(commentId: string) {
    const docRef = doc(db, COLLECTIONS.COMMENTS, commentId)
    await deleteDoc(docRef)
  }
}

// カスタム筋トレ項目関連操作
export const firestoreCustomExercises = {
  // カスタム項目作成
  async create(userId: string, bodyPart: string, exerciseName: string) {
    const collectionRef = collection(db, COLLECTIONS.CUSTOM_EXERCISES)
    const now = new Date().toISOString()
    
    const customExercise: Omit<FirestoreCustomExercise, 'id'> = {
      userId,
      bodyPart,
      exerciseName,
      createdAt: now,
      updatedAt: now
    }
    
    const docRef = await addDoc(collectionRef, customExercise)
    return { ...customExercise, id: docRef.id } as FirestoreCustomExercise
  },

  // ユーザーのカスタム項目取得
  async getByUser(userId: string): Promise<FirestoreCustomExercise[]> {
    const q = query(
      collection(db, COLLECTIONS.CUSTOM_EXERCISES),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreCustomExercise[]
  },

  // カスタム項目削除
  async delete(exerciseId: string) {
    const docRef = doc(db, COLLECTIONS.CUSTOM_EXERCISES, exerciseId)
    await deleteDoc(docRef)
  },

  // 項目名更新
  async update(exerciseId: string, exerciseName: string) {
    const docRef = doc(db, COLLECTIONS.CUSTOM_EXERCISES, exerciseId)
    const updatedData = {
      exerciseName,
      updatedAt: new Date().toISOString()
    }
    await updateDoc(docRef, updatedData)
    return updatedData
  }
}

// 通知関連操作
export const firestoreNotifications = {
  // 通知作成
  async create(notificationData: Omit<FirestoreNotification, 'id' | 'createdAt'>) {
    const collectionRef = collection(db, COLLECTIONS.NOTIFICATIONS)
    const now = new Date().toISOString()
    
    const notification: Omit<FirestoreNotification, 'id'> = {
      ...notificationData,
      createdAt: now
    }
    
    const docRef = await addDoc(collectionRef, notification)
    return { ...notification, id: docRef.id } as FirestoreNotification
  },

  // ユーザーの通知取得（最新順）
  async getByUser(userId: string, limitCount: number = 50): Promise<FirestoreNotification[]> {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId)
    )
    
    const querySnapshot = await getDocs(q)
    const notifications = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FirestoreNotification[]
    
    // クライアント側でソートして制限
    return notifications
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limitCount)
  },

  // 未読通知数を取得
  async getUnreadCount(userId: string): Promise<number> {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      where('isRead', '==', false)
    )
    
    const querySnapshot = await getDocs(q)
    return querySnapshot.size
  },

  // 通知を既読にする
  async markAsRead(notificationId: string) {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId)
    await updateDoc(docRef, {
      isRead: true
    })
  },

  // ユーザーの全通知を既読にする
  async markAllAsRead(userId: string) {
    const q = query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where('userId', '==', userId),
      where('isRead', '==', false)
    )
    
    const querySnapshot = await getDocs(q)
    const updatePromises = querySnapshot.docs.map(doc => 
      updateDoc(doc.ref, { isRead: true })
    )
    
    await Promise.all(updatePromises)
  },

  // 通知削除
  async delete(notificationId: string) {
    const docRef = doc(db, COLLECTIONS.NOTIFICATIONS, notificationId)
    await deleteDoc(docRef)
  }
}

// 日数目標関連操作
export const firestoreDaysGoals = {
  // 日数目標を作成/更新
  async set(userId: string, monthlyTarget: number): Promise<FirestoreDaysGoal> {
    const docRef = doc(db, COLLECTIONS.DAYS_GOALS, userId)
    const now = new Date().toISOString()
    
    // 既存のドキュメントを確認
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      // 既存のドキュメントがある場合は更新
      const updateData = {
        monthlyTarget,
        updatedAt: now
      }
      await updateDoc(docRef, updateData)
      
      const existingData = docSnap.data() as FirestoreDaysGoal
      return {
        ...existingData,
        ...updateData
      }
    } else {
      // 新規作成
      const daysGoal: FirestoreDaysGoal = {
        id: userId,
        userId,
        monthlyTarget,
        createdAt: now,
        updatedAt: now
      }
      
      await setDoc(docRef, daysGoal)
      return daysGoal
    }
  },

  // 日数目標を取得
  async get(userId: string): Promise<FirestoreDaysGoal | null> {
    const docRef = doc(db, COLLECTIONS.DAYS_GOALS, userId)
    const docSnap = await getDoc(docRef)
    
    if (docSnap.exists()) {
      return docSnap.data() as FirestoreDaysGoal
    }
    
    return null
  },

  // 日数目標を削除
  async delete(userId: string) {
    const docRef = doc(db, COLLECTIONS.DAYS_GOALS, userId)
    await deleteDoc(docRef)
  }
}