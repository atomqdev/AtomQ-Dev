"use client"

import { useState, useEffect } from "react"
import { PartyKitClient } from "@/lib/partykit-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react"

export default function TestWSPage() {
  const [room, setRoom] = useState("")
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle')
  const [message, setMessage] = useState("")
  const [serverInfo, setServerInfo] = useState("")
  const [users, setUsers] = useState<string[]>([])

  const handleTestConnection = async () => {
    if (!room.trim()) {
      setMessage("Please enter a room name")
      return
    }

    setStatus('connecting')
    setMessage(`Connecting to ws://localhost:1999/party/${room}...`)

    try {
      const client = new PartyKitClient(room)

      await client.connect({
        onOpen: () => {
          setStatus('connected')
          setMessage('✅ Successfully connected to PartyKit server!')
          setServerInfo(`ws://localhost:1999/party/${room}`)
        },
        onError: (error) => {
          setStatus('error')
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          setMessage(`❌ Connection failed: ${errorMsg}`)
          setServerInfo(`ws://localhost:1999/party/${room}`)
        },
        onUserUpdate: (updatedUsers) => {
          setUsers(updatedUsers.map(u => u.nickname))
        },
        onAdminConfirmed: () => {
          setMessage('✅ Admin privileges confirmed')
        },
        onGetReady: (payload) => {
          setMessage(`📝 Get ready for question ${payload.questionIndex}`)
        },
        onQuestionStart: (question) => {
          setMessage(`❓ Question started: ${question.question}`)
        },
        onShowAnswer: (payload) => {
          setMessage(`✅ Answer shown: ${payload.correctAnswer}`)
        },
        onLeaderboardUpdate: (payload) => {
          setMessage(`🏆 Leaderboard updated with ${payload.leaderboard.length} entries`)
        },
        onQuizEnded: (payload) => {
          setMessage(`🏁 Quiz ended!`)
        },
      })

      // Test sending a message
      setTimeout(() => {
        if (status === 'connected') {
          client.requestState()
        }
      }, 1000)

    } catch (error) {
      setStatus('error')
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      setMessage(`❌ Failed to connect: ${errorMsg}`)
    }
  }

  const handleTestServer = async () => {
    setMessage("Testing PartyKit server accessibility...")
    const result = await PartyKitClient.testServer()
    if (result.accessible) {
      setMessage(`✅ ${result.message}`)
      setServerInfo(result.message)
    } else {
      setMessage(`❌ ${result.message}`)
      setServerInfo("Server unreachable")
    }
  }

  const statusIcon = status === 'connected' ? <CheckCircle className="h-5 w-5 text-green-500" /> :
                   status === 'error' ? <XCircle className="h-5 w-5 text-red-500" /> :
                   status === 'connecting' ? <Loader2 className="h-5 w-5 animate-spin" /> :
                   <Wifi className="h-5 w-5 text-muted-foreground" />

  const statusColor = status === 'connected' ? 'text-green-500' :
                      status === 'error' ? 'text-red-500' :
                      status === 'connecting' ? 'text-blue-500' :
                      'text-muted-foreground'

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {statusIcon}
            PartyKit WebSocket Test
          </CardTitle>
          <CardDescription>
            Test connection to local PartyKit server on port 1999
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {/* Server Status */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-3 h-3 rounded-full ${
                status === 'connected' ? 'bg-green-500' :
                status === 'error' ? 'bg-red-500' :
                status === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                'bg-muted'
              }`} />
              <span className="text-sm font-medium">
                Status: <span className={statusColor}>{status.toUpperCase()}</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {serverInfo || 'No server info yet'}
            </p>
          </div>

          {/* Server Test Button */}
          <div className="flex gap-2">
            <Button onClick={handleTestServer} variant="outline" className="flex-1">
              <WifiOff className="h-4 w-4 mr-2" />
              Test Server
            </Button>
          </div>

          {/* Room Input */}
          <div className="space-y-2">
            <Label htmlFor="room">Room Name / Access Key</Label>
            <Input
              id="room"
              placeholder="Enter room name or access key..."
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              disabled={status === 'connecting'}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleTestConnection()
                }
              }}
            />
          </div>

          {/* Connect Button */}
          <Button
            onClick={handleTestConnection}
            disabled={status === 'connecting' || !room.trim()}
            className="w-full"
            size="lg"
          >
            {status === 'connecting' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : status === 'connected' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Connected
              </>
            ) : (
              <>
                <Wifi className="mr-2 h-4 w-4" />
                Connect to PartyKit
              </>
            )}
          </Button>

          {/* Message Display */}
          {message && (
            <div className={`p-4 rounded-lg ${
              status === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-200' :
              status === 'connected' ? 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-200' :
              'bg-muted'
            }`}>
              <p className="text-sm whitespace-pre-wrap break-words">{message}</p>
            </div>
          )}

          {/* Connected Users */}
          {users.length > 0 && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Connected Users ({users.length}):</p>
              <div className="flex flex-wrap gap-2">
                {users.map((user, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-background border rounded text-sm"
                  >
                    {user}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950 dark:text-blue-200 rounded-lg">
            <h4 className="font-semibold mb-2 text-sm">Test Instructions:</h4>
            <ol className="text-sm space-y-1 list-decimal list-inside pl-4">
              <li>Enter a room name (this creates a unique PartyKit room)</li>
              <li>Click "Connect to PartyKit" to test WebSocket</li>
              <li>Use the same room name in multiple tabs to simulate multi-user scenario</li>
              <li>After connecting, you can test the quiz system</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
