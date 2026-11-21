import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { useAppStore } from '@/stores/app.store';
import { useGameStore } from '@/stores/game.store';
import { awardCompletion } from '@/games/awards';
import { selectNext } from '@/content/engine';
import {
  createMenu,
  createChallenge,
  createEmojiConfessionModel,
  createPreferenceModel,
  createScenarioBuilderModel,
  createRouletteModel,
  acceptChallenge,
  approveScenario,
  completeSharedChallenge,
  createTemptationsModel,
  declineChallenge,
  declineScenario,
  isChallengeModel,
  isEmojiConfessionModel,
  isMenuModel,
  isScenarioBuilderModel,
  isRouletteModel,
  isTemptationsModel,
  pauseChallenge,
  resumeChallenge,
  revealMenu,
  revealChallenge,
  revealAndAdvancePreferenceRound,
  setMenuRank,
  requestScenarioApproval,
  requestScenarioChanges,
  recordRouletteSpin,
  submitMenuRanking,
  submitChallenge,
  submitPrivateChoice,
  respondToTemptation,
  selectTemptation,
  submitEmojiConfession,
  submitEmojiGuess,
  submitTemptationChoices,
  updateEmojiConfession,
  updateScenarioField,
  updateTemptationChoice,
  type ChallengeModel,
  type MenuModel,
  type ScenarioBuilderModel,
  type RouletteModel,
  type TemptationsModel,
} from '@/games/dedicated';
import { EMOJI_DECK } from '@/content/recipes';
import type { PreferenceChoice } from '@/games/dedicated';
import { GameCover } from '@/components/branding/GameCover';
import { AFTERDARK_ASSETS } from '@/assets/afterdark';

interface Props {
  gameId: string;
  moodId: string;
}

