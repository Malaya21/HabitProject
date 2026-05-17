/**
 * notifications.js — Browser Notification API & scheduled reminders
 */
const Notifications = (() => {
  let checkInterval = null;

  function isSupported() {
    return 'Notification' in window;
  }

  function getPermission() {
    return isSupported() ? Notification.permission : 'denied';
  }

  async function requestPermission() {
    if (!isSupported()) return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    return result;
  }

  function show(title, options = {}) {
    if (!isSupported() || Notification.permission !== 'granted') return null;
    const n = new Notification(title, {
      icon: 'assets/icons/favicon.svg',
      badge: 'assets/icons/favicon.svg',
      ...options
    });
    n.onclick = () => {
      window.focus();
      n.close();
    };
    return n;
  }

  function parseTime(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return { h, m };
  }

  function shouldFire(reminder, now = new Date()) {
    if (!reminder.enabled) return false;
    const { h, m } = parseTime(reminder.time);
    return now.getHours() === h && now.getMinutes() === m;
  }

  function checkReminders(data) {
    if (!data.settings.notifications) return;
    if (getPermission() !== 'granted') return;

    const now = new Date();
    const firedKey = `reflectflow_fired_${Storage.todayKey()}`;
    let fired = {};
    try {
      fired = JSON.parse(sessionStorage.getItem(firedKey) || '{}');
    } catch (_) {}

    (data.settings.reminders || []).forEach((rem) => {
      if (!shouldFire(rem, now)) return;
      const slot = `${rem.id}_${now.getHours()}:${now.getMinutes()}`;
      if (fired[slot]) return;
      fired[slot] = true;
      show(rem.label, { body: rem.message, tag: rem.id });
    });

    sessionStorage.setItem(firedKey, JSON.stringify(fired));
  }

  function startScheduler(data) {
    stopScheduler();
    checkReminders(data);
    checkInterval = setInterval(() => checkReminders(data), 60000);
  }

  function stopScheduler() {
    if (checkInterval) clearInterval(checkInterval);
    checkInterval = null;
  }

  function renderReminderSettings(container, data, onChange) {
    if (!container) return;
    container.innerHTML = (data.settings.reminders || [])
      .map(
        (r) => `
      <label class="reminder-row">
        <input type="checkbox" data-rem-id="${r.id}" ${r.enabled ? 'checked' : ''} class="rem-enable">
        <span class="reminder-label">${Habits.escapeHtml(r.label)}</span>
        <input type="time" data-rem-id="${r.id}" value="${r.time}" class="rem-time" title="${Habits.escapeHtml(r.message)}">
      </label>`
      )
      .join('');

    container.querySelectorAll('.rem-enable').forEach((el) => {
      el.addEventListener('change', () => {
        const rem = data.settings.reminders.find((x) => x.id === el.dataset.remId);
        if (rem) rem.enabled = el.checked;
        onChange();
      });
    });
    container.querySelectorAll('.rem-time').forEach((el) => {
      el.addEventListener('change', () => {
        const rem = data.settings.reminders.find((x) => x.id === el.dataset.remId);
        if (rem) rem.time = el.value;
        onChange();
      });
    });
  }

  const MOTIVATIONAL = [
    'You are one habit away from a better version of yourself.',
    'Consistency compounds. Show up today.',
    'Your future self will thank you for not skipping today.',
    'Discipline beats motivation every single time.'
  ];

  function randomMotivation() {
    return MOTIVATIONAL[Math.floor(Math.random() * MOTIVATIONAL.length)];
  }

  return {
    isSupported,
    getPermission,
    requestPermission,
    show,
    startScheduler,
    stopScheduler,
    renderReminderSettings,
    randomMotivation,
    checkReminders
  };
})();
