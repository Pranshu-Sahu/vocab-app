/**
 * Represents a single vocabulary word entry from words.json
 */
export interface Word {
  id: number;
  serialNumber: number;
  word: string;
  partOfSpeech: string;
  hindiMeaning: string;
  meaning: string;
  synonyms: string[];
  antonyms: string[];
  timesAskedTotal: number;
  examBreakdown: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  rootWord?: string;
  exampleSentence?: string;
  mnemonic?: string;
  memoryHookWord?: string;
}
