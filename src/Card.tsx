interface CardProps {
  rank: string
  suit: string
}

export function Card({ rank, suit }: CardProps) {
  const getSuitSymbol = (suit: string) => {
    switch (suit.toLowerCase()) {
      case 'hearts':
      case 'h':
        return '♥'
      case 'diamonds':
      case 'd':
        return '♦'
      case 'clubs':
      case 'c':
        return '♣'
      case 'spades':
      case 's':
        return '♠'
      default:
        return '?'
    }
  }

  const getSuitColor = (suit: string) => {
    const s = suit.toLowerCase()
    return s === 'hearts' || s === 'h' || s === 'diamonds' || s === 'd' 
      ? '#ff4444' 
      : '#000000'
  }

  const getRankDisplay = (rank: string) => {
    switch (rank.toLowerCase()) {
      case 'a':
      case 'ace':
        return 'A'
      case 'k':
      case 'king':
        return 'K'
      case 'q':
      case 'queen':
        return 'Q'
      case 'j':
      case 'jack':
        return 'J'
      case '10':
        return '10'
      default:
        return rank.toUpperCase()
    }
  }

  return (
    <div className="playing-card">
      <div className="card-content">
        <div className="rank" style={{ color: getSuitColor(suit) }}>
          {getRankDisplay(rank)}
        </div>
        <div className="suit" style={{ color: getSuitColor(suit) }}>
          {getSuitSymbol(suit)}
        </div>
      </div>
    </div>
  )
}