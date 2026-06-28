/**
 * Rotating placeholder prompts for the empty composer.
 *
 * Suggestions are split per `composer mode` (`chats` vs `coding`) so the
 * empty-state prompts feel appropriate for the workspace the user is in.
 * Each locale has its own ordered list; consumers should fall back to `en`
 * when the active locale has no entry. The lists are intentionally long
 * (16+) so the rotation feels curated and the user doesn't see the same
 * suggestion twice in a short session.
 */

export type SuggestionLocale = 'ru' | 'en';

export type SuggestionMode = 'chats' | 'coding';

const SUGGESTIONS_CHATS_RU: readonly string[] = [
  'Расскажи короткую историю на ночь',
  'Подкинь идею подарка для друга на день рождения',
  'Помоги составить поздравление с Новым годом',
  'Объясни ребёнку, почему небо голубое',
  'Составь план идеальных выходных в Питере',
  'Помоги придумать смешную шутку для тоста',
  'Что подарить коллеге на профессиональный праздник',
  'Помоги написать короткое сопроводительное письмо',
  'Набросай сценарий короткометражки',
  'Сгенерируй 5 идей для пятничного свидания',
  'Придумай название для домашнего питомца',
  'Помоги составить список дел на неделю',
  'Расскажи интересный факт о космосе',
  'Составь план романтического ужина на двоих',
  'Помоги сформулировать тост на свадьбу друга',
  'Набросай план путешествия по Золотому кольцу',
];

const SUGGESTIONS_CHATS_EN: readonly string[] = [
  'Tell me a short bedtime story',
  'Suggest a birthday gift idea for a friend',
  'Help me write a New Year greeting',
  'Explain to a child why the sky is blue',
  'Plan a perfect weekend in Lisbon',
  'Help me come up with a funny toast joke',
  'Pick a gift for a colleague on a professional holiday',
  'Help me write a short cover letter',
  'Sketch a short film script',
  'Generate 5 ideas for a Friday date night',
  'Invent a name for a new pet',
  'Compose a weekly to-do list',
  'Tell me an interesting fact about space',
  'Plan a romantic dinner for two',
  'Help me craft a wedding toast for a friend',
  'Sketch a travel plan for the Amalfi Coast',
];

const SUGGESTIONS_CODING_RU: readonly string[] = [
  'Напиши unit-тесты для этого класса',
  'Сделай рефакторинг этой функции',
  'Что означает этот stack trace?',
  'Сравни плюсы и минусы PostgreSQL и SQLite',
  'Набросай структуру README для проекта',
  'Составь план изучения Rust за месяц',
  'Помоги написать миграцию для схемы базы данных',
  'Объясни разницу между async/await и Promises',
  'Предложи улучшения для этого REST API',
  'Помоги настроить CI/CD pipeline',
  'Напиши Dockerfile для этого приложения',
  'Объясни, как работает garbage collector в C#',
  'Подкинь идею для пет-проекта на выходные',
  'Помоги отладить эту рекурсивную функцию',
  'Перепиши этот код с использованием LINQ',
  'Сгенерируй mock-данные для тестов',
];

const SUGGESTIONS_CODING_EN: readonly string[] = [
  'Write unit tests for this class',
  'Refactor this function to be more idiomatic',
  'What does this stack trace mean?',
  'Compare PostgreSQL and SQLite tradeoffs',
  'Sketch a README outline for a new project',
  'Plan a one-month Rust learning roadmap',
  'Help me write a migration for this schema',
  'Explain the difference between async/await and Promises',
  'Suggest improvements for this REST API',
  'Help me set up a CI/CD pipeline',
  'Write a Dockerfile for this application',
  'Explain how the garbage collector works in C#',
  'Pitch a weekend pet project idea',
  'Help me debug this recursive function',
  'Rewrite this code with LINQ',
  'Generate mock data for tests',
];

const SUGGESTIONS_BY_LOCALE_AND_MODE: Record<SuggestionLocale, Record<SuggestionMode, readonly string[]>> = {
  ru: {
    chats: SUGGESTIONS_CHATS_RU,
    coding: SUGGESTIONS_CODING_RU,
  },
  en: {
    chats: SUGGESTIONS_CHATS_EN,
    coding: SUGGESTIONS_CODING_EN,
  },
};

/**
 * Resolves the suggestion list for the given locale and composer mode.
 * Falls back to English for any locale that does not have a curated list
 * (ja, ko, zh, pt, etc.) and to `coding` if the mode is unknown.
 */
export function getSuggestions(
  locale: string | null | undefined,
  mode: SuggestionMode | string | null | undefined,
): readonly string[] {
  const normalizedLocale = (locale ?? '').toLowerCase().split(/[-_]/)[0] as SuggestionLocale;
  const localeMap = SUGGESTIONS_BY_LOCALE_AND_MODE[normalizedLocale] ?? SUGGESTIONS_BY_LOCALE_AND_MODE.en;
  return localeMap[(mode as SuggestionMode) ?? 'coding'] ?? localeMap.coding;
}

/** How long each suggestion is shown before fading to the next. */
export const SUGGESTION_ROTATION_MS = 8000;