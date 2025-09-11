import Anthropic from '@anthropic-ai/sdk'

export interface ParsedHand {
  cards: Array<{ rank: string; suit: string }>
  handName: string
  handRank: number
}

export class ClaudeHandParser {
  private anthropic: Anthropic | null = null

  constructor(apiKey?: string) {
    if (apiKey) {
      this.anthropic = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      })
    }
  }

  setApiKey(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true
    })
  }

  async parseHand(handDescription: string): Promise<ParsedHand | null> {
    if (!this.anthropic) {
      throw new Error('Claude API key not set')
    }

    const prompt = `Parse this poker hand description and return ONLY a JSON object with this exact format:
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
"royal flush" = {"handName": "Royal Flush", "handRank": 10, "cards": [{"rank": "A", "suit": "spades"}, {"rank": "K", "suit": "spades"}, {"rank": "Q", "suit": "spades"}, {"rank": "J", "suit": "spades"}, {"rank": "10", "suit": "spades"}]}

Suits: "spades", "hearts", "diamonds", "clubs"
Ranks: "A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"

Hand description: "${handDescription}"

Return only the JSON, no other text.`

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })

      const content = response.content[0]
      if (content.type === 'text') {
        const text = content.text.trim()
        
        // Remove any markdown formatting
        const jsonText = text.replace(/```json\n?|\n?```/g, '').trim()
        
        const parsed = JSON.parse(jsonText)
        
        // Validate the parsed result
        if (parsed.cards && parsed.handName && typeof parsed.handRank === 'number') {
          return parsed
        }
      }
      
      return null
    } catch (error) {
      console.error('Error parsing hand with Claude:', error)
      return null
    }
  }

  // Enhanced fallback parser for when API is not available
  parseHandFallback(handDescription: string): ParsedHand | null {
    const description = handDescription.toLowerCase().trim()
    
    // Royal Flush patterns
    if (this.matchesPattern(description, ['royal', 'flush']) || 
        this.matchesPattern(description, ['broadway', 'flush'])) {
      const suit = this.extractSuit(description) || 'spades'
      return this.createRoyalFlush(suit)
    }
    
    // Straight Flush patterns
    if (this.matchesPattern(description, ['straight', 'flush']) && 
        !this.matchesPattern(description, ['royal'])) {
      const suit = this.extractSuit(description) || 'hearts'
      const highCard = this.extractHighCard(description)
      return this.createStraightFlush(suit, highCard)
    }
    
    // Four of a Kind patterns
    if (this.matchesAnyPattern(description, [
      ['four', 'kind'], ['quads'], ['four', 'aces'], ['four', 'kings'], 
      ['four', 'queens'], ['four', 'jacks'], ['quad', 'aces'], ['quad', 'kings']
    ])) {
      const rank = this.extractRankFromQuads(description)
      return this.createFourOfAKind(rank)
    }
    
    // Full House patterns
    if (this.matchesAnyPattern(description, [
      ['full', 'house'], ['boat'], ['full'], ['house']
    ])) {
      const { trips, pair } = this.extractFullHouseRanks(description)
      return this.createFullHouse(trips, pair)
    }
    
    // Flush patterns (not straight flush)
    if (this.matchesPattern(description, ['flush']) && 
        !this.matchesPattern(description, ['straight']) &&
        !this.matchesPattern(description, ['royal'])) {
      const suit = this.extractSuit(description) || 'clubs'
      const highCard = this.extractHighCard(description)
      return this.createFlush(suit, highCard)
    }
    
    // Straight patterns (not straight flush)
    if (this.matchesPattern(description, ['straight']) && 
        !this.matchesPattern(description, ['flush'])) {
      const highCard = this.extractHighCard(description)
      return this.createStraight(highCard)
    }
    
    // Three of a Kind patterns
    if (this.matchesAnyPattern(description, [
      ['three', 'kind'], ['trips'], ['set'], ['three', 'aces'], ['three', 'kings']
    ])) {
      const rank = this.extractRankFromTrips(description)
      return this.createThreeOfAKind(rank)
    }
    
    // Two Pair patterns
    if (this.matchesAnyPattern(description, [
      ['two', 'pair'], ['2', 'pair'], ['double', 'pair']
    ])) {
      const { high, low } = this.extractTwoPairRanks(description)
      return this.createTwoPair(high, low)
    }
    
    // One Pair patterns
    if (this.matchesAnyPattern(description, [
      ['pair'], ['pocket', 'aces'], ['pocket', 'kings'], ['pocket', 'queens'],
      ['pocket', 'jacks'], ['pocket'], ['aces'], ['kings'], ['queens'], ['jacks']
    ])) {
      const rank = this.extractRankFromPair(description)
      return this.createOnePair(rank)
    }
    
    // High card patterns
    if (this.matchesAnyPattern(description, [
      ['high', 'card'], ['ace', 'high'], ['king', 'high'], ['queen', 'high']
    ])) {
      const highCard = this.extractHighCard(description)
      return this.createHighCard(highCard)
    }
    
    return null
  }
  
  private matchesPattern(text: string, pattern: string[]): boolean {
    return pattern.every(word => text.includes(word))
  }
  
  private matchesAnyPattern(text: string, patterns: string[][]): boolean {
    return patterns.some(pattern => this.matchesPattern(text, pattern))
  }
  
  private extractRankFromQuads(description: string): string {
    for (const rank of ['aces', 'kings', 'queens', 'jacks']) {
      if (description.includes(rank)) {
        return rank === 'aces' ? 'A' : rank === 'kings' ? 'K' : 
               rank === 'queens' ? 'Q' : 'J'
      }
    }
    return 'A' // default to aces
  }
  
  private extractRankFromTrips(description: string): string {
    for (const rank of ['aces', 'kings', 'queens', 'jacks']) {
      if (description.includes(rank)) {
        return rank === 'aces' ? 'A' : rank === 'kings' ? 'K' : 
               rank === 'queens' ? 'Q' : 'J'
      }
    }
    return 'K' // default to kings
  }
  
  private extractRankFromPair(description: string): string {
    if (description.includes('pocket')) {
      for (const rank of ['aces', 'kings', 'queens', 'jacks']) {
        if (description.includes(rank)) {
          return rank === 'aces' ? 'A' : rank === 'kings' ? 'K' : 
                 rank === 'queens' ? 'Q' : 'J'
        }
      }
    }
    for (const rank of ['aces', 'kings', 'queens', 'jacks']) {
      if (description.includes(rank)) {
        return rank === 'aces' ? 'A' : rank === 'kings' ? 'K' : 
               rank === 'queens' ? 'Q' : 'J'
      }
    }
    return 'K' // default to kings
  }
  
  private extractFullHouseRanks(description: string): { trips: string, pair: string } {
    // Look for "kings over queens" pattern
    const overPattern = /(aces|kings|queens|jacks|tens|nines|eights|sevens|sixes|fives|fours|threes|twos)\s+over\s+(aces|kings|queens|jacks|tens|nines|eights|sevens|sixes|fives|fours|threes|twos)/
    const match = description.match(overPattern)
    if (match) {
      return {
        trips: this.convertWordToRank(match[1]),
        pair: this.convertWordToRank(match[2])
      }
    }
    return { trips: 'K', pair: 'Q' }
  }
  
  private extractTwoPairRanks(description: string): { high: string, low: string } {
    return { high: 'K', low: 'Q' }
  }
  
  private extractHighCard(description: string): string {
    if (description.includes('ace')) return 'A'
    if (description.includes('king')) return 'K'
    if (description.includes('queen')) return 'Q'
    if (description.includes('jack')) return 'J'
    if (description.includes('ten') || description.includes('10')) return '10'
    if (description.includes('nine') || description.includes('9')) return '9'
    if (description.includes('eight') || description.includes('8')) return '8'
    if (description.includes('seven') || description.includes('7')) return '7'
    if (description.includes('six') || description.includes('6')) return '6'
    if (description.includes('five') || description.includes('5')) return '5'
    return 'A' // default
  }
  
  private convertWordToRank(word: string): string {
    const map: { [key: string]: string } = {
      'aces': 'A', 'kings': 'K', 'queens': 'Q', 'jacks': 'J', 'tens': '10',
      'nines': '9', 'eights': '8', 'sevens': '7', 'sixes': '6', 
      'fives': '5', 'fours': '4', 'threes': '3', 'twos': '2'
    }
    return map[word] || 'A'
  }
  
  private createRoyalFlush(suit: string): ParsedHand {
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
  }
  
  private createStraightFlush(suit: string, highCard: string = '9'): ParsedHand {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    const startIndex = ranks.indexOf(highCard)
    const cards = []
    for (let i = 0; i < 5; i++) {
      const rankIndex = startIndex - i
      if (rankIndex >= 0) {
        cards.push({ rank: ranks[rankIndex], suit })
      }
    }
    return {
      cards,
      handName: 'Straight Flush',
      handRank: 9
    }
  }
  
  private createFourOfAKind(rank: string): ParsedHand {
    return {
      cards: [
        { rank, suit: 'spades' },
        { rank, suit: 'hearts' },
        { rank, suit: 'diamonds' },
        { rank, suit: 'clubs' },
        { rank: 'K', suit: 'spades' }
      ],
      handName: 'Four of a Kind',
      handRank: 8
    }
  }
  
  private createFullHouse(trips: string, pair: string): ParsedHand {
    return {
      cards: [
        { rank: trips, suit: 'spades' },
        { rank: trips, suit: 'hearts' },
        { rank: trips, suit: 'diamonds' },
        { rank: pair, suit: 'clubs' },
        { rank: pair, suit: 'spades' }
      ],
      handName: 'Full House',
      handRank: 7
    }
  }
  
  private createFlush(suit: string, highCard: string = 'A'): ParsedHand {
    return {
      cards: [
        { rank: highCard, suit },
        { rank: 'J', suit },
        { rank: '9', suit },
        { rank: '7', suit },
        { rank: '5', suit }
      ],
      handName: 'Flush',
      handRank: 6
    }
  }
  
  private createStraight(highCard: string = '8'): ParsedHand {
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    const startIndex = ranks.indexOf(highCard)
    const cards = []
    const suits = ['spades', 'hearts', 'diamonds', 'clubs', 'hearts']
    
    for (let i = 0; i < 5; i++) {
      const rankIndex = startIndex - i
      if (rankIndex >= 0) {
        cards.push({ rank: ranks[rankIndex], suit: suits[i] })
      }
    }
    return {
      cards,
      handName: 'Straight',
      handRank: 5
    }
  }
  
  private createThreeOfAKind(rank: string): ParsedHand {
    return {
      cards: [
        { rank, suit: 'spades' },
        { rank, suit: 'hearts' },
        { rank, suit: 'diamonds' },
        { rank: 'Q', suit: 'clubs' },
        { rank: '9', suit: 'spades' }
      ],
      handName: 'Three of a Kind',
      handRank: 4
    }
  }
  
  private createTwoPair(high: string, low: string): ParsedHand {
    return {
      cards: [
        { rank: high, suit: 'spades' },
        { rank: high, suit: 'hearts' },
        { rank: low, suit: 'diamonds' },
        { rank: low, suit: 'clubs' },
        { rank: '9', suit: 'spades' }
      ],
      handName: 'Two Pair',
      handRank: 3
    }
  }
  
  private createOnePair(rank: string): ParsedHand {
    return {
      cards: [
        { rank, suit: 'spades' },
        { rank, suit: 'hearts' },
        { rank: 'Q', suit: 'diamonds' },
        { rank: 'J', suit: 'clubs' },
        { rank: '9', suit: 'spades' }
      ],
      handName: 'One Pair',
      handRank: 2
    }
  }
  
  private createHighCard(highCard: string): ParsedHand {
    return {
      cards: [
        { rank: highCard, suit: 'spades' },
        { rank: 'J', suit: 'hearts' },
        { rank: '9', suit: 'diamonds' },
        { rank: '7', suit: 'clubs' },
        { rank: '5', suit: 'hearts' }
      ],
      handName: 'High Card',
      handRank: 1
    }
  }

  private extractSuit(description: string): string | null {
    if (description.includes('spade')) return 'spades'
    if (description.includes('heart')) return 'hearts'  
    if (description.includes('diamond')) return 'diamonds'
    if (description.includes('club')) return 'clubs'
    return null
  }
}
