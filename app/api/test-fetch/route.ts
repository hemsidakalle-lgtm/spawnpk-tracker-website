import { NextResponse } from "next/server"

// Debug endpoint to test fetching from SpawnPK
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const username = searchParams.get("username") || "hellspawn"
  
  try {
    const response = await fetch(
      `https://spawnpk.net/highscores/index.php?name=${encodeURIComponent(username)}&submit=Search`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        cache: "no-store",
      }
    )

    if (!response.ok) {
      return NextResponse.json({ 
        error: `HTTP ${response.status}`,
        status: response.status 
      }, { status: 500 })
    }

    const html = await response.text()
    const lowerUsername = username.toLowerCase()
    
    // Try to find the username in the HTML
    const usernameIndex = html.toLowerCase().indexOf(`>${lowerUsername}</a>`)
    const hasUsername = html.toLowerCase().includes(lowerUsername)
    
    // Extract a relevant snippet
    let snippet = ""
    if (usernameIndex !== -1) {
      snippet = html.substring(Math.max(0, usernameIndex - 100), usernameIndex + 500)
    } else if (hasUsername) {
      const idx = html.toLowerCase().indexOf(lowerUsername)
      snippet = html.substring(Math.max(0, idx - 100), idx + 500)
    } else {
      // Just return the first part of the HTML
      snippet = html.substring(0, 2000)
    }
    
    // Try to extract numbers after username
    const cellPattern = /<td[^>]*>\s*([\d.]+)\s*<\/td>/gi
    const allCells = [...html.matchAll(cellPattern)]
    
    return NextResponse.json({
      username,
      htmlLength: html.length,
      hasUsername,
      usernameIndex,
      snippet,
      allCellValues: allCells.slice(0, 20).map(m => m[1]),
    })
  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}
