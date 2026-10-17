/**
 * Names for the daily storm. Fictional Filipino words, chosen so none is a real PAGASA name
 * of a past destructive typhoon. The title reads "Typhoon X" / "Bagyong X".
 */
export const STORM_NAMES = [
  'Bayani',
  'Dalisay',
  'Hiraya',
  'Kalinaw',
  'Lakan',
  'Lualhati',
  'Makisig',
  'Malaya',
  'Marilag',
  'Mayumi',
  'Payapa',
  'Silakbo',
  'Tanglaw',
  'Tinig',
] as const;

export const stormTitle = (name: string) => ({ en: `Typhoon ${name}`, fil: `Bagyong ${name}` });
