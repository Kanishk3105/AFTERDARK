import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAppStore } from '@/stores/app.store';
import { useGameStore } from '@/stores/game.store';
import { awardCompletion } from '@/games/awards';
import { createPreferenceModel, submitPrivateChoice, revealPreferenceRound, nextPreferenceRound } from '@/games/dedicated';
import { EMOJI_DECK } from '@/content/recipes';
import type { PreferenceChoice } from '@/games/dedicated';

interface Props {
  gameId: string;
  moodId: string;
}

export const DedicatedGamePage: React.FC<Props> = ({ gameId, moodId }) => {
  const navigate = useNavigate();
  const playerName = useAppStore((s) => s.playerName) || 'Player 1';
  const partnerName = useAppStore((s) => s.partnerName) || 'Player 2';
  const patchSession = useGameStore((s) => s.patchSession);
  const endSession = useGameStore((s) => s.endSession);
  const [phase, setPhase] = useState<'prompt' | 'answer-a' | 'handoff-b' | 'answer-b' | 'reveal' | 'finished'>('prompt');
  const [preference, setPreference] = useState(() =>
    createPreferenceModel(gameId, ['Which pace feels right tonight?', 'What kind of attention feels best?', 'What boundary matters most?', 'What would feel exciting but safe?']),
  );
  const [answerA, setAnswerA] = useState<PreferenceChoice>();
  const [answerB, setAnswerB] = useState<PreferenceChoice>();
  const [customText, setCustomText] = useState('');
  const [emoji, setEmoji] = useState('');
  const [scenario, setScenario] = useState({
    setting: 'A candlelit hotel',
    roles: 'Two consenting partners',
    atmosphere: 'Slow and mysterious',
    direction: 'Mutual discovery',
    boundary: 'Nothing without an explicit yes',
  });

  const isPrivateChoice = ['desire-match', 'fantasy-cards', 'love-language', 'the-menu'].includes(gameId);
  const isDuel = ['challenge-duel', 'couple-challenges', 'memory-lane', 'scenario-builder'].includes(gameId);
  const isTemptation = gameId === 'temptations';
  const isEmoji = gameId === 'emoji-confessions';
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

  const reveal = () => {
    setPreference((model) => revealPreferenceRound(model));
  };

  const finishPreferenceRound = () => {
    const next = nextPreferenceRound(preference);
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
              <Button fullWidth onClick={() => { reveal(); finishPreferenceRound(); }}>
                {preference.roundIndex + 1 >= preference.rounds.length ? 'Finish Results' : 'Next Round'}
              </Button>
            </Card>
          )}
        </>
      )}

      {isDuel && (
        <Card variant="glass" className="p-6 space-y-4">
          <h2 className="font-display text-lg">
            {gameId === 'scenario-builder' ? 'Build a scenario together' : 'Complete the same challenge'}
          </h2>
          {gameId === 'scenario-builder' ? (
            Object.entries(scenario).map(([key, value]) => (
              <label key={key} className="block space-y-1">
                <span className="text-[10px] uppercase text-ad-gold">{key}</span>
                <input
                  value={value}
                  onChange={(e) => setScenario((prev) => ({ ...prev, [key]: e.target.value }))}
                  className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary px-3 py-2 text-xs"
                />
              </label>
            ))
          ) : (
            <>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={4}
                placeholder="Write your independent submission..."
                className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-3 text-xs"
              />
              <p className="text-[10px] text-ad-text-secondary">Both players submit privately before reveal.</p>
            </>
          )}
          <Button fullWidth onClick={() => { patchSession({ engine: scenario }); finishGame(); }}>
            Save & Reveal
          </Button>
        </Card>
      )}

      {isTemptation && (
        <Card variant="glass" className="p-6 space-y-4">
          <h2 className="font-display text-lg">Create four private choices</h2>
          {Array.from({ length: 4 }).map((_, index) => (
            <input
              key={index}
              value={index === 0 ? customText : ''}
              onChange={(e) => index === 0 && setCustomText(e.target.value)}
              placeholder={`Choice ${index + 1}`}
              className="w-full rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary px-3 py-2 text-xs"
            />
          ))}
          <Button fullWidth onClick={finishGame}>Send for Partner Approval</Button>
        </Card>
      )}

      {isEmoji && (
        <Card variant="glass" className="p-6 space-y-4 text-center">
          <h2 className="font-display text-lg">Emoji Confession</h2>
          <div className="min-h-16 rounded-xl border border-ad-burgundy/40 bg-ad-bg-secondary p-3 text-3xl">{emoji || '✨'}</div>
          <div className="grid grid-cols-8 gap-1">
            {EMOJI_DECK.map((item) => (
              <button key={item} type="button" onClick={() => setEmoji((prev) => prev + item)} className="text-xl">{item}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setEmoji('')}>Clear</Button>
            <Button fullWidth onClick={finishGame}>Send Confession</Button>
          </div>
        </Card>
      )}
    </motion.div>
  );
};
