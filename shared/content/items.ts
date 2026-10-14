export type GoBagItemId =
  | 'drinking_water'
  | 'canned_food'
  | 'flashlight'
  | 'battery_radio'
  | 'first_aid_kit'
  | 'emergency_whistle'
  | 'documents'
  | 'extra_clothes';

/** The 8 Go-Bag items. Each is placed exactly once per course; collecting all 8 earns a bonus. */
export const GO_BAG_ITEMS: readonly { id: GoBagItemId; name: { en: string; fil: string } }[] = [
  { id: 'drinking_water', name: { en: 'Drinking water', fil: 'Inuming tubig' } },
  { id: 'canned_food', name: { en: 'Canned food', fil: 'De-latang pagkain' } },
  { id: 'flashlight', name: { en: 'Flashlight', fil: 'Flashlight' } },
  { id: 'battery_radio', name: { en: 'Battery-powered radio', fil: 'De-bateryang radyo' } },
  { id: 'first_aid_kit', name: { en: 'First aid kit', fil: 'First aid kit' } },
  { id: 'emergency_whistle', name: { en: 'Emergency whistle', fil: 'Pito' } },
  { id: 'documents', name: { en: 'Important documents in a plastic bag', fil: 'Mahahalagang dokumento sa plastik' } },
  { id: 'extra_clothes', name: { en: 'Extra clothes', fil: 'Ekstrang damit' } },
];

export type PowerUpType = 'life_vest' | 'tanod_whistle' | 'bayanihan';

export const POWER_UPS: Record<PowerUpType, { name: { en: string; fil: string }; effect: string }> = {
  life_vest: { name: { en: 'Life vest', fil: 'Life vest' }, effect: 'Absorbs one hit without losing a heart' },
  tanod_whistle: { name: { en: 'Tanod whistle', fil: 'Pito ng tanod' }, effect: 'Pulls in nearby supplies' },
  bayanihan: { name: { en: 'Bayanihan', fil: 'Bayanihan' }, effect: 'Fills the Bayanihan meter by half' },
};

export const SUPPLY_NAME = { en: 'Supplies', fil: 'Suplay' };
