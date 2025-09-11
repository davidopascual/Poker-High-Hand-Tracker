import { useState, useEffect } from 'react'
import './App.css'
import { Card } from './Card'
import { GeminiCardParser, type ParsedHand } from './gemini'

interface HighHandEntry {
  id: number
  timestamp: Date
  player: string
  hand: string
  amount: number
  parsedHand?: ParsedHand
}

interface CurrentBestHand {
  player: string
  hand: string
  parsedHand?: ParsedHand
  timestamp: Date
}

function App() {
  const [timerMinutes, setTimerMinutes] = useState(15)
  const [timeRemaining, setTimeRemaining] = useState(15 * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [currentPlayer, setCurrentPlayer] = useState('')
  const [currentHand, setCurrentHand] = useState('')
  const [currentAmount, setCurrentAmount] = useState('')
  const [entries, setEntries] = useState<HighHandEntry[]>([])
  const [nextId, setNextId] = useState(1)
  const [geminiApiKey, setGeminiApiKey] = useState(import.meta.env.VITE_GEMINI_API_KEY || '')
  const [cardParser] = useState(() => new GeminiCardParser(import.meta.env.VITE_GEMINI_API_KEY))
  const [currentBestHand, setCurrentBestHand] = useState<CurrentBestHand | null>(null)
  const [isParsingHand, setIsParsingHand] = useState(false)
  const [showApiKeyInput, setShowApiKeyInput] = useState(!import.meta.env.VITE_GEMINI_API_KEY)
  const [demoMode, setDemoMode] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null)

  useEffect(() => {
    let interval: number
    
    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsRunning(false)
            alert(`${timerMinutes} minutes up! Time to record the high hand!`)
            return timerMinutes * 60
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [isRunning, timeRemaining])

  // Notification auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setNotification({ message, type })
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const startTimer = () => {
    setIsRunning(true)
  }

  const pauseTimer = () => {
    setIsRunning(false)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setTimeRemaining(timerMinutes * 60)
    setCurrentBestHand(null)
  }

  const updateTimerDuration = (minutes: number) => {
    setTimerMinutes(minutes)
    if (!isRunning) {
      setTimeRemaining(minutes * 60)
    }
  }

  const handleApiKeySubmit = () => {
    if (geminiApiKey.trim()) {
      cardParser.setApiKey(geminiApiKey.trim())
      setShowApiKeyInput(false)
      showNotification('✅ Gemini AI enabled! Now you can use natural language for hands.', 'success')
    } else {
      showNotification('⚠️ Please enter a valid API key', 'error')
    }
  }

  const parseHandWithGemini = async (handDescription: string): Promise<ParsedHand | null> => {
    try {
      if (geminiApiKey) {
        const result = await cardParser.parseHand(handDescription)
        if (result) {
          showNotification(`🤖 AI parsed: ${result.handName}`, 'success')
          return result
        }
      }
      
      const fallbackResult = cardParser.parseHandFallback(handDescription)
      if (fallbackResult) {
        showNotification(`🔄 Using fallback parsing: ${fallbackResult.handName}`, 'info')
        return fallbackResult
      }
      
      showNotification('⚠️ Could not parse hand description. Try: "Royal flush", "Four aces", "8 high straight"', 'error')
      return null
    } catch (error) {
      console.error('Error parsing hand:', error)
      showNotification('❌ Error parsing hand. Using fallback method.', 'error')
      return cardParser.parseHandFallback(handDescription)
    }
  }

  const updateCurrentBest = async () => {
    if (!currentPlayer.trim() || !currentHand.trim()) return
    
    setIsParsingHand(true)
    const parsedHand = await parseHandWithGemini(currentHand)
    
    const newBest: CurrentBestHand = {
      player: currentPlayer.trim(),
      hand: currentHand.trim(),
      parsedHand,
      timestamp: new Date()
    }
    
    // Only update if this hand is better than current best
    if (!currentBestHand || (parsedHand && parsedHand.handRank > (currentBestHand.parsedHand?.handRank || 0))) {
      setCurrentBestHand(newBest)
    }
    
    setIsParsingHand(false)
    setCurrentPlayer('')
    setCurrentHand('')
  }

  const recordHighHand = async () => {
    const handToRecord = currentBestHand || {
      player: currentPlayer.trim(),
      hand: currentHand.trim(),
      parsedHand: null
    }

    if (!handToRecord.player || !handToRecord.hand) {
      alert('Please enter both player name and hand')
      return
    }

    setIsParsingHand(true)
    let parsedHand = handToRecord.parsedHand
    if (!parsedHand) {
      parsedHand = await parseHandWithGemini(handToRecord.hand)
    }

    const amount = parseFloat(currentAmount) || 0
    const newEntry: HighHandEntry = {
      id: nextId,
      timestamp: new Date(),
      player: handToRecord.player,
      hand: handToRecord.hand,
      amount: amount,
      parsedHand
    }

    setEntries(prev => [newEntry, ...prev])
    setNextId(prev => prev + 1)
    setCurrentPlayer('')
    setCurrentHand('')
    setCurrentAmount('')
    setCurrentBestHand(null)
    setIsParsingHand(false)
    resetTimer()
  }

  const deleteEntry = (id: number) => {
    setEntries(prev => prev.filter(entry => entry.id !== id))
  }

  const loadDemoData = () => {
    const demoEntries: HighHandEntry[] = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        player: 'Alex Chen',
        hand: 'Royal flush in spades',
        amount: 500,
        parsedHand: {
          cards: [
            { rank: 'A', suit: 'spades' },
            { rank: 'K', suit: 'spades' },
            { rank: 'Q', suit: 'spades' },
            { rank: 'J', suit: 'spades' },
            { rank: '10', suit: 'spades' }
          ],
          handName: 'Royal Flush',
          handRank: 10
        }
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 7200000), // 2 hours ago
        player: 'Maria Rodriguez',
        hand: 'Four aces',
        amount: 300,
        parsedHand: {
          cards: [
            { rank: 'A', suit: 'spades' },
            { rank: 'A', suit: 'hearts' },
            { rank: 'A', suit: 'diamonds' },
            { rank: 'A', suit: 'clubs' },
            { rank: 'K', suit: 'spades' }
          ],
          handName: 'Four of a Kind',
          handRank: 8
        }
      },
      {
        id: 3,
        timestamp: new Date(Date.now() - 10800000), // 3 hours ago
        player: 'John Smith',
        hand: '8 high straight',
        amount: 150,
        parsedHand: {
          cards: [
            { rank: '8', suit: 'spades' },
            { rank: '7', suit: 'hearts' },
            { rank: '6', suit: 'diamonds' },
            { rank: '5', suit: 'clubs' },
            { rank: '4', suit: 'hearts' }
          ],
          handName: 'Straight',
          handRank: 5
        }
      }
    ]
    setEntries(demoEntries)
    setNextId(4)
    setDemoMode(true)
  }

  const clearDemoData = () => {
    setEntries([])
    setNextId(1)
    setDemoMode(false)
    setCurrentBestHand(null)
  }

  const getHandStats = () => {
    const totalPayout = entries.reduce((sum, entry) => sum + entry.amount, 0)
    const handsByRank = entries.reduce((acc, entry) => {
      const rank = entry.parsedHand?.handRank || 0
      acc[rank] = (acc[rank] || 0) + 1
      return acc
    }, {} as Record<number, number>)
    
    return {
      totalHands: entries.length,
      totalPayout,
      averagePayout: entries.length > 0 ? totalPayout / entries.length : 0,
      handsByRank
    }
  }

  const handRankNames = {
    10: 'Royal Flush',
    9: 'Straight Flush', 
    8: 'Four of a Kind',
    7: 'Full House',
    6: 'Flush',
    5: 'Straight',
    4: 'Three of a Kind',
    3: 'Two Pair',
    2: 'One Pair',
    1: 'High Card'
  }

  const stats = getHandStats()

  return (
    <div className="app">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ margin: 0 }}>High Hand Tracker</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={() => setShowStats(!showStats)} 
            className="stats-toggle"
            style={{ 
              background: 'rgba(99, 102, 241, 0.2)', 
              border: '1px solid var(--primary)', 
              color: 'var(--primary)',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.9rem'
            }}
          >
            📊 Stats
          </button>
          {!demoMode ? (
            <button 
              onClick={loadDemoData} 
              className="demo-toggle"
              style={{ 
                background: 'rgba(245, 158, 11, 0.2)', 
                border: '1px solid var(--accent)', 
                color: 'var(--accent)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            >
              🎯 Demo Mode
            </button>
          ) : (
            <button 
              onClick={clearDemoData} 
              className="demo-toggle"
              style={{ 
                background: 'rgba(239, 68, 68, 0.2)', 
                border: '1px solid var(--danger)', 
                color: 'var(--danger)',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.9rem'
              }}
            >
              ❌ Clear Demo
            </button>
          )}
        </div>
      </div>

      {showStats && stats.totalHands > 0 && (
        <div className="stats-section" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '20px',
          padding: '2rem',
          border: '1px solid rgba(99, 102, 241, 0.3)',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)',
          marginBottom: '2rem'
        }}>
          <h2 style={{ color: 'var(--primary)', textAlign: 'center', marginBottom: '1.5rem', fontSize: '1.75rem', fontWeight: '700' }}>
            Session Statistics
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--accent)' }}>{stats.totalHands}</div>
              <div style={{ color: 'var(--gray)' }}>Total Hands</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--success)' }}>${stats.totalPayout.toFixed(0)}</div>
              <div style={{ color: 'var(--gray)' }}>Total Payout</div>
            </div>
            <div style={{ textAlign: 'center', background: 'rgba(255, 255, 255, 0.05)', padding: '1rem', borderRadius: '12px' }}>
              <div style={{ fontSize: '2rem', fontWeight: '700', color: 'var(--secondary)' }}>${stats.averagePayout.toFixed(0)}</div>
              <div style={{ color: 'var(--gray)' }}>Avg Payout</div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
            {Object.entries(stats.handsByRank).sort(([a], [b]) => Number(b) - Number(a)).map(([rank, count]) => (
              <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '8px' }}>
                <span style={{ fontSize: '0.9rem' }}>{handRankNames[Number(rank) as keyof typeof handRankNames]}</span>
                <span style={{ fontWeight: '700', color: 'var(--accent)' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification && (
        <div 
          className="notification-toast"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '1rem 1.5rem',
            borderRadius: '12px',
            color: 'white',
            fontSize: '0.9rem',
            fontWeight: '500',
            zIndex: 1000,
            maxWidth: '350px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.9)' :
                       notification.type === 'error' ? 'rgba(239, 68, 68, 0.9)' :
                       'rgba(99, 102, 241, 0.9)',
            border: `1px solid ${notification.type === 'success' ? 'var(--success)' :
                                notification.type === 'error' ? 'var(--danger)' :
                                'var(--primary)'}`,
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          {notification.message}
        </div>
      )}
      
      {showApiKeyInput && (
        <div className="api-key-section">
          <h3>Optional: Enter Gemini API Key for Smart Hand Parsing</h3>
          <div className="api-input-group">
            <input
              type="password"
              placeholder="Gemini API Key (optional)"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
            />
            <button onClick={handleApiKeySubmit} className="api-submit">
              Set Key
            </button>
            <button onClick={() => setShowApiKeyInput(false)} className="skip">
              Skip
            </button>
          </div>
          <p className="api-note">With an API key, the app can automatically parse hand descriptions and display cards. Without it, you'll get fallback parsing for common hands.</p>
        </div>
      )}
      
      <div className="timer-section">
        <div className="timer-config">
          <label>Timer Duration: </label>
          <select 
            value={timerMinutes} 
            onChange={(e) => updateTimerDuration(parseInt(e.target.value))}
            disabled={isRunning}
          >
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </div>
        
        <div className="timer-display">
          <span className={`time ${timeRemaining <= 60 ? 'warning' : ''}`}>
            {formatTime(timeRemaining)}
          </span>
        </div>
        
        <div className="timer-controls">
          <button onClick={startTimer} disabled={isRunning} className="start">
            Start
          </button>
          <button onClick={pauseTimer} disabled={!isRunning} className="pause">
            Pause
          </button>
          <button onClick={resetTimer} className="reset">
            Reset
          </button>
        </div>
      </div>

      {currentBestHand && (
        <div className="current-best-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0 }}>Current Best Hand</h2>
            <button 
              onClick={() => setCurrentBestHand(null)} 
              className="delete"
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              Clear
            </button>
          </div>
          <div className="best-hand-display">
            <div className="hand-info">
              <span className="player">{currentBestHand.player}</span>
              <span className="hand">{currentBestHand.hand}</span>
              {currentBestHand.parsedHand && (
                <span className="hand-rank">Rank: {currentBestHand.parsedHand.handRank}/10</span>
              )}
            </div>
            {currentBestHand.parsedHand && (
              <div className="cards-display">
                {currentBestHand.parsedHand.cards.map((card, index) => (
                  <Card key={index} rank={card.rank} suit={card.suit} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="record-section">
        <h2>{isRunning ? 'Update Current Best' : 'Record Final Hand'}</h2>
        <div className="input-group">
          <input
            type="text"
            placeholder="Player name"
            value={currentPlayer}
            onChange={(e) => setCurrentPlayer(e.target.value)}
          />
          <input
            type="text"
            placeholder="Hand (e.g., 'Royal Flush in spades', 'Aces full of Kings')"
            value={currentHand}
            onChange={(e) => setCurrentHand(e.target.value)}
          />
          {!isRunning && (
            <input
              type="number"
              step="0.01"
              placeholder="Amount ($)"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
            />
          )}
          {isRunning ? (
            <button 
              onClick={updateCurrentBest} 
              className="update"
              disabled={isParsingHand}
            >
              {isParsingHand ? 'Parsing...' : 'Update Best'}
            </button>
          ) : (
            <button 
              onClick={recordHighHand} 
              className="record"
              disabled={isParsingHand}
            >
              {isParsingHand ? 'Parsing...' : 'Record Hand'}
            </button>
          )}
        </div>
      </div>

      <div className="history-section">
        <h2>High Hand History</h2>
        {entries.length === 0 ? (
          <p>No hands recorded yet</p>
        ) : (
          <div className="entries">
            {entries.map(entry => (
              <div key={entry.id} className="entry">
                <div className="entry-main">
                  <span className="player">{entry.player}</span>
                  <span className="hand">{entry.hand}</span>
                  {entry.parsedHand && (
                    <span className="hand-rank">Rank: {entry.parsedHand.handRank}/10</span>
                  )}
                  {entry.amount > 0 && <span className="amount">${entry.amount.toFixed(2)}</span>}
                </div>
                {entry.parsedHand && (
                  <div className="entry-cards">
                    {entry.parsedHand.cards.map((card, index) => (
                      <Card key={index} rank={card.rank} suit={card.suit} />
                    ))}
                  </div>
                )}
                <div className="entry-meta">
                  <span className="timestamp">
                    {entry.timestamp.toLocaleTimeString()}
                  </span>
                  <button onClick={() => deleteEntry(entry.id)} className="delete">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
