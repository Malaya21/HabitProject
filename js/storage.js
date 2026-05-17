/**
 * storage.js — LocalStorage persistence, defaults, import/export
 */
const Storage = (() => {
  const KEY = 'reflectflow_data';
  const VERSION = 1;
  const DATA_EPOCH = 2; /* bump to reset sample data → fresh start */

  const DEFAULT_REMINDERS = [
    { id: 'rem-dsa', label: 'DSA Study', time: '18:00', message: 'Time to learn DSA — consistency beats talent!', enabled: true, habitMatch: 'Learn DSA' },
    { id: 'rem-sleep', label: 'Sleep Reminder', time: '22:45', message: 'Wind down — aim to sleep before 11:30 PM.', enabled: true, habitMatch: 'Sleep before 11:30 PM' },
    { id: 'rem-read', label: 'Reading', time: '21:00', message: '15 minutes of reading compounds into wisdom.', enabled: true, habitMatch: 'Read 15 min or 4 pages' },
    { id: 'rem-gym', label: 'Gym', time: '07:00', message: 'Gym day — show up even when motivation is low.', enabled: true, habitMatch: 'Gym Monday to Saturday' }
  ];

  const QUOTES = [
    { text: 'Discipline is choosing between what you want now and what you want most.', author: 'Abraham Lincoln' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
    { text: 'Motivation is what gets you started. Habit is what keeps you going.', author: 'Jim Ryun' },
    { text: 'Small daily improvements are the key to staggering long-term results.', author: 'Robin Sharma' },
    { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
    { text: 'The secret of your future is hidden in your daily routine.', author: 'Mike Murdock' },
    { text: 'You do not rise to the level of your goals. You fall to the level of your systems.', author: 'James Clear' }
  ];

  function uid() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /** Local calendar date (YYYY-MM-DD) — resets at midnight in your timezone */
  function dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function msUntilMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight - now;
  }

  function csvCell(value) {
    return `"${String(value ?? '').replace(/"/g, '""')}"`;
  }

  function createDefaultHabits() {
    const defs = [
      { title: 'Read 15 min or 4 pages', description: 'Daily reading habit', category: 'Learning', target: '15 min or 4 pages', frequency: 'daily', customDays: [0, 1, 2, 3, 4, 5, 6] },
      { title: 'Gym Monday to Saturday', description: 'Strength & cardio', category: 'Fitness', target: '45–60 min session', frequency: 'custom', customDays: [1, 2, 3, 4, 5, 6] },
      { title: 'Wake before 8 AM', description: 'Early start', category: 'Lifestyle', target: 'Before 8:00 AM', frequency: 'daily', customDays: [0, 1, 2, 3, 4, 5, 6] },
      { title: 'Sleep before 11:30 PM', description: 'Recovery & rest', category: 'Health', target: 'By 11:30 PM', frequency: 'daily', customDays: [0, 1, 2, 3, 4, 5, 6] },
      { title: 'Learn DSA', description: 'Data structures & algorithms', category: 'Learning', target: '45 min study', frequency: 'daily', customDays: [0, 1, 2, 3, 4, 5, 6] },
      { title: 'Solve LeetCode problem', description: 'One problem minimum', category: 'Career', target: '1 problem', frequency: 'daily', customDays: [0, 1, 2, 3, 4, 5, 6] },
      { title: 'Eat properly', description: 'Balanced meals, no junk binge', category: 'Health', target: '3 healthy meals', frequency: 'daily', customDays: [0, 1, 2, 3, 4, 5, 6] },
      { title: 'Be punctual at office', description: 'On time, prepared', category: 'Career', target: 'Arrive on time', frequency: 'custom', customDays: [1, 2, 3, 4, 5] }
    ];

    const now = new Date().toISOString();
    return defs.map((d, i) => ({
      id: uid(),
      title: d.title,
      description: d.description,
      category: d.category,
      target: d.target,
      frequency: d.frequency,
      customDays: d.customDays,
      createdAt: now,
      order: i,
      history: {},
      habitNotes: {},
      streak: { current: 0, longest: 0 },
      consistency: 0
    }));
  }

  /** Clean slate — habits kept, all progress & notes cleared */
  function freshStartState(preserveSettings = null) {
    return {
      version: VERSION,
      dataEpoch: DATA_EPOCH,
      habits: createDefaultHabits(),
      notes: [],
      settings: preserveSettings || {
        theme: 'dark',
        layout: 'default',
        notifications: false,
        reminders: DEFAULT_REMINDERS.map((r) => ({ ...r })),
        onboarded: true
      },
      achievements: [],
      quoteIndex: Math.floor(Math.random() * QUOTES.length),
      activeDate: todayKey(),
      lastVisit: todayKey(),
      dailySummaries: {}
    };
  }

  function defaultState() {
    const state = freshStartState();
    state.settings.onboarded = false;
    return state;
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultState();
      let data = JSON.parse(raw);
      if (!data.version) data.version = VERSION;

      /* One-time migration: clear sample history & notes — start fresh from today */
      if ((data.dataEpoch || 1) < DATA_EPOCH) {
        const preserved = data.settings ? { ...data.settings, onboarded: true } : null;
        data = freshStartState(preserved);
        save(data);
        localStorage.setItem('reflectflow_show_fresh_toast', '1');
        return data;
      }

      if (!data.habits) data.habits = [];
      if (!data.notes) data.notes = [];
      if (!data.dailySummaries) data.dailySummaries = {};
      if (!data.settings) data.settings = defaultState().settings;
      if (typeof Daily !== 'undefined') {
        Daily.processDayChange(data);
      } else {
        data.activeDate = todayKey();
        data.habits.forEach((h) => Streak.recalculate(h));
      }
      return data;
    } catch (e) {
      console.warn('Storage load failed, resetting', e);
      return defaultState();
    }
  }

  function save(data) {
    data.lastVisit = todayKey();
    if (!data.activeDate) data.activeDate = todayKey();
    localStorage.setItem(KEY, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('reflectflow:save', { detail: data }));
  }

  function reset() {
    const fresh = freshStartState();
    save(fresh);
    return fresh;
  }

  function getJournalForDate(data, dateKey) {
    return (data.notes || []).find((n) => n.date === dateKey) || null;
  }

  /** Daily sheet CSV: habits + habit notes + journal for one date */
  function exportDaySheetCSV(data, dateKey = todayKey()) {
    const d = new Date(dateKey + 'T12:00:00');
    const journal = getJournalForDate(data, dateKey);
    const lines = [];

    lines.push(csvCell(`Daily Sheet — ${dateKey}`));
    lines.push('');
    lines.push(['Habit', 'Category', 'Status', 'Target', 'Habit Note'].map(csvCell).join(','));
    data.habits.forEach((h) => {
      if (!Streak.isScheduledDay(h, d)) return;
      const status = Streak.getStatus(h, dateKey) || 'pending';
      const habitNote = (h.habitNotes || {})[dateKey] || '';
      lines.push(
        [h.title, h.category, status, h.target || '', habitNote].map(csvCell).join(',')
      );
    });
    lines.push('');
    lines.push(['Journal Date', 'Mood', 'Reflection'].map(csvCell).join(','));
    if (journal) {
      lines.push([journal.date, journal.mood, journal.content].map(csvCell).join(','));
    } else {
      lines.push([dateKey, '', 'No journal entry for this day'].map(csvCell).join(','));
    }
    return lines.join('\n');
  }

  function exportDaySheetJSON(data, dateKey = todayKey()) {
    const d = new Date(dateKey + 'T12:00:00');
    const habits = data.habits
      .filter((h) => Streak.isScheduledDay(h, d))
      .map((h) => ({
        title: h.title,
        category: h.category,
        target: h.target,
        status: Streak.getStatus(h, dateKey) || 'pending',
        habitNote: (h.habitNotes || {})[dateKey] || ''
      }));
    return JSON.stringify(
      {
        date: dateKey,
        exportedAt: new Date().toISOString(),
        habits,
        journal: getJournalForDate(data, dateKey)
      },
      null,
      2
    );
  }

  function exportJSON(data) {
    return JSON.stringify(data, null, 2);
  }

  function exportCSV(data) {
    const rows = [
      ['date', 'habit_title', 'category', 'status', 'target', 'habit_note', 'journal_mood', 'journal_reflection']
    ];
    const dates = new Set();
    data.habits.forEach((h) => Object.keys(h.history || {}).forEach((d) => dates.add(d)));
    (data.notes || []).forEach((n) => dates.add(n.date));
    dates.add(todayKey());

    [...dates].sort().forEach((date) => {
      const journal = getJournalForDate(data, date);
      const d = new Date(date + 'T12:00:00');
      const scheduled = data.habits.filter((h) => Streak.isScheduledDay(h, d));
      if (!scheduled.length) {
        if (journal) {
          rows.push([date, '', '', '', '', '', journal.mood, journal.content.replace(/\n/g, ' ')]);
        }
        return;
      }
      scheduled.forEach((h, i) => {
        const status = Streak.getStatus(h, date) || '';
        const habitNote = (h.habitNotes || {})[date] || '';
        rows.push([
          date,
          h.title,
          h.category,
          status,
          h.target || '',
          habitNote,
          i === 0 && journal ? journal.mood : '',
          i === 0 && journal ? journal.content.replace(/\n/g, ' ') : ''
        ]);
      });
    });
    return rows.map((r) => r.map(csvCell).join(',')).join('\n');
  }

  function importJSON(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    if (!parsed.habits) throw new Error('Invalid backup file');
    if (typeof Daily !== 'undefined') Daily.processDayChange(parsed);
    else parsed.habits.forEach((h) => Streak.recalculate(h));
    save(parsed);
    return parsed;
  }

  function getQuote(index) {
    return QUOTES[index % QUOTES.length];
  }

  return {
    KEY,
    DATA_EPOCH,
    uid,
    todayKey,
    dateKey,
    msUntilMidnight,
    load,
    save,
    reset,
    freshStartState,
    exportJSON,
    exportCSV,
    exportDaySheetCSV,
    exportDaySheetJSON,
    getJournalForDate,
    importJSON,
    getQuote,
    QUOTES,
    DEFAULT_REMINDERS
  };
})();
