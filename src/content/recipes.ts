import type { IntensityLevel, MoodId } from '@/types';

export interface AuthoredPrompt {
  id: string;
  prompt: string;
  tags: string[];
  intensity: IntensityLevel;
  choices?: string[];
  theme: string;
}

export interface GeneratedRecipe {
  gameId: string;
  mood: MoodId;
  answerType: 'mcq' | 'open-text' | 'prediction' | 'boolean' | 'ranking' | 'emoji';
  templates: string[];
  topics: string[];
  framings: string[];
  choiceSets: string[][];
  intensities: IntensityLevel[];
  authored: AuthoredPrompt[];
}

const FEEL: string[][] = [
  ['I want more of this', 'Only in the right mood', 'I am curious, slowly', 'I would rather leave it'],
  ['It already feels like us', 'I like the idea more than the habit', 'Ask me again tonight', 'That one is a no'],
  ['Soft and often', 'Rare and deliberate', 'Surprise me', 'Not our thing'],
  ['Yes, plan it', 'Yes, if we both bring it up', 'Maybe once', 'Leave it off the table'],
];

const FRAMINGS = [
  'Tonight, be specific.',
  'The next time you are alone together,',
  'Looking back at the two of you,',
  'If honesty were easy,',
  'After midnight,',
  'On a slow Sunday,',
  'Somewhere private,',
  'When nobody else is in the story,',
];

const PLATONIC = [
  'morning routines', 'weekends away', 'how you argue', 'shared jokes', 'music in the kitchen',
  'friend groups', 'family stories', 'money habits', 'food you crave', 'sleep schedules',
  'texts left on read', 'holiday plans', 'childhood homes', 'stress', 'silence',
  'adventure', 'routine', 'compliments', 'jealousy', 'forgiveness',
];

const ROMANTIC = [
  'a first date', 'handwritten notes', 'slow dances', 'anniversaries', 'pet names',
  'a future home', 'being looked after', 'surprises', 'long phone calls', 'rainy evenings',
  'reconciliation', 'public affection', 'private rituals', 'love songs', 'the way you say goodbye',
  'planning a life', 'being chosen', 'tenderness', 'nostalgia', 'devotion',
];

const SENSUAL = [
  'kissing slowly', 'being teased', 'setting the pace', 'aftercare', 'morning desire',
  'being undressed', 'eye contact', 'saying what you want', 'lingerie', 'a locked door',
  'hands in hair', 'praise', 'taking control', 'giving control', 'a long shower',
  'anticipation', 'being watched', 'whispering', 'starting over after laughter', 'staying longer',
];

const FANTASY = [
  'a masquerade', 'a hotel key', 'a private villa', 'a midnight train', 'a candlelit library',
  'a rooftop in the rain', 'a masked stranger who is still your partner', 'a stolen weekend',
  'a velvet booth', 'an unsigned invitation', 'a winter cabin', 'a city you have never visited',
];

function recipe(partial: GeneratedRecipe): GeneratedRecipe {
  return partial;
}

