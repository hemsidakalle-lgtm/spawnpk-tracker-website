"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, Trophy, Medal, Award, Star, Flame } from "lucide-react"
import type { PlayerStats } from "./leaderboard-table"

interface TopGainersProps {
  players: PlayerStats[]
  period: "24h" | "7d" | "30d"
}

const periodLabels = {
  "24h": "24 Hours",
  "7d": "7 Days", 
  "30d": "30 Days",
}

function getRankStyle(rank: number) {
  switch (rank) {
    case 1:
      return {
        icon: Trophy,
        bgColor: "bg-yellow-500/20",
        borderColor: "border-yellow-500/50",
        textColor: "text-yellow-500",
        iconColor: "text-yellow-400",
        glowColor: "shadow-yellow-500/20",
      }
    case 2:
      return {
        icon: Medal,
        bgColor: "bg-gray-400/20",
        borderColor: "border-gray-400/50",
        textColor: "text-gray-300",
        iconColor: "text-gray-300",
        glowColor: "shadow-gray-400/20",
      }
    case 3:
      return {
        icon: Award,
        bgColor: "bg-amber-600/20",
        borderColor: "border-amber-600/50",
        textColor: "text-amber-500",
        iconColor: "text-amber-500",
        glowColor: "shadow-amber-500/20",
      }
    case 4:
      return {
        icon: Star,
        bgColor: "bg-primary/10",
        borderColor: "border-primary/30",
        textColor: "text-primary",
        iconColor: "text-primary",
        glowColor: "shadow-primary/10",
      }
    case 5:
      return {
        icon: Flame,
        bgColor: "bg-primary/10",
        borderColor: "border-primary/30",
        textColor: "text-primary",
        iconColor: "text-primary",
        glowColor: "shadow-primary/10",
      }
    default:
      return {
        icon: Star,
        bgColor: "bg-secondary/50",
        borderColor: "border-border",
        textColor: "text-muted-foreground",
        iconColor: "text-muted-foreground",
        glowColor: "",
      }
  }
}

export function TopGainers({ players, period }: TopGainersProps) {
  // Sort by kills change and get top 5
  const topGainers = [...players]
    .filter((p) => p.killsChange > 0)
    .sort((a, b) => b.killsChange - a.killsChange)
    .slice(0, 5)

  if (topGainers.length === 0) {
    return null
  }

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-bold">Top Kill Gainers</CardTitle>
          <span className="text-sm text-muted-foreground ml-2">({periodLabels[period]})</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {topGainers.map((player, index) => {
            const rank = index + 1
            const style = getRankStyle(rank)
            const Icon = style.icon

            return (
              <div
                key={player.id}
                className={`relative flex flex-col items-center p-4 rounded-lg border ${style.bgColor} ${style.borderColor} ${style.glowColor} shadow-lg transition-transform hover:scale-105`}
              >
                {/* Rank badge */}
                <div className={`absolute -top-2 -left-2 w-7 h-7 rounded-full ${style.bgColor} border ${style.borderColor} flex items-center justify-center`}>
                  <span className={`text-xs font-bold ${style.textColor}`}>#{rank}</span>
                </div>

                {/* Icon */}
                <Icon className={`h-8 w-8 ${style.iconColor} mb-2`} />

                {/* Username */}
                <span className="font-semibold text-foreground text-sm text-center truncate w-full">
                  {player.displayName || player.username}
                </span>

                {/* Kills gained */}
                <span className={`text-2xl font-bold ${style.textColor} mt-1`}>
                  +{player.killsChange.toLocaleString()}
                </span>

                {/* Total kills */}
                <span className="text-xs text-muted-foreground mt-1">
                  {player.kills.toLocaleString()} total
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
