import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

async function isAuthenticated() {
  const cookieStore = await cookies()
  const session = cookieStore.get("admin_session")
  return !!session?.value
}

export async function GET() {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const supabase = await createClient()
  
  const { data: players, error } = await supabase
    .from("players")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ players })
}

export async function POST(request: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { username, displayName } = await request.json()

    if (!username || typeof username !== "string") {
      return NextResponse.json({ error: "Username is required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if player already exists
    const { data: existing } = await supabase
      .from("players")
      .select("id")
      .eq("username", username.toLowerCase())
      .single()

    if (existing) {
      return NextResponse.json({ error: "Player already exists" }, { status: 400 })
    }

    // Add the player
    const { data: player, error } = await supabase
      .from("players")
      .insert({
        username: username.toLowerCase(),
        display_name: displayName || null,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Trigger initial sync for this player
    await syncPlayerStats(player.id, username.toLowerCase())

    return NextResponse.json({ player })
  } catch {
    return NextResponse.json({ error: "Failed to add player" }, { status: 500 })
  }
}

async function syncPlayerStats(playerId: string, username: string) {
  try {
    const response = await fetch(
      `https://spawnpk.net/highscores/index.php?name=${encodeURIComponent(username)}&submit=Search`
    )
    const html = await response.text()

    // Parse the HTML to extract stats
    const stats = parseHighscoresHtml(html, username)
    
    if (stats) {
      const supabase = await createClient()
      await supabase.from("player_stats").insert({
        player_id: playerId,
        kills: stats.kills,
        deaths: stats.deaths,
        kdr: stats.kdr,
        streak: stats.streak,
        elo: stats.elo,
      })
    }
  } catch (error) {
    console.error(`Failed to sync stats for ${username}:`, error)
  }
}

function parseHighscoresHtml(html: string, username: string) {
  try {
    // Look for the player row in the table
    // Format: <td>username</td><td>Mode</td><td>Kills</td><td>Deaths</td><td>KDR</td><td>Streak</td><td>ELO</td>
    const regex = new RegExp(
      `<a[^>]*>${username}</a>\\s*</td>\\s*<td[^>]*>([^<]*)</td>\\s*<td[^>]*>([\\d,]+)</td>\\s*<td[^>]*>([\\d,]+)</td>\\s*<td[^>]*>([\\d.]+)</td>\\s*<td[^>]*>([\\d,]+)</td>\\s*<td[^>]*>([\\d,]+)</td>`,
      "i"
    )
    
    const match = html.match(regex)
    
    if (match) {
      return {
        kills: parseInt(match[2].replace(/,/g, ""), 10) || 0,
        deaths: parseInt(match[3].replace(/,/g, ""), 10) || 0,
        kdr: parseFloat(match[4]) || 0,
        streak: parseInt(match[5].replace(/,/g, ""), 10) || 0,
        elo: parseInt(match[6].replace(/,/g, ""), 10) || 0,
      }
    }
    
    return null
  } catch {
    return null
  }
}
