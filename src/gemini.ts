import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ParsedHand {
  cards: Array<{ rank: string; suit: string }>
  handName: string
  handRank: number
}

export class GeminiCardParser {
  private genAI: GoogleGenerativeAI | null = null

  constructor(apiKey?: string) {
    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey)
    }
  }

  setApiKey(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
  }

  async parseHand(handDescription: string): Promise<ParsedHand | null> {
    if (!this.genAI) {
      throw new Error('Gemini API key not set')
    }

    const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
    Parse this poker hand description and return ONLY a JSON object with this exact format:
    {
      "cards": [{"rank": "A", "suit": "spades"}, {"rank": "K", "suit": "hearts"}, ...],
      "handName": "Straight",
      "handRank": 5
    }

    CRITICAL RULES:
    1. If ONLY "flush" is mentioned (no "straight"), make all 5 cards the SAME suit
    2. If ONLY "straight" is mentioned (no "flush"), use MIXED suits (different suits)
    3. If "straight flush" is mentioned, make all 5 cards the SAME suit AND consecutive
    4. If "royal flush" is mentioned, use A-K-Q-J-10 all same suit
    5. For pairs/trips/quads, use different suits for non-matching cards
    6. When suit is specified (e.g., "spades", "hearts"), honor that suit
    7. When no suit specified, use mixed suits unless it's a flush

    Hand ranks (highest to lowest):
    10 = Royal Flush (A-K-Q-J-10 same suit)
    9 = Straight Flush (consecutive cards same suit)
    8 = Four of a Kind (4 same rank)
    7 = Full House (3 of a kind + pair)
    6 = Flush (5 same suit, not consecutive)
    5 = Straight (consecutive ranks, MIXED suits)
    4 = Three of a Kind (3 same rank)
    3 = Two Pair (2 pairs different ranks)
    2 = One Pair (2 same rank)
    1 = High Card (no pairs, not consecutive, mixed suits)

    Examples:
    "8 high straight" = {"handName": "Straight", "handRank": 5, "cards": [{"rank": "8", "suit": "spades"}, {"rank": "7", "suit": "hearts"}, {"rank": "6", "suit": "diamonds"}, {"rank": "5", "suit": "clubs"}, {"rank": "4", "suit": "spades"}]}
    "ace high flush" = {"handName": "Flush", "handRank": 6, "cards": [{"rank": "A", "suit": "hearts"}, {"rank": "J", "suit": "hearts"}, {"rank": "9", "suit": "hearts"}, {"rank": "7", "suit": "hearts"}, {"rank": "5", "suit": "hearts"}]}
    "straight flush" = {"handName": "Straight Flush", "handRank": 9, "cards": all same suit AND consecutive}

    Suits: "spades", "hearts", "diamonds", "clubs"
    Ranks: "A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"

    Hand description: "${handDescription}"

    Return only the JSON, no other text.
    `

    try {
      const result = await model.generateContent(prompt)
      const response = await result.response
      const text = response.text().trim()
      
      // Remove any markdown formatting
      const jsonText = text.replace(/```json\n?|\n?```/g, '').trim()
      
      const parsed = JSON.parse(jsonText)
      
      // Validate the parsed result
      if (parsed.cards && parsed.handName && typeof parsed.handRank === 'number') {
        return parsed
      }
      
      return null
    } catch (error) {
      console.error('Error parsing hand with Gemini:', error)
      return null
    }
  }

  // Fallback parser for when API is not available
  parseHandFallback(handDescription: string): ParsedHand | null {
    const description = handDescription.toLowerCase().trim()
    
    // Enhanced fallback logic with better suit handling
    if (description.includes('royal flush')) {
      const suit = this.extractSuit(description) || 'spades'
      return {
        cards: [
          { rank: 'A', suit },
          { rank: 'K', suit },
          { rank: 'Q', suit },
          { rank: 'J', suit },
          { rank: '10', suit }
        ],
        handName: 'Royal Flush',
        handRank: 10
      }
    } else if (description.includes('straight flush')) {
      const suit = this.extractSuit(description) || 'hearts'
      return {
        cards: [
          { rank: '9', suit },
          { rank: '8', suit },
          { rank: '7', suit },
          { rank: '6', suit },
          { rank: '5', suit }
        ],
        handName: 'Straight Flush',
        handRank: 9
      }
    } else if (description.includes('four of a kind') || description.includes('quads')) {
      return {
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
    } else if (description.includes('full house') || description.includes('boat')) {
      return {
        cards: [
          { rank: 'K', suit: 'spades' },
          { rank: 'K', suit: 'hearts' },
          { rank: 'K', suit: 'diamonds' },
          { rank: 'Q', suit: 'clubs' },
          { rank: 'Q', suit: 'spades' }
        ],
        handName: 'Full House',
        handRank: 7
      }
    } else if (description.includes('flush') && !description.includes('straight')) {
      const suit = this.extractSuit(description) || 'clubs'
      return {
        cards: [
          { rank: 'A', suit },
          { rank: 'J', suit },
          { rank: '9', suit },
          { rank: '7', suit },
          { rank: '5', suit }
        ],
        handName: 'Flush',
        handRank: 6
      }
    } else if (description.includes('straight') && !description.includes('flush')) {
      // Regular straight with MIXED suits
      return {
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
    } else if (description.includes('three of a kind') || description.includes('trips')) {
      return {
        cards: [
          { rank: 'K', suit: 'spades' },
          { rank: 'K', suit: 'hearts' },
          { rank: 'K', suit: 'diamonds' },
          { rank: 'Q', suit: 'clubs' },
          { rank: '9', suit: 'spades' }
        ],
        handName: 'Three of a Kind',
        handRank: 4
      }
    } else if (description.includes('two pair')) {
      return {
        cards: [
          { rank: 'K', suit: 'spades' },
          { rank: 'K', suit: 'hearts' },
          { rank: 'Q', suit: 'diamonds' },
          { rank: 'Q', suit: 'clubs' },
          { rank: '9', suit: 'spades' }
        ],
        handName: 'Two Pair',
        handRank: 3
      }
    } else if (description.includes('pair')) {
      return {
        cards: [
          { rank: 'K', suit: 'spades' },
          { rank: 'K', suit: 'hearts' },
          { rank: 'Q', suit: 'diamonds' },
          { rank: 'J', suit: 'clubs' },
          { rank: '9', suit: 'spades' }
        ],
        handName: 'One Pair',
        handRank: 2
      }
    }
    
    return null
  }

  private extractSuit(description: string): string | null {
    if (description.includes('spade')) return 'spades'
    if (description.includes('heart')) return 'hearts'  
    if (description.includes('diamond')) return 'diamonds'
    if (description.includes('club')) return 'clubs'
    return null
  }
}