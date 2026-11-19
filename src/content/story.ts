export interface StoryChoice {
  label: string;
  next: string;
}

export interface StoryNode {
  id: string;
  chapter: string;
  text: string;
  choices?: StoryChoice[];
  ending?: boolean;
}

export const STORY_TITLE = 'The Velvet Key';

export const STORY: Record<string, StoryNode> = {
  start: {
    id: 'start',
    chapter: 'Chapter 1 · The envelope',
    text: 'A black envelope is waiting on the console of a hotel that does not advertise its top floor. Inside is a velvet key and a card with both of your names. The night porter looks up once, then away.',
    choices: [
      { label: 'Take the private lift', next: 'lift' },
      { label: 'Ask the porter what the key opens', next: 'porter' },
    ],
  },
  lift: {
    id: 'lift',
    chapter: 'Chapter 2 · The lift',
    text: 'The lift has no numbers, only a keyhole. When the doors open you are in a corridor of red silk and low lamps. A second card says: one of you hosts, one of you arrives.',
    choices: [
      { label: 'You host. Your partner arrives', next: 'host' },
      { label: 'You arrive. Your partner hosts', next: 'arrive' },
    ],
  },
  porter: {
    id: 'porter',
    chapter: 'Chapter 2 · The rule',
    text: 'The porter says the floor belongs to whoever holds the key, and that either of you may leave the key on the desk and end the night with no questions. He slides a second card across: “Decide who leads before the door.”',
    choices: [
      { label: 'Leave the key and walk into the city', next: 'ending-city' },
      { label: 'Keep the key and choose a host', next: 'lift' },
    ],
  },
  host: {
    id: 'host',
    chapter: 'Chapter 3 · The room',
    text: 'You reach the suite first. Candles are already lit. You can set the tone before the knock, or open the door at once and let the room surprise both of you.',
    choices: [
      { label: 'Set out a note and wait', next: 'ending-note' },
      { label: 'Open the door as soon as they knock', next: 'ending-door' },
    ],
  },
  arrive: {
    id: 'arrive',
    chapter: 'Chapter 3 · The knock',
    text: 'Your partner is already inside. Through the door you hear music and nothing else. You can knock as invited, or slip the key under the door with a line of your own.',
    choices: [
      { label: 'Knock', next: 'ending-door' },
      { label: 'Send a line under the door', next: 'ending-note' },
    ],
  },
  'ending-city': {
    id: 'ending-city',
    chapter: 'Ending · The city',
    text: 'You leave the key. The street is wet and ordinary and entirely yours. The story ends with a choice you can still make tomorrow.',
    ending: true,
  },
  'ending-note': {
    id: 'ending-note',
    chapter: 'Ending · The note',
    text: 'The note is short and specific. When you are both in the room, the night follows what you wrote, and either of you may close it whenever you want. The key stays in the suite.',
    ending: true,
  },
  'ending-door': {
    id: 'ending-door',
    chapter: 'Ending · The door',
    text: 'The door opens onto red silk, a low lamp, and the person you already chose. Nothing in the room outranks a no. The story ends at the beginning of the night you actually want.',
    ending: true,
  },
};
