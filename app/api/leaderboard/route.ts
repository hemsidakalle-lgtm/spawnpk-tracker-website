import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "24h"
  
  const supabase = await createClient()
  
  // Calculate the period start date based on fixed UTC midnight times
  // All periods reset at 00:00 UTC (GMT)
  const now = new Date()
  let startDate: Date
  
  // Get today's midnight UTC
  const todayMidnightUTC = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    0, 0, 0, 0
  ))
  
  switch (period) {
    case "7d":
      // Start of the week (7 days ago at midnight UTC)
      // Find the most recent Monday at midnight UTC
      const dayOfWeek = todayMidnightUTC.getUTCDay()
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Sunday = 6 days back, else dayOfWeek - 1
      startDate = new Date(todayMidnightUTC.getTime() - daysToMonday * 24 * 60 * 60 * 1000)
      break
    case "30d":
      // Start of the month (1st day at midnight UTC)
      startDate = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        1,
        0, 0, 0, 0
      ))
      break
    default: // 24h - Daily reset at midnight UTC
      startDate = todayMidnightUTC
  }

  // Get all players
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, username, display_name")
    .order("created_at", { ascending: true })

  if (playersError) {
    console.error("Error fetching players:", playersError)
    return NextResponse.json({ players: [], stats: { totalPlayers: 0, totalKills: 0, totalDeaths: 0, avgKdr: 0 } })
  }

  if (!players || players.length === 0) {
    return NextResponse.json({ players: [], stats: { totalPlayers: 0, totalKills: 0, totalDeaths: 0, avgKdr: 0 } })
  }

  // Fetch ALL stats in a single query (ordered by recorded_at desc)
  const { data: allStats, error: statsError } = await supabase
    .from("player_stats")
    .select("*")
    .order("recorded_at", { ascending: false })

  if (statsError) {
    console.error("Error fetching stats:", statsError)
  }

  const statsArray = allStats || []

  // Process stats in memory instead of per-player queries
  const playerStats = players.map((player) => {
    // Get all stats for this player (sorted newest to oldest)
    const playerStatsRecords = statsArray.filter(s => s.player_id === player.id)
    
    // Latest stats (first record since sorted desc by recorded_at)
    const latestStats = playerStatsRecords[0] || null
    
    // Find the most recent stats recorded BEFORE the period started (this is the baseline)
    // We look for stats that were recorded before startDate
    const baselineStats = playerStatsRecords.find(
      s => new Date(s.recorded_at) < startDate
    )
    
    // Calculate kills change
    let killsChange = 0
    const currentKills = latestStats?.kills || 0
    
    if (baselineStats) {
      // We have a baseline from before the period - calculate actual gains
      killsChange = currentKills - baselineStats.kills
    } else if (playerStatsRecords.length >= 2) {
      // Player was added during this period but we have multiple syncs
      // Use the oldest sync as baseline to show gains since tracking started
      const oldestStats = playerStatsRecords[playerStatsRecords.length - 1]
      killsChange = currentKills - oldestStats.kills
    }
    // If only 1 stat record exists, killsChange stays 0 (no history to compare)

    return {
      id: player.id,
      username: player.username,
      displayName: player.display_name,
      kills: latestStats?.kills || 0,
      deaths: latestStats?.deaths || 0,
      kdr: latestStats?.kdr || 0,
      streak: latestStats?.streak || 0,
      elo: latestStats?.elo || 0,
      killsChange,
    }
  })

  // Sort by kills descending
  playerStats.sort((a, b) => b.kills - a.kills)

  // Calculate aggregate stats
  const totalKills = playerStats.reduce((sum, p) => sum + p.kills, 0)
  const totalDeaths = playerStats.reduce((sum, p) => sum + p.deaths, 0)
  const avgKdr = playerStats.length > 0 
    ? playerStats.reduce((sum, p) => sum + p.kdr, 0) / playerStats.length 
    : 0

  return NextResponse.json({
    players: playerStats,
    stats: {
      totalPlayers: players.length,
      totalKills,
      totalDeaths,
      avgKdr,
    },
  })
}
