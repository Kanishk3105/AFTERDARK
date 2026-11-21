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
import {
  createMenu,
  createPreferenceModel,
  isMenuModel,
  nextPreferenceRound,
  revealMenu,
  revealAndAdvancePreferenceRound,
  setMenuRank,
  submitMenuRanking,
  submitPrivateChoice,
  type MenuModel,
} from '@/games/dedicated';
import { EMOJI_DECK } from '@/content/recipes';
import type { PreferenceChoice } from '@/games/dedicated';

interface Props {
  gameId: string;
  moodId: string;
}

export const DedicatedGamePage: React.FC<Props> = ({ gameId, moodId }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const playerName = useAppStore((s) => s.playerName) || 'Player 1';
  const partnerName = useAppStore((s) => s.partnerName) || 'Player 2';
  const activeSession = useGameStore((s) => s.activeSession);
  const patchSession = useGameStore((s) => s.patchSession);
  const endSession = useGameStore((s) => s.endSession);
  const [menu, setMenu] = useState<MenuModel>(() =>
    isMenuModel(activeSession?.engine)
      ? activeSession.engine
      : createMenu(['Slow evening', 'Adventure', 'Deep conversation', 'Playful challenge']),
  );
  const [phase, setPhase] = useState<'prompt' | 'answer-a' | 'handoff-b' | 'answer-b' | 'reveal' | 'finished'>(() => {
    if (!isMenuModel(activeSession?.engine)) return 'prompt';
    if (activeSession.engine.revealed) return 'reveal';
    if (activeSession.engine.submitted[0]) return 'handoff-b';
    return 'prompt';
  });
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

  const isMenu = gameId === 'the-menu';
  const isPrivateChoice = ['love-quiz', 'love-language', 'desire-match', 'desire-quiz', 'fantasy-cards'].includes(gameId);
  const isDuel = ['challenge-duel', 'couple-challenges', 'memory-lane', 'scenario-builder'].includes(gameId);
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
        {isMenu && (
          <Card variant="solid" className="p-4">
            <div className="text-xs text-ad-text-secondary">Matching menu ranks</div>
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

      {isMenu && (
        <>
          {phase === 'prompt' && (
            <Card variant="glass" className="p-6 space-y-4 text-center">
              <h2 className="font-display text-xl">Rank what sounds most appealing</h2>
              <p className="text-xs text-ad-text-secondary">
                Each partner ranks privately. Compare only after both submit.
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
              <h2 className="font-display text-lg text-center">Compare your menus</h2>
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

      {isRoulette && (
        <Card variant="glass" className="p-6 space-y-5 text-center">
          <h2 className="font-display text-lg">Roulette</h2>
          <div className="w-36 h-36 mx-auto rounded-full border-4 border-dashed border-ad-gold/60 flex items-center justify-center text-5xl">
            🎰
          </div>
          <Button
            fullWidth
            onClick={() => {
              setCustomText(`Spin result ${preference.roundIndex + 1}: ${currentPrompt}`);
              setPreference((model) => nextPreferenceRound(model));
            }}
          >
            Spin and Reveal
          </Button>
          {customText && <p className="text-sm text-ad-text leading-relaxed">{customText}</p>}
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