export const RECIPES: Record<string, GeneratedRecipe> = {
  'six-questions': recipe({
    gameId: 'six-questions',
    mood: 'platonic',
    answerType: 'mcq',
    templates: [
      'When {topic} comes up, which sounds most like you?',
      'How should the two of you handle {topic}?',
      'What do you secretly prefer about {topic}?',
      'If your partner guessed wrong about {topic}, what would the right answer be?',
      'Which version of {topic} feels closest to home?',
      'What would you choose if {topic} were entirely up to you?',
    ],
    topics: PLATONIC,
    framings: FRAMINGS,
    choiceSets: FEEL,
    intensities: ['mild', 'moderate'],
    authored: [
      {
        id: 'sq-authored-1',
        theme: 'conflict',
        intensity: 'mild',
        tags: ['arguments'],
        prompt: 'When the two of you disagree, what do you actually need first?',
        choices: ['A pause', 'A clear explanation', 'To be held', 'To solve it immediately'],
      },
      {
        id: 'sq-authored-2',
        theme: 'attention',
        intensity: 'mild',
        tags: ['attention'],
        prompt: 'How do you prefer to be paid attention to on an ordinary day?',
        choices: ['A check-in text', 'Undivided time', 'A practical favour', 'Playful teasing'],
      },
    ],
  }),
  'how-well-do-you-know-me': recipe({
    gameId: 'how-well-do-you-know-me',
    mood: 'platonic',
    answerType: 'mcq',
    templates: [
      'Which answer would you give about {topic} if nobody was performing?',
      'What is the honest version of you around {topic}?',
      'If your partner had to bet, what should they bet about {topic}?',
    ],
    topics: PLATONIC,
    framings: FRAMINGS,
    choiceSets: FEEL,
    intensities: ['mild', 'moderate'],
    authored: [
      {
        id: 'know-1',
        theme: 'comfort',
        intensity: 'mild',
        tags: ['comfort'],
        prompt: 'What makes a house feel like yours?',
        choices: ['A full kitchen', 'Quiet', 'People coming and going', 'A view and a lamp'],
      },
    ],
  }),
  'would-you-rather': recipe({
    gameId: 'would-you-rather',
    mood: 'platonic',
    answerType: 'mcq',
    templates: ['Would you rather have {topic} or the alternative waiting on the card?'],
    topics: [
      'one perfect weekend with no plans',
      'a year of tiny good mornings',
      'a shared journal',
      'a standing Thursday date',
      'the last word in every argument',
      'a kitchen that is always warm',
      'tickets to anywhere this month',
      'a day with both phones in a drawer',
      'to be surprised',
      'to do the surprising',
      'a house full of music',
      'a house full of books',
      'to host everyone',
      'to disappear for a weekend',
      'a ridiculous inside joke',
      'a serious conversation you have been postponing',
    ],
    framings: ['Choose one.'],
    choiceSets: [],
    intensities: ['mild'],
    authored: [],
  }),
  'whos-more-likely': recipe({
    gameId: 'whos-more-likely',
    mood: 'platonic',
    answerType: 'mcq',
    templates: ['Who is more likely to be the one who {topic}?'],
    topics: [
      'starts the apology',
      'books the trip',
      'stays up too late',
      'cries at a film',
      'forgets the plan and makes a better one',
      'notices the other is quiet',
      'dances first',
      'keeps the souvenir',
      'says the bold thing',
      'makes breakfast',
      'gets lost on purpose',
      'remembers the small date',
    ],
    framings: ['Vote in secret.'],
    choiceSets: [],
    intensities: ['mild'],
    authored: [],
  }),
  'love-quiz': recipe({
    gameId: 'love-quiz',
    mood: 'romantic',
    answerType: 'mcq',
    templates: [
      'What is true for you about {topic}?',
      'Which gesture around {topic} lands the deepest?',
      'How do you want {topic} to feel between you?',
    ],
    topics: ROMANTIC,
    framings: FRAMINGS,
    choiceSets: FEEL,
    intensities: ['mild', 'moderate'],
    authored: [
      {
        id: 'lq-1',
        theme: 'memory',
        intensity: 'mild',
        tags: ['memory'],
        prompt: 'Which kind of memory do you replay most?',
        choices: ['The first time', 'A quiet ordinary night', 'A repair after a fight', 'A trip'],
      },
    ],
  }),
  'memory-lane': recipe({
    gameId: 'memory-lane',
    mood: 'romantic',
    answerType: 'open-text',
    templates: ['What do you remember about {topic}? Write the detail that stayed.'],
    topics: ROMANTIC,
    framings: ['Compare this memory.'],
    choiceSets: [],
    intensities: ['mild'],
    authored: [
      {
        id: 'ml-1',
        theme: 'beginning',
        intensity: 'mild',
        tags: ['beginning'],
        prompt: 'What is the first small thing you noticed about your partner?',
      },
    ],
  }),
  'couple-challenges': recipe({
    gameId: 'couple-challenges',
    mood: 'romantic',
    answerType: 'open-text',
    templates: ['Together: {topic}. Both of you decide whether to accept it.'],
    topics: [
      'give a specific compliment you have never said out loud',
      'write a four-line note and read it aloud',
      'build a three-song playlist for the other',
      'plan a dream date that costs nothing',
      'describe your favourite shared hour',
      'name a habit you want to keep',
      'put a song on and dance through one chorus',
      'tell the story of how you chose each other',
    ],
    framings: ['A challenge, not an order.'],
    choiceSets: [],
    intensities: ['mild', 'moderate'],
    authored: [],
  }),
  'romantic-roulette': recipe({
    gameId: 'romantic-roulette',
    mood: 'romantic',
    answerType: 'open-text',
    templates: ['The wheel gives you {topic}.'],
    topics: [
      'a six-minute dance',
      'a letter you will actually keep',
      'a walk with no destination',
      'recreating your first meal together',
      'a list of ten things you still want to learn about them',
      'a promise that lasts until morning',
      'choosing the next song they will love',
      'describing them as if they were a city',
    ],
    framings: ['Spin once.'],
    choiceSets: [],
    intensities: ['mild'],
    authored: [],
  }),
  'truth-or-dare': recipe({
    gameId: 'truth-or-dare',
    mood: 'sexual',
    answerType: 'open-text',
    templates: [
      'Truth: what is the honest answer about {topic}?',
      'Dare: if you both still want to, spend one minute on {topic}. You can pass.',
    ],
    topics: SENSUAL,
    framings: ['Consent stays with the person receiving this.', 'Either of you can pass.', 'Nothing here is owed.'],
    choiceSets: [],
    intensities: ['moderate', 'spicy', 'extreme'],
    authored: [
      {
        id: 'tod-t-1',
        theme: 'desire',
        intensity: 'spicy',
        tags: ['truth', 'desire'],
        prompt: 'Truth: what kind of attention do you want more of from your partner?',
      },
      {
        id: 'tod-d-1',
        theme: 'dare',
        intensity: 'moderate',
        tags: ['dare', 'kissing'],
        prompt: 'Dare: describe, out loud, the kiss you would like later. Passing is complete participation.',
      },
    ],
  }),
  'desire-match': recipe({
    gameId: 'desire-match',
    mood: 'sexual',
    answerType: 'mcq',
    templates: ['{topic}'],
    topics: SENSUAL,
    framings: ['Keep your selection private until both of you finish.'],
    choiceSets: [],
    intensities: ['moderate', 'spicy'],
    authored: [],
  }),
  'naughty-roulette': recipe({
    gameId: 'naughty-roulette',
    mood: 'sexual',
    answerType: 'open-text',
    templates: ['Optional challenge: {topic}. Accept only if you want it.'],
    topics: SENSUAL,
    framings: ['You can decline without a penalty.'],
    choiceSets: [],
    intensities: ['moderate', 'spicy', 'extreme'],
    authored: [],
  }),
  'temptations': recipe({
    gameId: 'temptations',
    mood: 'sexual',
    answerType: 'open-text',
    templates: ['Use {topic} as inspiration for one of the four choices you write.'],
    topics: SENSUAL,
    framings: ['Custom ideas need the other person\'s approval.'],
    choiceSets: [],
    intensities: ['spicy'],
    authored: [],
  }),
  'desire-quiz': recipe({
    gameId: 'desire-quiz',
    mood: 'sexual',
    answerType: 'prediction',
    templates: ['About {topic}, which answer is actually yours?'],
    topics: SENSUAL,
    framings: FRAMINGS.slice(0, 4),
    choiceSets: FEEL,
    intensities: ['moderate', 'spicy', 'extreme'],
    authored: [
      {
        id: 'dq-1',
        theme: 'pace',
        intensity: 'spicy',
        tags: ['pace'],
        prompt: 'How do you like a night to begin?',
        choices: ['Slow conversation', 'A direct invitation', 'Teasing', 'Let me lead'],
      },
    ],
  }),
  'emoji-confessions': recipe({
    gameId: 'emoji-confessions',
    mood: 'sexual',
    answerType: 'emoji',
    templates: ['Confess something about {topic} using only emoji, then let your partner interpret it.'],
    topics: SENSUAL.slice(0, 12),
    framings: ['Say it in symbols first.'],
    choiceSets: [],
    intensities: ['moderate', 'spicy'],
    authored: [],
  }),
  'fantasy-cards': recipe({
    gameId: 'fantasy-cards',
    mood: 'fantasy',
    answerType: 'mcq',
    templates: ['Scenario: {topic}. Would you want to play inside it?'],
    topics: FANTASY,
    framings: ['Interest is private until the reveal.', 'A boundary is a complete answer.'],
    choiceSets: [['Interested', 'Curious with limits', 'Only as a story', 'Not for me']],
    intensities: ['moderate', 'spicy'],
    authored: [],
  }),
  'scenario-builder': recipe({
    gameId: 'scenario-builder',
    mood: 'fantasy',
    answerType: 'open-text',
    templates: ['Start a scene from {topic}, then let your partner approve the direction.'],
    topics: FANTASY,
    framings: ['No scene starts without a yes.'],
    choiceSets: [],
    intensities: ['moderate'],
    authored: [],
  }),
  'the-menu': recipe({
    gameId: 'the-menu',
    mood: 'fantasy',
    answerType: 'ranking',
    templates: ['Rank how much you want {topic} in a shared story.'],
    topics: FANTASY,
    framings: ['Rank privately.'],
    choiceSets: [],
    intensities: ['moderate'],
    authored: [],
  }),
  'challenge-duel': recipe({
    gameId: 'challenge-duel',
    mood: 'fantasy',
    answerType: 'open-text',
    templates: ['Same challenge: write your version of {topic}. Reveal together.'],
    topics: FANTASY,
    framings: ['There is no wrong style.'],
    choiceSets: [],
    intensities: ['mild', 'moderate'],
    authored: [],
  }),
  'choose-your-story': recipe({
    gameId: 'choose-your-story',
    mood: 'fantasy',
    answerType: 'mcq',
    templates: [],
    topics: [],
    framings: [],
    choiceSets: [],
    intensities: ['moderate'],
    authored: [
      {
        id: 'story-velvet-key',
        theme: 'story',
        intensity: 'moderate',
        tags: ['story'],
        prompt: 'The Velvet Key — a branching night in a fictional hotel.',
      },
    ],
  }),
  'fantasy-roulette': recipe({
    gameId: 'fantasy-roulette',
    mood: 'fantasy',
    answerType: 'open-text',
    templates: [],
    topics: [],
    framings: [],
    choiceSets: [],
    intensities: ['moderate', 'spicy'],
    authored: [],
  }),
  'love-language': recipe({
    gameId: 'love-language',
    mood: 'romantic',
    answerType: 'ranking',
    templates: [],
    topics: [],
    framings: [],
    choiceSets: [],
    intensities: ['mild'],
    authored: [
      { id: 'll-words', theme: 'words', intensity: 'mild', tags: ['words'], prompt: 'Words of affirmation' },
      { id: 'll-time', theme: 'time', intensity: 'mild', tags: ['time'], prompt: 'Quality time' },
      { id: 'll-gifts', theme: 'gifts', intensity: 'mild', tags: ['gifts'], prompt: 'Receiving gifts' },
      { id: 'll-service', theme: 'service', intensity: 'mild', tags: ['service'], prompt: 'Acts of service' },
      { id: 'll-touch', theme: 'touch', intensity: 'mild', tags: ['affection'], prompt: 'Physical affection' },
    ],
  }),
};

