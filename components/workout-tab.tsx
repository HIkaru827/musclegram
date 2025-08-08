"use client"

import { useState, useEffect, useMemo, useCallback, memo } from "react"
import { firestorePosts, firestoreCustomExercises } from "@/lib/firestore-utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Dumbbell, Plus, Minus, Share2, Save, Clock, Trash2, ChevronRight, Camera, FileText, ChevronLeft, ChevronRight as ChevronRightIcon, Edit, Edit2, MoreVertical, Timer, Play, Pause, RotateCcw } from "lucide-react"
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
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set())
  const [customExercises, setCustomExercises] = useState<{[key: string]: string[]}>({})
  const [isAddingCustomExercise, setIsAddingCustomExercise] = useState<{bodyPart: string} | null>(null)
  const [customExerciseName, setCustomExerciseName] = useState<string>("")
  const [editingExerciseName, setEditingExerciseName] = useState<{bodyPart: string, oldName: string, newName: string} | null>(null)
  const [deleteConfirmation, setDeleteConfirmation] = useState<{bodyPart: string, exerciseName: string} | null>(null)
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null)
  const [exerciseDeleteConfirmation, setExerciseDeleteConfirmation] = useState<number | null>(null)
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

  // 今日の日付のエクササイズのみを取得する関数
  const getTodaysExercises = () => {
    const today = new Date().toISOString().split('T')[0] // 今日の日付 (YYYY-MM-DD)
    const todaysExercises: Exercise[] = []
    
    console.log('Getting today\'s exercises, today:', today)
    console.log('All exercises:', exercises)
    
    // exercisesが配列であることを確認
    if (!Array.isArray(exercises)) {
      return todaysExercises
    }
    
    exercises.forEach((exercise) => {
      if (!exercise || !exercise.timestamp) {
        return // 不正なデータをスキップ
      }
      
      const exerciseDate = exercise.timestamp.split(' ')[0] // 日付部分のみを取得
      console.log('Comparing exercise date:', exerciseDate, 'with today:', today)
      if (exerciseDate === today) {
        console.log('Found today\'s exercise:', exercise)
        todaysExercises.push(exercise)
      }
    })
    
    console.log('Today\'s exercises found:', todaysExercises)
    return todaysExercises
  }

  // 今日の日付の記録を取得（表示用）
  const getTodaysRecords = () => {
    const today = new Date().toISOString().split('T')[0]
    const todaysExercises = getTodaysExercises()
    
    if (todaysExercises.length === 0) {
      return {}
    }
    
    return { [today]: todaysExercises }
  }

  // 日付を○月○日形式でフォーマットする関数
  const formatDateJapanese = (dateStr: string): string => {
    const date = new Date(dateStr)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }

  // 記録編集機能
  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise)
    setCurrentExercise(exercise.name)
    setIsExerciseDetailOpen(true)
  }

  // 編集された記録を更新する関数
  const handleUpdateExercise = async (updatedExercise: Exercise) => {
    try {
      // ローカル状態を更新
      const updatedExercises = exercises.map(exercise => 
        exercise.id === updatedExercise.id ? updatedExercise : exercise
      )
      setExercises(updatedExercises)
      
      // ローカルストレージも更新
      localStorage.setItem(`workoutExercises_${currentUser.id}`, JSON.stringify(updatedExercises))
      
      // 投稿済みの場合、Firestoreの投稿も更新
      if (updatedExercise.postId) {
        await updatePostedWorkout(updatedExercise)
      }
      
      // グローバル投稿更新のイベントを発火
      window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
      
      alert('記録が更新されました！')
    } catch (error) {
      console.error('記録の更新に失敗:', error)
      alert('記録の更新に失敗しました')
    }
  }

  // 投稿済みワークアウトをFirestoreで更新
  const updatePostedWorkout = async (updatedExercise: Exercise) => {
    if (!updatedExercise.postId) return

    try {
      // 既存の投稿を取得
      const existingPost = await firestorePosts.get(updatedExercise.postId)
      if (!existingPost) return

      // 投稿がHevyスタイルか旧スタイルかを判定して更新
      if (existingPost.workout && existingPost.workout.exercises) {
        // Hevyスタイル: workoutデータを更新
        const updatedWorkout = { ...existingPost.workout }
        
        // 該当する種目を更新
        updatedWorkout.exercises = updatedWorkout.exercises.map((ex: any) => {
          if (ex.name === updatedExercise.name) {
            return {
              ...ex,
              sets: updatedExercise.sets || [],
              photo: updatedExercise.photo,
              maxWeight: updatedExercise.sets ? Math.max(...updatedExercise.sets.map(set => parseFloat(set.weight) || 0)) : 0,
              totalReps: updatedExercise.sets ? updatedExercise.sets.reduce((total, set) => total + (parseInt(set.reps) || 0), 0) : 0,
              totalVolume: updatedExercise.sets ? updatedExercise.sets.reduce((vol, set) => 
                vol + ((parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0)), 0) : 0
            }
          }
          return ex
        })
        
        // 全体統計を再計算
        updatedWorkout.totalSets = updatedWorkout.exercises.reduce((total: number, ex: any) => total + (ex.sets?.length || 0), 0)
        updatedWorkout.totalReps = updatedWorkout.exercises.reduce((total: number, ex: any) => total + (ex.totalReps || 0), 0)
        updatedWorkout.totalVolume = updatedWorkout.exercises.reduce((total: number, ex: any) => total + (ex.totalVolume || 0), 0)
        
        await firestorePosts.update(updatedExercise.postId, { workout: updatedWorkout })
      } else {
        // 旧スタイル: exerciseデータを直接更新
        await firestorePosts.update(updatedExercise.postId, {
          exercise: {
            id: updatedExercise.id,
            name: updatedExercise.name,
            sets: updatedExercise.sets,
            photo: updatedExercise.photo
          }
        })
      }
    } catch (error) {
      console.error('Firestore投稿の更新に失敗:', error)
      throw error
    }
  }

  // 今日の投稿をみんなの投稿に送信する関数
  const handleTodayPost = async () => {
    const today = new Date().toISOString().split('T')[0]
    const memo = recordMemo[today] || ''
    const todaysExercises = getTodaysExercises()
    
    if (todaysExercises.length === 0) {
      alert('投稿する記録がありません')
      return
    }
    
    try {
      // Hevyスタイルの投稿データを作成
      const workoutSummary = {
        totalExercises: todaysExercises.length,
        totalSets: todaysExercises.reduce((total, ex) => total + (ex.sets?.length || 0), 0),
        totalReps: todaysExercises.reduce((total, ex) => 
          total + (ex.sets?.reduce((reps, set) => reps + (parseInt(set.reps) || 0), 0) || 0), 0),
        totalVolume: todaysExercises.reduce((total, ex) => 
          total + (ex.sets?.reduce((vol, set) => 
            vol + ((parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0)), 0) || 0), 0),
        duration: 'N/A', // 今後の実装でワークアウト時間を追加可能
        exercises: todaysExercises.map(ex => ({
          name: ex.name,
          sets: ex.sets || [],
          photo: ex.photo,
          bodyPart: ex.bodyPart || 'その他',
          maxWeight: ex.sets ? Math.max(...ex.sets.map(set => parseFloat(set.weight) || 0)) : 0,
          totalReps: ex.sets ? ex.sets.reduce((total, set) => total + (parseInt(set.reps) || 0), 0) : 0,
          totalVolume: ex.sets ? ex.sets.reduce((vol, set) => 
            vol + ((parseFloat(set.weight) || 0) * (parseInt(set.reps) || 0)), 0) : 0
        }))
      }

      const postData = {
        userId: currentUser.id,
        userName: currentUser.displayName,
        userAvatar: currentUser.avatar,
        content: memo || `💪 今日のワークアウト完了！`,
        workout: workoutSummary, // Hevyスタイルのワークアウトデータ
        date: today,
        timestamp: new Date().toISOString(),
        likes: 0,
        comments: [],
        type: 'workout' // 投稿タイプを明確化
      }
      
      const result = await firestorePosts.create(postData)
      console.log('投稿成功:', result)
      setDailyPost(prev => ({ ...prev, [today]: memo }))
      
      // 投稿後、今日の記録にpostIdを付与して投稿済みとしてマーク
      const updatedExercises = exercises.map(exercise => {
        const exerciseDate = exercise.timestamp.split(' ')[0]
        if (exerciseDate === today && !exercise.postId) {
          return { ...exercise, postId: result.id }
        }
        return exercise
      })
      setExercises(updatedExercises)
      
      // ローカルストレージの今日の未投稿記録を投稿済みに更新
      const localExercisesJson = localStorage.getItem(`workoutExercises_${currentUser.id}`)
      if (localExercisesJson) {
        const localExercises = JSON.parse(localExercisesJson)
        const updatedLocalExercises = localExercises.map((exercise: any) => {
          const exerciseDate = exercise.timestamp.split(' ')[0]
          if (exerciseDate === today && !exercise.postId) {
            return { ...exercise, postId: result.id }
          }
          return exercise
        })
        localStorage.setItem(`workoutExercises_${currentUser.id}`, JSON.stringify(updatedLocalExercises))
      }
      
      // グローバル投稿更新のイベントを発火
      window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
      
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
      if (Array.isArray(exercises)) {
        exercises.forEach((exercise) => {
          if (exercise && exercise.sets && Array.isArray(exercise.sets) && exercise.sets.length > 0) {
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
      }
      
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
        // Firestoreからの投稿済み記録を取得
        const userPosts = await firestorePosts.getByUser(currentUser.id)
        const firestoreExercises: Exercise[] = []
        
        userPosts.forEach((post: any) => {
          if (post.workout && post.workout.exercises) {
            // Hevyスタイルの投稿: workout.exercisesから個別の記録を復元
            post.workout.exercises.forEach((ex: any) => {
              firestoreExercises.push({
                id: `${post.id}-${ex.name}`,
                name: ex.name,
                sets: ex.sets || [],
                photo: ex.photo,
                timestamp: post.timestamp,
                postId: post.id
              })
            })
          } else if (post.exercise) {
            // 旧スタイルの投稿: 直接exerciseデータを使用
            firestoreExercises.push({
              ...post.exercise,
              postId: post.id,
              timestamp: post.timestamp
            })
          }
        })
        
        // ローカルストレージからの未投稿記録を取得
        const localExercisesJson = localStorage.getItem(`workoutExercises_${currentUser.id}`)
        const localExercises = localExercisesJson ? JSON.parse(localExercisesJson) : []
        
        // 重複を除去してマージ（postIdがあるものは投稿済み、ないものは未投稿）
        const allExercises = [...firestoreExercises, ...localExercises.filter((local: any) => !local.postId)]
        
        console.log('Loaded exercises:', { firestoreCount: firestoreExercises.length, localCount: localExercises.length, totalCount: allExercises.length })
        setExercises(allExercises)
        
        // ワークアウト日付を抽出（YYYY-MM-DD形式で統一）
        const dates = new Set<string>()
        allExercises.forEach((exercise: any) => {
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

    // ローカルストレージ更新時にデータを再読み込み
    const handleStorageUpdate = () => {
      console.log('Storage updated, reloading exercises...')
      loadExercises()
    }

    // タブ切り替え時や投稿更新時にもリロード
    const handleGlobalUpdate = () => {
      console.log('Global update detected, reloading exercises...')
      loadExercises()
    }
    
    window.addEventListener('workoutDataUpdated', handleStorageUpdate)
    window.addEventListener('localStorageUpdate', handleStorageUpdate)
    window.addEventListener('globalPostsUpdated', handleGlobalUpdate)
    window.addEventListener('focus', handleGlobalUpdate) // ウィンドウフォーカス時

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

    // クリーンアップ関数
    return () => {
      window.removeEventListener('workoutDataUpdated', handleStorageUpdate)
      window.removeEventListener('localStorageUpdate', handleStorageUpdate)
      window.removeEventListener('globalPostsUpdated', handleGlobalUpdate)
      window.removeEventListener('focus', handleGlobalUpdate)
    }
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
      
      // ローカルストレージからも削除
      const localExercisesJson = localStorage.getItem(`workoutExercises_${currentUser.id}`)
      if (localExercisesJson) {
        const localExercises = JSON.parse(localExercisesJson)
        const updatedLocalExercises = localExercises.filter((ex: any) => ex.id !== exerciseId)
        localStorage.setItem(`workoutExercises_${currentUser.id}`, JSON.stringify(updatedLocalExercises))
      }
      
      // グローバル投稿更新のイベントを発火
      window.dispatchEvent(new CustomEvent('globalPostsUpdated'))
      
    } catch (error) {
      console.error('Failed to delete post:', error)
      alert('投稿の削除に失敗しました')
    }
  }


  // 日付クリック時の処理（新規記録作成用）
  const handleDateClick = (date: Date) => {
    // 新規記録作成
    setSelectedDateForNewWorkout(date)
    setIsExerciseModalOpen(true)
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

  // グローバル投稿として保存（現在は使用していない - 記録tabの投稿ボタンでまとめて投稿）
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

  const handleEditExerciseOld = (exercise: Exercise) => {
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
      
      // ISO形式の日付と時刻を作成（YYYY-MM-DD HH:mm形式）
      const year = targetDate.getFullYear()
      const month = String(targetDate.getMonth() + 1).padStart(2, '0')
      const day = String(targetDate.getDate()).padStart(2, '0')
      const hours = String(targetDate.getHours()).padStart(2, '0')
      const minutes = String(targetDate.getMinutes()).padStart(2, '0')
      const timestamp = `${year}-${month}-${day} ${hours}:${minutes}`
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
        
        // 個別記録では投稿しない（記録tabの投稿ボタンでまとめて投稿）
        
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
            
            // 個別記録では投稿しない
            
            alert('ストレージ容量不足のため、古いデータを削除しました。')
          } catch (retryError) {
            console.error('Retry save failed:', retryError)
            alert('データの保存に失敗しました。ブラウザのデータをクリアしてください。')
          }
        }
      }
      
      // 記録が保存された後にモーダルを閉じる
      setIsExerciseDetailOpen(false)
      setSelectedDateForNewWorkout(null) // リセット
    } else {
      alert('有効なセット（重量と回数の両方が入力されている）がありません')
    }
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
            </TabsList>
          </div>
          
          <div className="h-[calc(100vh-200px)]">
            <TabsContent value="records" className="m-0 h-full">
              <ScrollArea className="h-full">
                <div className="p-4 bg-gradient-to-br from-gray-50 to-white min-h-full">
                  {Object.entries(getTodaysRecords()).length > 0 ? (
                    Object.entries(getTodaysRecords()).map(([date, dayExercises]) => (
                      <div key={date} className="mb-6 p-4 bg-white rounded-xl border border-red-200 shadow-sm">
                        <h3 className="text-lg font-bold text-red-600 mb-4">
                          {formatDateJapanese(date)}
                        </h3>
                        
                        {/* その日の筋トレ記録 */}
                        <div className="space-y-3 mb-4">
                          {dayExercises.map((exercise, index) => (
                            <div key={exercise.id || `exercise-${index}-${exercise.timestamp}`} className="p-3 bg-gray-50 rounded-lg border">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <h4 className="font-semibold text-gray-800">{exercise.name}</h4>
                                  <p className="text-sm text-gray-500">{exercise.sets && Array.isArray(exercise.sets) ? exercise.sets.length : 0}セット</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-gray-400">
                                    {exercise.timestamp.split(' ')[1]}
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 border-red-300 text-red-600 hover:bg-red-50"
                                    onClick={() => handleEditExercise(exercise)}
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* セット詳細 */}
                              <div className="mt-2 space-y-1">
                                {exercise.sets && Array.isArray(exercise.sets) ? exercise.sets.map((set, index) => (
                                  <div key={index} className="flex gap-4 text-sm text-gray-600">
                                    <span>セット{index + 1}:</span>
                                    <span>{set.weight}kg × {set.reps}回</span>
                                  </div>
                                )) : null}
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
                            onClick={() => handleTodayPost()}
                            className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium py-3 rounded-lg shadow-lg transition-all duration-300 hover:scale-[1.02]"
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            今日の記録を投稿する
                          </Button>
                          
                          {dailyPost[new Date().toISOString().split('T')[0]] && (
                            <div className="text-sm text-green-600 text-center">
                              ✓ 投稿済み
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-400 py-8">
                      <p>今日の記録がまだありません</p>
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
            editingExercise={editingExercise}
            onEditComplete={async (updatedExercise) => {
              await handleUpdateExercise(updatedExercise)
              setEditingExercise(null)
              setIsExerciseDetailOpen(false)
            }}
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
  selectedDate,
  editingExercise,
  onEditComplete
}: { 
  exerciseName: string
  onComplete: (exerciseName: string, sets: { weight: string; reps: string }[], photo?: string) => void
  currentUser: UserAccount
  selectedDate?: Date | null
  editingExercise?: Exercise | null
  onEditComplete?: (exercise: Exercise) => void
}) {
  const [sets, setSets] = useState([
    { id: 1, weight: "", reps: "" },
    { id: 2, weight: "", reps: "" },
    { id: 3, weight: "", reps: "" },
  ])

  // 編集モード時に既存データを設定
  useEffect(() => {
    if (editingExercise && editingExercise.sets) {
      const existingSets = editingExercise.sets.map((set, index) => ({
        id: index + 1,
        weight: set.weight,
        reps: set.reps
      }))
      
      // 最低3セット分を確保
      while (existingSets.length < 3) {
        existingSets.push({ id: existingSets.length + 1, weight: "", reps: "" })
      }
      
      setSets(existingSets)
      if (editingExercise.photo) {
        setPhoto(editingExercise.photo)
      }
    }
  }, [editingExercise])
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
    // 編集モードか新規作成かで処理を分岐
    if (editingExercise && onEditComplete) {
      // 編集モード: 既存のエクササイズを更新
      const updatedExercise: Exercise = {
        ...editingExercise,
        sets: sets.filter(set => set.weight && set.reps).map(set => ({
          weight: set.weight,
          reps: set.reps
        })),
        photo: photo || editingExercise.photo,
        timestamp: editingExercise.timestamp // 元のタイムスタンプを保持
      }
      onEditComplete(updatedExercise)
    } else {
      // 新規作成モード
      const setsData = sets.map(set => ({
        weight: set.weight,
        reps: set.reps
      }))
      onComplete(exerciseName, setsData, photo)
    }
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
          <Save className="h-4 w-4 mr-1" /> 
          {editingExercise ? '更新' : '記録'}
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
