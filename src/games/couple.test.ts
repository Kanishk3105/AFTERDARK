import { describe, expect, it } from 'vitest';
import {
  beginAnswer,
  beginPrediction,
  createCoupleChoices,
  matchingPercentage,
  nextCoupleRound,
  submitAnswer,
  submitPrediction,
} from './couple';

describe('Couple private choice engine', () => {
  it('keeps the answer private until the prediction is submitted', () => {
    let model = createCoupleChoices('desire-quiz', 'What do you prefer?', ['Close', 'Distant'], 1);
    model = beginAnswer(model);
    model = submitAnswer(model, 'Close');
    expect(model.phase).toBe('handoff-predict');
    expect(model.rounds[0].revealed).toBe(false);

    model = beginPrediction(model);
    model = submitPrediction(model, 'Close');
    expect(model.phase).toBe('reveal');
    expect(model.rounds[0].answer).toBe('Close');
    expect(model.scores).toEqual([0, 1]);
  });

  it('reports non-judgmental matching percentage', () => {
    let model = createCoupleChoices('desire-match', 'Preference?', ['One', 'Two'], 1);
    model = beginAnswer(model);
    model = submitAnswer(model, 'One');
    model = beginPrediction(model);
    model = submitPrediction(model, 'Two');
    expect(matchingPercentage(model)).toBe(0);
  });

  it('finishes after the configured round count', () => {
    let model = createCoupleChoices('desire-match', 'Preference?', ['One', 'Two'], 1);
    model = beginAnswer(model);
    model = submitAnswer(model, 'One');
    model = beginPrediction(model);
    model = submitPrediction(model, 'One');
    model = nextCoupleRound(model, 'Next?', ['Yes', 'No']);
    expect(model.phase).toBe('finished');
  });
});
