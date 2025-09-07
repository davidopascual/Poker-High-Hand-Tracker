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
      "cards": [{"rank": "A", "suit": "spades"}, {"rank": "K", "suit": "spades"}, ...],
      "handName": "Royal Flush",
      "handRank": 10
    }

    Hand ranks (highest to lowest):
    10 = Royal Flush
    9 = Straight Flush
    8 = Four of a Kind
    7 = Full House
    6 = Flush
    5 = Straight
    4 = Three of a Kind
    3 = Two Pair
    2 = One Pair
    1 = High Card

    Suits should be: "spades", "hearts", "diamonds", "clubs"
    Ranks should be: "A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"

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
    
    // Simple fallback logic
    if (description.includes('royal flush')) {
      return {
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
    } else if (description.includes('straight flush')) {
      return {
        cards: [
          { rank: '9', suit: 'hearts' },
          { rank: '8', suit: 'hearts' },
          { rank: '7', suit: 'hearts' },
          { rank: '6', suit: 'hearts' },
          { rank: '5', suit: 'hearts' }
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
    } else if (description.includes('full house')) {
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
    } else if (description.includes('flush')) {
      return {
        cards: [
          { rank: 'A', suit: 'clubs' },
          { rank: 'J', suit: 'clubs' },
          { rank: '9', suit: 'clubs' },
          { rank: '7', suit: 'clubs' },
          { rank: '5', suit: 'clubs' }
        ],
        handName: 'Flush',
        handRank: 6
      }
    } else if (description.includes('straight')) {
      return {
        cards: [
          { rank: 'A', suit: 'spades' },
          { rank: 'K', suit: 'hearts' },
          { rank: 'Q', suit: 'diamonds' },
          { rank: 'J', suit: 'clubs' },
          { rank: '10', suit: 'spades' }
        ],
        handName: 'Straight',
        handRank: 5
      }
    }
    
    return null
  }
}