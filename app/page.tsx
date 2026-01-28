"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Users, Swords, Skull, Target, Shield } from "lucide-react"
import { StatsCard } from "@/components/stats-card"
import { LeaderboardTable, type PlayerStats } from "@/components/leaderboard-table"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function HomePage() {
  const [period, setPeriod] = useState<"24h" | "7d" | "30d">("24h")
  
  const { data, error, isLoading } = useSWR<{
    players: PlayerStats[]
    stats: {
      totalPlayers: number
      totalKills: number
      totalDeaths: number
      avgKdr: number
    }
  }>(`/api/leaderboard?period=${period}`, fetcher, {
    refreshInterval: 60000, // Refresh every minute
  })

  const stats = data?.stats || {
    totalPlayers: 0,
    totalKills: 0,
    totalDeaths: 0,
    avgKdr: 0,
  }

  const players = data?.players || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
                <Swords className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">SpawnPK</h1>
                <p className="text-xs text-muted-foreground">Clan Tracker</p>
              </div>
            </div>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border-border/50 text-foreground hover:bg-secondary/50 bg-transparent">
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-foreground">Clan Statistics</h2>
          <p className="text-muted-foreground">{"Track your clan members' kills and progress"}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Active Members"
            value={stats.totalPlayers}
            description="Currently tracked"
            icon={Users}
          />
          <StatsCard
            title="Total Kills"
            value={stats.totalKills.toLocaleString()}
            description="Combined kills"
            icon={Swords}
          />
          <StatsCard
            title="Total Deaths"
            value={stats.totalDeaths.toLocaleString()}
            description="Combined deaths"
            icon={Skull}
          />
          <StatsCard
            title="Avg KDR"
            value={stats.avgKdr.toFixed(2)}
            description="Average kill/death ratio"
            icon={Target}
          />
        </div>

        {/* Leaderboard */}
        <LeaderboardTable 
          players={players} 
          period={period} 
          onPeriodChange={setPeriod} 
        />

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground pt-8 border-t border-border/50">
          <p>Data syncs hourly from SpawnPK Highscores</p>
        </footer>
      </main>
    </div>
  )
}
