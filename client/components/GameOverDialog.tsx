import React, { useState } from 'react';
import { RunResult, VerifyCode } from '../../shared/sim/types';
import { HAZARDS } from '../../shared/content/hazards';
import { GO_BAG_ITEMS } from '../../shared/content/items';
import { STARTING_HEARTS } from '../../shared/sim/constants';
import { questionById } from '../../shared/content/questions';
import { Lang, UI, UiKey } from '../../shared/content/i18n';
import { RotateCcw, CheckCircle2, AlertTriangle, Trophy, Copy, Check, BookOpen, Home, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

/** Where the server check stands: waiting, a server answer (code), no server, or a practice run. */
export type VerifyStatus =
  | { state: 'checking' }
  | { state: 'offline' }
  | { state: 'practice' }
  | { state: 'mismatch' }
  | { state: 'answered'; code: VerifyCode; rank?: number };

const CODE_TEXT: Record<VerifyCode, UiKey> = {
  saved: 'verified',
  bad_request: 'verifyBadData',
  bad_seed: 'verifyBadData',
  bad_length: 'verifyBadData',
  bad_inputs: 'verifyBadData',
  old_rules: 'verifyOldRules',
  tick_mismatch: 'verifyTickMismatch',
  not_ended: 'verifyNotEnded',
  save_failed: 'verifySaveFailed',
};

interface GameOverDialogProps {
  isOpen: boolean;
  runData: RunResult | null;
  verify: VerifyStatus | null;
  playerName: string;
  lang: Lang;
  onRestart: () => void;
  onTitle: () => void;
  onOpenLeaderboard: () => void;
}

/** Results: how the run went, the lessons from wrong answers, and whether the server agreed. */
export const GameOverDialog: React.FC<GameOverDialogProps> = ({ isOpen, runData, verify, playerName, lang, onRestart, onTitle, onOpenLeaderboard }) => {
  const [copied, setCopied] = useState(false);
  const t = (key: UiKey) => UI[key][lang];

  // Celebrate reaching the evacuation center. Hooks run before any early return.
  React.useEffect(() => {
    if (isOpen && runData?.finished) {
      confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 }, colors: ['#f2c230', '#d6402b', '#2b5fb8', '#3d8b4f', '#f1ebdd'] });
    }
  }, [isOpen, runData]);

  if (!isOpen || !runData) return null;
  const rescuedBy = runData.rescuedBy ? HAZARDS[runData.rescuedBy].name[lang] : null;

  const scorecard = () =>
    [
      `Takbo! Bagyo Run · seed ${runData.seed}`,
      runData.finished ? t('madeItSub') : `${t('rescued')} ${runData.distance.toLocaleString('en-US')} m`,
      `${t('score')}: ${runData.score.toLocaleString('en-US')}`,
      `${t('heartsLeft')}: ${runData.heartsLeft}/${STARTING_HEARTS}`,
      `${t('goBagPacked')}: ${runData.goBagCount}/${GO_BAG_ITEMS.length}`,
      `${t('quizCorrect')}: ${runData.gatesCorrect}/${runData.gatesTotal}`,
    ].join('\n');

  const handleCopy = () => {
    navigator.clipboard?.writeText(scorecard()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const rows: [UiKey, string][] = [
    ['distance', `${(runData.distance / 1000).toFixed(2)} km`],
    ['heartsLeft', `${runData.heartsLeft} / ${STARTING_HEARTS}`],
    ['goBagPacked', `${runData.goBagCount} / ${GO_BAG_ITEMS.length}`],
    ['quizCorrect', `${runData.gatesCorrect} / ${runData.gatesTotal}`],
    ['supplies', String(runData.supplies)],
    ['nearMisses', String(runData.nearMisses)],
    ['time', `${(runData.ticks / 60).toFixed(1)} s`],
  ];

  const saved = verify?.state === 'answered' && verify.code === 'saved';
  const verifyText = !verify
    ? ''
    : verify.state === 'answered'
      ? `${t(CODE_TEXT[verify.code])}${saved ? ` · ${t('submittedAs')} ${playerName || 'RUNNER'}` : ''}`
      : t(({ checking: 'verifying', offline: 'offlineNotSubmitted', practice: 'practiceNotSubmitted', mismatch: 'replayMismatch' } as const)[verify.state]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/70 animate-in fade-in duration-200">
      {/* Header and lessons scroll; the status line and buttons stay pinned at the bottom */}
      <div role="dialog" aria-modal="true" aria-labelledby="results-title" className="sheet w-full max-w-xl max-h-[calc(100dvh-1.5rem)] flex flex-col font-body">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 md:px-7 pb-5 flex flex-col gap-5">
          <div>
            <span className="font-display text-xs tracking-wider text-[#f2c230]">{runData.finished ? t('madeItSub') : rescuedBy ? `${t('lastHit')}: ${rescuedBy}` : ''}</span>
            <h2 id="results-title" className="takbo-logo font-display text-4xl md:text-5xl leading-none mt-1">
              {runData.finished ? t('madeIt') : t('rescued')}
            </h2>
            {!runData.finished && <p className="text-sm text-[#f1ebdd]/85 mt-2">{t('rescuedSub')}</p>}
          </div>

          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-start">
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
              {rows.map(([k, v]) => (
                <React.Fragment key={k}>
                  <dt className="text-[#aaa6b8]">{t(k)}</dt>
                  <dd className="font-display text-right">{v}</dd>
                </React.Fragment>
              ))}
            </dl>
            <div className="rounded-lg bg-black/30 px-5 py-3 text-center">
              <span className="font-display text-xs text-[#f2c230]">{t('score')}</span>
              <p className="font-display text-3xl md:text-4xl">{runData.score.toLocaleString('en-US')}</p>
              {saved && verify.rank !== undefined && (
                <p className="text-xs text-[#aaa6b8] mt-1">
                  {t('rank')} #{verify.rank}
                </p>
              )}
            </div>
          </div>

          <section className="flex flex-col gap-2.5">
            <h3 className="font-display text-sm text-[#f2c230] flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> {t('lessons')}
            </h3>
            {runData.wrongQuestionIds.length === 0 ? (
              <p className="text-sm">{t('allCorrect')}</p>
            ) : (
              runData.wrongQuestionIds.map((id) => {
                const q = questionById(id);
                return (
                  <div key={id} className="rounded-lg bg-black/30 border-l-4 border-[#f2c230] p-3">
                    <p className="text-sm font-semibold">{q.prompt[lang]}</p>
                    <p className="text-sm text-[#9fe0a8] mt-1">
                      {t('answer')}: {q.choices[q.answer][lang]}
                    </p>
                    <p className="text-xs text-[#f1ebdd]/85 mt-1 leading-relaxed">{q.lesson[lang]}</p>
                    <p className="font-mono text-[10px] text-[#aaa6b8] mt-1.5">
                      {t('source')}: {q.source.org === 'Law' ? q.source.ref : `${q.source.org}, ${q.source.ref}`}
                    </p>
                  </div>
                );
              })
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-[#2f2d42] bg-[#1e1d2b] px-5 md:px-7 pt-3 pb-5 flex flex-col gap-3">
          {verify && (
            <div className="flex items-center gap-2 text-xs text-[#f1ebdd]/85">
              {verify.state === 'checking' ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#f2c230]" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4 text-[#6cc070]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#f0862a]" />
              )}
              <span>{verifyText}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={onRestart} className="btn-jeep flex-1 min-w-[160px] py-3 flex items-center justify-center gap-2" autoFocus>
              <RotateCcw className="w-4 h-4" /> {t('runAgain')}
            </button>
            <button onClick={handleCopy} className="btn-plain px-4 py-3 text-xs flex items-center gap-2">
              {copied ? <Check className="w-4 h-4 text-[#6cc070]" /> : <Copy className="w-4 h-4" />}
              {copied ? t('copied') : t('share')}
            </button>
            <button onClick={onOpenLeaderboard} className="btn-plain px-4 py-3 text-xs flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#f2c230]" /> {t('leaderboard')}
            </button>
            <button onClick={onTitle} className="btn-plain px-4 py-3 text-xs flex items-center gap-2">
              <Home className="w-4 h-4" /> {t('quitToTitle')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
