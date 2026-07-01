/**
 * Represents a single vocabulary word entry from words.json
 */
export interface Word {
  id: number;
  word: string;
  meaning: string;
  synonyms: string[];
  antonyms: string[];
  exampleSentence?: string;
  mnemonic?: string;
}
