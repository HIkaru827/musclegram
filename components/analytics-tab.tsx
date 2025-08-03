"use client"

import { useState, useEffect } from "react"
import { firestorePosts, firestoreDaysGoals, firestoreCustomExercises } from "@/lib/firestore-utils"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FlameIcon as Fire, TrendingUp, Calendar, Dumbbell, Target, Award, Zap, Activity, Plus, Edit, Trash2 } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface UserAccount {
  id: string
  email: string
  displayName: string
  username: string
  bio: string
  avatar: string
  createdAt: string
}

interface DaysGoal {
  monthlyTarget: number
  currentMonthDays: number
  achievementRate: number
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

interface VolumeChartData {
  date: string
  volume: number
  label: string
}

type VolumePeriod = '1week' | '1month' | '1year'

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


// 総合的な種目リストを取得する関数
const getAllExercises = (customExercises: {[key: string]: string[]} = {}) => {
  // カスタム種目が正しい形式でない場合は空オブジェクトに置き換え
  const safeCustomExercises = customExercises && typeof customExercises === 'object' ? customExercises : {}
  const allExercises: string[] = []
  
  // 既定の種目を追加（workout-tab.tsxからコピー）
  const baseExercises = {
    "胸": ["ベンチプレス", "ペックフライ", "チェストプレス"],
    "背中": ["デッドリフト", "ラットプルダウン", "プーリーロー"],
    "脚": ["スクワット", "スミスマシン・バーベルスクワット", "レッグプレス"],
    "肩": ["サイドレイズ", "ショルダープレス", "フロントレイズ"],
    "腕": ["フィンガーロール", "バーベルカール", "アームカール"],
    "お尻": ["ヒップスラスト"],
    "腹筋": ["プランク", "上体起こし"],
    "有酸素運動": ["ランニング", "サイクリング", "エリプティカル"]
  }
  
  // 既定の種目を追加
  Object.values(baseExercises).forEach(exercises => {
    allExercises.push(...exercises)
  })
  
  // カスタム種目を追加
  Object.values(safeCustomExercises).forEach(exercises => {
    if (Array.isArray(exercises)) {
      allExercises.push(...exercises)
    }
  })
  
  return [...new Set(allExercises)] // 重複を除去
}

export function AnalyticsTab({ currentUser }: { currentUser: UserAccount }) {
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
  const [availableExercises, setAvailableExercises] = useState<string[]>([])

  const [trainingFrequency, setTrainingFrequency] = useState([
    { day: '月', percentage: 0 },
    { day: '火', percentage: 0 },
    { day: '水', percentage: 0 },
    { day: '木', percentage: 0 },
    { day: '金', percentage: 0 },
    { day: '土', percentage: 0 },
    { day: '日', percentage: 0 }
  ])

  const [weeklyWorkoutDays, setWeeklyWorkoutDays] = useState(0)
  const [daysGoal, setDaysGoal] = useState<DaysGoal>({
    monthlyTarget: 12,
    currentMonthDays: 0,
    achievementRate: 0
  })

  const [volumeChartData, setVolumeChartData] = useState<VolumeChartData[]>([])
  const [volumePeriod, setVolumePeriod] = useState<VolumePeriod>('1month')

  // 1RMチャート関連のstate
  const [oneRMChartData, setOneRMChartData] = useState<any[]>([])
  const [selectedExercise, setSelectedExercise] = useState<string>('')
  const [availableExercisesForChart, setAvailableExercisesForChart] = useState<{[bodyPart: string]: string[]}>({})

  // 部位別の種目分類（記録画面の分類と統一）
  const exerciseBodyPartMapForAnalytics: { [key: string]: string } = {
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

  // ボリュームチャートデータを計算
  const calculateVolumeChartData = (exercises: any[], period: VolumePeriod): VolumeChartData[] => {
    const now = new Date()
    const data: VolumeChartData[] = []

    const calculateVolume = (exercisesList: any[]) => {
      return exercisesList.reduce((total, exercise) => {
        return total + exercise.sets.reduce((setTotal: number, set: any) => {
          const weight = parseInt(set.weight) || 0
          const reps = parseInt(set.reps) || 0
          return setTotal + (weight * reps)
        }, 0)
      }, 0)
    }

    if (period === '1week') {
      // 過去7日間のデータ
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now)
        date.setDate(now.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const nextDate = new Date(date)
        nextDate.setDate(date.getDate() + 1)
        
        const dayExercises = exercises.filter(ex => {
          const exDate = new Date(ex.timestamp)
          return exDate >= date && exDate < nextDate
        })
        
        data.push({
          date: date.toISOString(),
          volume: calculateVolume(dayExercises),
          label: `${date.getMonth() + 1}/${date.getDate()}`
        })
      }
    } else if (period === '1month') {
      // 過去30日間のデータ（5日毎）
      for (let i = 29; i >= 0; i -= 5) {
        const endDate = new Date(now)
        endDate.setDate(now.getDate() - i)
        endDate.setHours(23, 59, 59, 999)
        const startDate = new Date(endDate)
        startDate.setDate(endDate.getDate() - 4)
        startDate.setHours(0, 0, 0, 0)
        
        const periodExercises = exercises.filter(ex => {
          const exDate = new Date(ex.timestamp)
          return exDate >= startDate && exDate <= endDate
        })
        
        data.push({
          date: endDate.toISOString(),
          volume: calculateVolume(periodExercises),
          label: `${startDate.getMonth() + 1}/${startDate.getDate()}-${endDate.getMonth() + 1}/${endDate.getDate()}`
        })
      }
    } else { // 1year
      // 過去12ヶ月のデータ
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
        
        const monthExercises = exercises.filter(ex => {
          const exDate = new Date(ex.timestamp)
          return exDate >= date && exDate < nextMonth
        })
        
        data.push({
          date: date.toISOString(),
          volume: calculateVolume(monthExercises),
          label: `${date.getFullYear()}/${date.getMonth() + 1}`
        })
      }
    }

    return data
  }

