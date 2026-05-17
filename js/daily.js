/**
 * daily.js — Midnight rollover, daily summaries, fresh “today” state
 */
const Daily = (() => {
  let midnightTimer = null;
  let pollTimer = null;
  let onDayChange = null;

  function buildDaySummary(data, dateKey) {
    const d = new Date(dateKey + 'T12:00:00');
    let scheduled = 0;
    let completed = 0;
    let missed = 0;
    const habits = [];

    (data.habits || []).forEach((h) => {
      if (!Streak.isScheduledDay(h, d)) return;
      scheduled++;
      const status = Streak.getStatus(h, dateKey) || 'pending';
      if (status === 'completed') completed++;
      else if (status === 'missed') missed++;
      habits.push({ id: h.id, title: h.title, status });
    });

    return {
      date: dateKey,
      scheduled,
      completed,
      missed,
      pending: Math.max(0, scheduled - completed - missed),
      score: scheduled ? Math.round((completed / scheduled) * 100) : 0,
      habits,
      archivedAt: new Date().toISOString()
    };
  }

  /** Archive yesterday & refresh streaks — history by date is never deleted */
  function processDayChange(data) {
    const today = Storage.todayKey();
    const lastActive = data.activeDate || data.lastVisit || null;

    data.activeDate = today;
    data.lastVisit = today;

    if (!lastActive || lastActive === today) {
      data.habits.forEach((h) => Streak.recalculate(h));
      return { changed: false, today, previous: lastActive };
    }

    if (!data.dailySummaries) data.dailySummaries = {};

    if (lastActive) {
      data.dailySummaries[lastActive] = buildDaySummary(data, lastActive);
    }

    data.habits.forEach((h) => {
      Streak.recalculate(h);
    });

    return { changed: true, today, previous: lastActive, summary: data.dailySummaries[lastActive] };
  }

  function getTodayStatus(habit) {
    return Streak.getStatus(habit, Storage.todayKey()) || null;
  }

  function scheduleMidnight(callback) {
    if (midnightTimer) clearTimeout(midnightTimer);
    const ms = Storage.msUntilMidnight() + 1500;
    midnightTimer = setTimeout(() => {
      callback();
      scheduleMidnight(callback);
    }, ms);
  }

  function startWatch(callback) {
    onDayChange = callback;
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => callback(false), 30000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') callback(false);
    });
    scheduleMidnight(() => callback(true));
  }

  function stopWatch() {
    if (midnightTimer) clearTimeout(midnightTimer);
    if (pollTimer) clearInterval(pollTimer);
    midnightTimer = null;
    pollTimer = null;
  }

  function checkAndApply(data, showToast = false) {
    const result = processDayChange(data);
    if (result.changed) {
      Storage.save(data);
      if (showToast && typeof UI !== 'undefined') {
        UI.toast('New day — habits refreshed for today!', 'info', 4500);
      }
      if (onDayChange) onDayChange(data, result);
    }
    return result;
  }

  return {
    processDayChange,
    buildDaySummary,
    getTodayStatus,
    checkAndApply,
    startWatch,
    stopWatch
  };
})();
