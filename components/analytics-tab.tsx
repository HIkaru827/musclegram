"use client"

import { useState, useEffect } from "react"
import { firestorePosts } from "@/lib/firestore-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { BarChart3, FlameIcon as Fire, TrendingUp, Calendar, Dumbbell, Target, Award, Zap, Activity, Plus, Edit, Trash2 } from "lucide-react"

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

interface StrengthProgress {
  exercise: string
  currentMax: number
  previousMax: number
  improvement: number
  improvementPercentage: number
  currentDate: string
  previousDate: string
}

interface VolumeData {
  thisWeek: number
  lastWeek: number
  thisMonth: number
  lastMonth: number
  improvement: number
}

interface BodyPartBalance {
  name: string
  percentage: number
  level: number
  maxLevel: number
}

interface Goal {
  id: string
  name: string
  current: number
  target: number
  progress: number
}


// 筋トレ種目の選択肢
const exerciseOptions = {
  "胸": [
    "ベンチプレス",
    "インクラインベンチプレス",
    "デクラインベンチプレス",
    "ダンベルプレス",
    "ダンベルフライ",
    "プッシュアップ",
    "チェストプレス",
    "ディップス"
  ],
  "背中": [
    "デッドリフト",
    "プルアップ",
    "チンアップ",
    "ラットプルダウン",
    "ローイング",
    "ダンベルロウ",
    "シーテッドロウ",
    "ベントオーバーロウ"
  ],
  "脚": [
    "スクワット",
    "フロントスクワット",
    "レッグプレス",
    "レッグカール",
    "レッグエクステンション",
    "ランジ",
    "カーフレイズ",
    "ブルガリアンスクワット"
  ],
  "肩": [
    "ショルダープレス",
    "ダンベルプレス",
    "サイドレイズ",
    "フロントレイズ",
    "リアレイズ",
    "アップライトロウ",
    "シュラッグ",
    "フェイスプル"
  ],
  "腕": [
    "バーベルカール",
    "ダンベルカール",
    "ハンマーカール",
    "トライセプスプレス",
    "ディップス",
    "クローズグリップベンチプレス",
    "プリーチャーカール",
    "トライセプスエクステンション"
  ]
}

