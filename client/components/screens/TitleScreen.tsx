import React from 'react';
import { Play, GraduationCap, BookOpen, Calendar, Trophy, Settings, Info, Gamepad2, Smartphone } from 'lucide-react';
import { Lang, UI } from '../../../shared/content/i18n';

interface TitleScreenProps {
  lang: Lang;
  /** Today's storm, for the alert ticker */
  storm: { en: string; fil: string };
  onPlay: () => void;
  onPractice: () => void;
  onHowTo: () => void;
  onDaily: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
  onCredits: () => void;
}

/** TAKBO! lockup and the main menu, over the dusk barangay the renderer draws behind it. */
export const TitleScreen: React.FC<TitleScreenProps> = ({ lang, storm, onPlay, onPractice, onHowTo, onDaily, onLeaderboard, onSettings, onCredits }) => {
  const menu = [
    { label: UI.practice[lang], icon: GraduationCap, onClick: onPractice },
    { label: UI.howToPlay[lang], icon: BookOpen, onClick: onHowTo },
    { label: UI.daily[lang], icon: Calendar, onClick: onDaily },
    { label: UI.leaderboard[lang], icon: Trophy, onClick: onLeaderboard },
    { label: UI.settings[lang], icon: Settings, onClick: onSettings },
    { label: UI.credits[lang], icon: Info, onClick: onCredits },
  ];
  return (
    <div className="absolute inset-0 z-30 flex flex-col bg-gradient-to-r from-[#15141f]/85 via-[#15141f]/35 to-transparent">
      <div className="flex-1 flex flex-col justify-center px-6 md:px-12 pt-4 pb-14 overflow-y-auto">
        <div className="flex flex-col items-start max-w-xl animate-in fade-in duration-500">
          <span className="font-body text-xs md:text-sm font-bold uppercase tracking-widest text-[#ffe2b0]">{UI.kicker[lang]}</span>
          <h1 className="takbo-logo font-display text-6xl md:text-8xl leading-none mt-1">TAKBO!</h1>
          <span className="relative inline-block mt-3 px-3 pt-1.5 pb-2.5 bg-[#15141f] rounded font-display text-xl md:text-2xl text-white overflow-hidden">
            BAGYO RUN
            <span className="banig-trim absolute inset-x-0 bottom-0 h-1.5" aria-hidden="true" />
          </span>
          <p className="font-body text-sm md:text-base text-gray-100 mt-4 max-w-md drop-shadow hidden sm:block">{UI.intro[lang]}</p>

          <button onClick={onPlay} className="btn-jeep mt-6 px-7 py-3 text-lg md:text-xl flex items-center gap-3" autoFocus>
            <Play className="w-5 h-5 fill-white" /> {UI.play[lang]}
          </button>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {menu.map(({ label, icon: Icon, onClick }) => (
              <button key={label} onClick={onClick} className="btn-plain px-3 py-2 text-[11px] md:text-xs flex items-center gap-2 text-left">
                <Icon className="w-4 h-4 text-[#f2c230] shrink-0" /> {label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 font-mono text-[11px] text-gray-200">
            <span className="px-2.5 py-1 rounded-md bg-[#15141f]/75 border border-white/15 flex items-center gap-2">
              <Gamepad2 className="w-3.5 h-3.5 text-[#f2c230]" /> {UI.keyboard[lang]}
            </span>
            <span className="px-2.5 py-1 rounded-md bg-[#15141f]/75 border border-white/15 flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-[#f2c230]" /> {UI.mobile[lang]}
            </span>
          </div>
        </div>
      </div>
      <p className="absolute right-5 bottom-14 font-display text-sm text-white drop-shadow-[0_1px_3px_#000] animate-pulse hidden md:block">
        {UI.pressToRun[lang]}
      </p>
      <div className="absolute inset-x-0 bottom-0 bg-[#0a0810]/80 font-body text-xs md:text-sm px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis">
        <span className="font-display text-[#15141f] bg-[#f2c230] px-2 py-0.5 mr-2 rounded-sm">{UI.alert[lang]}</span>
        {UI.ticker[lang].replace('{storm}', storm[lang])}
      </div>
    </div>
  );
};
