import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get("period") || "24h"
  
  const supabase = await createClient()
  
  // Calculate the date range based on period
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default: // 24h
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
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
    // Get all stats for this player
    const playerStatsRecords = statsArray.filter(s => s.player_id === player.id)
    
    // Latest stats (first record since sorted desc by recorded_at)
    const latestStats = playerStatsRecords[0] || null
    
    // Find stats from before the period start (for baseline)
    const periodStartStats = playerStatsRecords.find(
      s => new Date(s.recorded_at) <= startDate
    )
    
    // If no stats before period, use the oldest stat as baseline
    const baselineStats = periodStartStats || playerStatsRecords[playerStatsRecords.length - 1] || null

    const currentKills = latestStats?.kills || 0
    const baselineKills = baselineStats?.kills || 0
    const killsChange = currentKills - baselineKills

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
