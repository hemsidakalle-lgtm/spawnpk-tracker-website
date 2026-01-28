"use client"

import React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import useSWR, { mutate } from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Shield, Plus, Trash2, Edit, LogOut, RefreshCw, ArrowLeft, Users } from "lucide-react"
import Link from "next/link"

interface Player {
  id: string
  username: string
  display_name: string | null
  created_at: string
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch")
  return res.json()
})

export default function AdminDashboardPage() {
  const router = useRouter()
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [newUsername, setNewUsername] = useState("")
  const [newDisplayName, setNewDisplayName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check auth
  const { data: session, error: sessionError } = useSWR("/api/admin/session", fetcher)
  
  // Fetch players
  const { data: playersData, error: playersError } = useSWR<{ players: Player[] }>(
    session?.authenticated ? "/api/admin/players" : null,
    fetcher
  )

  useEffect(() => {
    if (sessionError) {
      router.push("/admin")
    }
  }, [sessionError, router])

  const handleLogout = async () => {
    await fetch("/api/admin/logout", { method: "POST" })
    router.push("/admin")
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, displayName: newDisplayName || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to add player")
      }

      setNewUsername("")
      setNewDisplayName("")
      setIsAddOpen(false)
      mutate("/api/admin/players")
      
      // Auto-sync to fetch the new player's stats immediately
      setIsSyncing(true)
      try {
        await fetch("/api/sync", { method: "POST" })
      } finally {
        setIsSyncing(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add player")
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer) return
    
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/players/${editingPlayer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, displayName: newDisplayName || null }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update player")
      }

      setEditingPlayer(null)
      setNewUsername("")
      setNewDisplayName("")
      setIsEditOpen(false)
      mutate("/api/admin/players")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update player")
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeletePlayer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this player?")) return

    try {
      const res = await fetch(`/api/admin/players/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to delete player")
      mutate("/api/admin/players")
    } catch (err) {
      alert("Failed to delete player")
    }
  }

  const handleSyncAll = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch("/api/sync", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Sync failed")
      mutate("/api/admin/players")
      if (data.errors && data.errors.length > 0) {
        alert(`Synced ${data.synced}/${data.total} players.\n\nErrors:\n${data.errors.join("\n")}`)
      } else {
        alert(`Successfully synced ${data.synced} player(s)!`)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to sync stats")
    } finally {
      setIsSyncing(false)
    }
  }

  const openEditDialog = (player: Player) => {
    setEditingPlayer(player)
    setNewUsername(player.username)
    setNewDisplayName(player.display_name || "")
    setIsEditOpen(true)
  }

  if (!session?.authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const players = playersData?.players || []

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
                  <p className="text-xs text-muted-foreground">Manage tracked players</p>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleLogout}
              className="border-border/50 text-foreground hover:bg-secondary/50 bg-transparent"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">{players.length} players tracked</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleSyncAll}
              disabled={isSyncing}
              className="border-border/50 text-foreground hover:bg-secondary/50 bg-transparent"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync All Stats"}
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Player
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border/50 text-foreground">
                <DialogHeader>
                  <DialogTitle>Add New Player</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Enter the SpawnPK username to track. The username must match exactly as shown on the highscores.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddPlayer} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-username">SpawnPK Username</Label>
                    <Input
                      id="add-username"
                      placeholder="e.g., hellspawn"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                      className="bg-input border-border/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-display">Display Name (optional)</Label>
                    <Input
                      id="add-display"
                      placeholder="e.g., Hellspawn"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="bg-input border-border/50"
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="border-border/50">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
                      {isLoading ? "Adding..." : "Add Player"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Players Table */}
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-foreground">Tracked Players</CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage the players being tracked on the leaderboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Username</TableHead>
                  <TableHead className="text-muted-foreground">Display Name</TableHead>
                  <TableHead className="text-muted-foreground">Added</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {players.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No players tracked yet. Add a player to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  players.map((player) => (
                    <TableRow key={player.id} className="border-border/50 hover:bg-secondary/30">
                      <TableCell className="font-mono text-foreground">{player.username}</TableCell>
                      <TableCell className="text-foreground">{player.display_name || "-"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(player.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(player)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlayer(player.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="bg-card border-border/50 text-foreground">
            <DialogHeader>
              <DialogTitle>Edit Player</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Update the player details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditPlayer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-username">SpawnPK Username</Label>
                <Input
                  id="edit-username"
                  placeholder="e.g., hellspawn"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  className="bg-input border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-display">Display Name (optional)</Label>
                <Input
                  id="edit-display"
                  placeholder="e.g., Hellspawn"
                  value={newDisplayName}
                  onChange={(e) => setNewDisplayName(e.target.value)}
                  className="bg-input border-border/50"
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="border-border/50">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="bg-primary text-primary-foreground">
                  {isLoading ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  )
}
