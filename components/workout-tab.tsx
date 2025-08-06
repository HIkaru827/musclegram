"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { firestorePosts, firestoreCustomExercises } from "@/lib/firestore-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Dumbbell, Plus, Minus, Share2, Save, Clock, Trash2, ChevronRight, Camera, FileText, ChevronLeft, ChevronRight as ChevronRightIcon, Edit, MoreVertical, Timer, Play, Pause, RotateCcw } from "lucide-react"
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

interface Exercise {
  id: number
  name: string
  sets: Array<{
    weight: string
    reps: string
  }>
  timestamp: string
  photo?: string
  postId?: string
}

export function WorkoutTab({ 
  currentUser
}: { 
  currentUser: UserAccount
}) {
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
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedDateExercises, setSelectedDateExercises] = useState<Exercise[]>([])
  const [isDateDetailOpen, setIsDateDetailOpen] = useState(false)
  const [selectedDateForNewWorkout, setSelectedDateForNewWorkout] = useState<Date | null>(null)
  const [dailyPost, setDailyPost] = useState<{[key: string]: string}>({})
  const [recordMemo, setRecordMemo] = useState<{[key: string]: string}>({})

  // 有効数字2桁でフォーマットする関数
  const formatToTwoSignificantDigits = (num: number): string => {
    if (num === 0) return '0'
    if (num < 0.01) return '0.01'
    
    const magnitude = Math.floor(Math.log10(Math.abs(num)))
    const factor = Math.pow(10, 1 - magnitude)
    const rounded = Math.round(num * factor) / factor
    
    if (rounded >= 100) {
      return Math.round(rounded).toString()
    } else if (rounded >= 10) {
      return rounded.toFixed(1)
    } else {
      return rounded.toFixed(2)
    }
  }

  // 日付別にエクササイズをグループ化する関数
  const getExercisesByDate = () => {
    const groupedExercises: {[key: string]: Exercise[]} = {}
    
    exercises.forEach((exercise) => {
      const date = exercise.timestamp.split(' ')[0] // 日付部分のみを取得
      if (!groupedExercises[date]) {
        groupedExercises[date] = []
      }
      groupedExercises[date].push(exercise)
    })
    
    // 日付順でソート（新しい順）
    const sortedDates = Object.keys(groupedExercises).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime()
    })
    
    const result: {[key: string]: Exercise[]} = {}
    sortedDates.forEach(date => {
      result[date] = groupedExercises[date]
    })
    
    return result
  }

  // 日付を○月○日形式でフォーマットする関数
  const formatDateJapanese = (dateStr: string): string => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  // 日ごとの投稿をみんなの投稿に送信する関数
  const handleDailyPost = async (date: string) => {
    const memo = recordMemo[date] || ''
    const exercisesOnDate = getExercisesByDate()[date] || []
    
    if (exercisesOnDate.length === 0) {
      alert('投稿する記録がありません')
      return
    }
    
    try {
      // 投稿データを作成
      const postData = {
        userId: currentUser.id,
        userName: currentUser.displayName,
        userAvatar: currentUser.avatar,
        content: memo,
        exercises: exercisesOnDate,
        date: date,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: []
      }
      
      const result = await firestorePosts.create(postData)
      console.log('投稿成功:', result)
      setDailyPost(prev => ({ ...prev, [date]: memo }))
      alert('投稿が完了しました！')
    } catch (error) {
      console.error('投稿エラー:', error)
      alert('投稿に失敗しました')
    }
  }

  // 部位別の種目分類（記録画面の分類と統一）
  const exerciseBodyPartMap: { [key: string]: string } = {
    // 胸
    'ベンチプレス': '胸',
    'ペックフライ': '胸',
    'チェストプレス': '胸',
    'インクラインベンチプレス': '胸',
    'ダンベルプレス': '胸',
    'インクラインダンベルプレス': '胸',
    'ダンベルフライ': '胸',
    'インクラインダンベルフライ': '胸',
    'ディップス': '胸',
    'プッシュアップ': '胸',
    
    // 背中
    'デッドリフト': '背中',
    'ラットプルダウン': '背中',
    'プーリーロー': '背中',
    'ベントオーバーロー': '背中',
    'チンニング': '背中',
    'ワンハンドロー': '背中',
    'シーテッドロー': '背中',
    'Tバーロー': '背中',
    
    // 脚
    'スクワット': '脚',
    'スミスマシン・バーベルスクワット': '脚',
    'レッグプレス': '脚',
    'レッグエクステンション': '脚',
    'レッグカール': '脚',
    'カーフレイズ': '脚',
    'ランジ': '脚',
    'ブルガリアンスクワット': '脚',
    
    // 肩
    'サイドレイズ': '肩',
    'ショルダープレス': '肩',
    'フロントレイズ': '肩',
    'リアレイズ': '肩',
    'アップライトロー': '肩',
    'シュラッグ': '肩',
    
    // 腕
    'フィンガーロール': '腕',
    'バーベルカール': '腕',
    'アームカール': '腕',
    'ダンベルカール': '腕',
    'ハンマーカール': '腕',
    'プリーチャーカール': '腕',
    'トライセップスエクステンション': '腕',
    'フレンチプレス': '腕',
    'クローズグリップベンチプレス': '腕',
    
    // お尻
    'ヒップスラスト': 'お尻',
    
    // 腹筋
    'プランク': '腹筋',
    '上体起こし': '腹筋',
    'クランチ': '腹筋',
    'シットアップ': '腹筋',
    'レッグレイズ': '腹筋',
    'ロシアンツイスト': '腹筋',
    'マウンテンクライマー': '腹筋',
    
    // 有酸素運動
    'ランニング': '有酸素運動',
    'サイクリング': '有酸素運動',
    'エリプティカル': '有酸素運動'
  }

  // 各種目の最大1RMを部位別に計算する関数
  const getMaxOneRMByBodyPart = useMemo(() => {
    return () => {
      const exerciseMaxMap: { [exerciseName: string]: number } = {}
      
      // 全ての運動記録から各種目の最大1RMを計算
      exercises.forEach((exercise) => {
        if (exercise.sets && exercise.sets.length > 0) {
          exercise.sets.forEach((set) => {
            const weight = parseFloat(set.weight)
            const reps = parseInt(set.reps)
            
            if (weight > 0 && reps > 0) {
              // 1RM計算: (重量 × 回数) / 40 + 重量
              const oneRM = (weight * reps) / 40 + weight
              
              if (!exerciseMaxMap[exercise.name] || oneRM > exerciseMaxMap[exercise.name]) {
                exerciseMaxMap[exercise.name] = oneRM // 生の値を保存
              }
            }
          })
        }
      })
      
      // 部位別にグループ化
      const bodyPartGroups: { [bodyPart: string]: { name: string; maxOneRM: number }[] } = {}
      
      Object.entries(exerciseMaxMap).forEach(([exerciseName, maxOneRM]) => {
        // 静的な分類マップをまずチェック
        let bodyPart = exerciseBodyPartMap[exerciseName]
        
        // 見つからない場合は、記録画面の分類から動的に検索
        if (!bodyPart) {
          for (const [part, exerciseList] of Object.entries(exercisesByBodyPart)) {
            if (exerciseList.includes(exerciseName)) {
              bodyPart = part
              break
            }
          }
        }
        
        // カスタム種目の分類も確認
        if (!bodyPart) {
          for (const [part, exerciseList] of Object.entries(customExercises)) {
            if (Array.isArray(exerciseList) && exerciseList.includes(exerciseName)) {
              bodyPart = part
              break
            }
          }
        }
        
        // どこにも分類されない場合は「その他」
        if (!bodyPart) {
          bodyPart = 'その他'
        }
        
        if (!bodyPartGroups[bodyPart]) {
          bodyPartGroups[bodyPart] = []
        }
        
        bodyPartGroups[bodyPart].push({ name: exerciseName, maxOneRM: parseFloat(formatToTwoSignificantDigits(maxOneRM)) })
      })
      
      // 各部位内で1RM順にソート
      Object.keys(bodyPartGroups).forEach(bodyPart => {
        bodyPartGroups[bodyPart].sort((a, b) => b.maxOneRM - a.maxOneRM)
      })
      
      return bodyPartGroups
    }
  }, [exercises, customExercises])

  // Firestoreからエクササイズデータを読み込み
  useEffect(() => {
    const loadExercises = async () => {
      try {
        const userPosts = await firestorePosts.getByUser(currentUser.id)
        const userExercises = userPosts.map((post: any) => ({
          ...post.exercise,
          postId: post.id, // 削除用にpostIdを追加
          timestamp: post.timestamp
        }))
        setExercises(userExercises)
        
        // ワークアウト日付を抽出（YYYY-MM-DD形式で統一）
        const dates = new Set<string>()
        userExercises.forEach((exercise: any) => {
          if (exercise.timestamp) {
            // タイムスタンプを解析して日付部分のみを取得
            const timestampStr = exercise.timestamp
            let dateStr = ''
            
            if (timestampStr.includes('/')) {
              // "2024/7/29 14:30" 形式の場合
              const datePart = timestampStr.split(' ')[0] // "2024/7/29"
              const [year, month, day] = datePart.split('/')
              dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            } else {
              // その他の形式の場合は既存の処理
              const date = new Date(timestampStr)
              const year = date.getFullYear()
              const month = (date.getMonth() + 1).toString().padStart(2, '0')
              const day = date.getDate().toString().padStart(2, '0')
              dateStr = `${year}-${month}-${day}`
            }
            
            if (dateStr) {
              dates.add(dateStr)
              console.log('Added workout date:', dateStr, 'from timestamp:', timestampStr)
            }
          }
        })
        setWorkoutDates(dates)
        console.log('All workout dates:', Array.from(dates))
      } catch (error) {
        console.error('Failed to load exercises:', error)
        setExercises([])
        setWorkoutDates(new Set())
      }
    }
    
    loadExercises()

    // Firestoreからカスタム種目を読み込み
    const loadCustomExercises = async () => {
      try {
        const customExercisesList = await firestoreCustomExercises.getByUser(currentUser.id)
        const customExercisesMap: {[key: string]: string[]} = {}
        
        customExercisesList.forEach(exercise => {
          if (!customExercisesMap[exercise.bodyPart]) {
            customExercisesMap[exercise.bodyPart] = []
          }
          customExercisesMap[exercise.bodyPart].push(exercise.exerciseName)
        })
        
        setCustomExercises(customExercisesMap)
        console.log('Loaded custom exercises:', customExercisesMap)
      } catch (error) {
        console.error('Failed to load custom exercises:', error)
        setCustomExercises({})
      }
    }
    
    loadCustomExercises()
    setIsInitialized(true)
  }, [currentUser.id])

  // Firebase移行により、LocalStorage保存は不要

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

  // タイマー関連の状態
  const [isTimerModalOpen, setIsTimerModalOpen] = useState(false)
  const [timerMinutes, setTimerMinutes] = useState(1)
  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(60) // 秒単位
  const [timerInterval, setTimerInterval] = useState<NodeJS.Timeout | null>(null)

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

  const removeExercise = async (exerciseId: number) => {
    const exercise = exercises.find(ex => ex.id === exerciseId)
    if (!exercise) return

    try {
      // Firestoreから投稿を削除
      if (exercise.postId) {
        await firestorePosts.delete(exercise.postId)
      }
      
      // ローカル状態から削除
      const newExercises = exercises.filter((exercise) => exercise.id !== exerciseId)
      setExercises(newExercises)
      
      // グローバル投稿更新のイベントを発火
      window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
      
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('投稿の削除に失敗しました')
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
    
    // 日付をYYYY-MM-DD形式に変換するヘルパー関数
    const formatDateKey = (d: Date) => {
      const y = d.getFullYear()
      const m = (d.getMonth() + 1).toString().padStart(2, '0')
      const day = d.getDate().toString().padStart(2, '0')
      return `${y}-${m}-${day}`
    }
    
    const days = []
    const today = new Date()
    const todayKey = formatDateKey(today)
    
    // 前月の末尾の日々
    for (let i = startDate - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i)
      const dateKey = formatDateKey(prevDate)
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        hasWorkout: workoutDates.has(dateKey),
        isToday: dateKey === todayKey
      })
    }
    
    // 当月の日々
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const dateKey = formatDateKey(date)
      const hasWorkout = workoutDates.has(dateKey)
      
      // デバッグログ（トレーニング記録がある日のみ）
      if (hasWorkout) {
        console.log('Calendar day with workout:', dateKey, 'hasWorkout:', hasWorkout)
      }
      
      days.push({
        date,
        isCurrentMonth: true,
        hasWorkout,
        isToday: dateKey === todayKey
      })
    }
    
    // 次月の最初の日々（42日になるまで）
    const remainingDays = 42 - days.length
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day)
      const dateKey = formatDateKey(nextDate)
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        hasWorkout: workoutDates.has(dateKey),
        isToday: dateKey === todayKey
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

  // 日付クリック時の処理
  const handleDateClick = (date: Date, hasWorkout: boolean) => {
    if (hasWorkout) {
      // 既存の記録がある場合は記録詳細を表示
      const targetDateKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
      
      const dateExercises = exercises.filter(exercise => {
        if (!exercise.timestamp) return false
        
        let exerciseDateKey = ''
        if (exercise.timestamp.includes('/')) {
          // "2024/7/29 14:30" 形式の場合
          const datePart = exercise.timestamp.split(' ')[0] // "2024/7/29"
          const [year, month, day] = datePart.split('/')
          exerciseDateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        } else {
          const exerciseDate = new Date(exercise.timestamp)
          const year = exerciseDate.getFullYear()
          const month = (exerciseDate.getMonth() + 1).toString().padStart(2, '0')
          const day = exerciseDate.getDate().toString().padStart(2, '0')
          exerciseDateKey = `${year}-${month}-${day}`
        }
        
        return exerciseDateKey === targetDateKey
      })

      setSelectedDate(date.toLocaleDateString('ja-JP'))
      setSelectedDateExercises(dateExercises)
      setIsDateDetailOpen(true)
    } else {
      // 記録がない場合は新規記録作成
      setSelectedDateForNewWorkout(date)
      setIsExerciseModalOpen(true)
    }
  }

  const addCustomExercise = async (bodyPart: string, exerciseName: string) => {
    try {
      // Firestoreに保存
      await firestoreCustomExercises.create(currentUser.id, bodyPart, exerciseName)
      
      // ローカル状態を更新
      const updatedCustomExercises = {
        ...customExercises,
        [bodyPart]: [...(customExercises[bodyPart] || []), exerciseName]
      }
      setCustomExercises(updatedCustomExercises)
      
      console.log('Custom exercise added:', bodyPart, exerciseName)
    } catch (error) {
      console.error('Failed to add custom exercise:', error)
      alert('カスタム項目の追加に失敗しました')
    }
  }

  const handleCustomExerciseAdd = (bodyPart: string) => {
    setIsAddingCustomExercise({ bodyPart })
  }

  const handleCustomExerciseSubmit = async () => {
    if (isAddingCustomExercise && customExerciseName.trim()) {
      await addCustomExercise(isAddingCustomExercise.bodyPart, customExerciseName.trim())
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
  const saveGlobalPost = async (exercise: Exercise) => {
    try {
      const postContent = `${exercise.name}を投稿しました！`
      
      console.log('Attempting to save to Firestore...', {
        userId: currentUser.id,
        content: postContent,
        exercise: exercise
      })
      
      // Firestoreに保存
      const savedPost = await firestorePosts.create({
        userId: currentUser.id,
        content: postContent,
        exercise: {
          id: exercise.id,
          name: exercise.name,
          sets: exercise.sets,
          photo: exercise.photo
        },
        timestamp: exercise.timestamp
      })
      
      console.log('Post saved to Firestore successfully:', savedPost)
      
      // カレンダーのワークアウト日付を即座に更新
      const timestampStr = exercise.timestamp
      let dateStr = ''
      
      if (timestampStr.includes('/')) {
        // "2024/7/29 14:30" 形式の場合
        const datePart = timestampStr.split(' ')[0] // "2024/7/29"
        const [year, month, day] = datePart.split('/')
        dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      } else {
        // その他の形式の場合
        const date = new Date(timestampStr)
        const year = date.getFullYear()
        const month = (date.getMonth() + 1).toString().padStart(2, '0')
        const day = date.getDate().toString().padStart(2, '0')
        dateStr = `${year}-${month}-${day}`
      }
      
      if (dateStr) {
        setWorkoutDates(prev => new Set([...prev, dateStr]))
        console.log('Added workout date to calendar:', dateStr)
      }
      
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

  const confirmDeleteExercise = async () => {
    if (exerciseDeleteConfirmation) {
      await removeExercise(exerciseDeleteConfirmation)
      setExerciseDeleteConfirmation(null)
    }
  }

  const cancelDeleteExercise = () => {
    setExerciseDeleteConfirmation(null)
  }

  const updateExercise = async (exerciseId: number, updatedSets: { weight: string; reps: string }[], photo?: string, name?: string) => {
    const targetExercise = exercises.find(exercise => exercise.id === exerciseId)
    if (!targetExercise) return

    const updatedExercise = { 
      ...targetExercise, 
      sets: updatedSets, 
      photo, 
      name: name || targetExercise.name 
    }

    const updatedExercises = exercises.map(exercise => 
      exercise.id === exerciseId ? updatedExercise : exercise
    )
    setExercises(updatedExercises)
    
    // Firestoreの投稿も更新
    try {
      if (targetExercise.postId) {
        const postContent = `${updatedExercise.name}を投稿しました！`
        
        await firestorePosts.update(targetExercise.postId, {
          content: postContent,
          exercise: {
            id: updatedExercise.id,
            name: updatedExercise.name,
            sets: updatedExercise.sets,
            photo: updatedExercise.photo
          }
        })
        
        console.log('Post updated in Firestore successfully:', targetExercise.postId)
        
        // グローバル投稿更新のイベントを発火
        window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
      }
    } catch (error) {
      console.error('Failed to update post in Firestore:', error)
    }
    
    // ローカルストレージに保存
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

  const addExerciseFromDetail = (exerciseName: string, sets: { weight: string; reps: string }[], photo?: string) => {
    const validSets = sets.filter(set => set.weight && set.reps)
    if (validSets.length > 0) {
      // 選択された日付がある場合はその日付を使用、なければ現在日時
      const targetDate = selectedDateForNewWorkout || new Date()
      const timestamp = targetDate.toLocaleString('ja-JP', {
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
    setSelectedDateForNewWorkout(null) // リセット
  }

  // タイマー関連の関数
  const startTimer = () => {
    try {
      const totalSeconds = timerMinutes * 60 + timerSeconds
      setRemainingTime(totalSeconds)
      setIsTimerRunning(true)
      
      const interval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            // タイマー終了
            setIsTimerRunning(false)
            clearInterval(interval)
            setTimerInterval(null)
            
            // ポップアップ表示
            alert('時間です！')
            
            return 0
          }
          return prev - 1
        })
      }, 1000)
      
      setTimerInterval(interval)
    } catch (error) {
      console.error('Error starting timer:', error)
    }
  }

  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
    setIsTimerRunning(false)
  }

  const resetTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      setTimerInterval(null)
    }
    setIsTimerRunning(false)
    const totalSeconds = timerMinutes * 60 + timerSeconds
    setRemainingTime(totalSeconds)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // コンポーネントがアンマウントされるときにタイマーをクリア
  useEffect(() => {
    return () => {
      try {
        if (timerInterval) {
          clearInterval(timerInterval)
        }
      } catch (error) {
        console.error('Error clearing timer:', error)
      }
    }
  }, [timerInterval])

  return (
    <div className="h-full flex flex-col">
      {/* タブ切り替え */}
      <div className="flex-shrink-0">
        <Tabs defaultValue="records" className="w-full">
          <div className="p-2 md:p-4 border-b border-red-200 bg-white/80 backdrop-blur-sm">
            <TabsList className="w-full bg-transparent h-10 md:h-12 lg:h-14">
              <TabsTrigger value="records" className="flex-1 bg-white text-red-600 border border-red-300 hover:bg-red-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25 text-sm font-medium transition-all duration-300 rounded-lg">
                記録
              </TabsTrigger>
              <TabsTrigger value="history" className="flex-1 bg-white text-red-600 border border-red-300 hover:bg-red-50 data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-500 data-[state=active]:to-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-red-500/25 text-sm font-medium transition-all duration-300 rounded-lg">
                履歴
              </TabsTrigger>
            </TabsList>
          </div>
          
          <div className="h-[calc(100vh-200px)]">
            <TabsContent value="history" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-full">
                  {/* カレンダーヘッダー */}
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('prev')}
                      className="p-2 hover:bg-red-50 rounded-lg transition-all duration-300 hover:scale-110"
                    >
                      <ChevronLeft className="h-4 w-4 text-red-500" />
                    </Button>
                    <h3 className="text-xl font-bold text-red-600">
                      {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigateMonth('next')}
                      className="p-2 hover:bg-red-50 rounded-lg transition-all duration-300 hover:scale-110"
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
                          onClick={() => handleDateClick(day.date, hasWorkout)}
                          className={`
                            h-10 flex items-center justify-center text-sm cursor-pointer relative
                            ${isCurrentMonth ? 'text-red-500' : 'text-gray-300'}
                            ${isToday ? 'bg-red-500 text-white rounded-full' : 'hover:bg-gray-100 rounded'}
                            ${hasWorkout && !isToday ? 'border-4 border-red-500 rounded-full bg-red-50' : ''}
                            cursor-pointer
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
                      <div className="w-4 h-4 border-4 border-red-500 rounded-full bg-red-50"></div>
                      <span>トレーニング記録あり</span>
                    </div>
                  </div>

                  {/* 最大1RM表示（部位別） */}
                  <div className="mt-6 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                    <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <Dumbbell className="h-5 w-5 text-red-500" />
                      最大1RM記録（部位別）
                    </h4>
                    <div className="space-y-4">
                      {Object.entries(getMaxOneRMByBodyPart()).map(([bodyPart, exercises]) => (
                        <div key={bodyPart} className="border border-gray-100 rounded-lg p-3">
                          <h5 className="font-bold text-red-600 mb-2 text-sm">{bodyPart}</h5>
                          <div className="space-y-1">
                            {exercises.map((exercise) => (
                              <div key={exercise.name} className="flex justify-between items-center py-1 px-2 bg-gray-50 rounded">
                                <span className="text-sm text-gray-700">{exercise.name}</span>
                                <span className="text-sm font-bold text-red-600">
                                  {exercise.maxOneRM}kg
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {Object.keys(getMaxOneRMByBodyPart()).length === 0 && (
                        <div className="text-center text-gray-400 py-4">
                          <p>記録がありません</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="records" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-full">
                  {Object.entries(getExercisesByDate()).length > 0 ? (
                    Object.entries(getExercisesByDate()).map(([date, dayExercises]) => (
                      <div key={date} className="mb-6 p-4 bg-white rounded-xl border border-red-200 shadow-sm">
                        <h3 className="text-lg font-bold text-red-600 mb-4">
                          {formatDateJapanese(date)}
                        </h3>
                        
                        {/* その日の筋トレ記録 */}
                        <div className="space-y-3 mb-4">
                          {dayExercises.map((exercise) => (
                            <div key={exercise.id} className="p-3 bg-gray-50 rounded-lg border">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-semibold text-gray-800">{exercise.name}</h4>
                                  <p className="text-sm text-gray-500">{exercise.sets.length}セット</p>
                                </div>
                                <div className="text-xs text-gray-400">
                                  {exercise.timestamp.split(' ')[1]}
                                </div>
                              </div>
                              
                              {/* セット詳細 */}
                              <div className="mt-2 space-y-1">
                                {exercise.sets.map((set, index) => (
                                  <div key={index} className="flex gap-4 text-sm text-gray-600">
                                    <span>セット{index + 1}:</span>
                                    <span>{set.weight}kg × {set.reps}回</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* メモ入力欄 */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-gray-700">
                            この日のメモ
                          </label>
                          <textarea
                            value={recordMemo[date] || ''}
                            onChange={(e) => setRecordMemo(prev => ({ ...prev, [date]: e.target.value }))}
                            placeholder="今日のトレーニングについてメモを書いてください..."
                            className="w-full p-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                            rows={3}
                          />
                          
                          {/* 投稿ボタン */}
                          <Button 
                            onClick={() => handleDailyPost(date)}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 rounded-lg shadow-lg transition-all duration-300 hover:scale-[1.02]"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            この日の記録を投稿する
                          </Button>
                          
                          {dailyPost[date] && (
                            <div className="text-sm text-green-600 text-center">
                              ✓ 投稿済み
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <p>まだ記録がありません</p>
                      <p className="text-sm mt-2">筋トレを記録して投稿しましょう！</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>
      </div>
      
      {/* フローティング追加ボタン */}
      <Button
        onClick={() => setIsExerciseModalOpen(true)}
        className="fixed bottom-20 right-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 shadow-2xl shadow-red-500/30 hover:shadow-red-600/40 z-10 transition-all duration-300 hover:scale-110 active:scale-95"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
      
      {/* 種目選択モーダル */}
      <Dialog open={isExerciseModalOpen} onOpenChange={setIsExerciseModalOpen}>
        <DialogContent className="bg-gradient-to-br from-white via-gray-50 to-white border border-red-200/30 text-gray-900 max-w-md max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl shadow-red-500/10 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-black">種目を選択</DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
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
      <Dialog open={isExerciseDetailOpen} onOpenChange={(open) => {
        setIsExerciseDetailOpen(open)
        if (!open) {
          setSelectedDateForNewWorkout(null)
        }
      }}>
        <DialogContent className="bg-gradient-to-br from-white via-gray-50 to-white border border-red-200/30 text-gray-900 max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl shadow-red-500/10 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-black">{currentExercise}</DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
              {selectedDateForNewWorkout 
                ? `${selectedDateForNewWorkout.toLocaleDateString('ja-JP')}の記録として保存されます`
                : 'セットごとの重量や回数を入力してください'
              }
            </DialogDescription>
            
            {/* インラインタイマー */}
            <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/50 shadow-lg backdrop-blur-sm">
              <div className="flex items-center justify-center gap-4">
                <Timer className="h-6 w-6 text-blue-600 animate-pulse" />
                <TimerComponent />
              </div>
            </div>
          </DialogHeader>
          <ExerciseDetail 
            exerciseName={currentExercise} 
            onComplete={addExerciseFromDetail}
            currentUser={currentUser}
            selectedDate={selectedDateForNewWorkout}
          />
        </DialogContent>
      </Dialog>

      {/* 編集モーダル */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="bg-gradient-to-br from-white via-gray-50 to-white border border-red-200/30 text-gray-900 max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl shadow-red-500/10 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-black">{editingExercise?.name}</DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
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
              onDelete={(exerciseId) => {
                handleDeleteExercise(exerciseId)
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
          <div className="bg-white border border-red-200/50 rounded-xl p-6 max-w-sm mx-4 shadow-2xl shadow-red-500/10">
            <h3 className="text-lg font-bold text-black mb-4">削除磺認</h3>
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

      {/* 日付詳細モーダル */}
      <Dialog open={isDateDetailOpen} onOpenChange={(open) => {
        setIsDateDetailOpen(open)
        if (!open) {
          // モーダルを閉じる時にデータを再読み込み
          const loadExercises = async () => {
            try {
              const userPosts = await firestorePosts.getByUser(currentUser.id)
              const userExercises = userPosts.map((post: any) => ({
                ...post.exercise,
                postId: post.id,
                timestamp: post.timestamp
              }))
              setExercises(userExercises)
              
              // ワークアウト日付を再計算
              const dates = new Set<string>()
              userExercises.forEach((exercise: any) => {
                if (exercise.timestamp) {
                  const timestampStr = exercise.timestamp
                  let dateStr = ''
                  
                  if (timestampStr.includes('/')) {
                    const datePart = timestampStr.split(' ')[0]
                    const [year, month, day] = datePart.split('/')
                    dateStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
                  } else {
                    const date = new Date(timestampStr)
                    const year = date.getFullYear()
                    const month = (date.getMonth() + 1).toString().padStart(2, '0')
                    const day = date.getDate().toString().padStart(2, '0')
                    dateStr = `${year}-${month}-${day}`
                  }
                  
                  if (dateStr) {
                    dates.add(dateStr)
                  }
                }
              })
              setWorkoutDates(dates)
            } catch (error) {
              console.error('Failed to reload exercises:', error)
            }
          }
          loadExercises()
        }
      }}>
        <DialogContent className="bg-gradient-to-br from-white via-gray-50 to-white border border-red-200/30 text-gray-900 max-w-md max-h-[80vh] overflow-y-auto rounded-2xl shadow-2xl shadow-red-500/10 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-black">{selectedDate}のトレーニング記録</DialogTitle>
            <DialogDescription className="text-gray-600 text-sm">
              この日に記録したトレーニングです
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedDateExercises.length > 0 ? (
              selectedDateExercises.map((exercise) => (
                <div key={exercise.id} className="border border-red-200/50 rounded-xl p-4 bg-white hover:bg-red-50 shadow-md hover:shadow-lg transition-all duration-300 relative">
                  {/* 編集ボタン */}
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-gray-600 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all duration-300"
                      onClick={() => handleEditExercise(exercise)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex gap-4">
                    {/* 左側：情報エリア */}
                    <div className="w-1/2">
                      {/* 項目名、時間、セット数 */}
                      <div className="mb-3">
                        <h3 className="font-bold text-sm text-black">{exercise.name}</h3>
                        <p className="text-xs text-gray-500 font-medium">{exercise.timestamp}</p>
                        <p className="text-xs text-gray-600 mt-1">{exercise.sets.length}セット</p>
                      </div>
                      

                      {/* セット詳細 */}
                      <div className="space-y-2">
                        {exercise.sets.map((set, setIndex) => {
                          // 1RM計算: (重量 × 回数) / 40 + 重量
                          const weight = parseFloat(set.weight) || 0
                          const reps = parseFloat(set.reps) || 0
                          const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
                          
                          return (
                            <div key={setIndex} className="flex items-center gap-2">
                              <div className="w-6 text-xs text-center text-black font-bold">{setIndex + 1}</div>
                              <div className="w-16">
                                <div className="bg-red-100 border border-red-300 rounded-lg px-2 py-1 text-center text-xs text-gray-900 font-medium">
                                  {set.weight || '0'}kg
                                </div>
                              </div>
                              <div className="text-xs text-black font-bold">×</div>
                              <div className="w-16">
                                <div className="bg-red-100 border border-red-300 rounded-lg px-2 py-1 text-center text-xs text-gray-900 font-medium">
                                  {set.reps || '0'}回
                                </div>
                              </div>
                              <div className="w-20">
                                <div className="bg-blue-100 border border-blue-300 rounded-lg px-2 py-1 text-center text-xs text-blue-900 font-medium">
                                  {oneRM > 0 ? `${formatToTwoSignificantDigits(oneRM)}kg` : '0kg'}
                                </div>
                              </div>
                              <div className="text-xs text-blue-600 font-medium">1RM</div>
                            </div>
                          )
                        })}
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
              <div className="text-center py-8 text-gray-600">
                <Dumbbell className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm">この日の記録はありません</p>
              </div>
            )}
            
            {/* この日に記録を追加ボタン */}
            <div className="pt-4 border-t border-red-200/50">
              <Button
                onClick={() => {
                  if (selectedDate) {
                    const [year, month, day] = selectedDate.split('/').map(Number)
                    const targetDate = new Date(year, month - 1, day)
                    setSelectedDateForNewWorkout(targetDate)
                    setIsDateDetailOpen(false)
                    setIsExerciseModalOpen(true)
                  }
                }}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-lg py-3 rounded-lg transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                この日に記録を追加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
  postId?: string
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
    <div className="space-y-6 p-1">
{Object.entries(exercisesByBodyPart).map(([bodyPart, exercises]) => {
        const customExercisesForBodyPart = customExercises?.[bodyPart] || []
        const deletedExercises = customExercises?.['_deleted'] || []
        const filteredDefaultExercises = exercises.filter(ex => !deletedExercises.includes(ex))
        const allExercises = [...filteredDefaultExercises, ...customExercisesForBodyPart]
        
        return (
          <div key={bodyPart} className="space-y-2">
            <h3 className="font-bold text-red-600 border-b border-red-200 pb-2 text-lg">
              {bodyPart}
            </h3>
            <div className="space-y-1">
              {allExercises.map((exercise) => {
                const isCustomExercise = customExercisesForBodyPart.includes(exercise)
                const isEditing = editingExercise?.bodyPart === bodyPart && editingExercise?.oldName === exercise
                
                return isEditing ? (
                  <div key={exercise} className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm">
                    <Input
                      type="text"
                      value={editingExercise.newName}
                      onChange={(e) => onEditNameChange?.(e.target.value)}
                      placeholder="種目名を編集"
                      className="bg-white border-red-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 rounded-lg"
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
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50 bg-white rounded-lg transition-all duration-300"
                        onClick={onEditCancel}
                      >
                        キャンセル
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-600/30 transition-all duration-300 hover:scale-105 rounded-lg"
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
                      className="flex-1 justify-start text-left text-gray-800 hover:bg-red-50 hover:text-red-600 transition-all duration-300 hover:scale-105 rounded-lg"
                      onClick={() => onSelect(exercise)}
                    >
                      {exercise}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all duration-300 hover:scale-110"
                      onClick={() => onEditExercise?.(bodyPart, exercise)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
              
              {isAddingCustom?.bodyPart === bodyPart ? (
                <div className="space-y-3 p-4 bg-red-50 rounded-xl border border-red-200 shadow-sm">
                  <Input
                    type="text"
                    value={customExerciseName || ""}
                    onChange={(e) => onCustomNameChange?.(e.target.value)}
                    placeholder="新しい種目名を入力"
                    className="bg-white border-red-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 rounded-lg"
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
                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 bg-white rounded-lg transition-all duration-300"
                      onClick={onCustomCancel}
                    >
                      キャンセル
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-600/30 transition-all duration-300 hover:scale-105 rounded-lg"
                      onClick={onCustomSubmit}
                    >
                      追加
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-left text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-300 hover:scale-105 rounded-lg border border-red-200 hover:border-red-300"
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
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-sm mx-4 shadow-2xl shadow-red-500/20">
            <h3 className="text-xl font-bold text-red-600 mb-4">削除確認</h3>
            <p className="text-gray-700 mb-6">
              削除してもいいですか？削除するとデータも削除されてしまいます。
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 bg-white rounded-lg transition-all duration-300"
                onClick={() => onDeleteConfirmation?.(false)}
              >
                いいえ
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-600/30 transition-all duration-300 hover:scale-105 rounded-lg"
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
  onCancel,
  onDelete
}: { 
  exercise: Exercise
  onUpdate: (exerciseId: number, sets: { weight: string; reps: string }[], photo?: string, name?: string) => void
  customExercises: {[key: string]: string[]}
  onCancel: () => void
  onDelete?: (exerciseId: number) => void
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
  
  // 有効数字2桁でフォーマットする関数
  const formatToTwoSignificantDigits = (num: number): string => {
    if (num === 0) return '0'
    if (num < 0.01) return '0.01'
    
    const magnitude = Math.floor(Math.log10(Math.abs(num)))
    const factor = Math.pow(10, 1 - magnitude)
    const rounded = Math.round(num * factor) / factor
    
    if (rounded >= 100) {
      return Math.round(rounded).toString()
    } else if (rounded >= 10) {
      return rounded.toFixed(1)
    } else {
      return rounded.toFixed(2)
    }
  }
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ setId: number; setIndex: number } | null>(null)
  const [photo, setPhoto] = useState<string>(exercise.photo || "")
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
    onUpdate(exercise.id, setsData, photo, exerciseName)
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
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="text-sm font-medium text-gray-700">セット</div>
          <div className="text-sm font-medium text-gray-700">重さ</div>
          <div className="text-sm font-medium text-gray-700">回数</div>
          <div className="text-sm font-medium text-gray-700">1RM</div>
        </div>
        
        {sets.map((set, index) => {
          // 1RM計算: (重量 × 回数) / 40 + 重量
          const weight = parseFloat(set.weight) || 0
          const reps = parseFloat(set.reps) || 0
          const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
          
          return (
          <div key={set.id} className="grid grid-cols-4 gap-4 items-center">
            <div className="text-center">
              <button
                onClick={() => handleSetClick(set.id, index)}
                className={`w-10 h-10 rounded-full font-medium text-sm transition-colors duration-200 ${
                  sets.length <= 1 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
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
                  className="h-10 bg-white border-gray-300 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 rounded-lg transition-colors duration-200"
                  placeholder="重さ"
                  inputMode="decimal"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleFieldClick(set.id, 'weight', set.weight)}
                  className="w-full h-10 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-gray-800 transition-colors duration-200"
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
                  className="h-10 bg-white border-gray-300 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 rounded-lg transition-colors duration-200"
                  placeholder="回数"
                  inputMode="numeric"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleFieldClick(set.id, 'reps', set.reps)}
                  className="w-full h-10 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-gray-800 transition-colors duration-200"
                >
                  {set.reps || "0"}
                </button>
              )}
            </div>
            <div className="text-center">
              <div className="h-10 bg-white rounded-lg border border-gray-200 text-gray-800 font-medium text-sm flex items-center justify-center">
                {oneRM > 0 ? `${formatToTwoSignificantDigits(oneRM)}kg` : '0kg'}
              </div>
            </div>
            </div>
          )
        })}
        
        {/* セット追加ボタン */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addSet}
            className="border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-800 transition-colors duration-200 rounded-lg"
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
            <Camera className="h-5 w-5 text-red-600" />
            <span className="text-sm font-semibold text-red-600">写真</span>
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
              className="flex-1 p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 text-center text-sm cursor-pointer text-red-600 hover:text-red-700 transition-all duration-300 hover:scale-105"
            >
              写真を選択
            </label>
            {photo && (
              <button
                onClick={() => setPhoto("")}
                className="px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg border-none text-sm text-white transition-all duration-300 hover:scale-105 shadow-lg shadow-red-500/25"
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
                className="w-full h-32 object-cover rounded-xl border border-red-200 shadow-sm"
              />
            </div>
          )}
        </div>

      </div>

      {/* アクションボタン */}
      <div className="flex gap-2 pt-4">
        <Button 
          variant="outline"
          className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800"
          onClick={onCancel}
        >
          キャンセル
        </Button>
        <Button 
          variant="outline"
          className="flex-1 border-red-600 text-red-400 hover:bg-red-900/50"
          onClick={() => onDelete?.(exercise.id)}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          削除
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
  currentUser,
  selectedDate
}: { 
  exerciseName: string
  onComplete: (exerciseName: string, sets: { weight: string; reps: string }[], photo?: string) => void
  currentUser: UserAccount
  selectedDate?: Date | null
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
  
  // 有効数字2桁でフォーマットする関数
  const formatToTwoSignificantDigits = (num: number): string => {
    if (num === 0) return '0'
    if (num < 0.01) return '0.01'
    
    const magnitude = Math.floor(Math.log10(Math.abs(num)))
    const factor = Math.pow(10, 1 - magnitude)
    const rounded = Math.round(num * factor) / factor
    
    if (rounded >= 100) {
      return Math.round(rounded).toString()
    } else if (rounded >= 10) {
      return rounded.toFixed(1)
    } else {
      return rounded.toFixed(2)
    }
  }

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
    onComplete(exerciseName, setsData, photo)
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
    <div className="space-y-6 p-1">
      {/* 前回の履歴 */}
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-2">前回の記録 ({previousHistory.date})</h3>
        <div className="space-y-1">
          {previousHistory.sets.length > 0 ? (
            previousHistory.sets.map((set: any, index: number) => (
              <div key={index} className="text-sm text-gray-700">
                セット{index + 1}: {set.weight}kg × {set.reps}回
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-600">
              {exerciseName}の記録はまだありません
            </div>
          )}
        </div>
      </div>

      {/* セット入力 */}
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="text-sm font-medium text-gray-700">セット</div>
          <div className="text-sm font-medium text-gray-700">重さ</div>
          <div className="text-sm font-medium text-gray-700">回数</div>
          <div className="text-sm font-medium text-gray-700">1RM</div>
        </div>
        
        {sets.map((set, index) => {
          // 1RM計算: (重量 × 回数) / 40 + 重量
          const weight = parseFloat(set.weight) || 0
          const reps = parseFloat(set.reps) || 0
          const oneRM = weight > 0 && reps > 0 ? (weight * reps) / 40 + weight : 0
          
          return (
            <div key={set.id} className="grid grid-cols-4 gap-4 items-center">
            <div className="text-center">
              <button
                onClick={() => handleSetClick(set.id, index)}
                className={`w-10 h-10 rounded-full font-medium text-sm transition-colors duration-200 ${
                  sets.length <= 1 
                    ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
                    : 'bg-red-600 hover:bg-red-700 text-white'
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
                  className="h-10 bg-white border-gray-300 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 rounded-lg transition-colors duration-200"
                  placeholder="重さ"
                  inputMode="decimal"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleFieldClick(set.id, 'weight', set.weight)}
                  className="w-full h-10 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-gray-800 transition-colors duration-200"
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
                  className="h-10 bg-white border-gray-300 text-center text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400 rounded-lg transition-colors duration-200"
                  placeholder="回数"
                  inputMode="numeric"
                  autoFocus
                />
              ) : (
                <button
                  onClick={() => handleFieldClick(set.id, 'reps', set.reps)}
                  className="w-full h-10 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 text-gray-800 transition-colors duration-200"
                >
                  {set.reps || "0"}
                </button>
              )}
            </div>
            <div className="text-center">
              <div className="h-10 bg-white rounded-lg border border-gray-200 text-gray-800 font-medium text-sm flex items-center justify-center">
                {oneRM > 0 ? `${formatToTwoSignificantDigits(oneRM)}kg` : '0kg'}
              </div>
            </div>
            </div>
          )
        })}
        
        {/* セット追加ボタン */}
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={addSet}
            className="border-gray-300 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-800 transition-colors duration-200 rounded-lg"
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
            <Camera className="h-5 w-5 text-red-600" />
            <span className="text-sm font-semibold text-red-600">写真</span>
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
              className="flex-1 p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 text-center text-sm cursor-pointer text-red-600 hover:text-red-700 transition-all duration-300 hover:scale-105"
            >
              写真を選択
            </label>
            {photo && (
              <button
                onClick={() => setPhoto("")}
                className="px-4 py-3 bg-red-500 hover:bg-red-600 rounded-lg border-none text-sm text-white transition-all duration-300 hover:scale-105 shadow-lg shadow-red-500/25"
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
                className="w-full h-32 object-cover rounded-xl border border-red-200 shadow-sm"
              />
            </div>
          )}
        </div>

      </div>

      {/* アクションボタン */}
      <div className="flex pt-4">
        <Button 
          className="w-full bg-red-600 hover:bg-red-700 text-white font-medium text-lg py-3 rounded-lg transition-colors duration-200"
          onClick={handlePost}
        >
          <Save className="h-4 w-4 mr-1" /> 記録
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

// インラインタイマーコンポーネント
function TimerComponent() {
  const [timerSeconds, setTimerSeconds] = useState(60)
  const [remainingTime, setRemainingTime] = useState(60)
  const [isRunning, setIsRunning] = useState(false)
  const [isEditingTime, setIsEditingTime] = useState(false)
  const [editValue, setEditValue] = useState('60')
  const [interval, setIntervalRef] = useState<NodeJS.Timeout | null>(null)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startTimer = () => {
    if (isRunning) {
      // 停止
      if (interval) {
        clearInterval(interval)
        setIntervalRef(null)
      }
      setIsRunning(false)
    } else {
      // 開始
      setIsRunning(true)
      const newInterval = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            clearInterval(newInterval)
            setIntervalRef(null)
            alert('時間です！')
            return timerSeconds // リセット
          }
          return prev - 1
        })
      }, 1000)
      setIntervalRef(newInterval)
    }
  }

  const handleTimeClick = () => {
    if (!isRunning) {
      setIsEditingTime(true)
      setEditValue(timerSeconds.toString())
    }
  }

  const handleTimeSubmit = () => {
    const newTime = parseInt(editValue) || 60
    setTimerSeconds(newTime)
    setRemainingTime(newTime)
    setIsEditingTime(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTimeSubmit()
    }
  }

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (interval) {
        clearInterval(interval)
      }
    }
  }, [interval])

  return (
    <div className="flex items-center gap-4">
      {isEditingTime ? (
        <input
          type="number"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleTimeSubmit}
          onKeyPress={handleKeyPress}
          className="w-20 px-3 py-2 text-center bg-white border border-gray-300 rounded-lg text-gray-800 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
          autoFocus
        />
      ) : (
        <button
          onClick={handleTimeClick}
          className={`text-2xl font-medium transition-all duration-300 cursor-pointer px-3 py-2 rounded-lg bg-white border border-gray-200 ${
            isRunning 
              ? 'text-red-600 animate-pulse' 
              : 'text-gray-800 hover:text-gray-600 hover:border-gray-300'
          }`}
          disabled={isRunning}
        >
          {formatTime(remainingTime)}
        </button>
      )}
      
      <Button
        onClick={startTimer}
        size="sm"
        className={`${
          isRunning 
            ? 'bg-red-600 hover:bg-red-700' 
            : 'bg-green-600 hover:bg-green-700'
        } text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200`}
      >
        {isRunning ? 'STOP' : 'START'}
      </Button>
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
