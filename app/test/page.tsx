"use client"

import { useState, useEffect } from "react"
import { auth } from "@/lib/firebase"

export default function TestPage() {
  const [status, setStatus] = useState("Firebase接続中...")

  useEffect(() => {
    try {
      // Firebase認証の状態を確認
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          setStatus(`接続成功: ${user.email}`)
        } else {
          setStatus("接続成功: 未認証状態")
        }
      })

      return () => unsubscribe()
    } catch (error) {
      setStatus(`エラー: ${error}`)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4 text-center">Firebase接続テスト</h1>
        <p className="text-center text-gray-600">{status}</p>
        <div className="mt-4 text-center">
          <a href="/" className="text-blue-500 hover:underline">
            ← メインアプリに戻る
          </a>
        </div>
      </div>
    </div>
  )
}