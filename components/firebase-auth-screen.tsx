"use client"

import { useState } from "react"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dumbbell, Mail, Lock, User, Eye, EyeOff } from "lucide-react"

interface FirebaseAuthScreenProps {
  onAuthSuccess: (user: UserAccount) => void
}

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

export function FirebaseAuthScreen({ onAuthSuccess }: FirebaseAuthScreenProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // ログインフォーム
  const [loginData, setLoginData] = useState({
    email: "",
    password: ""
  })
  
  // 登録フォーム
  const [registerData, setRegisterData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    username: ""
  })
  
  const [errors, setErrors] = useState<string>("")

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleLogin = async () => {
    setErrors("")
    setIsLoading(true)

    try {
      // メールアドレスとパスワードの検証
      if (!loginData.email || !loginData.password) {
        setErrors("メールアドレスとパスワードを入力してください")
        return
      }

      if (!validateEmail(loginData.email)) {
        setErrors("有効なメールアドレスを入力してください")
        return
      }

      // Firebase Authentication でログイン
      const userCredential = await signInWithEmailAndPassword(auth, loginData.email, loginData.password)
      const firebaseUser = userCredential.user

      // UserAccount形式に変換
      const user: UserAccount = {
        id: firebaseUser.uid,
        email: firebaseUser.email!,
        displayName: firebaseUser.displayName || "ユーザー",
        username: firebaseUser.displayName?.toLowerCase().replace(/\s+/g, '_') || `user_${Date.now()}`,
        bio: "",
        avatar: firebaseUser.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(firebaseUser.displayName || 'ユーザー') + '&background=dc2626&color=ffffff&size=80',
        createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
      }

      onAuthSuccess(user)

    } catch (error: any) {
      console.error("Login error:", error)
      switch (error.code) {
        case 'auth/user-not-found':
          setErrors("アカウントが見つかりません")
          break
        case 'auth/wrong-password':
          setErrors("パスワードが間違っています")
          break
        case 'auth/invalid-email':
          setErrors("有効なメールアドレスを入力してください")
          break
        case 'auth/too-many-requests':
          setErrors("ログイン試行回数が多すぎます。しばらく待ってから再試行してください")
          break
        default:
          setErrors("ログインに失敗しました")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async () => {
    setErrors("")
    setIsLoading(true)

    try {
      // 入力検証
      if (!registerData.email || !registerData.password || !registerData.displayName || !registerData.username) {
        setErrors("すべての項目を入力してください")
        return
      }

      if (!validateEmail(registerData.email)) {
        setErrors("有効なメールアドレスを入力してください")
        return
      }

      if (registerData.password.length < 6) {
        setErrors("パスワードは6文字以上で入力してください")
        return
      }

      if (registerData.password !== registerData.confirmPassword) {
        setErrors("パスワードが一致しません")
        return
      }

      if (registerData.username.length < 3) {
        setErrors("ユーザーネームは3文字以上で入力してください")
        return
      }

      // Firebase Authentication で新規ユーザー作成
      const userCredential = await createUserWithEmailAndPassword(auth, registerData.email, registerData.password)
      const firebaseUser = userCredential.user

      // Firestoreにユーザー情報を保存
      const userData = {
        email: registerData.email,
        displayName: registerData.displayName,
        username: registerData.username,
        bio: "",
        avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName || 'ユーザー') + '&background=dc2626&color=ffffff&size=80',
        createdAt: new Date().toISOString()
      }

      await setDoc(doc(db, "users", firebaseUser.uid), userData)

      // UserAccount形式に変換
      const user: UserAccount = {
        id: firebaseUser.uid,
        ...userData
      }

      onAuthSuccess(user)

    } catch (error: any) {
      console.error("Registration error:", error)
      switch (error.code) {
        case 'auth/email-already-in-use':
          setErrors("このメールアドレスは既に使用されています")
          break
        case 'auth/weak-password':
          setErrors("パスワードが弱すぎます")
          break
        case 'auth/invalid-email':
          setErrors("有効なメールアドレスを入力してください")
          break
        default:
          setErrors("アカウント作成に失敗しました")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-black flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-black/30"></div>
      <Card className="w-full max-w-md bg-gradient-to-br from-gray-900/95 via-black/95 to-gray-900/95 border border-red-500/30 shadow-2xl shadow-red-500/20 backdrop-blur-xl rounded-2xl relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 bg-gradient-to-br from-red-500 via-red-600 to-red-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-red-500/25 animate-pulse">
              <Dumbbell className="h-10 w-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-400 via-red-500 to-red-600 bg-clip-text text-transparent">MuscleGram</CardTitle>
          <CardDescription className="text-gray-300">
            フィットネスログアプリ
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gradient-to-r from-gray-800 to-gray-900 rounded-xl p-1">
              <TabsTrigger value="login" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25 rounded-lg transition-all duration-300">
                ログイン
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25 rounded-lg transition-all duration-300">
                新規登録
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="login-email" className="text-red-400">メールアドレス</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                    className="pl-10 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-red-500/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-sm transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-red-400">パスワード</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="パスワード"
                    value={loginData.password}
                    onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                    className="pl-10 pr-10 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-red-500/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-sm transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errors && (
                <div className="text-red-400 text-sm bg-gradient-to-r from-red-900/30 to-red-800/30 p-3 rounded-xl border border-red-500/30 shadow-lg backdrop-blur-sm">
                  {errors}
                </div>
              )}

              <Button 
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-2xl shadow-red-500/25 hover:shadow-red-600/30 transition-all duration-300 hover:scale-105 active:scale-95 rounded-xl font-bold"
              >
                {isLoading ? "ログイン中..." : "ログイン"}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-red-400">メールアドレス</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="your-email@example.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({...registerData, email: e.target.value})}
                    className="pl-10 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-red-500/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-sm transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-display-name" className="text-red-400">表示名</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-display-name"
                    type="text"
                    placeholder="山田太郎"
                    value={registerData.displayName}
                    onChange={(e) => setRegisterData({...registerData, displayName: e.target.value})}
                    className="pl-10 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-red-500/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-sm transition-all duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-red-400">ユーザーネーム</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">@</span>
                  <Input
                    id="register-username"
                    type="text"
                    placeholder="yamada_muscle"
                    value={registerData.username}
                    onChange={(e) => setRegisterData({...registerData, username: e.target.value})}
                    className="pl-8 bg-gray-900 border-red-900/50 text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-red-400">パスワード</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="6文字以上"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({...registerData, password: e.target.value})}
                    className="pl-10 pr-10 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-red-500/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-sm transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-confirm-password" className="text-red-400">パスワード確認</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="register-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="パスワードを再入力"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({...registerData, confirmPassword: e.target.value})}
                    className="pl-10 pr-10 bg-gradient-to-r from-gray-900/50 to-gray-800/50 border border-red-500/30 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/50 backdrop-blur-sm transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {errors && (
                <div className="text-red-400 text-sm bg-gradient-to-r from-red-900/30 to-red-800/30 p-3 rounded-xl border border-red-500/30 shadow-lg backdrop-blur-sm">
                  {errors}
                </div>
              )}

              <Button 
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-2xl shadow-red-500/25 hover:shadow-red-600/30 transition-all duration-300 hover:scale-105 active:scale-95 rounded-xl font-bold"
              >
                {isLoading ? "登録中..." : "アカウント作成"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}