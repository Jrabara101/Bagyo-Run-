import { describe, expect, it } from 'vitest';
import { UI } from '../shared/content/i18n';
import { HAZARDS } from '../shared/content/hazards';
import { GO_BAG_ITEMS, POWER_UPS } from '../shared/content/items';
import { AREAS } from '../shared/content/areas';

describe('player-facing text', () => {
  it('every UI string exists in English and Filipino', () => {
    for (const [key, text] of Object.entries(UI)) {
      expect(text.en.trim(), key).not.toBe('');
      expect(text.fil.trim(), key).not.toBe('');
    }
  });

  it('every hazard, item and area name exists in both languages', () => {
    const names = [
      ...Object.values(HAZARDS).map((h) => h.name),
      ...GO_BAG_ITEMS.map((i) => i.name),
      ...Object.values(POWER_UPS).map((p) => p.name),
      ...AREAS.map((a) => a.name),
    ];
    for (const name of names) {
      expect(name.en.trim()).not.toBe('');
      expect(name.fil.trim()).not.toBe('');
    }
  });
});
