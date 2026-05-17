/**
 * notes.js — Journal entries, mood tracking, search
 */
const Notes = (() => {
  const MOOD_EMOJI = { great: '😄', good: '🙂', neutral: '😐', low: '😔', bad: '😢' };

  function getAll(data) {
    return [...(data.notes || [])].sort((a, b) => b.date.localeCompare(a.date));
  }

  function getById(data, id) {
    return data.notes.find((n) => n.id === id);
  }

  function add(data, payload) {
    const note = {
      id: Storage.uid(),
      date: payload.date,
      mood: payload.mood || 'neutral',
      content: payload.content,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.notes.push(note);
    return note;
  }

  function update(data, id, payload) {
    const n = getById(data, id);
    if (!n) return null;
    n.date = payload.date;
    n.mood = payload.mood;
    n.content = payload.content;
    n.updatedAt = new Date().toISOString();
    return n;
  }

  function remove(data, id) {
    data.notes = data.notes.filter((n) => n.id !== id);
  }

  function filter(notes, { search = '', date = '' } = {}) {
    let list = [...notes];
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((n) => n.content.toLowerCase().includes(q) || n.date.includes(q));
    if (date) list = list.filter((n) => n.date === date);
    return list;
  }

  function renderCard(note) {
    return `
      <article class="note-card glass" data-id="${note.id}">
        <header class="note-card__header">
          <span class="note-mood">${MOOD_EMOJI[note.mood] || '😐'} ${note.mood}</span>
          <time>${formatDate(note.date)}</time>
        </header>
        <p class="note-content">${Habits.escapeHtml(note.content)}</p>
        <footer class="note-card__footer">
          <button type="button" class="btn btn--ghost btn-sm" data-action="edit-note" data-id="${note.id}">Edit</button>
          <button type="button" class="btn btn--ghost btn-sm danger" data-action="delete-note" data-id="${note.id}">Delete</button>
        </footer>
      </article>`;
  }

  function formatDate(key) {
    const d = new Date(key + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
  }

  return { getAll, getById, add, update, remove, filter, renderCard, MOOD_EMOJI };
})();
