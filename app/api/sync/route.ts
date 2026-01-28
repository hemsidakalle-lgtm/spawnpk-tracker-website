import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

// This endpoint can be called by a cron job (e.g., Vercel Cron) every hour
// or manually from the admin panel

export async function POST() {
  try {
    const supabase = await createClient()

    // Get all tracked players
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, username")

    if (playersError) {
      console.error("Error fetching players:", playersError)
      return NextResponse.json({ error: "Failed to fetch players" }, { status: 500 })
    }

    if (!players || players.length === 0) {
      return NextResponse.json({ message: "No players to sync", synced: 0 })
    }

    let syncedCount = 0
    const errors: string[] = []

    // Sync each player
    for (const player of players) {
      try {
        const stats = await fetchPlayerStats(player.username)
        
        if (stats) {
          const { error: insertError } = await supabase.from("player_stats").insert({
            player_id: player.id,
            kills: stats.kills,
            deaths: stats.deaths,
            kdr: stats.kdr,
            streak: stats.streak,
            elo: stats.elo,
          })

          if (insertError) {
            errors.push(`Failed to save stats for ${player.username}: ${insertError.message}`)
          } else {
            syncedCount++
          }
        } else {
          errors.push(`Could not fetch stats for ${player.username}`)
        }
      } catch (error) {
        errors.push(`Error syncing ${player.username}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    return NextResponse.json({
      message: `Synced ${syncedCount} of ${players.length} players`,
      synced: syncedCount,
      total: players.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error("Sync error:", error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}

// GET endpoint for cron jobs (Vercel Cron sends GET requests)
export async function GET(request: Request) {
  // Optional: Add a secret token for cron job authentication
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Call the POST handler logic
  return POST()
}

async function fetchPlayerStats(username: string) {
  try {
    const response = await fetch(
      `https://spawnpk.net/highscores/index.php?name=${encodeURIComponent(username)}&submit=Search`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      console.error(`[v0] HTTP error fetching stats for ${username}: ${response.status}`)
      return null
    }

    const html = await response.text()
    console.log(`[v0] Fetched HTML for ${username}, length: ${html.length}`)
    return parseHighscoresHtml(html, username)
  } catch (error) {
    console.error(`[v0] Error fetching stats for ${username}:`, error)
    return null
  }
}

function parseHighscoresHtml(html: string, username: string) {
  try {
    // The SpawnPK highscores page structure:
    // Table row format: [username link] | [Mode] | [Kills] | [Deaths] | [KDR] | [Streak] | [ELO]
    // Example: ebrahkdabri | Trained | 2195 | 2372 | 0.93 | 63 | 1269
    
    const lowerUsername = username.toLowerCase()
    console.log(`[v0] Parsing stats for ${username}`)
    
    // Pattern 1: Standard table cell format with username in anchor tag
    // Looking for: >username</a> ... then numbers in table cells
    const pattern1 = new RegExp(
      `>${lowerUsername}</a>[\\s\\S]*?<td[^>]*>\\s*(?:Trained|Pure|Zerker|Maxed|[A-Za-z]+)\\s*</td>\\s*<td[^>]*>\\s*(\\d+)\\s*</td>\\s*<td[^>]*>\\s*(\\d+)\\s*</td>\\s*<td[^>]*>\\s*([\\d.]+)\\s*</td>\\s*<td[^>]*>\\s*(\\d+)\\s*</td>\\s*<td[^>]*>\\s*(\\d+)\\s*</td>`,
      "i"
    )
    
    let match = html.match(pattern1)
    
    if (match) {
      console.log(`[v0] Pattern 1 matched for ${username}:`, match.slice(1, 6))
      return {
        kills: parseInt(match[1], 10) || 0,
        deaths: parseInt(match[2], 10) || 0,
        kdr: parseFloat(match[3]) || 0,
        streak: parseInt(match[4], 10) || 0,
        elo: parseInt(match[5], 10) || 0,
      }
    }

    // Pattern 2: Find the username link and extract numbers after it
    const usernamePatterns = [
      `>${lowerUsername}</a>`,
      `">${lowerUsername}</a>`,
      `>${username}</a>`,
    ]
    
    for (const pattern of usernamePatterns) {
      const usernameIndex = html.toLowerCase().indexOf(pattern.toLowerCase())
      if (usernameIndex !== -1) {
        // Extract text after the username (next 1000 chars should contain the stats)
        const afterUsername = html.substring(usernameIndex, usernameIndex + 1000)
        console.log(`[v0] Found username at index ${usernameIndex}, extracting from: ${afterUsername.substring(0, 200)}`)
        
        // Look for the specific pattern: Mode then 5 numbers
        // The cells contain: Mode, Kills, Deaths, KDR, Streak, ELO
        const cellPattern = /<td[^>]*>\s*([\d.]+)\s*<\/td>/gi
        const cellMatches = [...afterUsername.matchAll(cellPattern)]
        
        if (cellMatches.length >= 5) {
          const values = cellMatches.map(m => m[1])
          console.log(`[v0] Pattern 2 extracted values for ${username}:`, values.slice(0, 5))
          
          return {
            kills: parseInt(values[0], 10) || 0,
            deaths: parseInt(values[1], 10) || 0,
            kdr: parseFloat(values[2]) || 0,
            streak: parseInt(values[3], 10) || 0,
            elo: parseInt(values[4], 10) || 0,
          }
        }
      }
    }

    // Pattern 3: Simple regex - find sequence of 5 numbers after username
    const simplePattern = new RegExp(
      `${lowerUsername}[\\s\\S]*?(\\d{1,6})[\\s\\S]*?(\\d{1,6})[\\s\\S]*?(\\d+\\.\\d+)[\\s\\S]*?(\\d{1,6})[\\s\\S]*?(\\d{1,6})`,
      "i"
    )
    
    match = html.match(simplePattern)
    
    if (match) {
      console.log(`[v0] Pattern 3 matched for ${username}:`, match.slice(1, 6))
      return {
        kills: parseInt(match[1], 10) || 0,
        deaths: parseInt(match[2], 10) || 0,
        kdr: parseFloat(match[3]) || 0,
        streak: parseInt(match[4], 10) || 0,
        elo: parseInt(match[5], 10) || 0,
      }
    }

    // Log a portion of the HTML for debugging
    console.log(`[v0] Could not parse stats for ${username}. HTML contains username: ${html.toLowerCase().includes(lowerUsername)}`)
    console.log(`[v0] HTML snippet around potential match:`, html.substring(0, 2000))
    return null
  } catch (error) {
    console.error(`[v0] Error parsing HTML for ${username}:`, error)
    return null
  }
}
