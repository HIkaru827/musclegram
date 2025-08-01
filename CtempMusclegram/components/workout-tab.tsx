"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Dumbbell, Plus, Minus, Share2, Save, Clock, Trash2, ChevronRight, Camera, FileText, ChevronLeft, ChevronRight as ChevronRightIcon, Edit, MoreVertical } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

export function WorkoutTab({ currentUser }: { currentUser: UserAccount }) {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set())
  const [customExercises, setCustomExercises] = useState<{[key: string]: string[]}>({})
  const [isAddingCustomExercise, setIsAddingCustomExercise] = useState<{bodyPart: string} | null>(null)
  const [customExerciseName, setCustomExerciseName] = useState<string>("")
  const [editingExerciseName, setEditingExerciseName] = useState<{bodyPart: string, oldName: string, newName: string} | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{bodyPart: string, exerciseName: string} | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)
  const [exerciseDeleteConfirmation, setExerciseDeleteConfirmation] = useState<number | null>(null)

  // ローカルストレージからデータを読み込む（初回のみ）
  useEffect(() => {
    const savedExercises = localStorage.getItem(`workoutExercises_${currentUser.id}`)
    if (savedExercises) {
      try {
        const parsedExercises = JSON.parse(savedExercises)
        setExercises(parsedExercises)
        
        // ワークアウトした日付を抽出
        const dates = new Set<string>()
        parsedExercises.forEach((exercise: Exercise) => {
          if (exercise.timestamp) {
            const date = new Date(exercise.timestamp.replace(/\//g, '-'))
            dates.add(date.toDateString())
          }
        })
        setWorkoutDates(dates)
      } catch (error) {
        console.error('Failed to parse saved exercises:', error)
        setExercises([])
      }
    }

    // カスタム種目を読み込み
    const savedCustomExercises = localStorage.getItem(`customExercises_${currentUser.id}`)
    if (savedCustomExercises) {
      try {
        setCustomExercises(JSON.parse(savedCustomExercises))
      } catch (error) {
        console.error('Failed to parse custom exercises:', error)
      }
    }

    setIsInitialized(true)
  }, [currentUser.id])

  // exercisesが変更されたらローカルストレージに保存（初期読み込み時は除く）
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem(`workoutExercises_${currentUser.id}`, JSON.stringify(exercises))
        // カスタムイベントを発火してmobile-appとhome-tabに通知
        window.dispatchEvent(new CustomEvent('localStorageUpdate'))
        window.dispatchEvent(new CustomEvent('workoutDataUpdated'))
      } catch (error) {
        console.error('Failed to save exercises:', error)
      }
    }
  }, [exercises, isInitialized, currentUser.id])

  // メニュー外クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (activeMenuId !== null) {
        setActiveMenuId(null)
      }
    }

    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('click', handleClickOutside)
    }
  }, [activeMenuId])

  const [selectedWorkout, setSelectedWorkout] = useState<string>("")
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false)
  const [isExerciseDetailOpen, setIsExerciseDetailOpen] = useState(false)
  const [currentExercise, setCurrentExercise] = useState<string>("")
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const addExercise = () => {
    if (selectedWorkout) {
      const now = new Date()
      const timestamp = now.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      const newExercises = [
        ...exercises,
        {
          id: Date.now(),
          name: selectedWorkout,
          sets: [{ weight: "", reps: "" }],
          timestamp: timestamp,
        },
      ]
      setExercises(newExercises)
      setSelectedWorkout("")
    }
  }

  const addSet = (exerciseId: number) => {
    setExercises(
      exercises.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, sets: [...exercise.sets, { weight: "", reps: "" }] } : exercise,
      ),
    )
  }

  const removeSet = (exerciseId: number, setIndex: number) => {
    setExercises(
      exercises
        .map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                sets: exercise.sets.filter((_, index) => index !== setIndex),
              }
            : exercise,
        )
        .filter((exercise) => exercise.sets.length > 0),
    )
  }

  const updateSet = (exerciseId: number, setIndex: number, field: "weight" | "reps", value: string) => {
    setExercises(
      exercises.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              sets: exercise.sets.map((set, index) => (index === setIndex ? { ...set, [field]: value } : set)),
            }
          : exercise,
      ),
    )
  }

  const removeExercise = (exerciseId: number) => {
    const exercise = exercises.find(ex => ex.id === exerciseId)
    if (!exercise) return

    // ローカルの運動データから削除
    const newExercises = exercises.filter((exercise) => exercise.id !== exerciseId)
    setExercises(newExercises)

    // グローバル投稿からも削除
    try {
      const globalPosts = JSON.parse(localStorage.getItem('musclegram_global_posts') || '[]')
      const postId = `${currentUser.id}_${exerciseId}`
      const updatedGlobalPosts = globalPosts.filter((post: any) => post.id !== postId)
      localStorage.setItem('musclegram_global_posts', JSON.stringify(updatedGlobalPosts))
      
      // グローバル投稿更新のイベントを発火
      window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
    } catch (error) {
      console.error('Failed to remove from global posts:', error)
    }

    // ローカルストレージを更新
    try {
      localStorage.setItem(`workoutExercises_${currentUser.id}`, JSON.stringify(newExercises))
      window.dispatchEvent(new CustomEvent('workoutDataUpdated'))
      window.dispatchEvent(new CustomEvent('localStorageUpdate'))
    } catch (error) {
      console.error('Failed to update localStorage:', error)
    }
  }

  // カレンダー関連の関数
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startDate = firstDay.getDay()
    
    const days = []
    
    // 前月の末尾の日々
    for (let i = startDate - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        hasWorkout: workoutDates.has(prevDate.toDateString()),
        isToday: false
      })
    }
    
    // 当月の日々
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const today = new Date()
      days.push({
        date,
        isCurrentMonth: true,
        hasWorkout: workoutDates.has(date.toDateString()),
        isToday: date.toDateString() === today.toDateString()
      })
    }
    
    // 次月の最初の日々（42日になるまで）
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        hasWorkout: workoutDates.has(nextDate.toDateString()),
        isToday: false
      })
    }
    
    return days
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }

  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月'
  ]

  const dayNames = ['日', '月', '火', '水', '木', '金', '土']

  const addCustomExercise = (bodyPart: string, exerciseName: string) => {
    const updatedCustomExercises = {
      ...customExercises,
      [bodyPart]: [...(customExercises[bodyPart] || []), exerciseName]
    }
    setCustomExercises(updatedCustomExercises)
    localStorage.setItem(`customExercises_${currentUser.id}`, JSON.stringify(updatedCustomExercises))
  }

  const handleCustomExerciseAdd = (bodyPart: string) => {
    setIsAddingCustomExercise({ bodyPart })
  }

  const handleCustomExerciseSubmit = () => {
    if (isAddingCustomExercise && customExerciseName.trim()) {
      addCustomExercise(isAddingCustomExercise.bodyPart, customExerciseName.trim())
      setCurrentExercise(customExerciseName.trim())
      setCustomExerciseName("")
      setIsAddingCustomExercise(null)
      setIsExerciseModalOpen(false)
      setIsExerciseDetailOpen(true)
    }
  }

  const handleCustomExerciseCancel = () => {
    setIsAddingCustomExercise(null)
    setCustomExerciseName("")
  }

  const handleEditExerciseName = (bodyPart: string, exerciseName: string) => {
    setEditingExerciseName({ bodyPart, oldName: exerciseName, newName: exerciseName })
  }

  const handleEditExerciseSubmit = () => {
    if (editingExerciseName) {
      if (!editingExerciseName.newName.trim()) {
        // 名前が空の場合、削除確認ダイアログを表示
        setDeleteConfirmation({
          bodyPart: editingExerciseName.bodyPart,
          exerciseName: editingExerciseName.oldName
        })
        return
      }
      
      const updatedCustomExercises = { ...customExercises }
      const bodyPartExercises = updatedCustomExercises[editingExerciseName.bodyPart] || []
      const exerciseIndex = bodyPartExercises.indexOf(editingExerciseName.oldName)
      
      if (exerciseIndex !== -1) {
        // カスタム種目の編集
        bodyPartExercises[exerciseIndex] = editingExerciseName.newName.trim()
        updatedCustomExercises[editingExerciseName.bodyPart] = bodyPartExercises
      } else {
        // デフォルト種目を編集してカスタム種目にする
        const defaultExercises = exercisesByBodyPart[editingExerciseName.bodyPart as keyof typeof exercisesByBodyPart] || []
        if (defaultExercises.includes(editingExerciseName.oldName)) {
          // デフォルト種目からカスタム種目リストに追加
          if (!bodyPartExercises.includes(editingExerciseName.newName.trim())) {
            bodyPartExercises.push(editingExerciseName.newName.trim())
            updatedCustomExercises[editingExerciseName.bodyPart] = bodyPartExercises
          }
        }
      }
      
      setCustomExercises(updatedCustomExercises)
      localStorage.setItem(`customExercises_${currentUser.id}`, JSON.stringify(updatedCustomExercises))
      
      // 既存のワークアウトデータの種目名も更新
      const updatedExercises = exercises.map(exercise => 
        exercise.name === editingExerciseName.oldName 
          ? { ...exercise, name: editingExerciseName.newName.trim() }
          : exercise
      )
      setExercises(updatedExercises)
      
      setEditingExerciseName(null)
    }
  }

  const handleEditExerciseCancel = () => {
    setEditingExerciseName(null)
  }

  const handleDeleteConfirmation = (confirm: boolean) => {
    if (deleteConfirmation) {
      if (confirm) {
        // 削除を実行
        const updatedCustomExercises = { ...customExercises }
        const bodyPartExercises = updatedCustomExercises[deleteConfirmation.bodyPart] || []
        const isCustomExercise = bodyPartExercises.includes(deleteConfirmation.exerciseName)
        const defaultExercises = exercisesByBodyPart[deleteConfirmation.bodyPart as keyof typeof exercisesByBodyPart] || []
        const isDefaultExercise = defaultExercises.includes(deleteConfirmation.exerciseName)
        
        if (isCustomExercise) {
          // カスタム種目の削除
          const filteredExercises = bodyPartExercises.filter(ex => ex !== deleteConfirmation.exerciseName)
          
          if (filteredExercises.length === 0) {
            delete updatedCustomExercises[deleteConfirmation.bodyPart]
          } else {
            updatedCustomExercises[deleteConfirmation.bodyPart] = filteredExercises
          }
          
          setCustomExercises(updatedCustomExercises)
          localStorage.setItem(`customExercises_${currentUser.id}`, JSON.stringify(updatedCustomExercises))
        } else if (isDefaultExercise) {
          // デフォルト種目の場合、削除済みリストに追加
          const deletedExercises = updatedCustomExercises['_deleted'] || []
          if (!deletedExercises.includes(deleteConfirmation.exerciseName)) {
            updatedCustomExercises['_deleted'] = [...deletedExercises, deleteConfirmation.exerciseName]
            setCustomExercises(updatedCustomExercises)
            localStorage.setItem(`customExercises_${currentUser.id}`, JSON.stringify(updatedCustomExercises))
          }
        }
        
        // 関連するワークアウトデータも削除
        const updatedExercises = exercises.filter(exercise => exercise.name !== deleteConfirmation.exerciseName)
        setExercises(updatedExercises)
        
        setDeleteConfirmation(null)
        setEditingExerciseName(null)
      } else {
        // キャンセル - 編集画面に戻る
        setDeleteConfirmation(null)
      }
    }
  }

  const handleEditExerciseNameChange = (newName: string) => {
    if (editingExerciseName) {
      setEditingExerciseName({ ...editingExerciseName, newName })
    }
  }

  const addExerciseFromModal = (exerciseName: string) => {
    setCurrentExercise(exerciseName)
    setIsExerciseModalOpen(false)
    setIsExerciseDetailOpen(true)
  }

  // グローバル投稿として保存
  const saveGlobalPost = (exercise: Exercise) => {
    try {
      const globalPosts = JSON.parse(localStorage.getItem('musclegram_global_posts') || '[]')
      
      const postData = {
        id: `${currentUser.id}_${exercise.id}`,
        userId: currentUser.id,
        user: {
          id: currentUser.id,
          name: currentUser.displayName,
          username: currentUser.username,
          avatar: currentUser.avatar
        },
        exercise: exercise,
        content: exercise.memo || `${exercise.name}を投稿しました！`,
        timestamp: exercise.timestamp,
        createdAt: new Date().toISOString()
      }
      
      const updatedPosts = [postData, ...globalPosts].slice(0, 1000) // 最新1000件まで保持
      localStorage.setItem('musclegram_global_posts', JSON.stringify(updatedPosts))
      
      // グローバル投稿更新のイベントを発火
      window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
    } catch (error) {
      console.error('Failed to save global post:', error)
    }
  }

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setIsEditModalOpen(true)
    setActiveMenuId(null)
  }

  const handleDeleteExercise = (exerciseId: number) => {
    setExerciseDeleteConfirmation(exerciseId)
    setActiveMenuId(null)
  }

  const confirmDeleteExercise = () => {
    if (exerciseDeleteConfirmation) {
      removeExercise(exerciseDeleteConfirmation)
      setExerciseDeleteConfirmation(null)
    }
  }

  const cancelDeleteExercise = () => {
    setExerciseDeleteConfirmation(null)
  }

  const updateExercise = (exerciseId: number, updatedSets: { weight: string; reps: string }[], photo?: string, memo?: string, name?: string) => {
    const updatedExercises = exercises.map(exercise => 
      exercise.id === exerciseId 
        ? { ...exercise, sets: updatedSets, photo, memo, name: name || exercise.name }
        : exercise
    )
    setExercises(updatedExercises)
    
    // 即座にローカルストレージに保存
    try {
      const limitedExercises = updatedExercises.slice(-50)
      localStorage.setItem(`workoutExercises_${currentUser.id}`, JSON.stringify(limitedExercises))
      window.dispatchEvent(new CustomEvent('workoutDataUpdated'))
      window.dispatchEvent(new CustomEvent('localStorageUpdate'))
    } catch (error) {
      console.error('Failed to save updated exercise:', error)
    }
    
    setIsEditModalOpen(false)
    setEditingExercise(null)
  }

  const addExerciseFromDetail = (exerciseName: string, sets: { weight: string; reps: string }[], photo?: string, memo?: string) => {
    const validSets = sets.filter(set => set.weight && set.reps)
    if (validSets.length > 0) {
      const now = new Date()
      const timestamp = now.toLocaleString('ja-JP', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      const newExercise = {
        id: Date.now(),
        name: exerciseName,
        sets: validSets,
        timestamp: timestamp,
        photo: photo,
        memo: memo,
      }
      const updatedExercises = [...exercises, newExercise]
      setExercises(updatedExercises)
      
      // 即座にローカルストレージに保存してイベントを発火
      try {
        // 古いデータを制限（最新50件のみ保持）
        const limitedExercises = updatedExercises.slice(-50)
        localStorage.setItem(`workoutExercises_${currentUser.id}`, JSON.stringify(limitedExercises))
        setExercises(limitedExercises)
        
        // グローバル投稿としても保存
        try {
          saveGlobalPost(newExercise)
        } catch (error) {
          console.error('Failed to call saveGlobalPost:', error)
        }
        
        // イベントを発火して他のコンポーネントに通知
        window.dispatchEvent(new CustomEvent('workoutDataUpdated'))
        window.dispatchEvent(new CustomEvent('localStorageUpdate'))
      } catch (error) {
        console.error('Failed to save exercise:', error)
        // 容量エラーの場合、古いデータを削除して再試行
        if (error instanceof DOMException && error.name === 'QuotaExceededError') {
          try {
            const reducedExercises = updatedExercises.slice(-20) // 最新20件のみ
            localStorage.setItem(`workoutExercises_${currentUser.id}`, JSON.stringify(reducedExercises))
            setExercises(reducedExercises)
            
            // グローバル投稿としても保存（リトライ時）
            try {
              saveGlobalPost(newExercise)
            } catch (globalPostError) {
              console.error('Failed to save global post during retry:', globalPostError)
            }
            
            alert('ストレージ容量不足のため、古いデータを削除しました。')
          } catch (retryError) {
            console.error('Retry save failed:', retryError)
            alert('データの保存に失敗しました。ブラウザのデータをクリアしてください。')
          }
        }
      }
    }
    setIsExerciseDetailOpen(false)
  }

  return (
    <div className="h-full flex flex-col">
      {/* タブ切り替え */}
      <div className="flex-shrink-0">
        <Tabs defaultValue="current" className="w-full">
          <div className="p-2 md:p-4 border-b border-red-900/50">
            <TabsList className="w-full bg-transparent h-10 md:h-12 lg:h-14">
              <TabsTrigger value="current" className="flex-1 bg-white text-red-500 border border-red-500 data-[state=active]:bg-red-500 data-[state=active]:text-white text-xs">
                今日の記録
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 bg-white text-red-500 border border-red-500 data-[state=active]:bg-red-500 data-[state=active]:text-white text-xs">
                履歴
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="h-[calc(100vh-200px)]">
            <TabsContent value="current" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-4 md:p-6 lg:p-8 space-y-4">
                  <div className="space-y-4">
            {exercises.length > 0 ? (
              exercises.map((exercise) => (
                <div key={exercise.id} className="border border-red-900/30 rounded-md p-3 bg-white relative">
                  {/* 右上のメニューボタン */}
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-500 hover:text-red-400 hover:bg-red-50"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActiveMenuId(activeMenuId === exercise.id ? null : exercise.id)
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    
                    {/* ドロップダウンメニュー */}
                    {activeMenuId === exercise.id && (
                      <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[100px]">
                        <button
                          className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditExercise(exercise)
                          }}
                        >
                          <Edit className="h-3 w-3" />
                          編集
                        </button>
                        <button
                          className="w-full px-3 py-2 text-left text-xs hover:bg-gray-50 text-red-600 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteExercise(exercise.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                          削除
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-4">
                    {/* 左側：情報エリア */}
                    <div className="w-1/2">
                      {/* 項目名、日付、セット数 */}
                      <div className="mb-3 pr-8">
                        <h3 className="font-semibold text-sm text-red-400">{exercise.name}</h3>
                        <p className="text-xs text-gray-400">{exercise.timestamp}</p>
                        <p className="text-xs text-gray-500 mt-1">{exercise.sets.length}セット</p>
                      </div>
                      
                      {/* メモ表示 */}
                      {exercise.memo && (
                        <div className="mb-3 p-2 bg-gray-100 rounded-md border border-red-900/30">
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="h-3 w-3 text-red-400" />
                            <span className="text-xs text-red-400">メモ</span>
                          </div>
                          <p className="text-xs text-gray-600">{exercise.memo}</p>
                        </div>
                      )}

                      {/* セット詳細 */}
                      <div className="space-y-2">
                        {exercise.sets.map((set, setIndex) => (
                          <div key={setIndex} className="flex items-center gap-2">
                            <div className="w-6 text-xs text-center text-red-400 font-semibold">{setIndex + 1}</div>
                            <div className="w-20">
                              <div className="bg-gray-200 rounded px-2 py-1 text-center text-xs text-black">
                                {set.weight || '0'}kg
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">×</div>
                            <div className="w-20">
                              <div className="bg-gray-200 rounded px-2 py-1 text-center text-xs text-black">
                                {set.reps || '0'}回
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* 右側：写真表示 */}
                    {exercise.photo && (
                      <div className="w-1/2 flex items-center justify-center p-1">
                        <div className="w-full h-full max-w-full max-h-48">
                          <img 
                            src={exercise.photo} 
                            alt="ワークアウト写真" 
                            className="w-full h-full object-cover rounded-md border border-red-900/30"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-8">
                <p>右下の＋ボタンから種目を追加してください</p>
              </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="history" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-4 bg-white">
                  {/* カレンダーヘッダー */}
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="p-2 hover:bg-gray-100"
                    >
                      <ChevronLeft className="h-4 w-4 text-red-500" />
                    </Button>
                    <h3 className="text-lg font-semibold text-red-500">
                      {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="p-2 hover:bg-gray-100"
                    >
                      <ChevronRightIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>

                  {/* 曜日ヘッダー */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {dayNames.map((day) => (
                      <div key={day} className="h-8 flex items-center justify-center text-xs font-medium text-red-500">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* カレンダーグリッド */}
                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth(currentDate).map((day, index) => {
                      const dayNumber = day.date.getDate()
                      const isToday = day.isToday
                      const hasWorkout = day.hasWorkout
                      const isCurrentMonth = day.isCurrentMonth

                      return (
                        <div
                          key={index}
                          className={`
                            h-10 flex items-center justify-center text-sm cursor-pointer relative
                            ${isCurrentMonth ? 'text-red-500' : 'text-gray-300'}
                            ${isToday ? 'bg-red-500 text-white rounded-full' : 'hover:bg-gray-100 rounded'}
                            ${hasWorkout && !isToday ? 'border-2 border-black rounded-full' : ''}
                          `}
                        >
                          {dayNumber}
                        </div>
                      )
                    })}
                  </div>

                  {/* 凡例 */}
                  <div className="mt-4 space-y-2 text-xs text-gray-600">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                      <span>今日</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black rounded-full"></div>
                      <span>トレーニング記録あり</span>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* フローティング追加ボタン */}
      <Dialog open={isExerciseModalOpen} onOpenChange={setIsExerciseModalOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-4 right-4 h-14 w-14 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-900/50 z-10"
            size="icon"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-black border-red-900/50 text-white max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-400">種目を選択</DialogTitle>
            <DialogDescription className="text-gray-400">
              トレーニングする種目を選んでください
            </DialogDescription>
          </DialogHeader>
          <ExerciseSelector 
            onSelect={addExerciseFromModal}
            onAddCustom={handleCustomExerciseAdd}
            customExercises={customExercises}
            isAddingCustom={isAddingCustomExercise}
            customExerciseName={customExerciseName}
            onCustomNameChange={setCustomExerciseName}
            onCustomSubmit={handleCustomExerciseSubmit}
            onCustomCancel={handleCustomExerciseCancel}
            onEditExercise={handleEditExerciseName}
            editingExercise={editingExerciseName}
            onEditSubmit={handleEditExerciseSubmit}
            onEditCancel={handleEditExerciseCancel}
            onEditNameChange={handleEditExerciseNameChange}
            deleteConfirmation={deleteConfirmation}
            onDeleteConfirmation={handleDeleteConfirmation}
          />
        </DialogContent>
      </Dialog>
      
      {/* 種目詳細画面 */}
      <Dialog open={isExerciseDetailOpen} onOpenChange={setIsExerciseDetailOpen}>
        <DialogContent className="bg-black border-red-900/50 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-400">{currentExercise}</DialogTitle>
            <DialogDescription className="text-gray-400">
              セットごとの重量や回数を入力してください
            </DialogDescription>
          </DialogHeader>
          <ExerciseDetail 
            exerciseName={currentExercise} 
            onComplete={addExerciseFromDetail}
            currentUser={currentUser}
          />
        </DialogContent>
      </Dialog>

      {/* 編集モーダル */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-black border-red-900/50 text-white max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-red-400">{editingExercise?.name}</DialogTitle>
            <DialogDescription className="text-gray-400">
              トレーニングデータを編集してください
            </DialogDescription>
          </DialogHeader>
          {editingExercise && (
            <ExerciseEditDetail 
              exercise={editingExercise}
              onUpdate={updateExercise}
              customExercises={customExercises}
              onCancel={() => {
                setIsEditModalOpen(false)
                setEditingExercise(null)
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* 削除確認ダイアログ */}
      {exerciseDeleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border border-red-900/50 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-red-500 mb-4">削除確認</h3>
            <p className="text-gray-700 mb-6">
              この記録を削除しますか？<br />
              マイページとみんなの投稿からも削除されます。
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                onClick={cancelDeleteExercise}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDeleteExercise}
              >
                削除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface Exercise {
  id: number
  name: string
  sets: Array<{
    weight: string
    reps: string
  }>
  timestamp: string
  photo?: string
  memo?: string
}

// 部位別種目データ
const exercisesByBodyPart = {
  胸: ["ベンチプレス", "ペックフライ", "チェストプレス"],
  背中: ["デッドリフト", "ラットプルダウン", "プーリーロー"],
  脚: ["スクワット", "スミスマシン・バーベルスクワット", "レッグプレス"],
  肩: ["サイドレイズ", "ショルダープレス", "フロントレイズ"],
  腕: ["フィンガーロール", "バーベルカール", "アームカール"],
  お尻: ["ヒップスラスト"],
  腹筋: ["プランク", "上体起こし"],
  有酸素運動: ["ランニング", "サイクリング", "エリプティカル"],
}

// ExerciseSelectorコンポーネント
function ExerciseSelector({ 
  onSelect, 
  onAddCustom, 
  customExercises, 
  isAddingCustom, 
  customExerciseName, 
  onCustomNameChange, 
  onCustomSubmit, 
  onCustomCancel,
  onEditExercise,
  editingExercise,
  onEditSubmit,
  onEditCancel,
  onEditNameChange,
  deleteConfirmation,
  onDeleteConfirmation
}: { 
  onSelect: (exerciseName: string) => void
  onAddCustom?: (bodyPart: string) => void
  customExercises?: {[key: string]: string[]}
  isAddingCustom?: {bodyPart: string} | null
  customExerciseName?: string
  onCustomNameChange?: (name: string) => void
  onCustomSubmit?: () => void
  onCustomCancel?: () => void
  onEditExercise?: (bodyPart: string, exerciseName: string) => void
  editingExercise?: {bodyPart: string, oldName: string, newName: string} | null
  onEditSubmit?: () => void
  onEditCancel?: () => void
  onEditNameChange?: (newName: string) => void
  deleteConfirmation?: {bodyPart: string, exerciseName: string} | null
  onDeleteConfirmation?: (confirm: boolean) => void
}) {
  return (
    <div className="space-y-4">
{Object.entries(exercisesByBodyPart).map(([bodyPart, exercises]) => {
        const customExercisesForBodyPart = customExercises?.[bodyPart] || []
        const deletedExercises = customExercises?.['_deleted'] || []
        const filteredDefaultExercises = exercises.filter(ex => !deletedExercises.includes(ex))
        const allExercises = [...filteredDefaultExercises, ...customExercisesForBodyPart]
        
        return (
          <div key={bodyPart} className="space-y-2">
            <h3 className="font-semibold text-red-400 border-b border-red-900/50 pb-1">
              {bodyPart}
            </h3>
            <div className="space-y-1">
              {allExercises.map((exercise) => {
                const isCustomExercise = customExercisesForBodyPart.includes(exercise)
                const isEditing = editingExercise?.bodyPart === bodyPart && editingExercise?.oldName === exercise
                
                return isEditing ? (
                  <div key={exercise} className="space-y-2 p-2 bg-gray-900/50 rounded border border-red-900/30">
                    <Input
                      type="text"
                      value={editingExercise.newName}
                      onChange={(e) => onEditNameChange?.(e.target.value)}
                      placeholder="種目名を編集"
                      className="bg-black border-red-900/50 text-white"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          onEditSubmit?.()
                        } else if (e.key === 'Escape') {
                          onEditCancel?.()
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
                        onClick={onEditCancel}
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                        onClick={onEditSubmit}
                      >
                        更新
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div key={exercise} className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      className="flex-1 justify-start text-left hover:bg-red-950/30 hover:text-red-300"
                      onClick={() => onSelect(exercise)}
                    >
                      {exercise}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-gray-400 hover:text-red-400 hover:bg-red-950/30"
                      onClick={() => onEditExercise?.(bodyPart, exercise)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
              
              {isAddingCustom?.bodyPart === bodyPart ? (
                <div className="space-y-2 p-2 bg-gray-900/50 rounded border border-red-900/30">
                  <Input
                    type="text"
                    value={customExerciseName || ""}
                    onChange={(e) => onCustomNameChange?.(e.target.value)}
                    placeholder="新しい種目名を入力"
                    className="bg-black border-red-900/50 text-white"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onCustomSubmit?.()
                      } else if (e.key === 'Escape') {
                        onCustomCancel?.()
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
                      onClick={onCustomCancel}
                    >
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                      onClick={onCustomSubmit}
                    >
                      追加
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-gray-400 hover:bg-gray-800 hover:text-white"
                  onClick={() => onAddCustom?.(bodyPart)}
                >
                  項目を追加
                </Button>
              )}
            </div>
          </div>
        )
      })}

      {/* 削除確認ダイアログ */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-900/50 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-red-400 mb-4">削除確認</h3>
            <p className="text-gray-300 mb-6">
              削除してもいいですか？削除するとデータも削除されてしまいます。
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
                onClick={() => onDeleteConfirmation?.(false)}
              >
                いいえ
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={() => onDeleteConfirmation?.(true)}
              >
                はい
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ExerciseEditDetailコンポーネント
function ExerciseEditDetail({ 
  exercise,
  onUpdate,
  customExercises,
  onCancel
}: { 
  exercise: Exercise
  onUpdate: (exerciseId: number, sets: { weight: string; reps: string }[], photo?: string, memo?: string, name?: string) => void
  customExercises: {[key: string]: string[]}
  onCancel: () => void
}) {
  const [sets, setSets] = useState(
    exercise.sets.map((set, index) => ({ 
      id: index + 1, 
      weight: set.weight, 
      reps: set.reps 
    }))
  )
  const [editingField, setEditingField] = useState<{ setId: number; field: 'weight' | 'reps' } | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ setId: number; setIndex: number } | null>(null)
  const [photo, setPhoto] = useState<string>(exercise.photo || "")
  const [memo, setMemo] = useState<string>(exercise.memo || "")
  const [exerciseName, setExerciseName] = useState<string>(exercise.name)
  const [isSelectingExercise, setIsSelectingExercise] = useState<boolean>(false)
  const [editingExerciseInModal, setEditingExerciseInModal] = useState<{bodyPart: string, oldName: string, newName: string} | null>(null)
  const [deleteConfirmationInModal, setDeleteConfirmationInModal] = useState<{bodyPart: string, exerciseName: string} | null>(null)

  const handleFieldClick = (setId: number, field: 'weight' | 'reps', currentValue: string) => {
    setEditingField({ setId, field })
    setInputValue(currentValue)
  }

  const handleInputSubmit = () => {
    if (editingField) {
      setSets(sets.map(set => 
        set.id === editingField.setId 
          ? { ...set, [editingField.field]: inputValue }
          : set
      ))
      setEditingField(null)
      setInputValue("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleInputSubmit()
      
      if (editingField) {
        const currentSetIndex = sets.findIndex(set => set.id === editingField.setId)
        
        if (editingField.field === 'weight') {
          setEditingField({ setId: editingField.setId, field: 'reps' })
          setInputValue(sets[currentSetIndex].reps)
        } else if (editingField.field === 'reps') {
          const nextSetIndex = currentSetIndex + 1
          if (nextSetIndex < sets.length) {
            const nextSet = sets[nextSetIndex]
            setEditingField({ setId: nextSet.id, field: 'weight' })
            setInputValue(nextSet.weight)
          } else {
            setEditingField(null)
            setInputValue("")
          }
        }
      }
    }
  }

  const handleUpdate = () => {
    const setsData = sets.map(set => ({
      weight: set.weight,
      reps: set.reps
    }))
    onUpdate(exercise.id, setsData, photo, memo, exerciseName)
  }

  const handleExerciseSelect = (selectedExercise: string) => {
    setExerciseName(selectedExercise)
    setIsSelectingExercise(false)
  }

  const handleExerciseClick = () => {
    setIsSelectingExercise(true)
  }

  const handleEditExerciseInModal = (bodyPart: string, exerciseName: string) => {
    setEditingExerciseInModal({ bodyPart, oldName: exerciseName, newName: exerciseName })
  }

  const handleEditExerciseInModalSubmit = () => {
    if (editingExerciseInModal) {
      if (!editingExerciseInModal.newName.trim()) {
        // 名前が空の場合、削除確認ダイアログを表示
        setDeleteConfirmationInModal({
          bodyPart: editingExerciseInModal.bodyPart,
          exerciseName: editingExerciseInModal.oldName
        })
        return
      }
      
      // 種目名を更新
      setExerciseName(editingExerciseInModal.newName.trim())
      setEditingExerciseInModal(null)
    }
  }

  const handleEditExerciseInModalCancel = () => {
    setEditingExerciseInModal(null)
  }

  const handleEditExerciseNameInModalChange = (newName: string) => {
    if (editingExerciseInModal) {
      setEditingExerciseInModal({ ...editingExerciseInModal, newName })
    }
  }


  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 500 * 1024) {
        alert('画像サイズは500KB以下にしてください')
        return
      }
      
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        const maxSize = 300
        let { width, height } = img
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        ctx?.drawImage(img, 0, 0, width, height)
        
        const compressedDataURL = canvas.toDataURL('image/jpeg', 0.6)
        setPhoto(compressedDataURL)
      }
      
      img.src = URL.createObjectURL(file)
    }
  }

  const addSet = () => {
    const newSetId = sets.length + 1
    setSets([...sets, { id: newSetId, weight: "", reps: "" }])
  }

  const handleSetClick = (setId: number, setIndex: number) => {
    if (sets.length <= 1) {
      return
    }
    setDeleteConfirmation({ setId, setIndex })
  }

  const confirmDelete = () => {
    if (deleteConfirmation && sets.length > 1) {
      const newSets = sets.filter((_, index) => index !== deleteConfirmation.setIndex)
      const updatedSets = newSets.map((set, index) => ({ ...set, id: index + 1 }))
      setSets(updatedSets)
    }
    setDeleteConfirmation(null)
  }

  const cancelDelete = () => {
    setDeleteConfirmation(null)
  }

  return (
    <div className="space-y-6">
      {/* 項目名編集 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-red-400" />
          <span className="text-sm text-red-400">種目名</span>
        </div>
{isSelectingExercise ? (
          <div className="bg-gray-900 rounded-lg border border-red-900/50 max-h-60 overflow-y-auto">
            <ExerciseSelector 
              onSelect={handleExerciseSelect}
              customExercises={customExercises}
              onAddCustom={() => {}}
              isAddingCustom={null}
              customExerciseName=""
              onCustomNameChange={() => {}}
              onCustomSubmit={() => {}}
              onCustomCancel={() => {}}
              onEditExercise={handleEditExerciseInModal}
              editingExercise={editingExerciseInModal}
              onEditSubmit={handleEditExerciseInModalSubmit}
              onEditCancel={handleEditExerciseInModalCancel}
              onEditNameChange={handleEditExerciseNameInModalChange}
              deleteConfirmation={deleteConfirmationInModal}
              onDeleteConfirmation={() => {
                // 削除機能は一時的に無効化
                alert('削除機能は現在メンテナンス中です')
              }}
            />
          </div>
        ) : (
          <button
            onClick={handleExerciseClick}
            className="w-full p-2 bg-gray-800 hover:bg-gray-700 rounded border border-red-900/50 text-white text-left flex items-center justify-between"
          >
            <span>{exerciseName}</span>
            <ChevronRight className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {/* セット入力 */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="text-xs text-gray-400">セット</div>
          <div className="text-xs text-gray-400">重さ</div>
          <div className="text-xs text-gray-400">回数</div>
        </div>
        
        {sets.map((set, index) => (
          <div key={set.id} className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <button
                onClick={() => handleSetClick(set.id, index)}
                className={`w-8 h-8 rounded-full text-white font-bold text-xs transition-colors ${
                  sets.length <= 1 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 hover:scale-105'
                }`}
                disabled={sets.length <= 1}
              >
                {index + 1}
              </button>
            </div>
            <div className="text-center">
              {editingField?.setId === set.id && editingField?.field === 'weight' ? (
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setInputValue(value)
                    }
                  }}
                  onBlur={handleInputSubmit}
                  onKeyDown={handleKeyPress}
                  className="h-8 bg-black border-red-900/50 text-center"
                  placeholder="重さ"
                  inputMode="decimal"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleFieldClick(set.id, 'weight', set.weight)}
                  className="w-full h-8 bg-gray-800 hover:bg-gray-700 rounded border border-red-900/50 text-white"
                >
                  {set.weight || "0"}
                </button>
              )}
            </div>
            <div className="text-center">
              {editingField?.setId === set.id && editingField?.field === 'reps' ? (
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    const value = e.target.value
                    if (value === '' || /^\d+$/.test(value)) {
                      setInputValue(value)
                    }
                  }}
                  onBlur={handleInputSubmit}
                  onKeyDown={handleKeyPress}
                  className="h-8 bg-black border-red-900/50 text-center"
                  placeholder="回数"
                  inputMode="numeric"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleFieldClick(set.id, 'reps', set.reps)}
                  className="w-full h-8 bg-gray-800 hover:bg-gray-700 rounded border border-red-900/50 text-white"
                >
                  {set.reps || "0"}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {/* セット追加ボタン */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addSet}
            className="border-red-500 text-red-500 hover:bg-red-950 hover:text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            追加
          </Button>
        </div>
      </div>

      {/* 写真とメモのセクション */}
      <div className="space-y-4">
        {/* 写真アップロード */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">写真</span>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              id="edit-photo-upload"
            />
            <label
              htmlFor="edit-photo-upload"
              className="flex-1 p-2 bg-gray-800 hover:bg-gray-700 rounded border border-red-900/50 text-center text-xs cursor-pointer text-gray-300 hover:text-white transition-colors"
            >
              写真を選択
            </label>
            {photo && (
              <button
                onClick={() => setPhoto("")}
                className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 rounded border border-red-900/50 text-xs text-red-400"
              >
                削除
              </button>
            )}
          </div>
          {photo && (
            <div className="mt-2">
              <img 
                src={photo} 
                alt="プレビュー" 
                className="w-full h-32 object-cover rounded-md border border-red-900/30"
              />
            </div>
          )}
        </div>

        {/* メモ入力 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">メモ</span>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモを入力してください..."
            className="w-full p-2 bg-black border border-red-900/50 rounded text-white text-sm resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex gap-3 pt-4">
        <Button 
          variant="outline"
          className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
          onClick={onCancel}
        >
          キャンセル
        </Button>
        <Button 
          className="flex-1 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500"
          onClick={handleUpdate}
        >
          更新
        </Button>
      </div>

      {/* 削除確認ダイアログ */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-900/50 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-red-400 mb-4">削除確認</h3>
            <p className="text-gray-300 mb-6">
              セット{deleteConfirmation.setIndex + 1}を削除しますか？
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
                onClick={cancelDelete}
              >
                いいえ
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
              >
                はい
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ExerciseDetailコンポーネント
function ExerciseDetail({ 
  exerciseName, 
  onComplete,
  currentUser
}: { 
  exerciseName: string
  onComplete: (exerciseName: string, sets: { weight: string; reps: string }[], photo?: string, memo?: string) => void
  currentUser: UserAccount
}) {
  const [sets, setSets] = useState([
    { id: 1, weight: "", reps: "" },
    { id: 2, weight: "", reps: "" },
    { id: 3, weight: "", reps: "" },
  ])
  const [editingField, setEditingField] = useState<{ setId: number; field: 'weight' | 'reps' } | null>(null)
  const [inputValue, setInputValue] = useState("")
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ setId: number; setIndex: number } | null>(null)
  const [photo, setPhoto] = useState<string>("")
  const [memo, setMemo] = useState<string>("")

  // 同じ種目の前回の記録を取得
  const getPreviousHistory = () => {
    const savedExercises = localStorage.getItem(`workoutExercises_${currentUser.id}`)
    if (savedExercises) {
      const exercises = JSON.parse(savedExercises)
      // 同じ種目の記録を新しい順でフィルタ（現在のセッションを除く）
      const sameExercises = exercises
        .filter((ex: any) => ex.name === exerciseName)
        .sort((a: any, b: any) => b.id - a.id) // 新しい順
      
      if (sameExercises.length > 0) {
        const previousExercise = sameExercises[0]
        return {
          date: previousExercise.timestamp,
          sets: previousExercise.sets
        }
      }
    }
    
    // 前回の記録がない場合のデフォルト
    return {
      date: "記録なし",
      sets: []
    }
  }

  const previousHistory = getPreviousHistory()

  const handleFieldClick = (setId: number, field: 'weight' | 'reps', currentValue: string) => {
    setEditingField({ setId, field })
    setInputValue(currentValue)
  }

  const handleInputSubmit = () => {
    if (editingField) {
      setSets(sets.map(set => 
        set.id === editingField.setId 
          ? { ...set, [editingField.field]: inputValue }
          : set
      ))
      setEditingField(null)
      setInputValue("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputSubmit()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      handleInputSubmit()
      
      if (editingField) {
        const currentSetIndex = sets.findIndex(set => set.id === editingField.setId)
        
        if (editingField.field === 'weight') {
          // 重さから回数へ
          setEditingField({ setId: editingField.setId, field: 'reps' })
          setInputValue(sets[currentSetIndex].reps)
        } else if (editingField.field === 'reps') {
          // 回数から次のセットの重さへ
          const nextSetIndex = currentSetIndex + 1
          if (nextSetIndex < sets.length) {
            const nextSet = sets[nextSetIndex]
            setEditingField({ setId: nextSet.id, field: 'weight' })
            setInputValue(nextSet.weight)
          } else {
            // 最後のセットの場合は編集終了
            setEditingField(null)
            setInputValue("")
          }
        }
      }
    }
  }

  const handlePost = () => {
    // id を除外してweight, repsのみを送信
    const setsData = sets.map(set => ({
      weight: set.weight,
      reps: set.reps
    }))
    onComplete(exerciseName, setsData, photo, memo)
  }

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // 画像サイズを制限（500KBまで）
      if (file.size > 500 * 1024) {
        alert('画像サイズは500KB以下にしてください')
        return
      }
      
      // 画像をリサイズして圧縮
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // 最大幅・高さを300pxに制限
        const maxSize = 300
        let { width, height } = img
        
        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        
        ctx?.drawImage(img, 0, 0, width, height)
        
        // 品質を下げて圧縮（0.6 = 60%品質）
        const compressedDataURL = canvas.toDataURL('image/jpeg', 0.6)
        setPhoto(compressedDataURL)
      }
      
      img.src = URL.createObjectURL(file)
    }
  }

  const addSet = () => {
    const newSetId = sets.length + 1
    setSets([...sets, { id: newSetId, weight: "", reps: "" }])
  }

  const handleSetClick = (setId: number, setIndex: number) => {
    // 1セットしか残っていない場合は削除しない
    if (sets.length <= 1) {
      return
    }
    setDeleteConfirmation({ setId, setIndex })
  }

  const confirmDelete = () => {
    if (deleteConfirmation && sets.length > 1) {
      const newSets = sets.filter((_, index) => index !== deleteConfirmation.setIndex)
      // IDを再割り当て
      const updatedSets = newSets.map((set, index) => ({ ...set, id: index + 1 }))
      setSets(updatedSets)
    }
    setDeleteConfirmation(null)
  }

  const cancelDelete = () => {
    setDeleteConfirmation(null)
  }

  return (
    <div className="space-y-6">
      {/* 前回の履歴 */}
      <div className="bg-gray-900/50 rounded-lg p-4 border border-red-900/30">
        <h3 className="text-xs text-red-400 mb-2">前回の記録 ({previousHistory.date})</h3>
        <div className="space-y-1">
          {previousHistory.sets.length > 0 ? (
            previousHistory.sets.map((set: any, index: number) => (
              <div key={index} className="text-xs text-gray-400">
                セット{index + 1}: {set.weight}kg × {set.reps}回
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-400">
              {exerciseName}の記録はまだありません
            </div>
          )}
        </div>
      </div>

      {/* セット入力 */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="text-xs text-gray-400">セット</div>
          <div className="text-xs text-gray-400">重さ</div>
          <div className="text-xs text-gray-400">回数</div>
        </div>
        
        {sets.map((set, index) => (
          <div key={set.id} className="grid grid-cols-3 gap-4 items-center">
            <div className="text-center">
              <button
                onClick={() => handleSetClick(set.id, index)}
                className={`w-8 h-8 rounded-full text-white font-bold text-xs transition-colors ${
                  sets.length <= 1 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 hover:scale-105'
                }`}
                disabled={sets.length <= 1}
              >
                {index + 1}
              </button>
            </div>
            <div className="text-center">
              {editingField?.setId === set.id && editingField?.field === 'weight' ? (
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    const value = e.target.value
                    // 数字、小数点、空文字のみ許可
                    if (value === '' || /^\d*\.?\d*$/.test(value)) {
                      setInputValue(value)
                    }
                  }}
                  onBlur={handleInputSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleInputSubmit()
                    } else if (e.key === 'Tab') {
                      handleKeyPress(e)
                    } else if (!/[\d.]/.test(e.key) && 
                               !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                      e.preventDefault()
                    }
                    // 複数の小数点を防止
                    if (e.key === '.' && e.currentTarget.value.includes('.')) {
                      e.preventDefault()
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement
                    const value = target.value
                    // 不正な文字が入力された場合、除去
                    if (!/^\d*\.?\d*$/.test(value)) {
                      target.value = value.replace(/[^\d.]/g, '')
                      setInputValue(target.value)
                    }
                  }}
                  className="h-8 bg-black border-red-900/50 text-center"
                  placeholder="重さ"
                  inputMode="decimal"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleFieldClick(set.id, 'weight', set.weight)}
                  className="w-full h-8 bg-gray-800 hover:bg-gray-700 rounded border border-red-900/50 text-white"
                >
                  {set.weight || "0"}
                </button>
              )}
            </div>
            <div className="text-center">
              {editingField?.setId === set.id && editingField?.field === 'reps' ? (
                <Input
                  type="text"
                  value={inputValue}
                  onChange={(e) => {
                    const value = e.target.value
                    // 数字、空文字のみ許可（整数のみ）
                    if (value === '' || /^\d+$/.test(value)) {
                      setInputValue(value)
                    }
                  }}
                  onBlur={handleInputSubmit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleInputSubmit()
                    } else if (e.key === 'Tab') {
                      handleKeyPress(e)
                    } else if (!/\d/.test(e.key) && 
                               !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) {
                      e.preventDefault()
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLInputElement
                    const value = target.value
                    // 不正な文字が入力された場合、除去
                    if (!/^\d*$/.test(value)) {
                      target.value = value.replace(/[^\d]/g, '')
                      setInputValue(target.value)
                    }
                  }}
                  className="h-8 bg-black border-red-900/50 text-center"
                  placeholder="回数"
                  inputMode="numeric"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleFieldClick(set.id, 'reps', set.reps)}
                  className="w-full h-8 bg-gray-800 hover:bg-gray-700 rounded border border-red-900/50 text-white"
                >
                  {set.reps || "0"}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {/* セット追加ボタン */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addSet}
            className="border-red-500 text-red-500 hover:bg-red-950 hover:text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            追加
          </Button>
        </div>
      </div>

      {/* 写真とメモのセクション */}
      <div className="space-y-4">
        {/* 写真アップロード */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">写真</span>
          </div>
          <div className="flex gap-2">
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
              id="photo-upload"
            />
            <label
              htmlFor="photo-upload"
              className="flex-1 p-2 bg-gray-800 hover:bg-gray-700 rounded border border-red-900/50 text-center text-xs cursor-pointer text-gray-300 hover:text-white transition-colors"
            >
              写真を選択
            </label>
            {photo && (
              <button
                onClick={() => setPhoto("")}
                className="px-3 py-2 bg-red-900/30 hover:bg-red-900/50 rounded border border-red-900/50 text-xs text-red-400"
              >
                削除
              </button>
            )}
          </div>
          {photo && (
            <div className="mt-2">
              <img 
                src={photo} 
                alt="プレビュー" 
                className="w-full h-32 object-cover rounded-md border border-red-900/30"
              />
            </div>
          )}
        </div>

        {/* メモ入力 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">メモ</span>
          </div>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="メモを入力してください..."
            className="w-full p-2 bg-black border border-red-900/50 rounded text-white text-sm resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* アクションボタン */}
      <div className="flex pt-4">
        <Button 
          className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500"
          onClick={handlePost}
        >
          <Share2 className="h-4 w-4 mr-1" /> 投稿
        </Button>
      </div>

      {/* 削除確認ダイアログ */}
      {deleteConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-red-900/50 rounded-lg p-6 max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-red-400 mb-4">削除確認</h3>
            <p className="text-gray-300 mb-6">
              セット{deleteConfirmation.setIndex + 1}を削除しますか？
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
                onClick={cancelDelete}
              >
                いいえ
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                onClick={confirmDelete}
              >
                はい
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// サンプルデータ
const workoutHistory = [
  { id: 1, date: "2023/4/15", type: "胸トレーニング", exercises: 4 },
  { id: 2, date: "2023/4/13", type: "背中トレーニング", exercises: 5 },
  { id: 3, date: "2023/4/11", type: "脚トレーニング", exercises: 6 },
  { id: 4, date: "2023/4/9", type: "肩トレーニング", exercises: 3 },
  { id: 5, date: "2023/4/7", type: "腕トレーニング", exercises: 4 },
]
