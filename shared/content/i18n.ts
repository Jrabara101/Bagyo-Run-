/**
 * Every player-facing UI string, in English and Filipino. Quiz text lives in questions.ts and
 * names of hazards, items and areas live with their content; this file is everything else.
 * Strings with numbers are filled in by the UI, so keep them as short labels here.
 */
export type Bilingual = { en: string; fil: string };
export type Lang = keyof Bilingual;

const B = (en: string, fil: string): Bilingual => ({ en, fil });

export const UI = {
  // Title and menu
  kicker: B('A storm-preparedness runner: typhoon, flood and lightning', 'Takbuhan ng paghahanda sa bagyo, baha at kidlat'),
  intro: B(
    'Run from home to the evacuation center as the storm rises from Signal No. 1 to 5. Dodge hazards, crouch through wind gusts, keep to high ground in floods, and leave any lane that crackles before lightning strikes. Answer each quiz gate by lane and pack your Go-Bag. You have 3 hearts.',
    'Tumakbo mula sa bahay papunta sa evacuation center habang lumalakas ang bagyo mula Signal No. 1 hanggang 5. Iwasan ang panganib, yumuko sa bugso ng hangin, manatili sa mataas na lugar kapag may baha, at umalis sa lane na kumikislap bago tumama ang kidlat. Sagutin ang bawat quiz gate gamit ang lane at kumpletuhin ang Go-Bag. May 3 puso ka.'
  ),
  play: B('Takbo!', 'Takbo!'),
  pressToRun: B('Press SPACE or ENTER to run', 'Pindutin ang SPACE o ENTER para tumakbo'),
  howToPlay: B('How to play', 'Paano laruin'),
  practice: B('Practice run', 'Pagsasanay'),
  leaderboard: B('Leaderboard', 'Talaan ng iskor'),
  daily: B('Daily challenge', 'Hamon ngayong araw'),
  settings: B('Settings', 'Mga setting'),
  credits: B('Credits', 'Kredito'),
  back: B('Back', 'Bumalik'),
  close: B('Close', 'Isara'),
  keyboard: B('KEYBOARD: WASD / ARROWS', 'KEYBOARD: WASD / ARROW KEYS'),
  mobile: B('MOBILE: SWIPE & TAP', 'MOBILE: I-SWIPE AT I-TAP'),
  alert: B('ALERT', 'BABALA'),
  ticker: B(
    '{storm}: Signal No. 1 is up over Barangay Maligaya. Pack your Go-Bag and keep the radio on.',
    '{storm}: Signal No. 1 na sa Barangay Maligaya. Ihanda ang inyong Go-Bag at makinig sa radyo.'
  ),
  switchLang: B('Lumipat sa Filipino', 'Switch to English'),
  mute: B('Mute sound', 'I-mute ang tunog'),
  unmute: B('Turn sound on', 'Buksan ang tunog'),
  fullscreen: B('Full screen', 'Buong screen'),
  serverOnline: B('Server online', 'Konektado sa server'),
  offline: B('Offline mode', 'Offline mode'),
  seed: B('Seed', 'Seed'),

  // HUD
  score: B('Score', 'Puntos'),
  signalNo: B('Signal No.', 'Signal Blg.'),
  hearts: B('Hearts', 'Puso'),
  goBag: B('Go-Bag', 'Go-Bag'),
  quiz: B('Quiz', 'Tanong'),
  supplies: B('Supplies', 'Suplay'),
  bayanihan: B('Bayanihan', 'Bayanihan'),
  bayanihanReady: B('Ready! SPACE / double-tap', 'Handa na! SPACE / i-double-tap'),
  bayanihanActive: B('Neighbors carry you!', 'Tinutulungan ka ng kapitbahay!'),
  bayanihanFill: B('Near misses and right answers fill it', 'Napupuno sa muntik-matamaan at tamang sagot'),
  pause: B('Pause', 'Ihinto'),
  aheadOfGhost: B('ahead of the ghost', 'nauuna sa ghost'),
  behindGhost: B('behind the ghost', 'nahuhuli sa ghost'),
  areaShortBarangay: B('Barangay', 'Barangay'),
  areaShortEstero: B('Estero', 'Estero'),
  areaShortPalayan: B('Rice fields', 'Palayan'),
  areaShortEvac: B('Evac center', 'Evacuation'),
  lifeVest: B('Life vest', 'Life vest'),
  whistle: B('Tanod whistle', 'Pito ng tanod'),

  // Tutorial coach
  coachLanes: B('Switch lanes: ← → / A D / swipe', 'Lumipat ng lane: ← → / A D / i-swipe'),
  coachJump: B('JUMP! ↑ / W / swipe up', 'TUMALON! ↑ / W / i-swipe pataas'),
  coachSlide: B('SLIDE! ↓ / S / swipe down', 'DUMAUSDOS! ↓ / S / i-swipe pababa'),
  coachDodge: B('Blocked! Change lanes', 'Harang! Lumipat ng lane'),
  coachGoBag: B('Go-Bag item ahead: grab it!', 'May gamit sa Go-Bag sa unahan: kunin!'),
  coachSupply: B('Grab supplies for points', 'Kunin ang suplay para sa puntos'),
  coachBayanihan: B('Bayanihan is ready: SPACE / double-tap', 'Handa ang Bayanihan: SPACE / i-double-tap'),
  coachGate: B('Quiz gate: run into the lane with the right answer', 'Quiz gate: tumakbo sa lane ng tamang sagot'),
  coachGust: B('GUST! Slide ↓ as it hits to crouch and hold your lane', 'BUGSO NG HANGIN! Dumausdos ↓ pagtama nito para yumuko at manatili sa lane'),
  coachFlood: B('Flood ahead: run on the high ground behind the sandbags', 'Baha sa unahan: tumakbo sa mataas na lugar sa likod ng mga sandbag'),
  coachLightning: B('Lightning! Leave the glowing lane', 'Kidlat! Umalis sa kumikislap na lane'),

  // Weather on the HUD
  hudWind: B('Wind', 'Hangin'),
  hudGust: B('GUST · CROUCH!', 'BUGSO · YUMUKO!'),
  hudGustHint: B('Slide ↓ as it hits', 'Dumausdos ↓ pagtama'),
  hudBraced: B('Braced!', 'Nakatagal!'),
  hudPushed: B('Shoved by the wind!', 'Tinulak ng hangin!'),
  hudFloodAhead: B('Flood ahead', 'Baha sa unahan'),
  hudFlooded: B('Flooded road', 'Bahang daan'),
  hudHighGround: B('High ground', 'Mataas na lugar'),
  hudDeepWater: B('Deep water: slow, no jumping', 'Malalim: mabagal, hindi makatalon'),
  laneLeft: B('left', 'kaliwa'),
  laneCenter: B('middle', 'gitna'),
  laneRight: B('right', 'kanan'),
  practiceBadge: B('Practice: not scored', 'Pagsasanay: walang iskor'),

  // Pause and settings
  paused: B('Paused', 'Nakahinto'),
  resume: B('Resume', 'Ituloy'),
  restart: B('Restart run', 'Ulitin ang takbo'),
  quitToTitle: B('Back to title', 'Bumalik sa simula'),
  sound: B('Sound', 'Tunog'),
  masterVolume: B('Master volume', 'Kabuuang lakas'),
  sfxVolume: B('Sound effects', 'Sound effects'),
  musicVolume: B('Music and rain', 'Musika at ulan'),
  camera: B('Camera', 'Kamera'),
  cameraTilt: B('Camera tilt', 'Pagkiling ng kamera'),
  screenShake: B('Screen shake', 'Pag-alog ng screen'),
  controls: B('Controls', 'Kontrol'),
  jump: B('Jump', 'Tumalon'),
  slide: B('Slide', 'Dumausdos'),
  left: B('Left', 'Kaliwa'),
  right: B('Right', 'Kanan'),
  language: B('Language', 'Wika'),

  // Results
  madeIt: B('You made it!', 'Ligtas ka na!'),
  madeItSub: B('You reached the evacuation center', 'Nakarating ka sa evacuation center'),
  rescued: B('Rescued!', 'Na-rescue ka!'),
  rescuedSub: B('Rescuers carried you the rest of the way', 'Binuhat ka ng mga rescuer hanggang sa evacuation center'),
  lastHit: B('Last hit', 'Huling tumama'),
  distance: B('Distance', 'Layo'),
  heartsLeft: B('Hearts left', 'Natitirang puso'),
  goBagPacked: B('Go-Bag packed', 'Laman ng Go-Bag'),
  quizCorrect: B('Quiz gates correct', 'Tamang sagot sa tanong'),
  nearMisses: B('Near misses', 'Muntik-matamaan'),
  time: B('Time', 'Oras'),
  lessons: B('Lessons from this run', 'Mga aral mula sa takbong ito'),
  allCorrect: B('Every quiz gate right. Galing!', 'Tama lahat ng sagot. Galing!'),
  answer: B('Answer', 'Sagot'),
  source: B('Source', 'Pinagmulan'),
  runAgain: B('Run again', 'Tumakbo ulit'),
  share: B('Share', 'Ibahagi'),
  copied: B('Copied!', 'Nakopya!'),
  verifying: B('Checking your run on the server...', 'Sinusuri ang takbo mo sa server...'),
  verified: B('Verified by server replay', 'Napatunayan ng server replay'),
  notVerified: B('Not verified', 'Hindi napatunayan'),
  offlineNotSubmitted: B('Offline: this run was not submitted', 'Offline: hindi naipasa ang takbong ito'),
  replayMismatch: B('Server replay gave a different score', 'Iba ang iskor sa server replay'),
  practiceNotSubmitted: B('Practice runs are not submitted', 'Hindi ipinapasa ang pagsasanay'),
  rank: B('Rank', 'Puwesto'),
  submittedAs: B('Submitted as', 'Ipinasa bilang'),
  verifyBadData: B('Not verified: the run data was not valid', 'Hindi napatunayan: hindi tama ang datos ng takbo'),
  verifyOldRules: B('Played on an older version of the game. Reload the page to get the latest.', 'Nilaro sa lumang bersyon ng laro. I-reload ang page para sa pinakabago.'),
  verifyTickMismatch: B('Not verified: the server replay ended at a different moment', 'Hindi napatunayan: iba ang oras ng pagtatapos sa server replay'),
  verifyNotEnded: B('Not verified: the server replay did not reach the end', 'Hindi napatunayan: hindi umabot sa dulo ang server replay'),
  verifySaveFailed: B('Verified, but the server could not save it', 'Napatunayan, pero hindi ito naitala ng server'),

  // Leaderboard and daily challenge
  topRunners: B('Top runners', 'Nangungunang runner'),
  thisSeed: B('This seed', 'Ang seed na ito'),
  allSeeds: B('All seeds', 'Lahat ng seed'),
  loading: B('Loading...', 'Naglo-load...'),
  noRuns: B('No verified runs yet. Be the first!', 'Wala pang napatunayang takbo. Ikaw na ang mauna!'),
  raceGhost: B('Race ghost', 'Kalabanin ang ghost'),
  points: B('pts', 'puntos'),
  todaysSeed: B("Today's seed", 'Seed ngayong araw'),
  seedRecord: B('Seed record', 'Rekord sa seed'),
  by: B('by', 'ni'),
  playDaily: B('Play the daily challenge', 'Laruin ang hamon ngayong araw'),
  copyLink: B('Copy challenge link', 'Kopyahin ang link ng hamon'),
  linkCopied: B('Challenge link copied!', 'Nakopya ang link!'),
  todaysStorm: B("Today's storm", 'Bagyo ngayong araw'),
  dailyNote: B('Everyone gets the same course and the same quiz today. A new storm arrives at midnight, Philippine time.', 'Pare-pareho ang daan at tanong para sa lahat ngayong araw. May bagong bagyo pagsapit ng hatinggabi, oras sa Pilipinas.'),
  offlineBoard: B('Offline: showing your runs on this device', 'Offline: ipinapakita ang mga takbo mo sa device na ito'),
  runnerName: B('Runner name', 'Pangalan ng runner'),
  runnerNameHint: B('Shown on the leaderboard', 'Makikita sa talaan ng iskor'),

  // How to play
  htpGoalTitle: B('The goal', 'Ang layunin'),
  htpGoal: B(
    'Typhoon Bayani is coming. Run 2.5 km from your barangay, along the estero and across the rice fields to the evacuation center at the school. The storm gets stronger, and you get faster, from Signal No. 1 to 5.',
    'Paparating ang Bagyong Bayani. Tumakbo nang 2.5 km mula sa inyong barangay, sa tabi ng estero at sa palayan, hanggang sa evacuation center sa paaralan. Lumalakas ang bagyo, at bumibilis ka, mula Signal No. 1 hanggang 5.'
  ),
  htpControlsTitle: B('Controls', 'Kontrol'),
  htpKeys: B('Keyboard', 'Keyboard'),
  htpTouch: B('Touch screen', 'Touch screen'),
  htpLaneKeys: B('← → or A D: switch lanes', '← → o A D: lumipat ng lane'),
  htpJumpKeys: B('↑ or W: jump', '↑ o W: tumalon'),
  htpSlideKeys: B('↓ or S: slide', '↓ o S: dumausdos'),
  htpBayKeys: B('SPACE: Bayanihan', 'SPACE: Bayanihan'),
  htpPauseKeys: B('P or ESC: pause', 'P o ESC: ihinto'),
  htpLaneTouch: B('Swipe left or right: switch lanes', 'I-swipe pakaliwa o pakanan: lumipat ng lane'),
  htpJumpTouch: B('Swipe up: jump', 'I-swipe pataas: tumalon'),
  htpSlideTouch: B('Swipe down: slide', 'I-swipe pababa: dumausdos'),
  htpBayTouch: B('Double-tap: Bayanihan', 'I-double-tap: Bayanihan'),
  htpHazardsTitle: B('Hazards', 'Mga panganib'),
  htpHazards: B('Each hit costs a heart. Lose all 3 and rescuers carry you in, with a lower score.', 'Bawat tama ay bawas na puso. Kapag naubos ang 3, bubuhatin ka ng rescuer, pero mas mababa ang iskor.'),
  avoidJump: B('Jump over', 'Talunan'),
  avoidSlide: B('Slide under', 'Dumausdos sa ilalim'),
  avoidLane: B('Change lanes', 'Lumipat ng lane'),
  htpGoBagTitle: B('Pack your Go-Bag', 'Ihanda ang Go-Bag'),
  htpGoBag: B('8 Go-Bag items are on the course, once each. Pack all 8 for a big bonus.', 'May 8 gamit sa Go-Bag sa daan, tig-iisa. Kumpletuhin ang 8 para sa malaking bonus.'),
  htpPowerTitle: B('Power-ups', 'Power-up'),
  htpPowerVest: B('Life vest: takes one hit for you', 'Life vest: sasalo ng isang tama para sa iyo'),
  htpPowerWhistle: B('Tanod whistle: pulls nearby supplies to you', 'Pito ng tanod: hinihila ang malapit na suplay'),
  htpPowerBay: B('Bayanihan sun: fills the Bayanihan meter by half', 'Araw ng Bayanihan: pinupuno ang kalahati ng Bayanihan meter'),
  htpQuizTitle: B('Quiz gates', 'Mga quiz gate'),
  htpQuiz: B(
    'Two gates in every area. The question appears about 5 seconds ahead with choices A, B and C, one per lane. Be in the lane with the right answer when you pass under the gate. Wrong answers come back as lessons at the end.',
    'Dalawang gate sa bawat lugar. Lumalabas ang tanong mga 5 segundo bago ang gate, may sagot na A, B at C, isa sa bawat lane. Nasa lane ka dapat ng tamang sagot pagdaan sa ilalim ng gate. Ang maling sagot ay babalik bilang aral sa dulo.'
  ),
  htpBayTitle: B('Bayanihan', 'Bayanihan'),
  htpBay: B(
    'Near misses and right answers fill the meter. When it is ready, call your neighbors: for 6 seconds you run faster and pull in supplies.',
    'Napupuno ang meter sa muntik-matamaan at tamang sagot. Kapag handa na, tawagin ang mga kapitbahay: sa loob ng 6 na segundo, mas mabilis ka at hinihila mo ang suplay.'
  ),
  htpWeatherTitle: B('Storm weather', 'Panahon sa gitna ng bagyo'),
  htpGust: B(
    'Wind gusts: arrows on the road show which way it will blow. Slide (crouch) as it hits to hold your lane and earn a bonus, or it shoves you a lane over.',
    'Bugso ng hangin: makikita sa arrow sa daan kung saan ito iihip. Dumausdos (yumuko) pagtama nito para manatili sa lane at makakuha ng bonus; kung hindi, itutulak ka nito sa katabing lane.'
  ),
  htpFlood: B(
    'Floods: two lanes are deep water that slows you down and stops you jumping. Run on the high ground behind the sandbags. Never wade through floodwater if you can avoid it.',
    'Baha: malalim na tubig ang dalawang lane, babagal ka at hindi makakatalon. Tumakbo sa mataas na lugar sa likod ng mga sandbag. Iwasang lumusong sa baha hangga\'t maaari.'
  ),
  htpLightning: B(
    'Thunderstorms: a lane that glows and crackles is about to be struck. Get out of it. Lightning strikes most in open fields, so take shelter early.',
    'Kulog at kidlat: tatamaan ng kidlat ang lane na kumikislap. Umalis agad dito. Madalas tumama ang kidlat sa malawak at bukas na lugar, kaya sumilong nang maaga.'
  ),
  htpSignalsTitle: B('Wind signals', 'Mga wind signal'),
  htpSignals: B(
    'The higher the PAGASA signal, the stronger the wind: faster pace, more hazards, more points for each right answer.',
    'Kapag mas mataas ang signal ng PAGASA, mas malakas ang hangin: mas mabilis, mas maraming panganib, mas malaking puntos sa bawat tamang sagot.'
  ),
  startPractice: B('Try a practice run', 'Subukan ang pagsasanay'),

  // Credits
  creditsTitle: B('Credits', 'Kredito'),
  madeFor: B('Made for', 'Ginawa para sa'),
  creditGame: B('Game design, code and art', 'Disenyo, code at art'),
  creditArt: B('All art and sound are generated in code. No image or audio files are used.', 'Lahat ng art at tunog ay ginawa sa code. Walang ginamit na image o audio file.'),
  creditSources: B('Disaster-preparedness facts', 'Mga impormasyon sa paghahanda'),
  creditSourcesNote: B('Quiz questions cite their source. Check the latest advisories from these agencies.', 'May pinagmulan ang bawat tanong. Sundin ang pinakabagong abiso ng mga ahensiyang ito.'),
  creditFonts: B('Fonts (SIL Open Font License)', 'Mga font (SIL Open Font License)'),
  creditAi: B('AI assistance', 'Tulong ng AI'),
  creditAiNote: B(
    'Code and first drafts of the quiz text were written with Claude (Anthropic) and reviewed by the developer. Listed in Form 03.',
    'Ang code at unang draft ng mga tanong ay isinulat kasama si Claude (Anthropic) at sinuri ng developer. Nakalista sa Form 03.'
  ),
  creditStory: B('Storm and barangay names are fictional.', 'Kathang-isip ang pangalan ng bagyo at barangay.'),
  footer: B('Takbo! Bagyo Run · DOST Level Up 3.0 · NSTW 2026', 'Takbo! Bagyo Run · DOST Level Up 3.0 · NSTW 2026'),
} satisfies Record<string, Bilingual>;

export type UiKey = keyof typeof UI;
