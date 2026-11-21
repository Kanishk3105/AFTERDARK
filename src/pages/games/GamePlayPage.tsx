import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/app.store';
import { useGameStore } from '@/stores/game.store';
import { selectAndRecordNext } from '@/content/selection';
import { MOODS } from '@/config/app.config';
import { STORY, STORY_TITLE, StoryNode } from '@/content/story';
import {
  createTod,
  chooseKind,
  acceptChallenge,
  completeChallenge,
  passChallenge,
  declineAlternative,
  swapIn,
  pauseGame,
  resumeGame,
  setSteps,
  approveStep,
  skipStep,
  swapStep,
  endSteps,
  nextTurn as todNextTurn,
  TodModel,
} from '@/games/tod';
import { awardCompletion, notePrompt } from '@/games/awards';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useToast } from '@/components/ui/Toast';
import { ContentCard, MoodId } from '@/types';
import { DEFAULT_INTENSITY } from '@/config/app.config';
import { DedicatedGamePage } from '@/pages/games/DedicatedGamePage';
import { GameCover } from '@/components/branding/GameCover';
import { AFTERDARK_ASSETS } from '@/assets/afterdark';

const storyScenes: Record<string, string> = {
  start: AFTERDARK_ASSETS.scenes.hotelSuite,
  lift: AFTERDARK_ASSETS.scenes.mysteriousHallway,
  porter: AFTERDARK_ASSETS.scenes.privateLounge,
  host: AFTERDARK_ASSETS.scenes.privateVilla,
  arrive: AFTERDARK_ASSETS.scenes.rooftopNight,
  'ending-city': AFTERDARK_ASSETS.scenes.masqueradeBall,
  'ending-note': AFTERDARK_ASSETS.scenes.hotelSuite,
  'ending-door': AFTERDARK_ASSETS.scenes.privateLounge,
};

const CARD_ROUND_GAMES = new Set([
  'six-questions',
  'how-well-do-you-know-me',
  'would-you-rather',
  'whos-more-likely',
]);

