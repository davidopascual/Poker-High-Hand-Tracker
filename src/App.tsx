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
    }
  }

  const parseHandWithGemini = async (handDescription: string): Promise<ParsedHand | null> => {
    try {
      if (geminiApiKey) {
        return await cardParser.parseHand(handDescription)
      } else {
        return cardParser.parseHandFallback(handDescription)
      }
    } catch (error) {
      console.error('Error parsing hand:', error)
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

  return (
    <div className="app">
      <h1>High Hand Tracker</h1>
      
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
