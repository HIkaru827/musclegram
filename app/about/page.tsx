import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MuscleGramについて | 筋トレ記録SNSアプリの特徴',
  description: 'MuscleGramは筋トレ記録、重量分析、SNS機能を組み合わせた次世代フィットネスアプリです。パワーアップ記録、五角形レーダーチャート、目標設定機能で効率的なトレーニングをサポートします。',
  keywords: ['MuscleGram', '筋トレアプリ', 'フィットネス', '重量分析', 'トレーニング記録'],
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 to-black text-white">
      <div className="container mx-auto px-4 py-16">
        <header className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
            MuscleGramについて
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            筋トレ記録、分析、SNS機能が融合した次世代フィットネスアプリ
          </p>
        </header>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-red-400">主な機能</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-gray-900/50 rounded-lg p-6 border border-red-900/30">
              <h3 className="text-xl font-semibold mb-4 text-red-300">📊 パワーアップ記録</h3>
              <p className="text-gray-300">
                重量向上を自動検出し、前回→今回の形式で成長を可視化。
                モチベーション向上に最適な機能です。
              </p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-6 border border-red-900/30">
              <h3 className="text-xl font-semibold mb-4 text-red-300">⚖️ 筋肉バランス</h3>
              <p className="text-gray-300">
                五角形レーダーチャートで部位別のトレーニングバランスを表示。
                偏りのない筋力発達をサポートします。
              </p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-6 border border-red-900/30">
              <h3 className="text-xl font-semibold mb-4 text-red-300">🎯 目標設定</h3>
              <p className="text-gray-300">
                40種類以上の種目から目標を設定。
                記録投稿と連動して進捗を自動更新します。
              </p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-6 border border-red-900/30">
              <h3 className="text-xl font-semibold mb-4 text-red-300">🔥 ボリューム分析</h3>
              <p className="text-gray-300">
                週間・月間のトレーニングボリューム（総挙上重量）を計算。
                期間別の比較で成長を数値化します。
              </p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-6 border border-red-900/30">
              <h3 className="text-xl font-semibold mb-4 text-red-300">📅 カレンダー機能</h3>
              <p className="text-gray-300">
                トレーニング日をカレンダー表示。
                過去の記録編集や履歴確認が簡単です。
              </p>
            </div>
            
            <div className="bg-gray-900/50 rounded-lg p-6 border border-red-900/30">
              <h3 className="text-xl font-semibold mb-4 text-red-300">👥 SNS機能</h3>
              <p className="text-gray-300">
                トレーニング記録を共有し、仲間と励まし合い。
                いいね・コメント・フォロー機能完備。
              </p>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <h2 className="text-3xl font-bold mb-8 text-red-400">なぜMuscleGramなのか？</h2>
          <div className="bg-gray-900/50 rounded-lg p-8 border border-red-900/30">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 text-red-300">科学的なアプローチ</h3>
                <p className="text-gray-300 mb-4">
                  重量向上の自動検出、ボリューム計算、部位別バランス分析など、
                  データに基づいたトレーニング管理が可能です。
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 text-red-300">モチベーション維持</h3>
                <p className="text-gray-300 mb-4">
                  成長の可視化とSNS機能により、継続的なトレーニングを支援。
                  一人では続かない方にも最適です。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="text-center">
          <h2 className="text-3xl font-bold mb-8 text-red-400">今すぐ始めよう</h2>
          <p className="text-xl text-gray-300 mb-8">
            無料でご利用いただけます。アカウント作成は簡単30秒。
          </p>
          <a
            href="/"
            className="inline-block bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 transform hover:scale-105"
          >
            MuscleGramを始める
          </a>
        </section>
      </div>
    </div>
  )
}