export function AnalyticsTab({ currentUser }: { currentUser: UserAccount }) {
  const [analyticsData, setAnalyticsData] = useState({
    thisMonthDays: 0,
    lastMonthComparison: 0,
    maxBenchPress: 0,
    yearTrainingDays: 0,
    yearProgress: '0/365'
  })

  const [strengthProgress, setStrengthProgress] = useState<StrengthProgress[]>([])
  const [volumeData, setVolumeData] = useState<VolumeData>({
    thisWeek: 0,
    lastWeek: 0,
    thisMonth: 0,
    lastMonth: 0,
    improvement: 0
  })

  const [bodyPartBalance, setBodyPartBalance] = useState<BodyPartBalance[]>([
    { name: '胸', percentage: 0, level: 1, maxLevel: 10 },
    { name: '背中', percentage: 0, level: 1, maxLevel: 10 },
    { name: '脚', percentage: 0, level: 1, maxLevel: 10 },
    { name: '肩', percentage: 0, level: 1, maxLevel: 10 },
    { name: '腕', percentage: 0, level: 1, maxLevel: 10 }
  ])


  const [customGoals, setCustomGoals] = useState<Goal[]>([])
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [newGoalName, setNewGoalName] = useState("")
  const [newGoalTarget, setNewGoalTarget] = useState("")
  const [newGoalCurrent, setNewGoalCurrent] = useState("")
  const [selectedBodyPart, setSelectedBodyPart] = useState("")

  const [trainingFrequency, setTrainingFrequency] = useState([
    { day: '月', percentage: 0 },
    { day: '火', percentage: 0 },
    { day: '水', percentage: 0 },
    { day: '木', percentage: 0 },
    { day: '金', percentage: 0 },
    { day: '土', percentage: 0 },
    { day: '日', percentage: 0 }
  ])

  // 重量・レップ数の成長分析（重量が向上した場合のみ、1種目につき1つまで、最大5個まで）
  const calculateStrengthProgress = (exercises: any[]): StrengthProgress[] => {
    const exerciseProgressMap = new Map<string, StrengthProgress>()

    // 全ての種目について重量向上を検出
    const exerciseNames = [...new Set(exercises.map(ex => ex.name))]
    
    exerciseNames.forEach(exerciseName => {
      const exerciseData = exercises.filter(ex => ex.name === exerciseName)

      if (exerciseData.length < 2) return // 2回以上の記録が必要

      // 時系列でソート
      exerciseData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      // 最大重量を取得
      const getMaxWeight = (exercise: any) => {
        return exercise.sets.reduce((max: number, set: any) => {
          const weight = parseInt(set.weight) || 0
          return Math.max(max, weight)
        }, 0)
      }

      // 連続する記録を比較して向上をチェック（最新の向上のみ保持）
      for (let i = 1; i < exerciseData.length; i++) {
        const currentExercise = exerciseData[i]
        const previousExercise = exerciseData[i - 1]
        
        const currentMax = getMaxWeight(currentExercise)
        const previousMax = getMaxWeight(previousExercise)
        const improvement = currentMax - previousMax
        const improvementPercentage = previousMax > 0 ? (improvement / previousMax) * 100 : 0

        // 重量が向上した場合のみ追加（同じ種目の場合は最新のもので上書き）
        if (improvement > 0) {
          // 日付をフォーマット（YYYY/MM/DD形式に変換）
          const formatDate = (timestamp: string) => {
            const date = new Date(timestamp)
            return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`
          }

          exerciseProgressMap.set(exerciseName, {
            exercise: exerciseName,
            currentMax,
            previousMax,
            improvement,
            improvementPercentage,
            currentDate: formatDate(currentExercise.timestamp),
            previousDate: formatDate(previousExercise.timestamp)
          })
        }
      }
    })

    // Map から配列に変換して日付順でソートし、最新の5件を取得
    return Array.from(exerciseProgressMap.values())
      .sort((a, b) => new Date(b.currentDate).getTime() - new Date(a.currentDate).getTime())
      .slice(0, 5)
  }

  // 総挙上重量（ボリューム）分析
  const calculateVolumeData = (exercises: any[]): VolumeData => {
    const now = new Date()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const calculateVolume = (exercisesList: any[]) => {
      return exercisesList.reduce((total, exercise) => {
        return total + exercise.sets.reduce((setTotal: number, set: any) => {
          const weight = parseInt(set.weight) || 0
          const reps = parseInt(set.reps) || 0
          return setTotal + (weight * reps)
        }, 0)
      }, 0)
    }

    const thisWeekExercises = exercises.filter(ex => new Date(ex.timestamp) >= weekAgo)
    const lastWeekExercises = exercises.filter(ex => {
      const date = new Date(ex.timestamp)
      return date >= twoWeeksAgo && date < weekAgo
    })

    const thisMonthExercises = exercises.filter(ex => new Date(ex.timestamp) >= monthAgo)
    const lastMonthExercises = exercises.filter(ex => {
      const date = new Date(ex.timestamp)
      return date >= twoMonthsAgo && date < monthAgo
    })

    const thisWeek = calculateVolume(thisWeekExercises)
    const lastWeek = calculateVolume(lastWeekExercises)
    const thisMonth = calculateVolume(thisMonthExercises)
    const lastMonth = calculateVolume(lastMonthExercises)

    const improvement = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0

    return {
      thisWeek,
      lastWeek,
      thisMonth,
      lastMonth,
      improvement
    }
  }

  // 筋肉部位バランス（レーダーチャート風）
  const calculateBodyPartBalance = (exercises: any[]): BodyPartBalance[] => {
    const bodyPartData = {
      '胸': 0,
      '背中': 0,
      '脚': 0,
      '肩': 0,
      '腕': 0
    }

    exercises.forEach(exercise => {
      const name = exercise.name.toLowerCase()
      const totalVolume = exercise.sets.reduce((total: number, set: any) => {
        const weight = parseInt(set.weight) || 0
        const reps = parseInt(set.reps) || 0
        return total + (weight * reps)
      }, 0)

      if (name.includes('ベンチプレス') || name.includes('チェストプレス') || name.includes('胸')) {
        bodyPartData['胸'] += totalVolume
      } else if (name.includes('プルアップ') || name.includes('ラットプルダウン') || name.includes('背中') || name.includes('デッドリフト')) {
        bodyPartData['背中'] += totalVolume
      } else if (name.includes('スクワット') || name.includes('レッグプレス') || name.includes('脚')) {
        bodyPartData['脚'] += totalVolume
      } else if (name.includes('ショルダープレス') || name.includes('肩')) {
        bodyPartData['肩'] += totalVolume
      } else if (name.includes('カール') || name.includes('腕') || name.includes('トライセプス')) {
        bodyPartData['腕'] += totalVolume
      }
    })

    const maxVolume = Math.max(...Object.values(bodyPartData))
    
    return Object.entries(bodyPartData).map(([name, volume]) => {
      const percentage = maxVolume > 0 ? (volume / maxVolume) * 100 : 0
      const level = Math.min(Math.floor(percentage / 10) + 1, 10)
      
      return {
        name,
        percentage,
        level,
        maxLevel: 10
      }
    })
  }

  // カスタム目標の現在値を更新する関数
  const updateCustomGoalsProgress = async () => {
    if (customGoals.length === 0) return
    
    try {
      const userPosts = await firestorePosts.getByUser(currentUser.id)
      const exercises = userPosts.map((post: any) => ({
        ...post.exercise,
        timestamp: post.timestamp
      }))
      
      const updatedGoals = customGoals.map(goal => {
        // 種目名に基づいて現在の最大重量を取得
        const exerciseData = exercises.filter(ex => 
          ex.name && ex.name.toLowerCase().includes(goal.name.toLowerCase())
        )
        
        let currentValue = 0 // 実際のデータから取得
        
        if (exerciseData.length > 0) {
          // 最大重量を取得
          currentValue = exerciseData.reduce((max, ex) => {
            const maxWeight = ex.sets.reduce((setMax: number, set: any) => {
              const weight = parseInt(set.weight) || 0
              return Math.max(setMax, weight)
            }, 0)
            return Math.max(max, maxWeight)
          }, 0)
        }
        
        const progress = Math.min((currentValue / goal.target) * 100, 100)
        
        return {
          ...goal,
          current: currentValue,
          progress
        }
      })
      
      setCustomGoals(updatedGoals)
      localStorage.setItem(`customGoals_${currentUser.id}`, JSON.stringify(updatedGoals))
    } catch (error) {
      console.error('Failed to update custom goals progress:', error)
    }
  }

  // 基本分析データを計算する関数
  const calculateAnalytics = (exercises: any[]) => {
    if (!exercises || exercises.length === 0) {
      return {
        thisMonthDays: 0,
        lastMonthComparison: 0,
        maxBenchPress: 0,
        yearTrainingDays: 0,
        yearProgress: '0/365'
      }
    }
    
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear

    // 今月のトレーニング日数を計算
    const thisMonthDays = new Set(
      exercises
        .filter(exercise => {
          const exerciseDate = new Date(exercise.timestamp)
          return exerciseDate.getMonth() === currentMonth && exerciseDate.getFullYear() === currentYear
        })
        .map(exercise => new Date(exercise.timestamp).toDateString())
    ).size

    // 先月のトレーニング日数を計算
    const lastMonthDays = new Set(
      exercises
        .filter(exercise => {
          const exerciseDate = new Date(exercise.timestamp)
          return exerciseDate.getMonth() === lastMonth && exerciseDate.getFullYear() === lastMonthYear
        })
        .map(exercise => new Date(exercise.timestamp).toDateString())
    ).size

    // 先月比を計算
    const lastMonthComparison = lastMonthDays === 0 ? 
      (thisMonthDays > 0 ? 100 : 0) : 
      Math.round(((thisMonthDays - lastMonthDays) / lastMonthDays) * 100)

    // 最大ベンチプレスを計算
    const benchPressExercises = exercises.filter(exercise => 
      exercise.name && exercise.name.toLowerCase().includes('ベンチプレス')
    )
    const maxBenchPress = benchPressExercises.reduce((max, exercise) => {
      const maxWeight = exercise.sets.reduce((maxSet: number, set: any) => {
        const weight = parseInt(set.weight) || 0
        return Math.max(maxSet, weight)
      }, 0)
      return Math.max(max, maxWeight)
    }, 0)

    // 年間トレーニング日数を計算
    const yearTrainingDays = new Set(
      exercises
        .filter(exercise => new Date(exercise.timestamp).getFullYear() === currentYear)
        .map(exercise => new Date(exercise.timestamp).toDateString())
    ).size

    return {
      thisMonthDays,
      lastMonthComparison,
      maxBenchPress,
      yearTrainingDays,
      yearProgress: `${yearTrainingDays}/365`
    }
  }

  // 曜日別トレーニング頻度を計算
  const calculateTrainingFrequency = (exercises: any[]) => {
    const dayCount = [0, 0, 0, 0, 0, 0, 0] // 月曜日から日曜日
    
    exercises.forEach(exercise => {
      const date = new Date(exercise.timestamp)
      const dayOfWeek = (date.getDay() + 6) % 7 // 月曜日を0にする
      dayCount[dayOfWeek]++
    })

    const maxCount = Math.max(...dayCount)
    
    return [
      { day: '月', percentage: maxCount > 0 ? (dayCount[0] / maxCount) * 100 : 0 },
      { day: '火', percentage: maxCount > 0 ? (dayCount[1] / maxCount) * 100 : 0 },
      { day: '水', percentage: maxCount > 0 ? (dayCount[2] / maxCount) * 100 : 0 },
      { day: '木', percentage: maxCount > 0 ? (dayCount[3] / maxCount) * 100 : 0 },
      { day: '金', percentage: maxCount > 0 ? (dayCount[4] / maxCount) * 100 : 0 },
      { day: '土', percentage: maxCount > 0 ? (dayCount[5] / maxCount) * 100 : 0 },
      { day: '日', percentage: maxCount > 0 ? (dayCount[6] / maxCount) * 100 : 0 }
    ]
  }

  // 部位別トレーニング頻度を計算
  const calculateBodyPartTraining = (exercises: any[]) => {
    const bodyPartCount = {
      '胸': 0,
      '背中': 0,
      '脚': 0,
      '肩': 0,
      '腕': 0
    }

    exercises.forEach(exercise => {
      const name = exercise.name.toLowerCase()
      if (name.includes('ベンチプレス') || name.includes('チェストプレス') || name.includes('胸')) {
        bodyPartCount['胸']++
      } else if (name.includes('プルアップ') || name.includes('ラットプルダウン') || name.includes('背中')) {
        bodyPartCount['背中']++
      } else if (name.includes('スクワット') || name.includes('レッグプレス') || name.includes('脚')) {
        bodyPartCount['脚']++
      } else if (name.includes('ショルダープレス') || name.includes('肩')) {
        bodyPartCount['肩']++
      } else if (name.includes('カール') || name.includes('腕')) {
        bodyPartCount['腕']++
      }
    })

    const total = Object.values(bodyPartCount).reduce((sum, count) => sum + count, 0)

    return [
      { name: '胸', percentage: total > 0 ? (bodyPartCount['胸'] / total) * 100 : 0 },
      { name: '背中', percentage: total > 0 ? (bodyPartCount['背中'] / total) * 100 : 0 },
      { name: '脚', percentage: total > 0 ? (bodyPartCount['脚'] / total) * 100 : 0 },
      { name: '肩', percentage: total > 0 ? (bodyPartCount['肩'] / total) * 100 : 0 },
      { name: '腕', percentage: total > 0 ? (bodyPartCount['腕'] / total) * 100 : 0 }
    ]
  }

  // データを読み込む
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const userPosts = await firestorePosts.getByUser(currentUser.id)
        const exercises = userPosts.map((post: any) => ({
          ...post.exercise,
          postId: post.id,
          timestamp: post.timestamp
        }))

        const analytics = calculateAnalytics(exercises)
        const strength = calculateStrengthProgress(exercises)
        const volume = calculateVolumeData(exercises)
        const bodyBalance = calculateBodyPartBalance(exercises)
        const frequency = calculateTrainingFrequency(exercises)

        setAnalyticsData(analytics)
        setStrengthProgress(strength)
        setVolumeData(volume)
        setBodyPartBalance(bodyBalance)
        setTrainingFrequency(frequency)

        // カスタム目標を読み込み
        const savedCustomGoals = localStorage.getItem(`customGoals_${currentUser.id}`)
        if (savedCustomGoals) {
          const goals = JSON.parse(savedCustomGoals)
          setCustomGoals(goals)
        }
      } catch (error) {
        console.error('Failed to load analytics:', error)
      }
    }

    loadAnalytics()
  }, [currentUser.id])

  // カスタム目標の現在値を更新（目標が読み込まれた後）
  useEffect(() => {
    if (customGoals.length > 0) {
      updateCustomGoalsProgress()
    }
  }, [customGoals.length])

  // グローバル投稿更新イベントを監視して目標を更新
  useEffect(() => {
    const handlePostUpdate = () => {
      updateCustomGoalsProgress()
    }

    window.addEventListener('globalPostsUpdated', handlePostUpdate)
    
    return () => {
      window.removeEventListener('globalPostsUpdated', handlePostUpdate)
    }
  }, [customGoals])

  // 五角形レーダーチャートコンポーネント
  const RadarChart = ({ data }: { data: BodyPartBalance[] }) => {
    const size = 200
    const center = size / 2
    const radius = 70
    const levels = 5

    const getPoint = (angle: number, value: number) => {
      const radian = (angle - 90) * (Math.PI / 180)
      const r = (value / 100) * radius
      return {
        x: center + Math.cos(radian) * r,
        y: center + Math.sin(radian) * r
      }
    }

    const getLevelPoint = (angle: number, level: number) => {
      const radian = (angle - 90) * (Math.PI / 180)
      const r = (level / levels) * radius
      return {
        x: center + Math.cos(radian) * r,
        y: center + Math.sin(radian) * r
      }
    }

    const angles = [0, 72, 144, 216, 288] // 5つの角度

    return (
      <svg width={size} height={size} className="mx-auto">
        {/* グリッドライン */}
        {Array.from({ length: levels }, (_, i) => {
          const level = i + 1
          const points = angles.map(angle => getLevelPoint(angle, level))
          const pathData = `M ${points[0].x} ${points[0].y} ` +
            points.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ') + ' Z'
          
          return (
            <path
              key={i}
              d={pathData}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          )
        })}

        {/* 軸線 */}
        {angles.map((angle, i) => {
          const outerPoint = getLevelPoint(angle, levels)
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={outerPoint.x}
              y2={outerPoint.y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          )
        })}

        {/* データポリゴン */}
        {data && data.length === 5 && (
          <>
            <defs>
              <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            {(() => {
              const points = data.map((item, i) => getPoint(angles[i], item.percentage))
              const pathData = `M ${points[0].x} ${points[0].y} ` +
                points.slice(1).map(point => `L ${point.x} ${point.y}`).join(' ') + ' Z'
              
              return (
                <>
                  <path
                    d={pathData}
                    fill="url(#radarGradient)"
                    stroke="#dc2626"
                    strokeWidth="2"
                  />
                  {points.map((point, i) => (
                    <circle
                      key={i}
                      cx={point.x}
                      cy={point.y}
                      r="4"
                      fill="#dc2626"
                    />
                  ))}
                </>
              )
            })()}
          </>
        )}

        {/* ラベル */}
        {data && data.map((item, i) => {
          const labelPoint = getLevelPoint(angles[i], levels + 0.8)
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-xs font-medium fill-gray-700"
            >
              {item.name}
            </text>
          )
        })}
      </svg>
    )
  }

  // カスタム目標の追加・編集
  const handleSaveGoal = () => {
    if (!newGoalName.trim() || !newGoalTarget || !newGoalCurrent) return

    const goalData = {
      id: editingGoal?.id || Date.now().toString(),
      name: newGoalName.trim(),
      current: parseInt(newGoalCurrent),
      target: parseInt(newGoalTarget),
      progress: Math.min((parseInt(newGoalCurrent) / parseInt(newGoalTarget)) * 100, 100)
    }

    let updatedGoals
    if (editingGoal) {
      updatedGoals = customGoals.map(goal => 
        goal.id === editingGoal.id ? goalData : goal
      )
    } else {
      updatedGoals = [...customGoals, goalData]
    }

    setCustomGoals(updatedGoals)
    localStorage.setItem(`customGoals_${currentUser.id}`, JSON.stringify(updatedGoals))
    
    setIsGoalModalOpen(false)
    setEditingGoal(null)
    setNewGoalName("")
    setNewGoalTarget("")
    setNewGoalCurrent("")
    setSelectedBodyPart("")
  }

  const handleDeleteGoal = (goalId: string) => {
    const updatedGoals = customGoals.filter(goal => goal.id !== goalId)
    setCustomGoals(updatedGoals)
    localStorage.setItem(`customGoals_${currentUser.id}`, JSON.stringify(updatedGoals))
  }

  const openEditGoal = (goal: Goal) => {
    setEditingGoal(goal)
    setNewGoalName(goal.name)
    setNewGoalTarget(goal.target.toString())
    setNewGoalCurrent(goal.current.toString())
    
    // 種目名から部位を特定
    let bodyPart = ""
    for (const [part, exercises] of Object.entries(exerciseOptions)) {
      if (exercises.includes(goal.name)) {
        bodyPart = part
        break
      }
    }
    setSelectedBodyPart(bodyPart)
    setIsGoalModalOpen(true)
  }

  return (
    <div className="h-full overflow-hidden bg-gray-50">
      <ScrollArea className="h-full">
        <div className="p-4 space-y-6">
          {/* パワーアップ記録 */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                パワーアップ記録
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {strengthProgress.length > 0 ? strengthProgress.map((progress) => (
                  <div key={progress.exercise} className="bg-gray-50 rounded-lg p-4">
                    <div className="mb-3">
                      <span className="font-medium text-gray-900 text-lg">{progress.exercise}</span>
                    </div>
                    
                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">前回</div>
                        <div className="text-xl font-bold text-gray-700">{progress.previousMax}kg</div>
                        <div className="text-xs text-gray-500 mt-1">{progress.previousDate}</div>
                      </div>
                      <div className="mx-4 flex items-center">
                        <div className="text-2xl text-green-600">→</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600 mb-1">今回</div>
                        <div className="text-xl font-bold text-green-600">{progress.currentMax}kg</div>
                        <div className="text-xs text-gray-500 mt-1">{progress.currentDate}</div>
                      </div>
                    </div>
                    
                    <div className="text-center mt-3 text-sm text-green-600 font-medium">
                      +{progress.improvement}kg UP! ({progress.improvementPercentage.toFixed(1)}%向上)
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-sm">重量が向上した記録がありません</div>
                    <div className="text-xs mt-1">同じ種目を2回以上記録して重量を上げよう！</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* トレーニングボリューム */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                トレーニングボリューム
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 週間ボリューム */}
              <div className="space-y-4">
                {/* 今週のボリューム */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center mb-3">
                    <div className="text-sm text-gray-600 mb-1">
                      今週のトレーニングボリューム ({(() => {
                        const now = new Date()
                        const startOfWeek = new Date(now)
                        startOfWeek.setDate(now.getDate() - now.getDay() + 1) // 月曜日
                        const endOfWeek = new Date(startOfWeek)
                        endOfWeek.setDate(startOfWeek.getDate() + 6) // 日曜日
                        
                        const formatDate = (date: Date) => {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return `${formatDate(startOfWeek)}～${formatDate(endOfWeek)}`
                      })()})
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{volumeData.thisWeek.toLocaleString()}kg</div>
                  </div>
                  {volumeData.improvement !== 0 && (
                    <div className={`text-center text-sm font-medium ${
                      volumeData.improvement > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      先週比: {volumeData.improvement > 0 ? '+' : ''}{volumeData.improvement.toFixed(1)}%
                    </div>
                  )}
                </div>

                {/* 先週のボリューム */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">
                      先週のトレーニングボリューム ({(() => {
                        const now = new Date()
                        const startOfLastWeek = new Date(now)
                        startOfLastWeek.setDate(now.getDate() - now.getDay() + 1 - 7) // 先週の月曜日
                        const endOfLastWeek = new Date(startOfLastWeek)
                        endOfLastWeek.setDate(startOfLastWeek.getDate() + 6) // 先週の日曜日
                        
                        const formatDate = (date: Date) => {
                          return `${date.getMonth() + 1}/${date.getDate()}`
                        }
                        
                        return `${formatDate(startOfLastWeek)}～${formatDate(endOfLastWeek)}`
                      })()})
                    </div>
                    <div className="text-xl font-bold text-gray-900">{volumeData.lastWeek.toLocaleString()}kg</div>
                  </div>
                </div>
                
                {/* 月間ボリューム */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">今月の累計ボリューム</div>
                    <div className="text-xl font-bold text-gray-900">{volumeData.thisMonth.toLocaleString()}kg</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 筋肉バランス（五角形レーダーチャート） */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                筋肉バランス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-6">
                <RadarChart data={bodyPartBalance} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {bodyPartBalance.map((part) => (
                  <div key={part.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-900">{part.name}</span>
                    <span className="text-sm text-gray-600">{part.percentage.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 目標達成率 */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                目標達成率
                <Button
                  onClick={() => setIsGoalModalOpen(true)}
                  size="sm"
                  className="ml-auto bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  追加
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* カスタム目標のみ表示 */}
                {customGoals.length > 0 ? customGoals.map((goal) => (
                  <div key={goal.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-gray-900">{goal.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{goal.current}kg / {goal.target}kg</span>
                        <Button
                          onClick={() => openEditGoal(goal)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => handleDeleteGoal(goal.id)}
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <Progress value={goal.progress} className="h-2" />
                    <div className="text-xs text-gray-500 mt-1">
                      {goal.progress >= 100 ? '🎉 目標達成!' : `あと ${goal.target - goal.current}kg!`}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-sm">まだ目標が設定されていません</div>
                    <div className="text-xs mt-1">「追加」ボタンから目標を設定しましょう！</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 基本統計 */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-red-600" />
                基本統計
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{analyticsData.thisMonthDays}</div>
                  <div className="text-sm text-gray-600">今月のトレーニング</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className={`text-2xl font-bold ${
                    analyticsData.lastMonthComparison >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {analyticsData.lastMonthComparison >= 0 ? '+' : ''}{analyticsData.lastMonthComparison}%
                  </div>
                  <div className="text-sm text-gray-600">先月比</div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">曜日別頻度</h3>
                <div className="h-20 flex items-end gap-2">
                  {trainingFrequency.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-red-500 rounded-t-sm mb-1"
                        style={{ height: `${Math.max(day.percentage, 5)}%` }}
                      ></div>
                      <div className="text-xs text-gray-600">{day.day}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>

      {/* 目標追加・編集モーダル */}
      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>{editingGoal ? '目標を編集' : '新しい目標を追加'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">部位を選択</label>
              <Select value={selectedBodyPart} onValueChange={setSelectedBodyPart}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="部位を選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(exerciseOptions).map((bodyPart) => (
                    <SelectItem key={bodyPart} value={bodyPart}>
                      {bodyPart}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedBodyPart && (
              <div>
                <label className="text-sm font-medium text-gray-700">種目を選択</label>
                <Select value={newGoalName} onValueChange={setNewGoalName}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="種目を選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    {exerciseOptions[selectedBodyPart as keyof typeof exerciseOptions].map((exercise) => (
                      <SelectItem key={exercise} value={exercise}>
                        {exercise}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">現在の重量 (kg)</label>
                <Input
                  type="number"
                  value={newGoalCurrent}
                  onChange={(e) => setNewGoalCurrent(e.target.value)}
                  placeholder="60"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">目標重量 (kg)</label>
                <Input
                  type="number"
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="100"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  setIsGoalModalOpen(false)
                  setEditingGoal(null)
                  setNewGoalName("")
                  setNewGoalTarget("")
                  setNewGoalCurrent("")
                  setSelectedBodyPart("")
                }}
                variant="outline"
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSaveGoal}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!newGoalName.trim() || !newGoalTarget || !newGoalCurrent}
              >
                {editingGoal ? '更新' : '追加'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}