export const DedicatedGamePage: React.FC<Props> = ({ gameId, moodId }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const playerName = useAppStore((s) => s.playerName) || 'Player 1';
  const partnerName = useAppStore((s) => s.partnerName) || 'Player 2';
  const excludedTopics = useAppStore((s) => s.preferences.excludedTopics) || [];
  const activeSession = useGameStore((s) => s.activeSession);
  const patchSession = useGameStore((s) => s.patchSession);
  const endSession = useGameStore((s) => s.endSession);
  const saveMemory = useGameStore((s) => s.saveMemory);
  const cardHistory = useGameStore((s) => s.cardHistory);
  const fingerprints = useGameStore((s) => s.fingerprints);
  const recordCardEncountered = useGameStore((s) => s.recordCardEncountered);
  const activeEngine = activeSession?.engine;
  const [menu, setMenu] = useState<MenuModel>(() =>
    isMenuModel(activeEngine) && activeEngine.gameId === gameId
      ? activeEngine
      : createMenu(
        gameId === 'love-language'
          ? ['Words of affirmation', 'Quality time', 'Receiving gifts', 'Acts of service', 'Physical touch']
          : ['Slow evening', 'Adventure', 'Deep conversation', 'Playful challenge'],
        gameId,
      ),
  );
  const [phase, setPhase] = useState<'prompt' | 'answer-a' | 'handoff-b' | 'answer-b' | 'reveal' | 'finished'>(() => {
    if (!isMenuModel(activeEngine) || activeEngine.gameId !== gameId) return 'prompt';
    if (activeEngine.revealed) return 'reveal';
    if (activeEngine.submitted[0]) return 'handoff-b';
    return 'prompt';
  });
  const [preference, setPreference] = useState(() =>
    createPreferenceModel(gameId, ['Which pace feels right tonight?', 'What kind of attention feels best?', 'What boundary matters most?', 'What would feel exciting but safe?']),
  );
  const [answerA, setAnswerA] = useState<PreferenceChoice>();
  const [answerB, setAnswerB] = useState<PreferenceChoice>();
  const initialScenario = isScenarioBuilderModel(activeEngine)
    ? activeEngine
    : createScenarioBuilderModel();
  const [scenario, setScenario] = useState<ScenarioBuilderModel>(initialScenario);
  const challengePrompts: Record<string, string> = {
    'challenge-duel': 'Describe one small, thoughtful way you would make an ordinary evening feel special.',
    'memory-lane': 'What is one early moment together that you still remember clearly?',
    'couple-challenges': 'Create a shared playlist of five songs that tell a story about you both.',
  };
  const scenarioFields = ['setting', 'roles', 'atmosphere', 'direction', 'boundary'] as const;
  const initialChallenge = isChallengeModel(activeSession?.engine)
    && activeSession.engine.gameId === gameId
    ? activeSession.engine
    : createChallenge(
      gameId,
      challengePrompts[gameId] || 'Choose a small activity you both feel comfortable sharing.',
      gameId === 'couple-challenges',
    );
  const [challenge, setChallenge] = useState<ChallengeModel>(initialChallenge);
  const [challengePhase, setChallengePhase] = useState<
    'prompt' | 'answer-a' | 'handoff-b' | 'answer-b' | 'active' | 'paused' | 'reveal' | 'declined'
  >(() => {
    if (initialChallenge.status === 'declined') return 'declined';
    if (initialChallenge.status === 'paused') return 'paused';
    if (gameId === 'couple-challenges') {
      if (initialChallenge.status === 'accepted') return 'active';
      return initialChallenge.acceptances[0] ? 'handoff-b' : 'prompt';
    }
    if (initialChallenge.status === 'completed') return 'reveal';
    return initialChallenge.submissions[0] ? 'handoff-b' : 'prompt';
  });
  const [challengeDraft, setChallengeDraft] = useState('');
  const [memoryNote, setMemoryNote] = useState('');
  const initialTemptation = isTemptationsModel(activeEngine)
    ? activeEngine
    : createTemptationsModel();
  const [temptation, setTemptation] = useState<TemptationsModel>(initialTemptation);
  const initialEmojiConfession = isEmojiConfessionModel(activeEngine)
    ? activeEngine
    : createEmojiConfessionModel();
  const [emojiConfession, setEmojiConfession] = useState(initialEmojiConfession);
  const [emojiGuess, setEmojiGuess] = useState('');
  const initialRoulette = isRouletteModel(activeEngine) && activeEngine.gameId === gameId
    ? activeEngine
    : createRouletteModel(gameId);
  const [roulette, setRoulette] = useState<RouletteModel>(initialRoulette);

  const isMenu = gameId === 'the-menu';
  const isLoveLanguage = gameId === 'love-language';
  const isRankedGame = isMenu || isLoveLanguage;
  const isPrivateChoice = ['love-quiz', 'desire-match', 'desire-quiz', 'fantasy-cards'].includes(gameId);
  const isDuel = ['challenge-duel', 'couple-challenges', 'memory-lane'].includes(gameId);
  const isScenarioBuilder = gameId === 'scenario-builder';
  const isTemptation = gameId === 'temptations';
  const isEmoji = gameId === 'emoji-confessions';
  const isRoulette = ['romantic-roulette', 'naughty-roulette', 'fantasy-roulette'].includes(gameId);
  const currentPrompt = preference.rounds[preference.roundIndex]?.prompt || 'Choose together.';
  const matchCount = useMemo(
    () => preference.rounds.filter((round) => round.revealed && round.a === round.b).length,
    [preference],
  );

  const submitA = (choice: PreferenceChoice) => {
    setAnswerA(choice);
    setPreference((model) => submitPrivateChoice(model, 'a', choice));
    setPhase('handoff-b');
  };

  const submitB = (choice: PreferenceChoice) => {
    setAnswerB(choice);
    setPreference((model) => submitPrivateChoice(model, 'b', choice));
    setPhase('reveal');
  };

  const submitMenu = (player: 0 | 1) => {
    const submitted = submitMenuRanking(menu, player);
    if (!submitted.submitted[player]) {
      showToast('Give every option a different rank before submitting.', 'warning');
      return;
    }

    if (player === 0) {
      setMenu(submitted);
      patchSession({ engine: submitted });
      setPhase('handoff-b');
      return;
    }

    const revealed = revealMenu(submitted);
    setMenu(revealed);
    patchSession({
      engine: revealed,
      scores: [revealed.matchingRanks, revealed.matchingRanks],
    });
    setPhase('reveal');
  };

  const finishPreferenceRound = () => {
    const next = revealAndAdvancePreferenceRound(preference);
    setPreference(next);
    setAnswerA(undefined);
    setAnswerB(undefined);
    if (next.completed) setPhase('finished');
    else setPhase('prompt');
  };

  const finishGame = () => {
    awardCompletion({
      gameId,
      moodId: moodId as 'platonic' | 'romantic' | 'sexual' | 'fantasy',
      desire: gameId === 'desire-match',
      scenario: gameId === 'scenario-builder',
    });
    endSession();
    setPhase('finished');
  };

  const updateChallenge = (
    next: ChallengeModel,
    nextPhase = challengePhase,
  ) => {
    setChallenge(next);
    setChallengePhase(nextPhase);
    patchSession({ engine: next, scores: next.scores });
  };

  const submitPrivateChallengeAnswer = (player: 0 | 1) => {
    const submitted = submitChallenge(challenge, player, challengeDraft);
    if (submitted === challenge) {
      showToast('Add your response before submitting.', 'warning');
      return;
    }
    setChallengeDraft('');
    if (player === 0) {
      updateChallenge(submitted, 'handoff-b');
      return;
    }
    const revealed = revealChallenge(submitted, gameId === 'challenge-duel');
    updateChallenge(revealed, 'reveal');
  };

  const updateTemptation = (next: TemptationsModel) => {
    setTemptation(next);
    patchSession({ engine: next });
  };

  const saveTemptationChoices = () => {
    const next = submitTemptationChoices(temptation);
    if (next === temptation) {
      showToast('Add four different choices before continuing.', 'warning');
      return;
    }
    updateTemptation(next);
  };

  const updateEmojiModel = (next: typeof emojiConfession) => {
    setEmojiConfession(next);
    patchSession({ engine: next });
  };

  const sendEmojiConfession = () => {
    const next = submitEmojiConfession(emojiConfession);
    if (next === emojiConfession) {
      showToast('Add both an emoji confession and its meaning first.', 'warning');
      return;
    }
    updateEmojiModel(next);
  };

  const updateScenario = (next: ScenarioBuilderModel) => {
    setScenario(next);
    patchSession({ engine: next });
  };

  const sendScenarioForApproval = () => {
    const next = requestScenarioApproval(scenario);
    if (next === scenario) {
      showToast('Complete every scenario field before requesting approval.', 'warning');
      return;
    }
    updateScenario(next);
  };

  const revealEmojiConfession = () => {
    const next = submitEmojiGuess(emojiConfession, emojiGuess);
    if (next === emojiConfession) {
      showToast('Write your interpretation before revealing.', 'warning');
      return;
    }
    setEmojiGuess('');
    updateEmojiModel(next);
  };

  const spinRoulette = () => {
    const result = selectNext({
      gameId,
      intensity: activeSession?.intensity ?? 'spicy',
      excludedTopics,
      history: cardHistory,
      fingerprints,
      distribution: 'private',
    });
    if (!result.ok) {
      showToast(result.reason, 'warning');
      return;
    }

    const next = recordRouletteSpin(roulette, result.card);
    if (next === roulette) {
      showToast('That card was already used. Spin again for a new one.', 'warning');
      return;
    }
    setRoulette(next);
    patchSession({ engine: next });
    recordCardEncountered(result.card.id, result.card.similarityFingerprint, gameId);
  };

  const choiceButtons: [PreferenceChoice, string][] = [
    ['yes', 'Yes / interested'],
    ['maybe', 'Maybe / with limits'],
    ['no', 'No / leave it out'],
  ];

  if (phase === 'finished') {
    return (
      <div className="space-y-6 text-center px-4 py-8">
        <div className="text-5xl">🏆</div>
        <h2 className="font-display text-2xl font-bold">Session Complete</h2>
        {isPrivateChoice && (
          <Card variant="solid" className="p-4">
            <div className="text-xs text-ad-text-secondary">Revealed matches</div>
            <div className="font-display text-2xl text-ad-gold">{matchCount} / {preference.rounds.filter((r) => r.revealed).length}</div>
          </Card>
        )}
        {isRankedGame && (
          <Card variant="solid" className="p-4">
            <div className="text-xs text-ad-text-secondary">
              {isLoveLanguage ? 'Matching love-language priorities' : 'Matching menu ranks'}
            </div>
            <div className="font-display text-2xl text-ad-gold">{menu.matchingRanks} / {menu.items[0].length}</div>
          </Card>
        )}
        <Button fullWidth onClick={() => navigate(`/games/${moodId}`)}>Return to Games</Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 px-4 py-5">
      <div className="flex items-center justify-between">
        <Badge variant="gold" size="sm">{gameId.replace(/-/g, ' ')}</Badge>
        <span className="text-xs text-ad-gold">{playerName} & {partnerName}</span>
      </div>
      <GameCover gameId={gameId} className="h-32 w-full" />

      {isPrivateChoice && (
        <>
          {phase === 'prompt' && (
            <Card variant="glass" className="p-6 space-y-5 text-center">
              <h2 className="font-display text-xl">{currentPrompt}</h2>
              <p className="text-xs text-ad-text-secondary">Pass the phone to {playerName}. Their choice stays private.</p>
              <Button fullWidth onClick={() => setPhase('answer-a')}>View my private choice</Button>
            </Card>
          )}
          {phase === 'answer-a' && (
            <div className="space-y-3">
              <h2 className="font-display text-lg text-center">{playerName}, choose privately</h2>
              {choiceButtons.map(([value, label]) => (
                <Button key={value} fullWidth variant="secondary" onClick={() => submitA(value)}>{label}</Button>
              ))}
            </div>
          )}
          {phase === 'handoff-b' && (
            <Card variant="glass" className="p-6 space-y-5 text-center">
              <h2 className="font-display text-xl">Pass to {partnerName}</h2>
              <p className="text-xs text-ad-text-secondary">Your choice will not reveal until both selections are submitted.</p>
              <Button fullWidth onClick={() => setPhase('answer-b')}>View partner prompt</Button>
            </Card>
          )}
          {phase === 'answer-b' && (
            <div className="space-y-3">
              <h2 className="font-display text-lg text-center">{partnerName}, choose privately</h2>
              {choiceButtons.map(([value, label]) => (
                <Button key={value} fullWidth variant="primary" onClick={() => submitB(value)}>{label}</Button>
              ))}
            </div>
          )}
          {phase === 'reveal' && (
            <Card variant="glass" className="p-6 space-y-5 text-center">
              <h2 className="font-display text-xl">Reveal together</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-ad-burgundy/40 p-3">{playerName}<div className="text-ad-gold text-sm mt-1">{answerA}</div></div>
                <div className="rounded-xl border border-ad-burgundy/40 p-3">{partnerName}<div className="text-ad-gold text-sm mt-1">{answerB}</div></div>
              </div>
              <Button fullWidth onClick={finishPreferenceRound}>
                {preference.roundIndex + 1 >= preference.rounds.length ? 'Finish Results' : 'Next Round'}
              </Button>
            </Card>
          )}
        </>
      )}

      {isRankedGame && (
        <>
          {phase === 'prompt' && (
            <Card variant="glass" className="p-6 space-y-4 text-center">
              <h2 className="font-display text-xl">
                {isLoveLanguage ? 'Rank what makes you feel most loved' : 'Rank what sounds most appealing'}
              </h2>
              <p className="text-xs text-ad-text-secondary">
                {isLoveLanguage
                  ? 'Rank all five languages privately. Compare your priorities only after both submit.'
                  : 'Each partner ranks privately. Compare only after both submit.'}
              </p>
              <Button fullWidth onClick={() => setPhase('answer-a')}>Start private ranking</Button>
            </Card>
          )}
          {(phase === 'answer-a' || phase === 'answer-b') && (() => {
            const player: 0 | 1 = phase === 'answer-a' ? 0 : 1;
            const name = player === 0 ? playerName : partnerName;
            const rankedItems = menu.items[player];
            return (
              <Card variant="glass" className="p-5 space-y-4">
                <h2 className="font-display text-lg text-center">{name}, rank privately</h2>
                <p className="text-[10px] text-ad-text-secondary text-center">1 is your first choice.</p>
                {rankedItems.map((item) => (
                  <label key={item.id} className="flex items-center justify-between gap-3 text-xs">
                    <span>{item.label}</span>
                    <select
                      value={item.rank + 1}
                      onChange={(event) => {
                        const next = setMenuRank(menu, player, item.id, Number(event.target.value) - 1);
                        setMenu(next);
                        patchSession({ engine: next });
                      }}
                      className="rounded-lg border border-ad-burgundy/40 bg-ad-bg-secondary px-2 py-1"
                    >
                      {rankedItems.map((rankedItem) => (
                        <option key={rankedItem.id} value={rankedItem.rank + 1}>
                          {rankedItem.rank + 1}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
                <Button fullWidth onClick={() => submitMenu(player)}>Submit privately</Button>
              </Card>
            );
          })()}
          {phase === 'handoff-b' && (
            <Card variant="glass" className="p-6 space-y-4 text-center">
              <h2 className="font-display text-xl">Pass to {partnerName}</h2>
              <p className="text-xs text-ad-text-secondary">The first ranking stays hidden until both are submitted.</p>
              <Button fullWidth onClick={() => setPhase('answer-b')}>Start partner ranking</Button>
            </Card>
          )}
          {phase === 'reveal' && (
            <Card variant="glass" className="p-5 space-y-4">
              <h2 className="font-display text-lg text-center">
                {isLoveLanguage ? 'Compare your love-language priorities' : 'Compare your menus'}
              </h2>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[menu.items[0], menu.items[1]].map((items, player) => (
                  <div key={player}>
                    <h3 className="mb-2 text-ad-gold">{player === 0 ? playerName : partnerName}</h3>
                    {[...items].sort((a, b) => a.rank - b.rank).map((item) => (
                      <div key={item.id} className="py-1">{item.rank + 1}. {item.label}</div>
                    ))}
                  </div>
                ))}
              </div>
              <Button fullWidth onClick={finishGame}>Finish Results</Button>
            </Card>
          )}
        </>
      )}

      {isDuel && (
        <Card variant="glass" className="p-6 space-y-4">
          <div className="text-center">
            <Badge variant="gold" size="sm">
              {gameId === 'memory-lane' ? 'A SHARED MEMORY' : gameId === 'challenge-duel' ? 'SAME PROMPT · PRIVATE ANSWERS' : 'MUTUAL AGREEMENT'}
            </Badge>
            <h2 className="font-display text-lg mt-3">{challenge.prompt}</h2>
          </div>

          {gameId === 'couple-challenges' ? (
            <>
              {challengePhase === 'prompt' && (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-ad-text-secondary">
                    {playerName}, review the activity. It only starts after both of you accept.
                  </p>
                  <Button fullWidth onClick={() => {
                    const next = acceptChallenge(challenge, 0);
                    updateChallenge(next, next.status === 'accepted' ? 'active' : 'handoff-b');
                  }}>
                    I accept
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => updateChallenge(declineChallenge(challenge), 'declined')}>
                    Pass without penalty
                  </Button>
                </div>
              )}
              {challengePhase === 'handoff-b' && (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-ad-text-secondary">
                    Pass to {partnerName}. Nothing begins until they choose.
                  </p>
                  <Button fullWidth onClick={() => {
                    const next = acceptChallenge(challenge, 1);
                    updateChallenge(next, next.status === 'accepted' ? 'active' : 'handoff-b');
                  }}>
                    {partnerName}, I accept
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => updateChallenge(declineChallenge(challenge), 'declined')}>
                    Pass without penalty
                  </Button>
                </div>
              )}
              {challengePhase === 'active' && (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-ad-text-secondary">
                    You both agreed. Take your time; either partner can pause or stop at any point.
                  </p>
                  <Button fullWidth onClick={() => updateChallenge(pauseChallenge(challenge), 'paused')}>
                    Pause activity
                  </Button>
                  <Button variant="secondary" fullWidth onClick={() => updateChallenge(completeSharedChallenge(challenge), 'reveal')}>
                    We completed it together
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => updateChallenge(declineChallenge(challenge), 'declined')}>
                    Stop without penalty
                  </Button>
                </div>
              )}
              {challengePhase === 'paused' && (
                <div className="space-y-3 text-center">
                  <p className="text-xs text-ad-text-secondary">This activity is paused. Resume only if you both want to.</p>
                  <Button fullWidth onClick={() => updateChallenge(resumeChallenge(challenge), 'active')}>
                    Resume together
                  </Button>
                  <Button variant="ghost" fullWidth onClick={() => updateChallenge(declineChallenge(challenge), 'declined')}>
                    End without penalty
                  </Button>
                </div>
              )}
              {challengePhase === 'reveal' && (
                <div className="space-y-4 text-center">
                  <p className="font-display text-xl text-ad-gold">Completed together</p>
                  <p className="text-xs text-ad-text-secondary">A shared yes is what made this activity happen.</p>
                  <Button fullWidth onClick={finishGame}>Save results</Button>
                </div>
              )}
              {challengePhase === 'declined' && (
                <div className="space-y-4 text-center">
                  <p className="font-display text-lg">No pressure. Passing or stopping is always okay.</p>
                  <p className="text-xs text-ad-text-secondary">Passing or stopping never costs a trophy or score.</p>
                  <Button fullWidth onClick={finishGame}>Finish</Button>
                </div>
              )}
            </>
          ) : (
            <>
              {challengePhase === 'prompt' && (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-ad-text-secondary">
                    Each player writes a private answer. Both answers stay hidden until both are submitted.
                  </p>
                  <Button fullWidth onClick={() => setChallengePhase('answer-a')}>Begin private round</Button>
                </div>
              )}
              {challengePhase === 'answer-a' && (
                <div className="space-y-3">
                  <p className="text-center text-xs text-ad-text-secondary">{playerName}, write privately.</p>
                  <textarea
                    value={challengeDraft}
                    onChange={(event) => setChallengeDraft(event.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder={gameId === 'memory-lane' ? 'What do you remember?' : 'Write your response...'}
                    className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-3 text-xs"
                  />
                  <Button fullWidth onClick={() => submitPrivateChallengeAnswer(0)}>Submit privately</Button>
                </div>
              )}
              {challengePhase === 'handoff-b' && (
                <div className="space-y-4 text-center">
                  <p className="text-xs text-ad-text-secondary">
                    {playerName}'s answer is locked. Pass to {partnerName} without showing the screen.
                  </p>
                  <Button fullWidth onClick={() => setChallengePhase('answer-b')}>Continue privately</Button>
                </div>
              )}
              {challengePhase === 'answer-b' && (
                <div className="space-y-3">
                  <p className="text-center text-xs text-ad-text-secondary">{partnerName}, write privately.</p>
                  <textarea
                    value={challengeDraft}
                    onChange={(event) => setChallengeDraft(event.target.value)}
                    rows={4}
                    maxLength={1000}
                    placeholder={gameId === 'memory-lane' ? 'What do you remember?' : 'Write your response...'}
                    className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-3 text-xs"
                  />
                  <Button fullWidth onClick={() => submitPrivateChallengeAnswer(1)}>Reveal both answers</Button>
                </div>
              )}
              {challengePhase === 'reveal' && (
                <div className="space-y-4">
                  <h3 className="text-center font-display text-lg">Your answers, side by side</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[challenge.submissions[0], challenge.submissions[1]].map((answer, index) => (
                      <div key={index} className="min-w-0 rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary/60 p-3">
                        <p className="mb-2 text-[10px] uppercase tracking-wider text-ad-gold">
                          {index === 0 ? playerName : partnerName}
                        </p>
                        <p className="break-words text-xs text-ad-text">{answer}</p>
                      </div>
                    ))}
                  </div>
                  {gameId === 'memory-lane' && (
                    <label className="block space-y-2">
                      <span className="text-[10px] uppercase tracking-wider text-ad-gold">Save an optional shared note</span>
                      <textarea
                        value={memoryNote}
                        onChange={(event) => setMemoryNote(event.target.value)}
                        maxLength={500}
                        rows={2}
                        placeholder="A detail you want to remember..."
                        className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-3 text-xs"
                      />
                    </label>
                  )}
                  {gameId === 'challenge-duel' && (
                    <p className="text-center text-xs text-ad-text-secondary">
                      Both completed the round. Score: {challenge.scores[0]}–{challenge.scores[1]}.
                    </p>
                  )}
                  <Button fullWidth onClick={() => {
                    if (gameId === 'memory-lane' && memoryNote.trim()) {
                      saveMemory(challenge.prompt, memoryNote.trim());
                    }
                    finishGame();
                  }}>
                    {gameId === 'memory-lane' ? 'Save memory and finish' : 'Finish results'}
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {isScenarioBuilder && (
        <Card variant="glass" className="p-6 space-y-4">
          <h2 className="font-display text-lg">
            {scenario.status === 'draft' ? 'Build a scenario together' : 'Partner approval'}
          </h2>
          <img
            src={AFTERDARK_ASSETS.scenes.privateLounge}
            alt=""
            aria-hidden="true"
            className="h-28 w-full rounded-xl object-cover"
            loading="lazy"
            decoding="async"
          />
          {scenario.status === 'draft' && (
            <>
              {scenarioFields.map((field) => (
                <label key={field} className="block space-y-1">
                  <span className="text-[10px] uppercase text-ad-gold">{field}</span>
                  <input
                    value={scenario[field]}
                    maxLength={200}
                    onChange={(event) => updateScenario(updateScenarioField(scenario, field, event.target.value))}
                    className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary px-3 py-2 text-xs"
                  />
                </label>
              ))}
              <p className="text-xs text-ad-text-secondary">
                Every element is editable. The scenario is saved only after the partner approves it.
              </p>
              <Button fullWidth onClick={sendScenarioForApproval}>
                Pass to partner for review
              </Button>
            </>
          )}
          {scenario.status === 'awaiting-approval' && (
            <>
              <dl className="space-y-3">
                {scenarioFields.map((field) => (
                  <div key={field}>
                    <dt className="text-[10px] uppercase tracking-wider text-ad-gold">{field}</dt>
                    <dd className="mt-1 text-xs text-ad-text">{scenario[field]}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-ad-text-secondary">
                {partnerName}, approve only if every part feels right. Request edits or leave the scenario at any time.
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" fullWidth onClick={() => updateScenario(requestScenarioChanges(scenario))}>
                  Request changes
                </Button>
                <Button fullWidth onClick={() => {
                  patchSession({ engine: approveScenario(scenario) });
                  finishGame();
                }}>
                  Approve and save
                </Button>
                <Button variant="ghost" fullWidth onClick={() => updateScenario(declineScenario(scenario))}>
                  Pass
                </Button>
              </div>
            </>
          )}
          {scenario.status === 'declined' && (
            <div className="space-y-4 text-center">
              <p className="font-display text-lg">The scenario was passed on.</p>
              <Button fullWidth onClick={finishGame}>Finish</Button>
            </div>
          )}
        </Card>
      )}

      {isTemptation && (
        <Card variant="glass" className="p-6 space-y-4">
          <h2 className="font-display text-lg">
            {temptation.status === 'draft' ? 'Create four choices' : 'A choice, together'}
          </h2>
          {temptation.status === 'draft' && (
            <div className="space-y-3">
              <p className="text-xs text-ad-text-secondary">
                {playerName}, write four distinct options. {partnerName} chooses one, then you can approve or pass.
              </p>
              {temptation.choices.map((choice, index) => (
                <label key={index} className="block space-y-1">
                  <span className="text-[10px] uppercase tracking-wider text-ad-gold">Choice {index + 1}</span>
                  <input
                    value={choice}
                    maxLength={120}
                    onChange={(event) => updateTemptation(
                      updateTemptationChoice(temptation, index, event.target.value),
                    )}
                    placeholder={`Write choice ${index + 1}`}
                    className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary px-3 py-2 text-xs"
                  />
                </label>
              ))}
              <Button fullWidth onClick={saveTemptationChoices}>Pass choices to partner</Button>
            </div>
          )}
          {temptation.status === 'awaiting-selection' && (
            <div className="space-y-3">
              <p className="text-xs text-ad-text-secondary">{partnerName}, choose privately. You can pass at any time.</p>
              {temptation.choices.map((choice, index) => (
                <Button
                  key={index}
                  fullWidth
                  variant="secondary"
                  onClick={() => updateTemptation(selectTemptation(temptation, index))}
                >
                  {choice}
                </Button>
              ))}
              <Button variant="ghost" fullWidth onClick={() => updateTemptation(respondToTemptation(temptation, false))}>
                Pass without choosing
              </Button>
            </div>
          )}
          {temptation.status === 'awaiting-approval' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-ad-text-secondary">
                {partnerName} chose: <span className="text-ad-gold">{temptation.choices[temptation.selectedIndex ?? 0]}</span>
              </p>
              <p className="text-xs text-ad-text-secondary">{playerName}, approve it only if it feels right.</p>
              <Button fullWidth onClick={() => updateTemptation(respondToTemptation(temptation, true))}>
                Approve choice
              </Button>
              <Button variant="ghost" fullWidth onClick={() => updateTemptation(respondToTemptation(temptation, false))}>
                Pass without penalty
              </Button>
            </div>
          )}
          {temptation.status === 'approved' && (
            <div className="space-y-4 text-center">
              <p className="text-xs text-ad-text-secondary">Approved by both partners</p>
              <p className="font-display text-xl text-ad-gold">{temptation.choices[temptation.selectedIndex ?? 0]}</p>
              <Button fullWidth onClick={finishGame}>Finish</Button>
            </div>
          )}
          {temptation.status === 'declined' && (
            <div className="space-y-4 text-center">
              <p className="font-display text-lg">No pressure. Nothing was approved.</p>
              <Button fullWidth onClick={finishGame}>Finish</Button>
            </div>
          )}
        </Card>
      )}

      {isRoulette && (
        <Card variant="glass" className="p-6 space-y-5 text-center">
          <h2 className="font-display text-lg">
            {gameId === 'romantic-roulette' ? 'Romantic Roulette' : gameId === 'naughty-roulette' ? 'Naughty Roulette' : 'Fantasy Roulette'}
          </h2>
          <div className="relative mx-auto h-36 w-36 overflow-hidden rounded-full border-4 border-dashed border-ad-gold/60">
            <img
              src={AFTERDARK_ASSETS.ui.rouletteWheel}
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
            {gameId === 'fantasy-roulette' && (
              <img
                src={AFTERDARK_ASSETS.ui.dice}
                alt=""
                aria-hidden="true"
                className="absolute bottom-1 right-1 h-8 w-10 rounded-md object-cover"
                loading="lazy"
                decoding="async"
              />
            )}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-ad-text-secondary">
            {roulette.spinCount} {roulette.spinCount === 1 ? 'card' : 'cards'} revealed
          </p>
          <Button fullWidth onClick={spinRoulette}>
            {roulette.currentCard ? 'Spin for another card' : 'Spin and reveal'}
          </Button>
          {roulette.currentCard && (
            <p className="text-sm text-ad-text leading-relaxed">{roulette.currentCard.prompt}</p>
          )}
        </Card>
      )}

      {isEmoji && (
        <Card variant="glass" className="p-6 space-y-4 text-center">
          <h2 className="font-display text-lg">
            {emojiConfession.status === 'draft' ? 'Compose a private confession' : 'Emoji Confession'}
          </h2>
          {emojiConfession.status === 'draft' && (
            <div className="space-y-4">
              <p className="text-xs text-ad-text-secondary">
                Build a message with emoji and privately enter what it means. Your partner interprets the emoji before the meaning is revealed.
              </p>
              <div className="min-h-16 break-words rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-3 text-3xl">
                {emojiConfession.emojis || '✨'}
              </div>
              <div className="grid grid-cols-8 gap-1">
                {EMOJI_DECK.map((item) => (
                  <button
                    key={item}
                    type="button"
                    aria-label={`Add ${item}`}
                    onClick={() => updateEmojiModel(updateEmojiConfession(
                      emojiConfession,
                      'emojis',
                      emojiConfession.emojis + item,
                    ))}
                    className="text-xl"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => updateEmojiModel(updateEmojiConfession(emojiConfession, 'emojis', ''))}
                >
                  Clear
                </Button>
                <Button fullWidth onClick={sendEmojiConfession}>Pass to partner</Button>
              </div>
              <label className="block space-y-2 text-left">
                <span className="text-[10px] uppercase tracking-wider text-ad-gold">What are you confessing?</span>
                <textarea
                  value={emojiConfession.confession}
                  onChange={(event) => updateEmojiModel(updateEmojiConfession(
                    emojiConfession,
                    'confession',
                    event.target.value,
                  ))}
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-3 text-xs"
                />
              </label>
            </div>
          )}
          {emojiConfession.status === 'awaiting-guess' && (
            <div className="space-y-4">
              <p className="text-xs text-ad-text-secondary">{partnerName}, interpret the emoji before the meaning is revealed.</p>
              <div className="break-words rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-4 text-3xl">
                {emojiConfession.emojis}
              </div>
              <textarea
                value={emojiGuess}
                onChange={(event) => setEmojiGuess(event.target.value)}
                maxLength={500}
                rows={3}
                placeholder="What do you think it means?"
                className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-3 text-xs"
              />
              <Button fullWidth onClick={revealEmojiConfession}>Reveal confession</Button>
            </div>
          )}
          {emojiConfession.status === 'revealed' && (
            <div className="space-y-4">
              <div className="break-words rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-4 text-3xl">
                {emojiConfession.emojis}
              </div>
              <div className="grid gap-3 text-left sm:grid-cols-2">
                <div className="rounded-xl border border-ad-burgundy/40 p-3">
                  <p className="mb-1 text-[10px] uppercase text-ad-gold">{partnerName}'s interpretation</p>
                  <p className="break-words text-xs">{emojiConfession.guess}</p>
                </div>
                <div className="rounded-xl border border-ad-burgundy/40 p-3">
                  <p className="mb-1 text-[10px] uppercase text-ad-gold">{playerName}'s confession</p>
                  <p className="break-words text-xs">{emojiConfession.confession}</p>
                </div>
              </div>
              <Button fullWidth onClick={finishGame}>Finish together</Button>
            </div>
          )}
        </Card>
      )}
    </motion.div>
  );
};
