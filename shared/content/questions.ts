import type { AreaId } from './areas';

export type Bilingual = { en: string; fil: string };
export type Lang = keyof Bilingual;

export type SourceOrg = 'PAGASA' | 'NDRRMC' | 'OCD' | 'DOH' | 'DepEd' | 'DSWD' | 'DENR-MGB' | 'DA' | 'NEA' | 'BFP' | 'Law';

export interface QuizQuestion {
  id: string;
  /** Areas whose gates may ask this question. */
  areas: readonly AreaId[];
  prompt: Bilingual;
  /** Exactly three. The gate shuffles them into the lanes. */
  choices: readonly [Bilingual, Bilingual, Bilingual];
  answer: 0 | 1 | 2;
  /** Shown on the results screen when the player gets it wrong. */
  lesson: Bilingual;
  source: { org: SourceOrg; ref: string };
  /**
   * false until a person has checked the fact and the Filipino against the cited source.
   * Drafted with AI assistance (see Form 03 note in CLAUDE.md).
   */
  reviewed: boolean;
}

const Q = (q: QuizQuestion) => q;

export const QUESTIONS: readonly QuizQuestion[] = [
  // ---------------------------------------------------------------- Barangay: warnings and preparing
  Q({
    id: 'signal_meaning',
    areas: ['barangay'],
    prompt: { en: 'What does a PAGASA wind signal number warn you about?', fil: 'Ano ang babala ng numero ng wind signal ng PAGASA?' },
    choices: [
      { en: 'How strong the winds will be', fil: 'Gaano kalakas ang hangin' },
      { en: 'How much rain will fall', fil: 'Gaano karami ang ulan' },
      { en: 'How many days classes are off', fil: 'Ilang araw walang pasok' },
    ],
    answer: 0,
    lesson: {
      en: 'Wind signals (Signal No. 1 to 5) are about wind strength. Heavy rain has its own warnings, so even a low signal can bring dangerous floods.',
      fil: 'Ang wind signal (Signal No. 1 hanggang 5) ay tungkol sa lakas ng hangin. May hiwalay na babala para sa malakas na ulan, kaya kahit mababa ang signal, puwede pa ring bumaha nang mapanganib.',
    },
    source: { org: 'PAGASA', ref: 'Tropical Cyclone Wind Signals (TCWS), 2022 revision' },
    reviewed: false,
  }),
  Q({
    id: 'signal5_wind',
    areas: ['barangay', 'evac'],
    prompt: { en: 'Signal No. 5 is raised for winds of at least how fast?', fil: 'Itinataas ang Signal No. 5 kapag ang hangin ay umaabot nang gaano kabilis?' },
    choices: [
      { en: '185 km/h', fil: '185 km/h' },
      { en: '62 km/h', fil: '62 km/h' },
      { en: '39 km/h', fil: '39 km/h' },
    ],
    answer: 0,
    lesson: {
      en: 'Signal No. 5 means typhoon-force winds of 185 km/h or more: an extreme threat to life and property.',
      fil: 'Ang Signal No. 5 ay hanging typhoon-force na 185 km/h o higit pa: matinding banta sa buhay at ari-arian.',
    },
    source: { org: 'PAGASA', ref: 'Tropical Cyclone Wind Signals (TCWS), 2022 revision' },
    reviewed: false,
  }),
  Q({
    id: 'signal1_lead',
    areas: ['barangay'],
    prompt: { en: 'Signal No. 1 warns that strong winds may arrive within about...', fil: 'Babala ang Signal No. 1 na maaaring dumating ang malakas na hangin sa loob ng mga...' },
    choices: [
      { en: '36 hours', fil: '36 oras' },
      { en: '1 hour', fil: '1 oras' },
      { en: '2 weeks', fil: '2 linggo' },
    ],
    answer: 0,
    lesson: {
      en: 'Signal No. 1 gives about 36 hours of lead time. Use it to pack your Go-Bag and secure your home, not to wait.',
      fil: 'Mga 36 oras ang palugit ng Signal No. 1. Gamitin ito para ihanda ang Go-Bag at ang bahay, hindi para maghintay.',
    },
    source: { org: 'PAGASA', ref: 'Tropical Cyclone Wind Signals (TCWS), 2022 revision' },
    reviewed: false,
  }),
  Q({
    id: 'par_name',
    areas: ['barangay'],
    prompt: {
      en: 'When a storm enters the Philippine Area of Responsibility (PAR), PAGASA...',
      fil: 'Kapag pumasok ang bagyo sa Philippine Area of Responsibility (PAR), ang PAGASA ay...',
    },
    choices: [
      { en: 'Gives it a local name', fil: 'Binibigyan ito ng lokal na pangalan' },
      { en: 'Stops tracking it', fil: 'Hindi na ito binabantayan' },
      { en: 'Declares a holiday', fil: 'Nagdedeklara ng holiday' },
    ],
    answer: 0,
    lesson: {
      en: 'Storms inside PAR get a local name (like Yolanda or Odette) so warnings are easy to follow.',
      fil: 'Binibigyan ng lokal na pangalan (tulad ng Yolanda o Odette) ang mga bagyo sa loob ng PAR para madaling sundan ang mga babala.',
    },
    source: { org: 'PAGASA', ref: 'Philippine tropical cyclone names' },
    reviewed: false,
  }),
  Q({
    id: 'gobag_72',
    areas: ['barangay', 'evac'],
    prompt: { en: 'A Go-Bag should have enough supplies to last at least...', fil: 'Dapat may sapat na laman ang Go-Bag para tumagal nang hindi bababa sa...' },
    choices: [
      { en: '72 hours (3 days)', fil: '72 oras (3 araw)' },
      { en: '3 hours', fil: '3 oras' },
      { en: '1 month', fil: '1 buwan' },
    ],
    answer: 0,
    lesson: {
      en: 'Help can take time to arrive. A Go-Bag with water, food, light, radio, first aid and documents should keep you going for 72 hours.',
      fil: 'Maaaring matagalan bago dumating ang tulong. Ang Go-Bag na may tubig, pagkain, ilaw, radyo, first aid at dokumento ay dapat tumagal nang 72 oras.',
    },
    source: { org: 'OCD', ref: 'NDRRMC / Office of Civil Defense Go Bag (emergency kit) guide' },
    reviewed: false,
  }),
  Q({
    id: 'gobag_docs',
    areas: ['barangay', 'estero'],
    prompt: { en: 'How should important documents be packed in a Go-Bag?', fil: 'Paano dapat ilagay ang mahahalagang dokumento sa Go-Bag?' },
    choices: [
      { en: 'In a sealed plastic bag', fil: 'Sa nakasarang plastik' },
      { en: 'Loose in a pocket', fil: 'Maluwag sa bulsa' },
      { en: 'Leave them at home', fil: 'Iwan sa bahay' },
    ],
    answer: 0,
    lesson: {
      en: 'Birth certificates, IDs and land titles are hard to replace. Keep copies sealed in plastic so floodwater cannot ruin them.',
      fil: 'Mahirap palitan ang birth certificate, ID at titulo ng lupa. Itago ang mga kopya sa nakasarang plastik para hindi masira ng baha.',
    },
    source: { org: 'OCD', ref: 'NDRRMC / Office of Civil Defense Go Bag (emergency kit) guide' },
    reviewed: false,
  }),
  Q({
    id: 'radio_updates',
    areas: ['barangay', 'palayan'],
    prompt: {
      en: 'The power is out during a typhoon. How do you keep getting official updates?',
      fil: 'Brownout habang may bagyo. Paano ka patuloy na makakakuha ng opisyal na balita?',
    },
    choices: [
      { en: 'Battery-powered radio', fil: 'De-bateryang radyo' },
      { en: 'Watch TV', fil: 'Manood ng TV' },
      { en: 'Guess from the sky', fil: 'Hulaan sa langit' },
    ],
    answer: 0,
    lesson: {
      en: 'A battery radio works without electricity, so you still hear PAGASA bulletins and evacuation orders. Pack spare batteries.',
      fil: 'Gumagana ang de-bateryang radyo kahit walang kuryente, kaya maririnig mo pa rin ang bulletin ng PAGASA at utos na lumikas. Magdala ng ekstrang baterya.',
    },
    source: { org: 'NDRRMC', ref: 'Typhoon preparedness advisory' },
    reviewed: false,
  }),
  Q({
    id: 'phone_alert',
    areas: ['barangay'],
    prompt: {
      en: 'Your phone blares a loud emergency alert about the typhoon. What is it?',
      fil: 'Biglang tumunog nang malakas ang cellphone mo dahil sa emergency alert tungkol sa bagyo. Ano ito?',
    },
    choices: [
      { en: 'An official disaster warning', fil: 'Opisyal na babala sa sakuna' },
      { en: 'A game notification', fil: 'Notification ng laro' },
      { en: 'A phone virus', fil: 'Virus sa cellphone' },
    ],
    answer: 0,
    lesson: {
      en: 'The Free Mobile Disaster Alerts Act (RA 10639) has phone networks send free official alerts. Read them and follow them.',
      fil: 'Ayon sa Free Mobile Disaster Alerts Act (RA 10639), nagpapadala ang mga network ng libreng opisyal na alerto. Basahin at sundin ang mga ito.',
    },
    source: { org: 'Law', ref: 'RA 10639, Free Mobile Disaster Alerts Act (2014)' },
    reviewed: false,
  }),
  Q({
    id: 'hotline_911',
    areas: ['barangay', 'evac'],
    prompt: { en: 'What is the national emergency hotline in the Philippines?', fil: 'Ano ang pambansang emergency hotline sa Pilipinas?' },
    choices: [
      { en: '911', fil: '911' },
      { en: '101', fil: '101' },
      { en: '555', fil: '555' },
    ],
    answer: 0,
    lesson: {
      en: 'Call 911 for emergencies anywhere in the country. Stay calm and give your exact location.',
      fil: 'Tumawag sa 911 kapag may emergency saan ka man sa bansa. Manatiling kalmado at sabihin ang eksaktong lokasyon mo.',
    },
    source: { org: 'Law', ref: 'Emergency 911 National Office' },
    reviewed: false,
  }),
  Q({
    id: 'secure_outside',
    areas: ['barangay'],
    prompt: {
      en: 'Before the typhoon arrives, what should you do with loose things outside the house?',
      fil: 'Bago dumating ang bagyo, ano ang dapat gawin sa mga bagay na nakakalat sa labas ng bahay?',
    },
    choices: [
      { en: 'Tie them down or bring them in', fil: 'Itali o ipasok sa loob' },
      { en: 'Leave them where they are', fil: 'Hayaan lang sila' },
      { en: 'Put them on the roof', fil: 'Ilagay sa bubong' },
    ],
    answer: 0,
    lesson: {
      en: 'Strong winds turn loose roofing, pots and signs into flying debris. Secure or store them before the wind picks up.',
      fil: 'Nagiging lumilipad na debris ang maluluwag na yero, paso at karatula kapag malakas ang hangin. Itali o itago ang mga ito bago lumakas ang hangin.',
    },
    source: { org: 'NDRRMC', ref: 'Typhoon preparedness advisory' },
    reviewed: false,
  }),
  Q({
    id: 'ra10121',
    areas: ['barangay'],
    prompt: {
      en: "Which law created the NDRRMC and the country's disaster risk reduction system?",
      fil: 'Anong batas ang lumikha sa NDRRMC at sa sistema ng bansa para sa disaster risk reduction?',
    },
    choices: [
      { en: 'RA 10121 (2010)', fil: 'RA 10121 (2010)' },
      { en: 'The Family Code', fil: 'Ang Family Code' },
      { en: 'The Labor Code', fil: 'Ang Labor Code' },
    ],
    answer: 0,
    lesson: {
      en: 'RA 10121, the Philippine DRRM Act of 2010, set up the NDRRMC and local DRRM councils down to the barangay.',
      fil: 'Itinatag ng RA 10121, ang Philippine DRRM Act of 2010, ang NDRRMC at ang mga lokal na DRRM council hanggang sa barangay.',
    },
    source: { org: 'Law', ref: 'RA 10121, Philippine Disaster Risk Reduction and Management Act of 2010' },
    reviewed: false,
  }),

  // ---------------------------------------------------------------- Estero: rain, floods, storm surge
  Q({
    id: 'rain_red',
    areas: ['estero'],
    prompt: { en: 'PAGASA raises a RED rainfall warning. What does it mean?', fil: 'Nagtaas ang PAGASA ng RED rainfall warning. Ano ang ibig sabihin nito?' },
    choices: [
      { en: 'Serious flooding: be ready to evacuate', fil: 'Malubhang baha: maghandang lumikas' },
      { en: 'Light rain only', fil: 'Mahinang ulan lang' },
      { en: 'The rain is over', fil: 'Tapos na ang ulan' },
    ],
    answer: 0,
    lesson: {
      en: 'Red is the highest level: intense rain of more than 30 mm an hour. Serious flooding is expected in low areas, so evacuate when told.',
      fil: 'Red ang pinakamataas na antas: matinding ulan na higit 30 mm kada oras. Inaasahan ang malubhang baha sa mabababang lugar, kaya lumikas kapag inutos.',
    },
    source: { org: 'PAGASA', ref: 'Color-coded Heavy Rainfall Warning' },
    reviewed: false,
  }),
  Q({
    id: 'rain_yellow',
    areas: ['estero'],
    prompt: { en: 'Under a YELLOW rainfall warning, flooding is possible...', fil: 'Sa YELLOW rainfall warning, posibleng bumaha...' },
    choices: [
      { en: 'In low areas near rivers', fil: 'Sa mababang lugar malapit sa ilog' },
      { en: 'Only on mountaintops', fil: 'Sa tuktok lang ng bundok' },
      { en: 'Nowhere at all', fil: 'Wala kahit saan' },
    ],
    answer: 0,
    lesson: {
      en: 'Yellow is the first level: 7.5 to 15 mm of rain an hour. Low places near rivers and esteros can already flood, so keep watch.',
      fil: 'Yellow ang unang antas: 7.5 hanggang 15 mm na ulan kada oras. Puwede nang bumaha sa mabababang lugar malapit sa ilog at estero, kaya magbantay.',
    },
    source: { org: 'PAGASA', ref: 'Color-coded Heavy Rainfall Warning' },
    reviewed: false,
  }),
  Q({
    id: 'rain_order',
    areas: ['estero'],
    prompt: {
      en: "Put PAGASA's rainfall warnings in order, from lowest to highest.",
      fil: 'Ayusin ang rainfall warning ng PAGASA mula pinakamababa hanggang pinakamataas.',
    },
    choices: [
      { en: 'Yellow, Orange, Red', fil: 'Yellow, Orange, Red' },
      { en: 'Red, Orange, Yellow', fil: 'Red, Orange, Yellow' },
      { en: 'Green, Blue, Red', fil: 'Green, Blue, Red' },
    ],
    answer: 0,
    lesson: {
      en: 'Yellow (watch), Orange (flooding is threatening, prepare), Red (serious flooding, evacuate). Each step up means more danger.',
      fil: 'Yellow (magbantay), Orange (banta ng baha, maghanda), Red (malubhang baha, lumikas). Bawat pagtaas ay mas mapanganib.',
    },
    source: { org: 'PAGASA', ref: 'Color-coded Heavy Rainfall Warning' },
    reviewed: false,
  }),
  Q({
    id: 'leptospirosis',
    areas: ['estero'],
    prompt: { en: 'Why should you avoid wading through floodwater?', fil: 'Bakit dapat iwasan ang paglusong sa baha?' },
    choices: [
      { en: 'It can give you leptospirosis', fil: 'Maaari kang magka-leptospirosis' },
      { en: 'It is too cold', fil: 'Masyadong malamig' },
      { en: 'It ruins your shoes', fil: 'Masisira ang sapatos mo' },
    ],
    answer: 0,
    lesson: {
      en: 'Floodwater can carry rat urine that causes leptospirosis. If you had to wade, wash well and see a doctor, especially if you have wounds.',
      fil: 'Maaaring may ihi ng daga ang baha na nagdudulot ng leptospirosis. Kung napilitang lumusong, maghugas nang mabuti at magpatingin sa doktor, lalo na kung may sugat.',
    },
    source: { org: 'DOH', ref: 'Leptospirosis prevention advisory' },
    reviewed: false,
  }),
  Q({
    id: 'moving_water',
    areas: ['estero', 'palayan'],
    prompt: {
      en: 'Fast-moving floodwater is crossing the road ahead. What do you do?',
      fil: 'May rumaragasang baha na tumatawid sa daan sa unahan. Ano ang gagawin mo?',
    },
    choices: [
      { en: 'Turn back and find another way', fil: 'Bumalik at humanap ng ibang daan' },
      { en: 'Run across quickly', fil: 'Tumakbo nang mabilis patawid' },
      { en: 'Swim across', fil: 'Languyin' },
    ],
    answer: 0,
    lesson: {
      en: 'Even knee-deep moving water can knock you over and hide open manholes. Never cross it: go around or wait for help.',
      fil: 'Kahit hanggang tuhod lang ang rumaragasang tubig, kaya ka nitong patumbahin at maaari nitong itago ang bukas na manhole. Huwag tumawid: umikot o maghintay ng tulong.',
    },
    source: { org: 'NDRRMC', ref: 'Flood safety advisory' },
    reviewed: false,
  }),
  Q({
    id: 'main_switch',
    areas: ['estero'],
    prompt: {
      en: 'Floodwater is about to enter your house. What should you switch off first?',
      fil: 'Papasok na ang baha sa bahay ninyo. Ano ang dapat unang patayin?',
    },
    choices: [
      { en: 'The main power switch', fil: 'Ang main switch ng kuryente' },
      { en: 'Only the TV', fil: 'Ang TV lang' },
      { en: 'Nothing, leave it on', fil: 'Wala, hayaang bukas' },
    ],
    answer: 0,
    lesson: {
      en: 'Water and electricity together can kill. Turn off the main switch while you are still dry, before the water comes in.',
      fil: 'Nakamamatay ang pinagsamang tubig at kuryente. Patayin ang main switch habang tuyo ka pa, bago pumasok ang tubig.',
    },
    source: { org: 'NDRRMC', ref: 'Flood safety advisory' },
    reviewed: false,
  }),
  Q({
    id: 'estero_trash',
    areas: ['estero'],
    prompt: { en: 'Why does throwing garbage into esteros make floods worse?', fil: 'Bakit lumalala ang baha kapag nagtatapon ng basura sa estero?' },
    choices: [
      { en: "It clogs the water's way out", fil: 'Bumabara ito sa daluyan ng tubig' },
      { en: 'Garbage makes it rain', fil: 'Nagpapaulan ang basura' },
      { en: 'It does not', fil: 'Hindi naman' },
    ],
    answer: 0,
    lesson: {
      en: 'Esteros carry rainwater away. Plastic and trash block them, so water backs up into streets and homes. Dumping waste in esteros is against the law.',
      fil: 'Dinadala ng estero ang tubig-ulan palayo. Binabarahan ito ng plastik at basura, kaya umaapaw ang tubig sa kalye at mga bahay. Bawal sa batas ang pagtatapon ng basura sa estero.',
    },
    source: { org: 'Law', ref: 'RA 9003, Ecological Solid Waste Management Act of 2000, Sec. 48' },
    reviewed: false,
  }),
  Q({
    id: 'storm_surge',
    areas: ['estero'],
    prompt: { en: 'What is a storm surge?', fil: 'Ano ang storm surge (daluyong)?' },
    choices: [
      { en: 'Seawater pushed ashore by a storm', fil: 'Tubig-dagat na itinulak ng bagyo sa lupa' },
      { en: 'A strong earthquake', fil: 'Malakas na lindol' },
      { en: 'A power outage', fil: 'Pagkawala ng kuryente' },
    ],
    answer: 0,
    lesson: {
      en: "A storm surge is an abnormal rise of the sea driven by a storm's winds. Yolanda's surge in 2013 devastated coastal Leyte.",
      fil: 'Ang storm surge ay di-pangkaraniwang pagtaas ng dagat dahil sa hangin ng bagyo. Winasak ng daluyong ni Yolanda noong 2013 ang mga baybayin ng Leyte.',
    },
    source: { org: 'PAGASA', ref: 'Storm surge warnings' },
    reviewed: false,
  }),
  Q({
    id: 'surge_action',
    areas: ['estero'],
    prompt: {
      en: 'A storm surge warning is up and you live near the coast. What do you do?',
      fil: 'May storm surge warning at nakatira ka malapit sa dagat. Ano ang gagawin mo?',
    },
    choices: [
      { en: 'Move inland to higher ground', fil: 'Lumipat sa mas mataas na lugar' },
      { en: 'Go and watch the waves', fil: 'Panoorin ang alon' },
      { en: 'Stay on the beach', fil: 'Manatili sa tabing-dagat' },
    ],
    answer: 0,
    lesson: {
      en: 'Surge water comes fast and deep. Evacuate early to higher ground away from the shore.',
      fil: 'Mabilis at malalim ang tubig ng daluyong. Lumikas nang maaga sa mataas na lugar na malayo sa dagat.',
    },
    source: { org: 'PAGASA', ref: 'Storm surge warnings' },
    reviewed: false,
  }),

  // ---------------------------------------------------------------- Palayan: wind, landslides, farms
  Q({
    id: 'power_line',
    areas: ['palayan', 'evac'],
    prompt: { en: 'You see a fallen power line on the path. What do you do?', fil: 'May nakita kang bumagsak na kawad ng kuryente sa daan. Ano ang gagawin mo?' },
    choices: [
      { en: 'Stay away and report it', fil: 'Lumayo at i-report ito' },
      { en: 'Move it with a stick', fil: 'Ilipat gamit ang patpat' },
      { en: 'Step over it', fil: 'Hakbangan ito' },
    ],
    answer: 0,
    lesson: {
      en: 'A fallen line can still be live, and wet ground carries the current. Keep far away and report it to your electric cooperative or barangay.',
      fil: 'Maaaring may kuryente pa ang bumagsak na kawad, at dumadaloy ito sa basang lupa. Lumayo at i-report sa electric cooperative o barangay.',
    },
    source: { org: 'NEA', ref: 'National Electrification Administration / electric cooperative typhoon safety advisory' },
    reviewed: false,
  }),
  Q({
    id: 'landslide_signs',
    areas: ['palayan'],
    prompt: { en: 'Which of these is a warning sign of a landslide?', fil: 'Alin dito ang babala ng pagguho ng lupa (landslide)?' },
    choices: [
      { en: 'New cracks and tilting trees', fil: 'Bagong bitak at tumatagilid na puno' },
      { en: 'A rainbow after rain', fil: 'Bahaghari pagkatapos ng ulan' },
      { en: 'Birds singing', fil: 'Huni ng mga ibon' },
    ],
    answer: 0,
    lesson: {
      en: 'Watch for new cracks, tilting trees or posts, muddy springs and rumbling sounds. Leave the slope right away if you see them.',
      fil: 'Bantayan ang bagong bitak, tumatagilid na puno o poste, malabong bukal at dagundong. Umalis agad sa dalisdis kapag nakita ang mga ito.',
    },
    source: { org: 'DENR-MGB', ref: 'Mines and Geosciences Bureau landslide hazard advisory' },
    reviewed: false,
  }),
  Q({
    id: 'landslide_where',
    areas: ['palayan'],
    prompt: {
      en: 'After days of heavy rain, which place is most at risk of a landslide?',
      fil: 'Pagkatapos ng ilang araw ng malakas na ulan, aling lugar ang pinakamapanganib sa landslide?',
    },
    choices: [
      { en: 'The foot of a steep slope', fil: 'Paanan ng matarik na dalisdis' },
      { en: 'A flat open field', fil: 'Patag na bukid' },
      { en: 'A sturdy evacuation center', fil: 'Matibay na evacuation center' },
    ],
    answer: 0,
    lesson: {
      en: 'Soaked soil on steep slopes can slide. Homes at the foot of hills and mountains should evacuate early during heavy rain.',
      fil: 'Puwedeng gumuho ang basang lupa sa matatarik na dalisdis. Dapat lumikas nang maaga ang mga bahay sa paanan ng burol at bundok kapag malakas ang ulan.',
    },
    source: { org: 'DENR-MGB', ref: 'Mines and Geosciences Bureau landslide hazard advisory' },
    reviewed: false,
  }),
  Q({
    id: 'eye_calm',
    areas: ['palayan'],
    prompt: { en: 'In the middle of a typhoon the wind suddenly stops. What does it mean?', fil: 'Sa gitna ng bagyo, biglang tumigil ang hangin. Ano ang ibig sabihin nito?' },
    choices: [
      { en: 'The eye is passing; winds will return', fil: 'Dumadaan ang mata; babalik ang hangin' },
      { en: 'The typhoon is over', fil: 'Tapos na ang bagyo' },
      { en: 'It is safe to go out', fil: 'Ligtas nang lumabas' },
    ],
    answer: 0,
    lesson: {
      en: 'It can be calm for a while as the eye passes. Then the winds come back, often from the other direction. Stay inside until PAGASA says it is over.',
      fil: 'Maaaring kalmado sandali habang dumadaan ang mata ng bagyo. Pagkatapos, babalik ang hangin, kadalasan mula sa kabilang direksiyon. Manatili sa loob hanggang sabihin ng PAGASA na tapos na.',
    },
    source: { org: 'PAGASA', ref: 'Tropical cyclone public information' },
    reviewed: false,
  }),
  Q({
    id: 'tc_categories',
    areas: ['palayan', 'barangay'],
    prompt: { en: "Which is the strongest category on PAGASA's tropical cyclone scale?", fil: 'Alin ang pinakamalakas na kategorya ng bagyo sa sukatan ng PAGASA?' },
    choices: [
      { en: 'Super Typhoon', fil: 'Super Typhoon' },
      { en: 'Tropical Depression', fil: 'Tropical Depression' },
      { en: 'Tropical Storm', fil: 'Tropical Storm' },
    ],
    answer: 0,
    lesson: {
      en: 'From weakest to strongest: Tropical Depression, Tropical Storm, Severe Tropical Storm, Typhoon, Super Typhoon (185 km/h or more).',
      fil: 'Mula pinakamahina hanggang pinakamalakas: Tropical Depression, Tropical Storm, Severe Tropical Storm, Typhoon, Super Typhoon (185 km/h o higit pa).',
    },
    source: { org: 'PAGASA', ref: 'Tropical cyclone intensity scale' },
    reviewed: false,
  }),
  Q({
    id: 'wind_shelter',
    areas: ['palayan'],
    prompt: { en: 'Strong winds are blowing. Which place is NOT safe to stay?', fil: 'Malakas ang hangin. Aling lugar ang HINDI ligtas na tigilan?' },
    choices: [
      { en: 'Under big trees', fil: 'Sa ilalim ng malalaking puno' },
      { en: 'Inside a sturdy building', fil: 'Sa loob ng matibay na gusali' },
      { en: 'At the evacuation center', fil: 'Sa evacuation center' },
    ],
    answer: 0,
    lesson: {
      en: 'Branches and coconuts break off in strong winds. Shelter in a sturdy building, away from trees, posts and weak structures.',
      fil: 'Nababali at nahuhulog ang sanga at niyog kapag malakas ang hangin. Sumilong sa matibay na gusali, malayo sa puno, poste at mahihinang istruktura.',
    },
    source: { org: 'NDRRMC', ref: 'Typhoon preparedness advisory' },
    reviewed: false,
  }),
  Q({
    id: 'windows',
    areas: ['palayan', 'barangay'],
    prompt: {
      en: 'Inside the house during the strongest winds, where should you stay?',
      fil: 'Sa loob ng bahay habang pinakamalakas ang hangin, saan ka dapat manatili?',
    },
    choices: [
      { en: 'Away from windows and glass', fil: 'Malayo sa bintana at salamin' },
      { en: 'Near the glass to watch', fil: 'Sa tabi ng bintana para manood' },
      { en: 'Up on the roof', fil: 'Sa bubong' },
    ],
    answer: 0,
    lesson: {
      en: 'Wind can shatter windows and throw debris through them. Stay in an inner room away from glass.',
      fil: 'Kayang basagin ng hangin ang bintana at ipasok ang debris. Manatili sa panloob na kuwarto, malayo sa salamin.',
    },
    source: { org: 'NDRRMC', ref: 'Typhoon preparedness advisory' },
    reviewed: false,
  }),
  Q({
    id: 'farm_harvest',
    areas: ['palayan'],
    prompt: {
      en: 'A typhoon is coming and the rice is almost ready. What can farmers do?',
      fil: 'May paparating na bagyo at halos handa na ang palay. Ano ang magagawa ng magsasaka?',
    },
    choices: [
      { en: 'Harvest early and store it high', fil: 'Mag-ani nang maaga at itago sa mataas' },
      { en: 'Flood the field more', fil: 'Lalong bahain ang bukid' },
      { en: 'Plant new seeds', fil: 'Magtanim ng bagong binhi' },
    ],
    answer: 0,
    lesson: {
      en: 'Farmers are advised to harvest mature crops early and store grain and seeds in a high, dry place before a typhoon.',
      fil: 'Pinapayuhan ang mga magsasaka na anihin nang maaga ang hinog na pananim at itago ang butil at binhi sa mataas at tuyong lugar bago ang bagyo.',
    },
    source: { org: 'DA', ref: 'Department of Agriculture typhoon advisory for farmers' },
    reviewed: false,
  }),
  Q({
    id: 'farm_animals',
    areas: ['palayan'],
    prompt: {
      en: 'What should you do with farm animals like carabaos before a typhoon?',
      fil: 'Ano ang dapat gawin sa mga alagang hayop tulad ng kalabaw bago ang bagyo?',
    },
    choices: [
      { en: 'Move them to safe, higher ground', fil: 'Ilipat sa ligtas at mataas na lugar' },
      { en: 'Tie them by the river', fil: 'Itali sa tabi ng ilog' },
      { en: 'Leave them in the open field', fil: 'Iwan sa gitna ng bukid' },
    ],
    answer: 0,
    lesson: {
      en: 'Animals tied in low areas can drown. Move livestock to higher, sheltered ground with food and water.',
      fil: 'Maaaring malunod ang mga hayop na nakatali sa mabababang lugar. Ilipat sila sa mataas at may silungang lugar, may pagkain at tubig.',
    },
    source: { org: 'DA', ref: 'Department of Agriculture typhoon advisory for farmers' },
    reviewed: false,
  }),

  // ---------------------------------------------------------------- Evacuation center: evacuating and after
  Q({
    id: 'forced_evac',
    areas: ['evac', 'estero'],
    prompt: { en: 'Your barangay orders everyone to evacuate. What do you do?', fil: 'Inutos ng barangay na lumikas ang lahat. Ano ang gagawin mo?' },
    choices: [
      { en: 'Leave now with your Go-Bag', fil: 'Umalis na dala ang Go-Bag' },
      { en: 'Wait until water reaches the roof', fil: 'Maghintay hanggang umabot sa bubong ang tubig' },
      { en: 'Hide so you can stay', fil: 'Magtago para makapanatili' },
    ],
    answer: 0,
    lesson: {
      en: 'Leave as soon as the order is given, while roads are still passable. Waiting makes rescue harder and more dangerous for everyone.',
      fil: 'Umalis agad pagkautos, habang madadaanan pa ang mga daan. Ang paghihintay ay nagpapahirap at nagpapadelikado sa pag-rescue para sa lahat.',
    },
    source: { org: 'NDRRMC', ref: 'Pre-emptive and forced evacuation guidance' },
    reviewed: false,
  }),
  Q({
    id: 'evac_priority',
    areas: ['evac'],
    prompt: { en: 'Who should be helped to evacuate first?', fil: 'Sino ang dapat unang tulungang lumikas?' },
    choices: [
      { en: 'Elderly, PWDs, pregnant women, kids', fil: 'Matatanda, PWD, buntis at bata' },
      { en: 'The fastest runners', fil: 'Ang pinakamabibilis tumakbo' },
      { en: 'Whoever has a car', fil: 'Ang may sasakyan' },
    ],
    answer: 0,
    lesson: {
      en: 'Older people, persons with disabilities, pregnant women and young children need more time and help. Bayanihan means helping them first.',
      fil: 'Mas kailangan ng oras at tulong ng matatanda, PWD, buntis at maliliit na bata. Ang bayanihan ay pagtulong muna sa kanila.',
    },
    source: { org: 'NDRRMC', ref: 'Evacuation guidance for vulnerable groups' },
    reviewed: false,
  }),
  Q({
    id: 'evac_register',
    areas: ['evac'],
    prompt: { en: 'You arrive at the evacuation center. What should your family do first?', fil: 'Dumating kayo sa evacuation center. Ano ang unang dapat gawin ng pamilya mo?' },
    choices: [
      { en: 'Register with the camp staff', fil: 'Magparehistro sa mga tagapamahala' },
      { en: 'Lock yourselves in a room', fil: 'Magkulong sa isang kuwarto' },
      { en: 'Go back to check the house', fil: 'Bumalik para tingnan ang bahay' },
    ],
    answer: 0,
    lesson: {
      en: 'Registering lets officials count everyone, find missing family members and hand out relief goods fairly.',
      fil: 'Sa pagpaparehistro, nabibilang ng mga opisyal ang lahat, nahahanap ang nawawalang kapamilya at patas na naipamimigay ang relief goods.',
    },
    source: { org: 'DSWD', ref: 'Camp coordination and camp management guidance' },
    reviewed: false,
  }),
  Q({
    id: 'go_home',
    areas: ['evac'],
    prompt: { en: 'When is it safe to go back home after a typhoon?', fil: 'Kailan ligtas umuwi pagkatapos ng bagyo?' },
    choices: [
      { en: "When officials say it's safe", fil: 'Kapag sinabi ng opisyal na ligtas na' },
      { en: 'As soon as the rain stops', fil: 'Pagtigil ng ulan' },
      { en: 'When the eye passes', fil: 'Pagdaan ng mata ng bagyo' },
    ],
    answer: 0,
    lesson: {
      en: 'Floods, landslides and live wires can remain after the rain. Wait for your LGU to say it is safe before going back.',
      fil: 'Maaaring may baha, landslide at live wire pa rin pagkatapos ng ulan. Hintayin ang abiso ng LGU bago umuwi.',
    },
    source: { org: 'NDRRMC', ref: 'After-typhoon safety advisory' },
    reviewed: false,
  }),
  Q({
    id: 'dengue',
    areas: ['evac', 'estero'],
    prompt: { en: 'After a flood, how can you help prevent dengue?', fil: 'Pagkatapos ng baha, paano makatutulong sa pag-iwas sa dengue?' },
    choices: [
      { en: 'Remove standing water', fil: 'Alisin ang naipong tubig' },
      { en: 'Keep water in open cans', fil: 'Mag-ipon ng tubig sa bukas na lata' },
      { en: 'Sleep outdoors', fil: 'Matulog sa labas' },
    ],
    answer: 0,
    lesson: {
      en: "Dengue mosquitoes breed in still water. DOH's 4S: Search and destroy breeding sites, Self-protection, Seek early consultation, Support fogging in outbreaks.",
      fil: 'Nangingitlog ang lamok na may dengue sa tubig na hindi gumagalaw. 4S ng DOH: Search and destroy, Self-protection, Seek early consultation, Support fogging kapag may outbreak.',
    },
    source: { org: 'DOH', ref: '4S strategy against dengue' },
    reviewed: false,
  }),
  Q({
    id: 'safe_water',
    areas: ['evac'],
    prompt: {
      en: 'After a typhoon, tap water may be dirty. How do you make it safe to drink?',
      fil: 'Pagkatapos ng bagyo, maaaring marumi ang tubig sa gripo. Paano ito gagawing ligtas inumin?',
    },
    choices: [
      { en: 'Boil it first', fil: 'Pakuluan muna' },
      { en: 'Add sugar', fil: 'Lagyan ng asukal' },
      { en: 'Chill it in the fridge', fil: 'Palamigin sa ref' },
    ],
    answer: 0,
    lesson: {
      en: 'Floods can contaminate water lines and cause diarrhea and typhoid. Boil water or drink bottled water until the supply is declared safe.',
      fil: 'Maaaring madumihan ng baha ang linya ng tubig at magdulot ng pagtatae at tipus. Pakuluan ang tubig o uminom ng bottled water hanggang ideklarang ligtas.',
    },
    source: { org: 'DOH', ref: 'Safe drinking water advisory after disasters' },
    reviewed: false,
  }),
  Q({
    id: 'school_drill',
    areas: ['evac'],
    prompt: { en: 'Why do schools hold regular disaster drills?', fil: 'Bakit regular na nagsasagawa ng disaster drill ang mga paaralan?' },
    choices: [
      { en: 'So everyone knows what to do', fil: 'Para alam ng lahat ang gagawin' },
      { en: 'To skip classes', fil: 'Para makaiwas sa klase' },
      { en: 'To test the school bell', fil: 'Para subukan ang bell' },
    ],
    answer: 0,
    lesson: {
      en: 'Practicing routes and roles helps people act faster and calmer in a real emergency. Drills are part of DepEd\'s school DRRM program.',
      fil: 'Ang pagsasanay sa ruta at tungkulin ay tumutulong para kumilos nang mas mabilis at kalmado sa totoong emergency. Bahagi ng DRRM program ng DepEd ang mga drill.',
    },
    source: { org: 'DepEd', ref: 'DepEd Order No. 37, s. 2015 (Comprehensive DRRM in Basic Education Framework)' },
    reviewed: false,
  }),
  Q({
    id: 'safe_light',
    areas: ['evac'],
    prompt: {
      en: 'The lights go out in a crowded evacuation center. Which light is safest?',
      fil: 'Nawalan ng ilaw sa siksikang evacuation center. Aling ilaw ang pinakaligtas?',
    },
    choices: [
      { en: 'A flashlight', fil: 'Flashlight' },
      { en: 'A candle', fil: 'Kandila' },
      { en: 'A kerosene lamp', fil: 'Gasera' },
    ],
    answer: 0,
    lesson: {
      en: 'Candles and kerosene lamps start fires, especially in crowded places. Use a flashlight and keep spare batteries in your Go-Bag.',
      fil: 'Nagdudulot ng sunog ang kandila at gasera, lalo na sa siksikang lugar. Gumamit ng flashlight at magtabi ng ekstrang baterya sa Go-Bag.',
    },
    source: { org: 'BFP', ref: 'Bureau of Fire Protection fire safety advisory' },
    reviewed: false,
  }),
];

const BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export function questionById(id: string): QuizQuestion {
  const q = BY_ID.get(id);
  if (!q) throw new Error(`Unknown question ${id}`);
  return q;
}
