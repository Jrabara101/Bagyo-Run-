import React from 'react';
import { ActiveGateHud } from '../../shared/sim/types';
import { Lang, questionById } from '../../shared/content/questions';
import type { GateFeedback } from '../game/GameController';

const LETTERS = ['A', 'B', 'C'] as const;

const TEXT = {
  gate: { en: 'Quiz gate', fil: 'Tanong' },
  hint: { en: 'Run into the lane with the right answer', fil: 'Tumakbo sa lane ng tamang sagot' },
  correct: { en: 'Correct!', fil: 'Tama!' },
  wrong: { en: 'Not quite', fil: 'Mali' },
  answer: { en: 'Answer', fil: 'Sagot' },
};

interface QuizGateBannerProps {
  gate: ActiveGateHud | null;
  feedback: GateFeedback | null;
  gatesTotal: number;
  lang: Lang;
}

/** The question for the next gate, with the A / B / C choice standing in each lane. */
export const QuizGateBanner: React.FC<QuizGateBannerProps> = ({ gate, feedback, gatesTotal, lang }) => {
  if (gate) {
    const q = questionById(gate.questionId);
    return (
      <div className="absolute left-1/2 -translate-x-1/2 top-24 md:top-28 w-[min(92%,760px)] pointer-events-none z-20" role="status" aria-live="polite">
        <div className="rounded-2xl bg-[#fff4d6] text-[#1b2a4a] border-4 border-[#b3261e] shadow-[0_6px_0_#1b2a4a] px-4 py-3">
          <div className="flex items-center justify-between font-display text-[11px] tracking-wider text-[#b3261e]">
            <span>
              {TEXT.gate[lang]} {gate.index + 1}/{gatesTotal}
            </span>
            <span>{gate.metersLeft} m</span>
          </div>
          <p className="font-body text-base md:text-xl font-extrabold leading-snug mt-1">{q.prompt[lang]}</p>
          <div className="grid grid-cols-3 gap-2 mt-2.5">
            {gate.laneChoices.map((choice, lane) => (
              <div
                key={lane}
                className={`rounded-xl border-2 px-2 py-1.5 flex items-start gap-1.5 transition-colors ${
                  gate.lane === lane ? 'bg-[#f7be1d] border-[#1b2a4a]' : 'bg-white/70 border-[#1b2a4a]/30'
                }`}
              >
                <span className="font-display text-lg leading-none">{LETTERS[lane]}</span>
                <span className="text-xs md:text-sm font-semibold leading-tight">{q.choices[choice][lang]}</span>
              </div>
            ))}
          </div>
          <p className="font-mono text-[10px] mt-2 text-[#1b2a4a]/70 uppercase tracking-wider">{TEXT.hint[lang]}</p>
        </div>
      </div>
    );
  }

  if (feedback) {
    const q = questionById(feedback.questionId);
    const answer = q.choices[q.answer][lang];
    return (
      <div className="absolute left-1/2 -translate-x-1/2 top-24 md:top-28 pointer-events-none z-20" role="status" aria-live="polite">
        <div
          className={`rounded-2xl px-5 py-2.5 border-4 shadow-[0_6px_0_#1b2a4a] text-center ${
            feedback.correct ? 'bg-emerald-300 border-emerald-700 text-emerald-950' : 'bg-[#fff4d6] border-[#b3261e] text-[#1b2a4a]'
          }`}
        >
          <p className="font-display text-xl md:text-2xl">
            {feedback.correct ? `${TEXT.correct[lang]} +${feedback.points.toLocaleString()}` : TEXT.wrong[lang]}
          </p>
          {!feedback.correct && (
            <p className="text-sm font-semibold mt-0.5">
              {TEXT.answer[lang]}: {LETTERS[feedback.correctLane]}. {answer}
            </p>
          )}
        </div>
      </div>
    );
  }

  return null;
};
