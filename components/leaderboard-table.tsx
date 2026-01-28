"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Trophy, Medal, Award } from "lucide-react"

export interface PlayerStats {
  id: string
  username: string
  displayName: string | null
  kills: number
  deaths: number
  kdr: number
  streak: number
  elo: number
  killsChange: number
}

interface LeaderboardTableProps {
  players: PlayerStats[]
  period: "24h" | "7d" | "30d"
  onPeriodChange: (period: "24h" | "7d" | "30d") => void
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-5 w-5 text-yellow-500" />
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />
  return <span className="text-muted-foreground font-mono">{rank}</span>
}

export function LeaderboardTable({ players, period, onPeriodChange }: LeaderboardTableProps) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-xl font-bold">Kill Leaderboard</CardTitle>
        <Tabs value={period} onValueChange={(v) => onPeriodChange(v as "24h" | "7d" | "30d")}>
          <TabsList className="bg-secondary/50">
            <TabsTrigger value="24h" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">24h</TabsTrigger>
            <TabsTrigger value="7d" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">7 Days</TabsTrigger>
            <TabsTrigger value="30d" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">30 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <TableHead className="w-16 text-muted-foreground">Rank</TableHead>
              <TableHead className="text-muted-foreground">Username</TableHead>
              <TableHead className="text-right text-muted-foreground">Kills</TableHead>
              <TableHead className="text-right text-muted-foreground">Deaths</TableHead>
              <TableHead className="text-right text-muted-foreground">KDR</TableHead>
              <TableHead className="text-right text-muted-foreground">Period Kills</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {players.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No players tracked yet. Add players from the admin panel.
                </TableCell>
              </TableRow>
            ) : (
              players.map((player, index) => (
                <TableRow key={player.id} className="border-border/50 hover:bg-secondary/30">
                  <TableCell className="font-medium">
                    <div className="flex items-center justify-center w-8 h-8">
                      {getRankIcon(index + 1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-foreground">
                      {player.displayName || player.username}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    {player.kills.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {player.deaths.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground">
                    {player.kdr.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={`font-mono ${player.killsChange > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {player.killsChange > 0 ? `+${player.killsChange}` : player.killsChange}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