export const FANTASY_SETTINGS = [
  'a candlelit hotel corridor',
  'a masked ball',
  'a cliffside villa',
  'a sleeper train',
  'a private cinema',
  'a winter cabin',
  'a rooftop garden',
  'a library after closing',
  'a rain-struck city',
  'a yacht with the lights off',
  'an old theatre',
  'a desert camp',
];

export const FANTASY_ATMOSPHERES = [
  'slow and devoted',
  'playful and teasing',
  'formal until the masks come off',
  'quiet and intense',
  'luxurious and unhurried',
  'storm-lit',
  'tender after a secret',
  'bold and laughing',
  'ceremonial',
  'almost silent',
];

export const FANTASY_THEMES = [
  'a reunion',
  'a first invitation',
  'a dare you can both refuse',
  'a confession',
  'a role you chose together',
  'an evening with one rule',
  'a chase that ends in conversation',
  'a gift with a condition',
  'a promise until sunrise',
  'a story you tell while it happens',
];

export const FANTASY_DIRECTIONS = [
  'begin with a letter',
  'begin with a dance',
  'begin with a question',
  'begin already in the room',
  'let one of you host',
  'let one of you arrive late',
  'trade the lead halfway',
  'end before you expect to',
];

export const LOVE_LANGUAGES = [
  'Words of affirmation',
  'Quality time',
  'Receiving gifts',
  'Acts of service',
  'Physical affection',
];

export const EMOJI_DECK = ['🍆', '🍑', '🍒', '💦', '🔥', '🥵', '😈', '💋', '👅', '🌹', '🍾', '🧸', '🚿', '❤️‍🔥', '😘', '🫦', '🖤', '💌', '🥀', '🕯️', '🎭', '🛁', '🍷', '✨', '❤️', '💗', '💞'];