export const GamePlayPage: React.FC = () => {
  const { moodId, gameId } = useParams<{ moodId: string; gameId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const playerName = useAppStore((s) => s.playerName) || 'Player 1';
  const partnerName = useAppStore((s) => s.partnerName) || 'Player 2';
  const excludedTopics = useAppStore((s) => s.preferences.excludedTopics) || [];

  const activeSession = useGameStore((s) => s.activeSession);
  const sessionIntensity = activeSession?.intensity ?? DEFAULT_INTENSITY;
  const updateCardEncounterStatus = useGameStore((s) => s.updateCardEncounterStatus);
  const saveMemory = useGameStore((s) => s.saveMemory);
  const endSession = useGameStore((s) => s.endSession);

  // General Turn State for Multi-round Games (e.g. Six Questions, WYR, Quiz)
  const [currentRoundNum, setCurrentRoundNum] = useState(1);
  const [currentCard, setCurrentCard] = useState<ContentCard | null>(null);
  const [cardLoading, setCardLoading] = useState(() => CARD_ROUND_GAMES.has(gameId ?? ''));
  const [cardLoadError, setCardLoadError] = useState('');
  const [phase, setPhase] = useState<'handoff1' | 'answer1' | 'handoff2' | 'guess2' | 'reveal' | 'finished'>('handoff1');
  
  // Player Answers
  const [ansPlayer1, setAnsPlayer1] = useState<string>('');
  const [ansPlayer2, setAnsPlayer2] = useState<string>('');
  const [customInput, setCustomInput] = useState<string>('');
  const [scores, setScores] = useState<[number, number]>([0, 0]);
  const [roundHistory, setRoundHistory] = useState<Array<{ round: number; prompt: string; p1: string; p2: string; matched: boolean }>>([]);

  // Spin Wheel State (Roulette games)
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<string>('');
  const rouletteSpinSequence = useRef(0);

  // Story Mode State
  const [storyNodeId, setStoryNodeId] = useState<string>('start');
  const [storyOpeningCard, setStoryOpeningCard] = useState<ContentCard | null>(null);
  const [storyContentReady, setStoryContentReady] = useState(() => gameId !== 'choose-your-story');
  const [storyContentError, setStoryContentError] = useState('');
  useEffect(() => {
    if (gameId !== 'choose-your-story') return;
    const saved = activeSession?.engine as { storyNodeId?: string } | undefined;
    if (saved?.storyNodeId && STORY[saved.storyNodeId]) setStoryNodeId(saved.storyNodeId);
  }, [gameId, activeSession?.engine]);

  useEffect(() => {
    if (gameId !== 'choose-your-story') return;
    let cancelled = false;
    setStoryContentReady(false);
    setStoryContentError('');
    const sessionId = activeSession?.id ?? 'unscoped';
    void selectAndRecordNext({
      gameId,
      intensity: sessionIntensity,
      excludedTopics,
      history: [],
      fingerprints: [],
      distribution: 'private',
    }, sessionId, `${sessionId}:${gameId}:opening`)
      .then((result) => {
        if (cancelled) return;
        if (!result.ok) {
          setStoryContentError(result.reason);
          setStoryContentReady(true);
          return;
        }
        setStoryOpeningCard(result.card);
        notePrompt(result.card, result.recorded);
        setStoryContentReady(true);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        console.error('Loading story content failed', error);
        setStoryContentError('The story content pool could not be loaded.');
        setStoryContentReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId, activeSession?.id, sessionIntensity, excludedTopics]);

  // Truth or Dare Engine State
  const [todState, setTodState] = useState<TodModel>(() => createTod('adventure'));
  const [customStepsText, setCustomStepsText] = useState<string[]>([
    'Make slow eye contact for 30 seconds',
    'Whisper a sincere secret in their ear',
    'Gently massage their neck or shoulders',
    'Choose your favorite music track for this room',
    'Share what you desire next without holding back',
  ]);

  // Current answering player index: alternates round by round
  const activeFirstPlayerIndex = (currentRoundNum - 1) % 2; // 0 = Player 1, 1 = Player 2
  const activeSecondPlayerIndex = activeFirstPlayerIndex === 0 ? 1 : 0;
  const p1Label = activeFirstPlayerIndex === 0 ? playerName : partnerName;
  const p2Label = activeFirstPlayerIndex === 0 ? partnerName : playerName;

  // Load question for current game
  const fetchNextCard = async () => {
    if (!gameId || !CARD_ROUND_GAMES.has(gameId)) return;
    setCurrentCard(null);
    setCardLoading(true);
    setCardLoadError('');
    try {
      const sessionId = activeSession?.id ?? 'unscoped';
      const res = await selectAndRecordNext({
        gameId,
        intensity: sessionIntensity,
        excludedTopics,
        history: [],
        fingerprints: [],
      }, sessionId, `${sessionId}:${gameId}:round:${currentRoundNum}`);

      if (!res.ok) {
        setCardLoadError(res.reason);
        showToast(res.reason, 'info');
        return;
      }
      setCurrentCard(res.card);
      notePrompt(res.card, res.recorded);
    } catch (error) {
      console.error('Selecting the next content card failed', error);
      setCardLoadError('Could not load a new card. Your history was preserved.');
      showToast('Could not load a new card. Your history was preserved.', 'error');
    } finally {
      setCardLoading(false);
    }
  };

  const selectTruthOrDareCard = async () => {
    try {
      const sessionId = activeSession?.id ?? 'unscoped';
      const result = await selectAndRecordNext({
        gameId: 'truth-or-dare',
        intensity: sessionIntensity,
        excludedTopics,
        history: [],
        fingerprints: [],
      }, sessionId, `${sessionId}:truth-or-dare:${crypto.randomUUID()}`);
      if (!result.ok) {
        showToast(result.reason, 'warning');
        return null;
      }

      notePrompt(result.card, result.recorded);
      return result;
    } catch (error) {
      console.error('Truth or Dare selection failed', error);
      showToast('Could not load a new challenge. Your history was preserved.', 'error');
      return null;
    }
  };

  const updateTodEncounterStatus = (status: 'completed' | 'passed') => {
    if (!todState.promptId) return;
    void updateCardEncounterStatus(todState.promptId, status).catch((error: unknown) => {
      console.error('Updating Truth or Dare content history failed', error);
      showToast('The challenge changed, but its history status could not be saved.', 'warning');
    });
  };

  useEffect(() => {
    void fetchNextCard().catch((error: unknown) => {
      console.error('Selecting the next content card failed', error);
      showToast('Could not load a new card. Your history was preserved.', 'error');
    });
  }, [currentRoundNum]);

  // Hand-off handlers
  const handleP1AnswerSubmit = (answer: string) => {
    setAnsPlayer1(answer);
    setPhase('handoff2');
  };

  const handleP2GuessSubmit = (guess: string) => {
    setAnsPlayer2(guess);
    const matched = guess.trim().toLowerCase() === ansPlayer1.trim().toLowerCase();
    
    // Award score to the guesser if correct
    if (matched) {
      setScores((prev) => {
        const next: [number, number] = [...prev];
        next[activeSecondPlayerIndex] += 1;
        return next;
      });
    }

    setRoundHistory((prev) => [
      ...prev,
      {
        round: currentRoundNum,
        prompt: currentCard?.prompt || '',
        p1: ansPlayer1,
        p2: guess,
        matched,
      },
    ]);

    if (currentCard) {
      void updateCardEncounterStatus(currentCard.id, 'completed').catch((error: unknown) => {
        console.error('Updating completed content history failed', error);
        showToast('The round finished, but its history status could not be saved.', 'warning');
      });
    }
    setPhase('reveal');
  };

  const handleNextRound = () => {
    if (gameId === 'six-questions' && currentRoundNum >= 6) {
      finishGame();
      return;
    }
    if (currentRoundNum >= 5 && gameId !== 'six-questions') {
      finishGame();
      return;
    }
    setCurrentCard(null);
    setCardLoadError('');
    setCardLoading(true);
    setCurrentRoundNum((r) => r + 1);
    setAnsPlayer1('');
    setAnsPlayer2('');
    setCustomInput('');
    setPhase('handoff1');
  };

  const finishGame = () => {
    if (gameId === 'choose-your-story' && storyOpeningCard) {
      void updateCardEncounterStatus(storyOpeningCard.id, 'completed').catch((error: unknown) => {
        console.error('Saving completed story history failed', error);
        showToast('The story ended, but its history status could not be saved.', 'warning');
      });
    }
    const perfectSix =
      gameId === 'six-questions' &&
      roundHistory.length === 6 &&
      roundHistory.every((round) => round.matched);
    awardCompletion({
      gameId,
      moodId: moodId as MoodId,
      perfectSix,
      story: gameId === 'choose-your-story',
      fiveStep: gameId === 'truth-or-dare' && todState.phase === 'resolved' && todState.steps.length === 5,
    });
    endSession();
    setPhase('finished');
  };

  // Roulette Spin Handler
  const spinRoulette = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWheelResult('');
    rouletteSpinSequence.current += 1;
    const spinNumber = rouletteSpinSequence.current;
    const sessionId = activeSession?.id ?? 'unscoped';

    setTimeout(() => {
      void selectAndRecordNext({
        gameId: gameId || 'fantasy-roulette',
        intensity: sessionIntensity,
        excludedTopics,
        history: [],
        fingerprints: [],
      }, sessionId, `${sessionId}:${gameId || 'fantasy-roulette'}:spin:${spinNumber}`)
        .then((result) => {
          if (!result.ok) {
            setWheelResult('');
            showToast(result.reason, 'warning');
            return;
          }
          setWheelResult(result.card.prompt);
          notePrompt(result.card, result.recorded);
        })
        .catch((error: unknown) => {
          console.error('Roulette selection failed', error);
          setWheelResult('');
          showToast('Could not spin for a new card. Your history was preserved.', 'error');
        })
        .finally(() => setIsSpinning(false));
    }, 2000);
  };

  const dedicatedGameIds = new Set([
    'love-quiz',
    'memory-lane',
    'love-language',
    'couple-challenges',
    'romantic-roulette',
    'desire-match',
    'naughty-roulette',
    'fantasy-roulette',
    'desire-quiz',
    'temptations',
    'emoji-confessions',
    'fantasy-cards',
    'scenario-builder',
    'the-menu',
    'challenge-duel',
  ]);

  if (gameId === 'choose-your-story' && !storyContentReady) {
    return (
      <div className="space-y-4 px-4 py-8 text-center">
        <p className="text-sm text-ad-text-secondary">Checking the story pool and local history…</p>
      </div>
    );
  }

  if (gameId === 'choose-your-story' && storyContentError) {
    return (
      <div className="space-y-4 px-4 py-8 text-center">
        <h2 className="font-display text-lg text-ad-gold">No eligible story opening</h2>
        <p className="text-sm text-ad-text-secondary">{storyContentError}</p>
        <p className="text-xs text-ad-text-secondary">
          No lower-intensity or previously shown opening was substituted.
        </p>
        <Button fullWidth onClick={() => navigate(`/games/${moodId}/${gameId}`)}>Return to game setup</Button>
      </div>
    );
  }

  if (CARD_ROUND_GAMES.has(gameId ?? '') && cardLoading) {
    return (
      <div className="space-y-4 px-4 py-8 text-center">
        <p className="text-sm text-ad-text-secondary">Checking this round's content pool and local history…</p>
      </div>
    );
  }

  if (CARD_ROUND_GAMES.has(gameId ?? '') && (!currentCard || cardLoadError)) {
    return (
      <div className="space-y-4 px-4 py-8 text-center">
        <h2 className="font-display text-lg text-ad-gold">No eligible card available</h2>
        <p className="text-sm text-ad-text-secondary">
          {cardLoadError || 'No card was selected for this round.'}
        </p>
        <p className="text-xs text-ad-text-secondary">
          No lower-intensity or previously shown card was substituted.
        </p>
        <Button fullWidth onClick={() => navigate(`/games/${moodId}/${gameId}`)}>Return to game setup</Button>
      </div>
    );
  }

  if (dedicatedGameIds.has(gameId || '') && moodId) {
    return <DedicatedGamePage gameId={gameId || ''} moodId={moodId} />;
  }

  return (
    <div className="min-h-screen px-4 pt-4 pb-12 max-w-md mx-auto flex flex-col justify-between">
      {/* Top Header Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to exit this game?')) {
                endSession();
                navigate(`/games/${moodId}`);
              }
            }}
            className="text-xs text-ad-text-secondary hover:text-ad-text flex items-center gap-1"
          >
            <span>✕</span> <span>Exit Game</span>
          </button>

          <div className="flex items-center gap-2">
            <GameCover gameId={gameId || ''} className="h-8 w-12 flex-shrink-0" />
            <span className="font-display font-bold text-xs tracking-wider uppercase text-ad-gold">
              {gameId?.replace(/-/g, ' ')}
            </span>
          </div>

          {gameId === 'six-questions' && (
            <span className="text-xs font-mono text-ad-text-secondary">
              ROUND {currentRoundNum}/6
            </span>
          )}
        </div>

        {gameId === 'six-questions' && (
          <ProgressBar value={(currentRoundNum / 6) * 100} size="sm" />
        )}
      </div>

      {/* GAME SPECIFIC ENGINES */}
      <div className="flex-1 flex flex-col justify-center py-4">
        {/* ========================================================= */}
        {/* 1. SIGNATURE TRUTH OR DARE WITH THREE-LEVEL TWIST LADDER */}
        {/* ========================================================= */}
        {gameId === 'truth-or-dare' && (
          <div className="space-y-4">
            {/* Turn & Strike Status Bar */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-ad-bg-secondary/60 border border-ad-burgundy/40 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-ad-gold font-bold">TURN {todState.round}:</span>
                <span className="text-white font-semibold">
                  {todState.recipient === 0 ? playerName : partnerName}'s Challenge
                </span>
              </div>
              {/* Strikes */}
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <span className="text-ad-text-secondary">STRIKES:</span>
                <span className="text-red-400 font-bold">
                  {'✕'.repeat(todState.strikes[todState.recipient]) || '—'}
                </span>
              </div>
            </div>

            {/* Phase 1: Choose Truth or Dare */}
            {todState.phase === 'choose' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="space-y-2">
                  <div className="text-4xl select-none">🎲</div>
                  <h2 className="font-display text-2xl font-bold text-ad-text">
                    {todState.chooser === 0 ? playerName : partnerName}, choose for {todState.recipient === 0 ? playerName : partnerName}
                  </h2>
                  <p className="text-xs text-ad-text-secondary">
                    Pick Truth or Dare. Level 1, 2, or 5-Step twists activate if needed.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <Button
                    size="lg"
                    variant="secondary"
                    className="py-6 text-lg font-display tracking-widest uppercase border-ad-gold/60"
                    onClick={async () => {
                      const selected = await selectTruthOrDareCard();
                      if (selected) {
                        setTodState((prev) => chooseKind(prev, 'truth', selected.card.prompt, selected.card.id));
                      }
                    }}
                  >
                    TRUTH 🌹
                  </Button>

                  <Button
                    size="lg"
                    variant="primary"
                    className="py-6 text-lg font-display tracking-widest uppercase shadow-xl shadow-ad-red/40"
                    onClick={async () => {
                      const selected = await selectTruthOrDareCard();
                      if (selected) {
                        setTodState((prev) => chooseKind(prev, 'dare', selected.card.prompt, selected.card.id));
                      }
                    }}
                  >
                    DARE 🔥
                  </Button>
                </div>

                {/* Twist Level Selector Switcher */}
                <div className="pt-4 flex justify-center gap-2 text-[10px]">
                  <button
                    onClick={() => setTodState((s) => ({ ...s, twistLevel: 'easy' }))}
                    className={`px-3 py-1 rounded-full border transition-all ${
                      todState.twistLevel === 'easy' ? 'border-ad-gold text-ad-gold bg-ad-gold/10' : 'border-ad-burgundy/40 text-ad-text-secondary'
                    }`}
                  >
                    Level 1: Easy 🌹
                  </button>
                  <button
                    onClick={() => setTodState((s) => ({ ...s, twistLevel: 'adventure' }))}
                    className={`px-3 py-1 rounded-full border transition-all ${
                      todState.twistLevel === 'adventure' ? 'border-ad-red text-ad-text bg-ad-red/20' : 'border-ad-burgundy/40 text-ad-text-secondary'
                    }`}
                  >
                    Level 2: Adventure 🔥
                  </button>
                  <button
                    onClick={() => setTodState((s) => ({ ...s, twistLevel: 'five-step' }))}
                    className={`px-3 py-1 rounded-full border transition-all ${
                      todState.twistLevel === 'five-step' ? 'border-purple-400 text-purple-300 bg-purple-900/30' : 'border-ad-burgundy/40 text-ad-text-secondary'
                    }`}
                  >
                    Level 3: 5-Step 😈
                  </button>
                </div>
              </motion.div>
            )}

            {/* Phase 2: Challenge Presented */}
            {todState.phase === 'presented' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <Card variant="glass" className="p-6 text-center space-y-4 border-ad-gold/40 shadow-2xl">
                  <Badge variant={todState.kind === 'truth' ? 'gold' : 'red'} size="md">
                    {todState.kind?.toUpperCase()}
                  </Badge>

                  <h3 className="font-display text-lg sm:text-xl font-bold text-ad-text leading-relaxed">
                    "{todState.prompt}"
                  </h3>

                  <p className="text-[11px] text-ad-text-secondary italic">
                    Recipient: {todState.recipient === 0 ? playerName : partnerName}. Passing is always an accepted option.
                  </p>
                </Card>

                {/* Challenge Actions: Accept, Swap, Pass, Pause */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      updateTodEncounterStatus('completed');
                      setTodState((s) => completeChallenge(acceptChallenge(s)));
                    }}
                  >
                    ✓ Complete
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      const selected = await selectTruthOrDareCard();
                      if (!selected) return;
                      updateTodEncounterStatus('passed');
                      setTodState((s) => swapIn(s, selected.card.prompt, selected.card.id));
                      showToast('Challenge swapped', 'info');
                    }}
                  >
                    ↻ Swap
                  </Button>
                  <Button
                    variant="ghost"
                    className="border border-ad-burgundy/40 text-red-300"
                    onClick={async () => {
                      updateTodEncounterStatus('passed');
                      const alternative = await selectTruthOrDareCard();
                      setTodState((s) => passChallenge(s, alternative?.card.prompt));
                    }}
                  >
                    × Pass (+1 Strike)
                  </Button>
                  <Button
                    variant="ghost"
                    className="border border-ad-burgundy/40"
                    onClick={() => setTodState((s) => pauseGame(s))}
                  >
                    Ⅱ Pause
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Alternative Offer Phase (Level 1 Twist) */}
            {todState.phase === 'alternative' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 text-center"
              >
                <Card variant="solid" className="p-5 space-y-3 border-ad-gold/30">
                  <div className="text-ad-gold font-bold text-xs uppercase tracking-wider">
                    🌹 LEVEL 1 TWIST: COMPARABLE ALTERNATIVE
                  </div>
                  <p className="text-sm text-ad-text font-medium leading-relaxed">
                    "{todState.alternative}"
                  </p>
                  <p className="text-[10px] text-ad-text-secondary">
                    You may accept this alternative or decline with no further requirement.
                  </p>
                </Card>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => setTodState((s) => completeChallenge(s))}
                  >
                    Accept Alternative
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setTodState((s) => declineAlternative(s))}
                  >
                    Decline
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Video Offer Phase (Level 2 Twist) */}
            {todState.phase === 'video-offer' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 text-center"
              >
                <Card variant="solid" className="p-5 space-y-3 border-ad-red/50">
                  <div className="text-ad-red font-bold text-xs uppercase tracking-wider">
                    🔥 LEVEL 2 ADVENTURE TWIST: OPTIONAL VIDEO PERFORMANCE
                  </div>
                  <p className="text-xs text-ad-text leading-relaxed">
                    Record an optional 15-second private video challenge, or complete a different activity in chat.
                  </p>
                  <div className="p-3 bg-ad-bg rounded-xl border border-ad-burgundy/40 text-[11px] text-ad-text-secondary">
                    Requires camera review before sending. Never automatically recorded or transmitted.
                  </div>
                </Card>

                <div className="flex gap-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => {
                      showToast('Opening private camera review...', 'info');
                      navigate('/chat');
                    }}
                  >
                    Open Camera 📷
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => setTodState((s) => declineAlternative(s))}
                  >
                    Decline
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Phase: Five-Step Challenge Terminal Composition (Level 3 Twist) */}
            {todState.phase === 'compose-steps' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="text-center space-y-1">
                  <h3 className="font-display text-lg font-bold text-ad-text uppercase">
                    😈 FIVE-STEP CHALLENGE TERMINAL
                  </h3>
                  <p className="text-xs text-ad-text-secondary">
                    {todState.chooser === 0 ? playerName : partnerName}: Compose 5 steps for your partner.
                  </p>
                </div>

                <div className="space-y-2 max-h-[48vh] overflow-y-auto pr-1">
                  {customStepsText.map((stepText, idx) => (
                    <div key={idx} className="space-y-1 text-left">
                      <label className="text-[10px] text-ad-gold font-mono uppercase">
                        STEP {idx + 1}/5
                      </label>
                      <input
                        type="text"
                        value={stepText}
                        onChange={(e) => {
                          const updated = [...customStepsText];
                          updated[idx] = e.target.value;
                          setCustomStepsText(updated);
                        }}
                        className="w-full bg-ad-bg-secondary/70 border border-ad-burgundy/40 rounded-xl px-3 py-2 text-xs text-ad-text focus:outline-none focus:border-ad-gold"
                      />
                    </div>
                  ))}
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => setTodState((s) => setSteps(s, customStepsText))}
                >
                  Activate 5-Step Sequence ➔
                </Button>
              </motion.div>
            )}

            {/* Phase: Five-Step Challenge Execution Terminal */}
            {todState.phase === 'step' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 text-center"
              >
                <Card variant="glass" className="p-6 space-y-4 border-ad-gold/50 shadow-2xl">
                  <div className="flex items-center justify-between text-xs font-mono text-ad-gold">
                    <span>STEP {todState.stepIndex + 1} OF 5</span>
                    <span>{Math.round(((todState.stepIndex + 1) / 5) * 100)}%</span>
                  </div>

                  <ProgressBar value={((todState.stepIndex + 1) / 5) * 100} size="sm" variant="gold" />

                  <h3 className="font-display text-lg font-bold text-white leading-relaxed">
                    "{todState.steps[todState.stepIndex]?.text}"
                  </h3>

                  <p className="text-[10px] text-ad-text-secondary">
                    Recipient: {todState.recipient === 0 ? playerName : partnerName} can approve, swap, or skip.
                  </p>
                </Card>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="primary"
                    onClick={() => setTodState((s) => approveStep(s))}
                  >
                    ✓ Approve Step
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setTodState((s) => swapStep(s, 'A sweet romantic embrace'))}
                  >
                    ↻ Swap Step
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setTodState((s) => skipStep(s))}
                    className="text-red-300"
                  >
                    × Skip
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setTodState((s) => endSteps(s))}
                  >
                    End Sequence
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Phase: Resolved / Next Turn */}
            {todState.phase === 'resolved' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 text-center"
              >
                <div className="w-16 h-16 mx-auto rounded-full bg-ad-red/20 border border-ad-gold/40 flex items-center justify-center text-3xl">
                  ✓
                </div>
                <h3 className="font-display text-xl font-bold text-ad-text">
                  Round Complete!
                </h3>
                <p className="text-xs text-ad-text-secondary">
                  Points: {playerName} ({todState.points[0]}) · {partnerName} ({todState.points[1]})
                </p>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={() => setTodState((s) => todNextTurn(s))}
                  >
                    Next Turn ➔
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => finishGame()}
                  >
                    End Game
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 2. SIX QUESTIONS & HOW WELL DO YOU KNOW ME? MCQ ENGINES */}
        {/* ========================================================= */}
        {(gameId === 'six-questions' || gameId === 'how-well-do-you-know-me' || gameId === 'love-quiz' || gameId === 'desire-quiz') && (
          <div>
            {/* Step 1: Hand-off to Player 1 */}
            {phase === 'handoff1' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full border-2 border-ad-gold/40 bg-ad-burgundy/40 flex items-center justify-center text-4xl shadow-xl shadow-ad-red/20">
                  📱
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-ad-gold uppercase tracking-widest font-mono">
                    PASS PHONE TO
                  </span>
                  <h2 className="font-display text-2xl font-bold text-white">
                    {p1Label}
                  </h2>
                  <p className="text-xs text-ad-text-secondary max-w-xs mx-auto">
                    Answer secretly. {p2Label} must not look at the screen!
                  </p>
                </div>
                <Button
                  size="lg"
                  fullWidth
                  variant="primary"
                  onClick={() => setPhase('answer1')}
                >
                  I am {p1Label} — View Question ➔
                </Button>
              </motion.div>
            )}

            {/* Step 2: Player 1 Secretly Answers */}
            {phase === 'answer1' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <Badge variant="gold" size="sm">
                    {p1Label}'S SECRET CHOICE
                  </Badge>
                  <h3 className="font-display text-lg font-bold text-ad-text leading-relaxed">
                    {currentCard?.prompt || 'What is your genuine preference?'}
                  </h3>
                </div>

                <div className="space-y-2">
                  {(currentCard?.answerChoices || [
                    'A quiet evening with candles',
                    'An adventurous night out',
                    'Deep honest conversation',
                    'Spontaneous sensual play',
                  ]).map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => handleP1AnswerSubmit(choice)}
                      className="w-full p-3.5 rounded-xl text-left text-xs bg-ad-bg-secondary/70 border border-ad-burgundy/40 hover:border-ad-gold/60 text-ad-text transition-all active:scale-[0.99] flex items-center justify-between"
                    >
                      <span>{choice}</span>
                      <span className="text-ad-gold/60 text-xs">➔</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Hand-off to Player 2 */}
            {phase === 'handoff2' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 mx-auto rounded-full border-2 border-ad-red/40 bg-ad-bg-secondary flex items-center justify-center text-4xl shadow-xl shadow-ad-red/20">
                  📱
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-ad-red uppercase tracking-widest font-mono">
                    PASS PHONE TO
                  </span>
                  <h2 className="font-display text-2xl font-bold text-white">
                    {p2Label}
                  </h2>
                  <p className="text-xs text-ad-text-secondary max-w-xs mx-auto">
                    Predict what {p1Label} chose. Can you read your partner's mind?
                  </p>
                </div>
                <Button
                  size="lg"
                  fullWidth
                  variant="primary"
                  onClick={() => setPhase('guess2')}
                >
                  I am {p2Label} — Make My Guess ➔
                </Button>
              </motion.div>
            )}

            {/* Step 4: Player 2 Predicts */}
            {phase === 'guess2' && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1">
                  <Badge variant="red" size="sm">
                    {p2Label}'S PREDICTION
                  </Badge>
                  <h3 className="font-display text-lg font-bold text-ad-text leading-relaxed">
                    What did {p1Label} answer for:
                  </h3>
                  <p className="text-xs text-ad-text-secondary italic">
                    "{currentCard?.prompt}"
                  </p>
                </div>

                <div className="space-y-2">
                  {(currentCard?.answerChoices || [
                    'A quiet evening with candles',
                    'An adventurous night out',
                    'Deep honest conversation',
                    'Spontaneous sensual play',
                  ]).map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => handleP2GuessSubmit(choice)}
                      className="w-full p-3.5 rounded-xl text-left text-xs bg-ad-bg-secondary/70 border border-ad-burgundy/40 hover:border-ad-red/60 text-ad-text transition-all active:scale-[0.99] flex items-center justify-between"
                    >
                      <span>{choice}</span>
                      <span className="text-ad-red/60 text-xs">➔</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 5: Simultaneous Reveal Screen */}
            {phase === 'reveal' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5 text-center"
              >
                {/* Result Indicator */}
                <div className="space-y-1">
                  <div className="text-4xl select-none mb-1">
                    {ansPlayer1.toLowerCase() === ansPlayer2.toLowerCase() ? '💞' : '⚡'}
                  </div>
                  <h3 className="font-display text-xl font-bold text-white">
                    {ansPlayer1.toLowerCase() === ansPlayer2.toLowerCase()
                      ? 'PERFECT MATCH! (+1 POINT)'
                      : 'DELICIOUS DIFFERENCE'}
                  </h3>
                </div>

                {/* Answers Comparison */}
                <div className="grid grid-cols-2 gap-2 text-left">
                  <Card variant="glass" className="p-3 border-ad-gold/30">
                    <div className="text-[10px] text-ad-gold uppercase font-mono font-bold">
                      {p1Label}'S ANSWER:
                    </div>
                    <div className="text-xs text-ad-text font-medium mt-1">
                      {ansPlayer1}
                    </div>
                  </Card>

                  <Card variant="glass" className="p-3 border-ad-red/30">
                    <div className="text-[10px] text-ad-red uppercase font-mono font-bold">
                      {p2Label}'S GUESS:
                    </div>
                    <div className="text-xs text-ad-text font-medium mt-1">
                      {ansPlayer2}
                    </div>
                  </Card>
                </div>

                {/* Score Tally */}
                <div className="p-2.5 rounded-xl bg-ad-bg-secondary/80 border border-ad-burgundy/40 text-xs text-ad-text-secondary">
                  Scores: {playerName} ({scores[0]}) · {partnerName} ({scores[1]})
                </div>

                <Button
                  size="lg"
                  fullWidth
                  variant="primary"
                  onClick={handleNextRound}
                >
                  Continue to Next Round ➔
                </Button>
              </motion.div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 3. WOULD YOU RATHER & WHO'S MORE LIKELY? */}
        {/* ========================================================= */}
        {(gameId === 'would-you-rather' || gameId === 'whos-more-likely') && (
          <div className="space-y-5 text-center">
            <Badge variant="gold" size="sm">
              {gameId === 'would-you-rather' ? 'WOULD YOU RATHER' : "WHO'S MORE LIKELY"}
            </Badge>

            <h3 className="font-display text-lg font-bold text-ad-text leading-relaxed">
              {currentCard?.prompt || 'Make your choice:'}
            </h3>

            {phase === 'handoff1' && (
              <Card variant="glass" className="p-5 space-y-3">
                <p className="text-xs text-ad-text-secondary">Pass the phone to {p1Label}. Their choice stays private.</p>
                <Button fullWidth onClick={() => setPhase('answer1')}>Start private choice</Button>
              </Card>
            )}
            {phase === 'answer1' && (
              <div className="space-y-3">
                <p className="text-sm font-bold">{p1Label}, choose privately</p>
                {(currentCard?.answerChoices || (gameId === 'whos-more-likely' ? [playerName, partnerName] : ['Option A', 'Option B']))
                  .map((choice, index) => (
                    <Button
                      key={index}
                      variant={index === 0 ? 'secondary' : 'primary'}
                      fullWidth
                      onClick={() => handleP1AnswerSubmit(
                        gameId === 'whos-more-likely'
                          ? choice.replace('Player 1', playerName).replace('Player 2', partnerName)
                          : choice,
                      )}
                    >
                      {gameId === 'whos-more-likely'
                        ? choice.replace('Player 1', playerName).replace('Player 2', partnerName)
                        : choice}
                    </Button>
                  ))}
                {gameId === 'would-you-rather' && (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Write a custom third choice"
                      value={customInput}
                      onChange={(event) => setCustomInput(event.target.value)}
                      className="w-full bg-ad-bg-secondary/70 border border-ad-burgundy/40 rounded-xl px-3 py-2 text-xs text-ad-text"
                    />
                    <Button
                      fullWidth
                      variant="ghost"
                      disabled={!customInput.trim()}
                      onClick={() => handleP1AnswerSubmit(customInput.trim())}
                    >
                      Choose custom option
                    </Button>
                  </div>
                )}
              </div>
            )}
            {phase === 'handoff2' && (
              <Card variant="glass" className="p-5 space-y-3">
                <p className="text-xs text-ad-text-secondary">Pass to {p2Label}. Do not reveal the first choice.</p>
                <Button fullWidth onClick={() => setPhase('guess2')}>Make private choice</Button>
              </Card>
            )}
            {phase === 'guess2' && (
              <div className="space-y-3">
                <p className="text-sm font-bold">{p2Label}, choose privately</p>
                {(currentCard?.answerChoices || (gameId === 'whos-more-likely' ? [playerName, partnerName] : ['Option A', 'Option B']))
                  .map((choice, index) => {
                    const displayedChoice = gameId === 'whos-more-likely'
                      ? choice.replace('Player 1', playerName).replace('Player 2', partnerName)
                      : choice;
                    return (
                      <Button
                        key={index}
                        variant={index === 0 ? 'secondary' : 'primary'}
                        fullWidth
                        onClick={() => handleP2GuessSubmit(displayedChoice)}
                      >
                        {displayedChoice}
                      </Button>
                    );
                  })}
                {gameId === 'would-you-rather' && customInput.trim() && (
                  <Button fullWidth variant="ghost" onClick={() => handleP2GuessSubmit(customInput.trim())}>
                    {customInput.trim()}
                  </Button>
                )}
              </div>
            )}
            {phase === 'reveal' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="text-3xl">{ansPlayer1 === ansPlayer2 ? '🤝' : '✨'}</div>
                <h4 className="font-display text-base font-bold text-ad-gold">
                  {ansPlayer1 === ansPlayer2 ? 'You chose the same answer' : 'Choices revealed'}
                </h4>
                <div className="p-4 rounded-xl bg-ad-bg-secondary/60 border border-ad-burgundy/40 text-xs space-y-2 text-left">
                  <div><span className="text-ad-gold font-bold">{p1Label}:</span> {ansPlayer1}</div>
                  <div><span className="text-ad-red font-bold">{p2Label}:</span> {ansPlayer2}</div>
                  <div>Score: {playerName} ({scores[0]}) · {partnerName} ({scores[1]})</div>
                </div>
                <Button variant="primary" fullWidth onClick={handleNextRound}>Next Card ➔</Button>
              </motion.div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 4. ROULETTE GAMES (ROMANTIC, NAUGHTY, FANTASY) */}
        {/* ========================================================= */}
        {(gameId === 'romantic-roulette' || gameId === 'naughty-roulette' || gameId === 'fantasy-roulette') && (
          <div className="space-y-6 text-center">
            <Badge variant="red" size="sm">
              ROULETTE WHEEL
            </Badge>

            {/* Animated Roulette Spinner Graphic */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <motion.div
                animate={{ rotate: isSpinning ? 1800 : 0 }}
                transition={{ duration: 2, ease: [0.17, 0.67, 0.12, 0.99] }}
                className="w-full h-full rounded-full border-4 border-dashed border-ad-gold/60 bg-gradient-to-br from-ad-burgundy via-ad-red/30 to-ad-bg flex items-center justify-center shadow-2xl shadow-ad-red/40"
              >
                <img
                  src={AFTERDARK_ASSETS.ui.rouletteWheel}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 text-xl text-ad-gold font-bold">
                ▼
              </div>
            </div>
            {gameId === 'fantasy-roulette' && (
              <img
                src={AFTERDARK_ASSETS.ui.dice}
                alt=""
                aria-hidden="true"
                className="mx-auto h-12 w-20 rounded-lg object-cover"
                loading="lazy"
                decoding="async"
              />
            )}

            {/* Result Display */}
            {wheelResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-ad-bg-secondary/80 border border-ad-gold/40 text-left space-y-2 shadow-xl"
              >
                <span className="text-[10px] text-ad-gold font-mono font-bold uppercase tracking-wider">
                  ROULETTE SELECTION:
                </span>
                <p className="text-xs text-ad-text font-medium leading-relaxed">
                  {wheelResult}
                </p>
              </motion.div>
            )}

            <Button
              size="lg"
              fullWidth
              variant="primary"
              loading={isSpinning}
              onClick={spinRoulette}
              className="shadow-xl shadow-ad-red/40 text-sm font-display tracking-wider uppercase"
            >
              {wheelResult ? 'SPIN AGAIN 🎰' : 'SPIN THE WHEEL 🎰'}
            </Button>
          </div>
        )}

        {/* ========================================================= */}
        {/* 5. CHOOSE YOUR STORY (BRANCHING NARRATIVE) */}
        {/* ========================================================= */}
        {gameId === 'choose-your-story' && (
          <div className="space-y-5 text-left">
            <div className="relative overflow-hidden rounded-xl border border-ad-gold/30">
              <img
                src={storyScenes[storyNodeId] || AFTERDARK_ASSETS.scenes.hotelSuite}
                alt=""
                aria-hidden="true"
                className="h-36 w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ad-bg/80 via-transparent to-ad-bg/10" />
              <img
                src={AFTERDARK_ASSETS.ui.maskOverlay}
                alt=""
                aria-hidden="true"
                className="absolute bottom-2 right-2 h-10 w-16 rounded-lg object-cover opacity-90"
                loading="lazy"
                decoding="async"
              />
            </div>
            <div className="text-center space-y-1">
              <span className="text-xs font-mono text-ad-gold tracking-widest uppercase">
                {STORY_TITLE}
              </span>
              <h2 className="font-display text-xl font-bold text-white">
                {STORY[storyNodeId]?.chapter || 'Chapter 1'}
              </h2>
            </div>

            <Card variant="glass" className="p-5 space-y-4 border-ad-burgundy/60 shadow-2xl leading-relaxed text-sm text-ad-text">
              {storyOpeningCard && (
                <p className="text-ad-gold">{storyOpeningCard.prompt}</p>
              )}
              <p>{STORY[storyNodeId]?.text}</p>
            </Card>

            {/* Decisions */}
            {!STORY[storyNodeId]?.ending ? (
              <div className="space-y-2 pt-2">
                {STORY[storyNodeId]?.choices?.map((choice, idx) => (
                  <Button
                    key={idx}
                    variant={idx === 0 ? 'primary' : 'secondary'}
                    fullWidth
                    size="md"
                    onClick={() => {
                      setStoryNodeId(choice.next);
                      useGameStore.getState().patchSession({ engine: { storyNodeId: choice.next } });
                    }}
                  >
                    {choice.label} ➔
                  </Button>
                ))}
              </div>
            ) : (
              <div className="space-y-3 pt-2 text-center">
                <div className="text-3xl select-none">🌹</div>
                <h3 className="font-display text-base font-bold text-ad-gold">
                  Story Completed!
                </h3>
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => finishGame()}
                >
                  Return to Lounge
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. GENERIC / DESIRE MATCH / MEMORY LANE / TEMPTATIONS */}
        {/* ========================================================= */}
        {!['truth-or-dare', 'six-questions', 'how-well-do-you-know-me', 'love-quiz', 'desire-quiz', 'would-you-rather', 'whos-more-likely', 'romantic-roulette', 'naughty-roulette', 'fantasy-roulette', 'choose-your-story'].includes(gameId || '') && (
          <div className="space-y-5 text-center">
            <Badge variant="gold" size="sm">
              {gameId?.toUpperCase().replace(/-/g, ' ')}
            </Badge>

            <Card variant="glass" className="p-6 space-y-3 border-ad-gold/40 shadow-2xl">
              <h3 className="font-display text-lg font-bold text-ad-text leading-relaxed">
                {currentCard?.prompt || 'Enjoy this shared adventure together.'}
              </h3>

              {gameId === 'memory-lane' && (
                <div className="pt-2">
                  <textarea
                    placeholder="Write your note or memory to preserve in this room..."
                    className="w-full bg-ad-bg-secondary/70 border border-ad-burgundy/40 rounded-xl p-3 text-xs text-ad-text"
                    rows={3}
                    value={customInput}
                    onChange={(e) => setCustomInput(e.target.value)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-2"
                    disabled={!customInput.trim()}
                    onClick={() => {
                      saveMemory(currentCard?.prompt || 'Memory', customInput);
                      showToast('Memory preserved in private vault', 'success');
                      setCustomInput('');
                    }}
                  >
                    💾 Save to Memory Vault
                  </Button>
                </div>
              )}
            </Card>

            <div className="flex gap-2">
              <Button
                variant="primary"
                fullWidth
                onClick={() => fetchNextCard()}
              >
                Next Prompt ➔
              </Button>
              <Button
                variant="ghost"
                onClick={() => finishGame()}
              >
                Complete Game
              </Button>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* FINAL RESULTS SCREEN */}
        {/* ========================================================= */}
        {phase === 'finished' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center"
          >
            <div className="w-20 h-20 mx-auto rounded-full border-2 border-ad-gold/60 bg-gradient-to-br from-ad-burgundy to-ad-red/40 flex items-center justify-center text-4xl shadow-xl shadow-ad-red/30">
              🏆
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono text-ad-gold uppercase tracking-wider">
                SESSION COMPLETED
              </span>
              <h2 className="font-display text-2xl font-bold text-white">
                Game Results
              </h2>
            </div>

            {/* Score Summary */}
            <Card variant="solid" className="p-4 space-y-2 text-left">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-ad-gold">{playerName}:</span>
                <span className="font-bold text-ad-text">{scores[0]} Points</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-ad-red">{partnerName}:</span>
                <span className="font-bold text-ad-text">{scores[1]} Points</span>
              </div>
              {gameId === 'six-questions' && (
                <div className="pt-2 border-t border-ad-burgundy/30 text-xs text-ad-text-secondary flex justify-between">
                  <span>Match Rate:</span>
                  <span className="text-ad-gold font-bold">
                    {Math.round(((scores[0] + scores[1]) / 6) * 100)}%
                  </span>
                </div>
              )}
            </Card>

            <Button
              size="lg"
              fullWidth
              variant="primary"
              onClick={() => navigate(`/games/${moodId}`)}
            >
              Back to Games ➔
            </Button>
          </motion.div>
        )}
      </div>

      {/* Bottom Subtle Status */}
      <div className="text-center text-[10px] text-ad-text-secondary/60">
        AFTERDARK PRIVACY PRESERVED · PRIVATE ROOM
      </div>
    </div>
  );
};
