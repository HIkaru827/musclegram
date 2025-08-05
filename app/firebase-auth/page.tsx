"use client"

import { useState } from "react"
import { FirebaseAuthScreen } from "@/components/firebase-auth-screen"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

export default function FirebaseAuthPage() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null)
  const [showLocalAuth, setShowLocalAuth] = useState(false)

  const handleAuthSuccess = (user: UserAccount) => {
    setCurrentUser(user)
  }

  const handleBackToLocalAuth = () => {
    setShowLocalAuth(true)
  }

  const handleLogout = () => {
    setCurrentUser(null)
  }

  if (showLocalAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">LocalStorage認証に戻る</h1>
          <p className="text-gray-600 mb-4">メインアプリに戻ります</p>
          <a href="/" className="text-blue-500 hover:underline">
            → メインアプリへ
          </a>
        </div>
      </div>
    )
  }

  if (currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold mb-4 text-center">Firebase認証成功！</h1>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>ID:</strong> {currentUser.id}</p>
            <p><strong>Email:</strong> {currentUser.email}</p>
            <p><strong>表示名:</strong> {currentUser.displayName}</p>
            <p><strong>ユーザーネーム:</strong> {currentUser.username}</p>
          </div>
          <div className="mt-4 space-y-2">
            <button 
              onClick={handleLogout}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
            >
              ログアウト
            </button>
            <a 
              href="/" 
              className="block text-center text-blue-500 hover:underline"
            >
              メインアプリに戻る
            </a>
          </div>
        </div>
      </div>
    )
  }

  return <FirebaseAuthScreen onAuthSuccess={handleAuthSuccess} />
}