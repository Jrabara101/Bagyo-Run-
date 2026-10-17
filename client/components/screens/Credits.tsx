import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Lang, UI } from '../../../shared/content/i18n';
import { CREDITS } from '../../../shared/content/credits';

/** Who made the game, where the facts come from, fonts and AI assistance. */
export const Credits: React.FC<{ lang: Lang; onBack: () => void }> = ({ lang, onBack }) => (
  <div className="absolute inset-0 z-30 bg-[#15141f]/88 overflow-y-auto">
    <div className="sheet max-w-2xl mx-auto my-4 md:my-8 px-5 md:px-8 pb-8 flex flex-col gap-5 font-body text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl md:text-3xl">{UI.creditsTitle[lang]}</h2>
        <button onClick={onBack} className="btn-plain px-3 py-2 text-xs flex items-center gap-2" autoFocus>
          <ArrowLeft className="w-4 h-4" /> {UI.back[lang]}
        </button>
      </div>

      <div>
        <p className="takbo-logo font-display text-4xl leading-none">TAKBO!</p>
        <p className="font-display text-lg mt-1">BAGYO RUN</p>
        <p className="text-[#f1ebdd]/80 mt-2">
          {UI.madeFor[lang]} {CREDITS.event}
        </p>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-1">
        <dt className="text-[#aaa6b8]">{UI.creditGame[lang]}</dt>
        <dd className="font-semibold">{CREDITS.developer}</dd>
      </dl>
      <p className="text-[#f1ebdd]/90">{UI.creditArt[lang]}</p>

      <section>
        <h3 className="font-display text-base text-[#f2c230]">{UI.creditSources[lang]}</h3>
        <ul className="mt-1 grid sm:grid-cols-2 gap-x-5 gap-y-0.5">
          {CREDITS.sources.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
        <p className="text-xs text-[#aaa6b8] mt-2">{UI.creditSourcesNote[lang]}</p>
      </section>

      <section>
        <h3 className="font-display text-base text-[#f2c230]">{UI.creditFonts[lang]}</h3>
        <ul className="mt-1">
          {CREDITS.fonts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-display text-base text-[#f2c230]">{UI.creditAi[lang]}</h3>
        <p className="mt-1 text-[#f1ebdd]/90">{UI.creditAiNote[lang]}</p>
      </section>

      <p className="text-xs text-[#aaa6b8]">{UI.creditStory[lang]}</p>
    </div>
  </div>
);