  // 1RMチャートデータを計算
  const calculateOneRMChartData = (exercises: any[], exerciseName: string) => {
    if (!exerciseName) return []
    
    // 選択された種目のデータをフィルタリング
    const exerciseData = exercises
      .filter(ex => ex.name === exerciseName)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    
    return exerciseData.map(exercise => {
      // 各セッションの最大1RMを計算
      const maxOneRM = exercise.sets.reduce((max: number, set: any) => {
        const weight = parseFloat(set.weight) || 0
        const reps = parseInt(set.reps) || 0
        
        if (weight > 0 && reps > 0) {
          // 1RM計算: (重量 × 回数) / 40 + 重量
          const oneRM = (weight * reps) / 40 + weight
          return Math.max(max, oneRM)
        }
        return max
      }, 0)
      
      // 日付をフォーマット
      const date = new Date(exercise.timestamp)
      const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`
      
      return {
        date: exercise.timestamp,
        oneRM: parseFloat(formatToTwoSignificantDigits(maxOneRM)), // 有効数字2桁
        label: dateLabel,
        exerciseName
      }
    }).filter(data => data.oneRM > 0) // 1RMが0より大きいもののみ
  }

  // 筋肉部位バランス（レーダーチャート風）
  const calculateBodyPartBalance = (exercises: any[], customExercises: {[key: string]: string[]} = {}): BodyPartBalance[] => {
    const bodyPartData = {
      '胸': 0,
      '背中': 0,
      '脚': 0,
      '肩': 0,
      '腕': 0
    }

    // 記録画面と同じ分類システムを使用
    const exercisesByBodyPartBase = {
      胸: ["ベンチプレス", "ペックフライ", "チェストプレス"],
      背中: ["デッドリフト", "ラットプルダウン", "プーリーロー"],
      脚: ["スクワット", "スミスマシン・バーベルスクワット", "レッグプレス"],
      肩: ["サイドレイズ", "ショルダープレス", "フロントレイズ"],
      腕: ["フィンガーロール", "バーベルカール", "アームカール"],
      お尻: ["ヒップスラスト"],
      腹筋: ["プランク", "上体起こし"],
      有酸素運動: ["ランニング", "サイクリング", "エリプティカル"],
    }

    exercises.forEach(exercise => {
      const totalVolume = exercise.sets.reduce((total: number, set: any) => {
        const weight = parseInt(set.weight) || 0
        const reps = parseInt(set.reps) || 0
        return total + (weight * reps)
      }, 0)

      // 静的な分類マップをまずチェック
      let bodyPart = exerciseBodyPartMapForAnalytics[exercise.name]
      
      // 見つからない場合は、記録画面の分類から動的に検索
      if (!bodyPart) {
        for (const [part, exerciseList] of Object.entries(exercisesByBodyPartBase)) {
          if (exerciseList.includes(exercise.name)) {
            bodyPart = part
            break
          }
        }
      }
      
      // カスタム種目の分類も確認
      if (!bodyPart) {
        for (const [part, exerciseList] of Object.entries(customExercises)) {
          if (Array.isArray(exerciseList) && exerciseList.includes(exercise.name)) {
            bodyPart = part
            break
          }
        }
      }

      // レーダーチャートに含まれる部位のみ加算
      if (bodyPart && bodyPartData.hasOwnProperty(bodyPart)) {
        bodyPartData[bodyPart as keyof typeof bodyPartData] += totalVolume
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
        // 種目名が完全一致するものを取得
        const exerciseData = exercises.filter(ex => 
          ex.name && ex.name === goal.name
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

  // 日数目標を計算する関数
  const calculateDaysGoal = (exercises: any[], monthlyTarget: number): DaysGoal => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // 今月のトレーニング日数を計算
    const currentMonthDays = new Set(
      exercises
        .filter(exercise => {
          const exerciseDate = new Date(exercise.timestamp)
          return exerciseDate.getMonth() === currentMonth && exerciseDate.getFullYear() === currentYear
        })
        .map(exercise => new Date(exercise.timestamp).toDateString())
    ).size

    const achievementRate = monthlyTarget > 0 ? Math.round((currentMonthDays / monthlyTarget) * 100) : 0

    return {
      monthlyTarget,
      currentMonthDays,
      achievementRate
    }
  }

  // 一週間のトレーニング日数を計算する関数
  const calculateWeeklyWorkoutDays = (exercises: any[]): number => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay() + 1) // 月曜日
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6) // 日曜日
    endOfWeek.setHours(23, 59, 59, 999) // 日曜日の終わり

    return new Set(
      exercises
        .filter(exercise => {
          const exerciseDate = new Date(exercise.timestamp)
          return exerciseDate >= startOfWeek && exerciseDate <= endOfWeek
        })
        .map(exercise => new Date(exercise.timestamp).toDateString())
    ).size
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

        // Firebaseから日数目標を取得
        const daysGoalData = await firestoreDaysGoals.get(currentUser.id)
        const monthlyTarget = daysGoalData?.monthlyTarget || 12

        // 利用可能な種目リストを取得（カスタム種目も含む）
        const customExercises = await firestoreCustomExercises.getByUser(currentUser.id) || {}

        const analytics = calculateAnalytics(exercises)
        const strength = calculateStrengthProgress(exercises)
        const volume = calculateVolumeData(exercises)
        const bodyBalance = calculateBodyPartBalance(exercises, customExercises)
        const frequency = calculateTrainingFrequency(exercises)
        const weeklyDays = calculateWeeklyWorkoutDays(exercises)
        const calculatedDaysGoal = calculateDaysGoal(exercises, monthlyTarget)
        const chartData = calculateVolumeChartData(exercises, volumePeriod)

        setAnalyticsData(analytics)
        setStrengthProgress(strength)
        setVolumeData(volume)
        setBodyPartBalance(bodyBalance)
        setTrainingFrequency(frequency)
        setWeeklyWorkoutDays(weeklyDays)
        setDaysGoal(calculatedDaysGoal)
        setVolumeChartData(chartData)
        const allExercises = getAllExercises(customExercises)
        setAvailableExercises(allExercises)

        // 記録画面と同じ分類システムを使用
        const exercisesByBodyPartBase = {
          胸: ["ベンチプレス", "ペックフライ", "チェストプレス"],
          背中: ["デッドリフト", "ラットプルダウン", "プーリーロー"],
          脚: ["スクワット", "スミスマシン・バーベルスクワット", "レッグプレス"],
          肩: ["サイドレイズ", "ショルダープレス", "フロントレイズ"],
          腕: ["フィンガーロール", "バーベルカール", "アームカール"],
          お尻: ["ヒップスラスト"],
          腹筋: ["プランク", "上体起こし"],
          有酸素運動: ["ランニング", "サイクリング", "エリプティカル"],
        }

        // 1RMチャート用の種目リストを部位別に取得（実際に記録のある種目のみ）
        const exercisesWithRecords = [...new Set(exercises.map(ex => ex.name))]
        const exercisesByBodyPart: {[bodyPart: string]: string[]} = {}
        
        // 部位別に分類
        exercisesWithRecords.forEach(exerciseName => {
          // 静的な分類マップをまずチェック
          let bodyPart = exerciseBodyPartMapForAnalytics[exerciseName]
          
          // 見つからない場合は、記録画面の分類から動的に検索
          if (!bodyPart) {
            for (const [part, exerciseList] of Object.entries(exercisesByBodyPartBase)) {
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
          
          if (!exercisesByBodyPart[bodyPart]) {
            exercisesByBodyPart[bodyPart] = []
          }
          exercisesByBodyPart[bodyPart].push(exerciseName)
        })
        
        // 各部位内でソート
        Object.keys(exercisesByBodyPart).forEach(bodyPart => {
          exercisesByBodyPart[bodyPart].sort()
        })
        
        setAvailableExercisesForChart(exercisesByBodyPart)
        
        // デフォルトで最初の種目を選択
        const firstBodyPart = Object.keys(exercisesByBodyPart)[0]
        if (firstBodyPart && exercisesByBodyPart[firstBodyPart].length > 0 && !selectedExercise) {
          setSelectedExercise(exercisesByBodyPart[firstBodyPart][0])
        }
        
        // 選択された種目の1RMチャートデータを計算
        if (selectedExercise) {
          const chartData = calculateOneRMChartData(exercises, selectedExercise)
          setOneRMChartData(chartData)
        }

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
  }, [currentUser.id, volumePeriod])

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

  // 選択された種目が変更されたときに1RMチャートデータを更新
  useEffect(() => {
    const loadOneRMData = async () => {
      if (selectedExercise) {
        try {
          const userPosts = await firestorePosts.getByUser(currentUser.id)
          const exercises = userPosts.map((post: any) => ({
            ...post.exercise,
            postId: post.id,
            timestamp: post.timestamp
          }))
          
          const chartData = calculateOneRMChartData(exercises, selectedExercise)
          setOneRMChartData(chartData)
        } catch (error) {
          console.error('Failed to load 1RM data:', error)
        }
      }
    }
    
    loadOneRMData()
  }, [selectedExercise, currentUser.id])

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
  const handleSaveGoal = async () => {
    if (!newGoalName.trim() || !newGoalTarget) return

    try {
      // 現在の重量をデータから取得
      const userPosts = await firestorePosts.getByUser(currentUser.id)
      const exercises = userPosts.map((post: any) => ({
        ...post.exercise,
        timestamp: post.timestamp
      }))
      
      const exerciseData = exercises.filter(ex => 
        ex.name && ex.name === newGoalName.trim()
      )
      
      let currentValue = 0
      if (exerciseData.length > 0) {
        currentValue = exerciseData.reduce((max, ex) => {
          const maxWeight = ex.sets.reduce((setMax: number, set: any) => {
            const weight = parseInt(set.weight) || 0
            return Math.max(setMax, weight)
          }, 0)
          return Math.max(max, maxWeight)
        }, 0)
      }

      const goalData = {
        id: editingGoal?.id || Date.now().toString(),
        name: newGoalName.trim(),
        current: currentValue,
        target: parseInt(newGoalTarget),
        progress: Math.min((currentValue / parseInt(newGoalTarget)) * 100, 100)
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
    } catch (error) {
      console.error('Failed to save goal:', error)
    }
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
    setIsGoalModalOpen(true)
  }

  // 日数目標を更新する関数
  const updateMonthlyTarget = async (newTarget: number) => {
    try {
      await firestoreDaysGoals.set(currentUser.id, newTarget)
      
      const updatedDaysGoal = {
        ...daysGoal,
        monthlyTarget: newTarget,
        achievementRate: newTarget > 0 ? Math.round((daysGoal.currentMonthDays / newTarget) * 100) : 0
      }
      setDaysGoal(updatedDaysGoal)
    } catch (error) {
      console.error('Failed to update monthly target:', error)
    }
  }

  // ボリューム期間を変更する関数
  const handlePeriodChange = (newPeriod: VolumePeriod) => {
    setVolumePeriod(newPeriod)
  }

  return (
    <div className="h-full overflow-hidden bg-gray-50">
      <ScrollArea className="h-full">
        <div className="p-3 space-y-3">
          {/* パワーアップ記録 */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
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

          {/* 1RM推移チャート */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                1RM推移グラフ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 種目選択 */}
              <div className="mb-6">
                <label className="text-sm font-medium text-gray-700 mb-2 block">種目を選択</label>
                <Select value={selectedExercise} onValueChange={(value) => setSelectedExercise(value)}>
                  <SelectTrigger className="max-w-xs">
                    <SelectValue placeholder="種目を選択してください" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {Object.entries(availableExercisesForChart).map(([bodyPart, exercises]) => (
                      <div key={bodyPart}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-red-600 bg-red-50 border-b border-red-100">
                          {bodyPart}
                        </div>
                        {exercises.map((exercise) => (
                          <SelectItem key={exercise} value={exercise} className="pl-4">
                            {exercise}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* チャート */}
              {oneRMChartData.length > 0 ? (
                <div className="h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={oneRMChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="label" 
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="#666"
                        tickFormatter={(value) => `${value}kg`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [`${value}kg`, '1RM']}
                        labelStyle={{ color: '#666' }}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="oneRM" 
                        stroke="#dc2626" 
                        strokeWidth={3}
                        dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2, fill: 'white' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <div className="text-sm">
                      {selectedExercise ? 
                        `${selectedExercise}の記録がありません` : 
                        '種目を選択してください'
                      }
                    </div>
                    <div className="text-xs mt-1">
                      重量と回数を記録すると1RMの推移が表示されます
                    </div>
                  </div>
                </div>
              )}

              {/* 統計情報 */}
              {oneRMChartData.length > 0 && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {formatToTwoSignificantDigits(oneRMChartData[oneRMChartData.length - 1]?.oneRM || 0)}kg
                    </div>
                    <div className="text-xs text-gray-600">最新1RM</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-lg font-bold text-gray-900">
                      {formatToTwoSignificantDigits(Math.max(...oneRMChartData.map(d => d.oneRM)))}kg
                    </div>
                    <div className="text-xs text-gray-600">最高1RM</div>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className={`text-lg font-bold ${
                      oneRMChartData.length > 1 && 
                      oneRMChartData[oneRMChartData.length - 1].oneRM > oneRMChartData[0].oneRM 
                        ? 'text-green-600' : 'text-gray-900'
                    }`}>
                      {oneRMChartData.length > 1 ? 
                        `+${formatToTwoSignificantDigits(oneRMChartData[oneRMChartData.length - 1].oneRM - oneRMChartData[0].oneRM)}kg` :
                        '0kg'
                      }
                    </div>
                    <div className="text-xs text-gray-600">総向上</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* トレーニングボリューム */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Zap className="h-5 w-5 text-orange-500" />
                トレーニングボリューム
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* 期間切り替えボタン */}
              <div className="flex justify-center mb-6">
                <div className="flex bg-gray-100 rounded-lg p-1">
                  {[
                    { key: '1week', label: '1週間' },
                    { key: '1month', label: '1ヶ月' },
                    { key: '1year', label: '1年' }
                  ].map((option) => (
                    <Button
                      key={option.key}
                      onClick={() => handlePeriodChange(option.key as VolumePeriod)}
                      variant={volumePeriod === option.key ? 'default' : 'ghost'}
                      size="sm"
                      className={`px-4 py-2 ${
                        volumePeriod === option.key 
                          ? 'bg-orange-500 text-white shadow-sm' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* チャート */}
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={volumeChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      stroke="#666"
                      tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: number) => [`${value.toLocaleString()}kg`, 'ボリューム']}
                      labelStyle={{ color: '#666' }}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volume" 
                      stroke="#dc2626" 
                      strokeWidth={3}
                      dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, stroke: '#dc2626', strokeWidth: 2, fill: 'white' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 統計情報 */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{volumeData.thisWeek.toLocaleString()}kg</div>
                  <div className="text-xs text-gray-600">今週</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-gray-900">{volumeData.thisMonth.toLocaleString()}kg</div>
                  <div className="text-xs text-gray-600">今月</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className={`text-lg font-bold ${
                    volumeData.improvement >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {volumeData.improvement >= 0 ? '+' : ''}{volumeData.improvement.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-600">先週比</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 筋肉バランス（五角形レーダーチャート） */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                筋肉バランス
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center mb-3">
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
            <CardHeader className="pb-2">
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
                        <span className="text-xs text-blue-600">(自動更新)</span>
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

          {/* 一週間の筋トレ日数 */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-600" />
                一週間の筋トレ日数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                <div className="text-4xl font-bold text-blue-600 mb-2">{weeklyWorkoutDays}</div>
                <div className="text-sm text-gray-600 mb-1">今週のトレーニング日数</div>
                <div className="text-xs text-gray-500">
                  ({(() => {
                    const now = new Date()
                    const startOfWeek = new Date(now)
                    startOfWeek.setDate(now.getDate() - now.getDay() + 1)
                    const endOfWeek = new Date(startOfWeek)
                    endOfWeek.setDate(startOfWeek.getDate() + 6)
                    
                    const formatDate = (date: Date) => {
                      return `${date.getMonth() + 1}/${date.getDate()}`
                    }
                    
                    return `${formatDate(startOfWeek)}～${formatDate(endOfWeek)}`
                  })()})
                </div>
              </div>
              
              <div className="mt-3 bg-gray-50 rounded-lg p-3">
                <h3 className="font-medium text-gray-900 mb-2">曜日別頻度</h3>
                <div className="h-20 flex items-end gap-2">
                  {trainingFrequency.map((day, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className="w-full bg-blue-500 rounded-t-sm mb-1"
                        style={{ height: `${Math.max(day.percentage, 5)}%` }}
                      ></div>
                      <div className="text-xs text-gray-600">{day.day}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 日数目標 */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Award className="h-5 w-5 text-green-600" />
                日数目標
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 目標設定 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-900">今月の目標日数</span>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={daysGoal.monthlyTarget}
                        onChange={(e) => updateMonthlyTarget(parseInt(e.target.value) || 0)}
                        className="w-16 h-8 text-center"
                        min="0"
                        max="31"
                      />
                      <span className="text-sm text-gray-600">日</span>
                    </div>
                  </div>
                  <Progress value={Math.min(daysGoal.achievementRate, 100)} className="h-3" />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-sm text-gray-600">
                      現在: {daysGoal.currentMonthDays}日 / {daysGoal.monthlyTarget}日
                    </span>
                    <span className={`text-sm font-medium ${
                      daysGoal.achievementRate >= 100 ? 'text-green-600' : 
                      daysGoal.achievementRate >= 70 ? 'text-blue-600' : 'text-gray-600'
                    }`}>
                      達成率: {daysGoal.achievementRate}%
                    </span>
                  </div>
                  {daysGoal.achievementRate >= 100 && (
                    <div className="text-center mt-3 text-green-600 font-medium">
                      🎉 目標達成おめでとうございます！
                    </div>
                  )}
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
              <label className="text-sm font-medium text-gray-700">種目を選択</label>
              <Select value={newGoalName} onValueChange={setNewGoalName}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="種目を選択してください" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {availableExercises.map((exercise) => (
                    <SelectItem key={exercise} value={exercise}>
                      {exercise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <p className="text-xs text-gray-500 mt-1">
                現在の重量はあなたの記録から自動で取得されます
              </p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  setIsGoalModalOpen(false)
                  setEditingGoal(null)
                  setNewGoalName("")
                  setNewGoalTarget("")
                }}
                variant="outline"
                className="flex-1"
              >
                キャンセル
              </Button>
              <Button
                onClick={handleSaveGoal}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!newGoalName.trim() || !newGoalTarget}
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