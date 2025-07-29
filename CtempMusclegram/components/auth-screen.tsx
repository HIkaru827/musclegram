"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dumbbell, Mail, Lock, User, Eye, EyeOff } from "lucide-react"

interface AuthScreenProps {
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

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
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

      // ローカルストレージからユーザー情報を取得
      const users = JSON.parse(localStorage.getItem('musclegram_users') || '[]')
      const user = users.find((u: UserAccount) => u.email === loginData.email)

      if (!user) {
        setErrors("アカウントが見つかりません")
        return
      }

      // パスワード検証（実際のアプリではハッシュ化が必要）
      const savedPassword = localStorage.getItem(`musclegram_password_${user.id}`)
      if (savedPassword !== loginData.password) {
        setErrors("パスワードが間違っています")
        return
      }

      // ログイン成功
      localStorage.setItem('musclegram_current_user', JSON.stringify(user))
      onAuthSuccess(user)

    } catch (error) {
      setErrors("ログインに失敗しました")
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

      // 既存ユーザーの確認
      const users = JSON.parse(localStorage.getItem('musclegram_users') || '[]')
      const existingUser = users.find((u: UserAccount) => 
        u.email === registerData.email || u.username === registerData.username
      )

      if (existingUser) {
        if (existingUser.email === registerData.email) {
          setErrors("このメールアドレスは既に使用されています")
        } else {
          setErrors("このユーザーネームは既に使用されています")
        }
        return
      }

      // 新しいユーザーアカウントを作成
      const newUser: UserAccount = {
        id: Date.now().toString(),
        email: registerData.email,
        displayName: registerData.displayName,
        username: registerData.username,
        bio: "",
        avatar: "/placeholder.svg?height=80&width=80",
        createdAt: new Date().toISOString()
      }

      // ユーザー情報を保存
      const updatedUsers = [...users, newUser]
      localStorage.setItem('musclegram_users', JSON.stringify(updatedUsers))
      localStorage.setItem(`musclegram_password_${newUser.id}`, registerData.password)
      localStorage.setItem('musclegram_current_user', JSON.stringify(newUser))

      // プロフィール情報も初期化
      localStorage.setItem('userProfile', JSON.stringify({
        avatar: newUser.avatar,
        displayName: newUser.displayName,
        username: newUser.username,
        bio: newUser.bio
      }))

      onAuthSuccess(newUser)

    } catch (error) {
      setErrors("アカウント作成に失敗しました")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-black border-red-900/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center">
              <Dumbbell className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-red-400">MuscleGram</CardTitle>
          <CardDescription className="text-gray-400">
            筋トレ記録とコミュニティ
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900">
              <TabsTrigger value="login" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
                ログイン
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-red-600 data-[state=active]:text-white">
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
                    className="pl-10 bg-gray-900 border-red-900/50 text-white"
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
                    className="pl-10 pr-10 bg-gray-900 border-red-900/50 text-white"
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
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900/50">
                  {errors}
                </div>
              )}

              <Button 
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
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
                    className="pl-10 bg-gray-900 border-red-900/50 text-white"
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
                    className="pl-10 bg-gray-900 border-red-900/50 text-white"
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
                    className="pl-10 pr-10 bg-gray-900 border-red-900/50 text-white"
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
                    className="pl-10 pr-10 bg-gray-900 border-red-900/50 text-white"
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
                <div className="text-red-400 text-sm bg-red-900/20 p-3 rounded border border-red-900/50">
                  {errors}
                </div>
              )}

              <Button 
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600"
              >
                {isLoading ? "登録中..." : "アカウント作成"}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="text-center">
          <div className="w-full text-xs text-gray-500">
            アカウントを作成することで、利用規約に同意したものとみなされます
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}