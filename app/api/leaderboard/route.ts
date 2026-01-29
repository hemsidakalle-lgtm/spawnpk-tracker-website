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

  // Get all players with their latest stats
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

  // Get the latest stats for each player
  const playerStats = await Promise.all(
    players.map(async (player) => {
      // Get the latest stats
      const { data: latestStatsArr } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", player.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
      
      const latestStats = latestStatsArr?.[0] || null

      // Get stats from BEFORE the start of the period to calculate kills change
      // This gives us the baseline (what their kills were at the start of the period)
      const { data: periodStartStatsArr } = await supabase
        .from("player_stats")
        .select("*")
        .eq("player_id", player.id)
        .lte("recorded_at", startDate.toISOString())
        .order("recorded_at", { ascending: false })
        .limit(1)
      
      const periodStartStats = periodStartStatsArr?.[0] || null

      // Calculate kills change
      // Only count kills if we have a baseline from BEFORE the period started
      // If player was added during the period (no pre-period stats), use their oldest stat as baseline
      let killsChange = 0
      const currentKills = latestStats?.kills || 0

      if (periodStartStats) {
        // We have stats from before the period - calculate the difference
        killsChange = currentKills - periodStartStats.kills
      } else {
        // No stats from before the period - player was added during this period
        // Get their oldest recorded stat to use as baseline
        const { data: oldestStatsArr } = await supabase
          .from("player_stats")
          .select("*")
          .eq("player_id", player.id)
          .order("recorded_at", { ascending: true })
          .limit(1)
        
        const oldestStats = oldestStatsArr?.[0] || null
        
        if (oldestStats && latestStats && oldestStats.id !== latestStats.id) {
          // We have multiple stat records - calculate difference between oldest and latest
          killsChange = currentKills - oldestStats.kills
        } else {
          // Only one stat record exists (or none) - no change to report yet
          killsChange = 0
        }
      }

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
  )

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
