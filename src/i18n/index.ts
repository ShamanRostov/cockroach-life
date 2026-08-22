import type { Locale, LocalePack, I18nParams, LocaleChangeListener } from './types';
import type { MapPlayer } from '../game/types';
import { ru } from './locales/ru';
import { en } from './locales/en';
import type { RoomType } from '../game/systems/BuildingSystem';

const LOCALE_KEY = 'cockroach-life-locale';

const packs: Record<Locale, LocalePack> = { ru, en };

export const SUPPORTED_LOCALES: Locale[] = ['ru', 'en'];

class I18nManager {
  private locale: Locale = 'ru';
  private listeners: LocaleChangeListener[] = [];

  init(): void {
    const saved = localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (saved && packs[saved]) {
      this.locale = saved;
    } else {
      const browserLang = navigator.language.slice(0, 2);
      this.locale = browserLang === 'ru' ? 'ru' : 'en';
    }
    this.applyDocumentLang();
  }

  getLocale(): Locale {
    return this.locale;
  }

  getPack(): LocalePack {
    return packs[this.locale];
  }

  setLocale(locale: Locale): void {
    if (!packs[locale] || this.locale === locale) return;
    this.locale = locale;
    localStorage.setItem(LOCALE_KEY, locale);
    this.applyDocumentLang();
    this.listeners.forEach((fn) => fn(locale));
  }

  toggleLocale(): void {
    this.setLocale(this.locale === 'ru' ? 'en' : 'ru');
  }

  onChange(listener: LocaleChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /** Replace {key} placeholders in a string. */
  format(template: string, params?: I18nParams): string {
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, key: string) =>
      params[key] !== undefined ? String(params[key]) : `{${key}}`,
    );
  }

  roomName(type: RoomType): string {
    return packs[this.locale].rooms[type].name;
  }

  roomDesc(type: RoomType): string {
    return packs[this.locale].rooms[type].desc;
  }

  roomBenefit(type: RoomType): string {
    return packs[this.locale].rooms[type].benefit;
  }

  buildError(key: keyof LocalePack['building']['errors']): string {
    return packs[this.locale].building.errors[key];
  }

  private applyDocumentLang(): void {
    document.documentElement.lang = this.locale;
    document.title = packs[this.locale].game.title;
  }
}

export const i18n = new I18nManager();

/** Shorthand for current locale pack. */
export function L(): LocalePack {
  return i18n.getPack();
}

export function fmt(template: string, params?: I18nParams): string {
  return i18n.format(template, params);
}

/** Localized display name for a map player (player or bot). */
export function mapPlayerName(player: Pick<MapPlayer, 'id' | 'districtId'>): string {
  const world = L().world;
  if (player.id === 'player') return world.you;
  const key = player.districtId as keyof LocalePack['world']['bots'];
  return world.bots[key] ?? player.districtId;
}

/** Generate a random cockroach name for the current locale. */
export function generateCockroachName(): string {
  const names = L().breeding.names;
  const base = names[Math.floor(Math.random() * names.length)]!;
  const suffix = Math.floor(Math.random() * 90) + 10;
  return `${base}-${suffix}`;
}
