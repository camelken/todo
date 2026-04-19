'use strict';

// ── State ─────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'todo-app-tasks';

let tasks = load();
let currentFilter = 'all';

// ── Persistence ───────────────────────────────────────────────────────────────

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

// ── DOM refs ──────────────────────────────────────────────────────────────────

const form          = document.getElementById('add-form');
const input         = document.getElementById('new-task-input');
const prioritySelect = document.getElementById('priority-select');
const taskList      = document.getElementById('task-list');
const emptyState    = document.getElementById('empty-state');
const statsText     = document.getElementById('stats-text');
const footer        = document.getElementById('footer');
const clearBtn      = document.getElementById('clear-completed');
const filterBtns    = document.querySelectorAll('.filter-btn');

// ── Core Actions ──────────────────────────────────────────────────────────────

function addTask(text, priority) {
  tasks.unshift({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2),
    text,
    priority,
    completed: false,
    createdAt: Date.now(),
  });
  save();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    save();
    render();
  }
}

function deleteTask(id) {
  const item = document.querySelector(`[data-id="${id}"]`);
  if (item) {
    item.style.transition = 'opacity 0.15s, transform 0.15s';
    item.style.opacity = '0';
    item.style.transform = 'translateX(20px)';
    setTimeout(() => {
      tasks = tasks.filter(t => t.id !== id);
      save();
      render();
    }, 150);
  }
}

function updateTaskText(id, newText) {
  const task = tasks.find(t => t.id === id);
  if (task && newText.trim()) {
    task.text = newText.trim();
    save();
    render();
  }
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.completed);
  save();
  render();
}

// ── Filter ────────────────────────────────────────────────────────────────────

function filteredTasks() {
  if (currentFilter === 'active')    return tasks.filter(t => !t.completed);
  if (currentFilter === 'completed') return tasks.filter(t =>  t.completed);
  return tasks;
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
  const visible = filteredTasks();
  const activeCnt = tasks.filter(t => !t.completed).length;
  const completedCnt = tasks.filter(t => t.completed).length;

  // Stats
  statsText.textContent = activeCnt === 0 ? 'すべて完了!' : `${activeCnt}件残り`;

  // Footer
  footer.style.display = completedCnt > 0 ? 'flex' : 'none';

  // Clear existing items (keep empty-state sentinel)
  Array.from(taskList.children).forEach(child => {
    if (child !== emptyState) child.remove();
  });

  if (visible.length === 0) {
    emptyState.style.display = '';
    const msgs = {
      all: 'タスクがありません',
      active: '未完了のタスクがありません',
      completed: '完了済みのタスクがありません',
    };
    emptyState.textContent = msgs[currentFilter];
    return;
  }

  emptyState.style.display = 'none';

  visible.forEach(task => {
    taskList.appendChild(createTaskEl(task));
  });
}

function createTaskEl(task) {
  const li = document.createElement('li');
  li.className = 'task-item' + (task.completed ? ' completed' : '');
  li.dataset.id = task.id;

  // Priority dot
  const dot = document.createElement('span');
  dot.className = `priority-dot ${task.priority}`;
  dot.title = { high: '優先度: 高', normal: '優先度: 普通', low: '優先度: 低' }[task.priority];

  // Checkbox circle
  const checkbox = document.createElement('div');
  checkbox.className = 'task-checkbox';
  checkbox.setAttribute('role', 'checkbox');
  checkbox.setAttribute('aria-checked', String(task.completed));
  checkbox.setAttribute('tabindex', '0');
  checkbox.innerHTML = `<svg width="11" height="9" viewBox="0 0 11 9" fill="none">
    <path d="M1 4L4 7.5L10 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  // Text
  const textSpan = document.createElement('span');
  textSpan.className = 'task-text';
  textSpan.textContent = task.text;
  textSpan.title = 'ダブルクリックで編集';

  // Delete button
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'task-delete';
  deleteBtn.setAttribute('aria-label', '削除');
  deleteBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M6 4V2h4v2M6.5 7v5M9.5 7v5M3 4l1 9h8l1-9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

  // ── Events ──
  const handleToggle = () => toggleTask(task.id);

  checkbox.addEventListener('click', handleToggle);
  checkbox.addEventListener('keydown', e => {
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); handleToggle(); }
  });

  textSpan.addEventListener('dblclick', () => startEdit(li, task, textSpan));

  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  li.append(dot, checkbox, textSpan, deleteBtn);
  return li;
}

// ── Inline Edit ───────────────────────────────────────────────────────────────

function startEdit(li, task, textSpan) {
  if (li.querySelector('.task-edit-input')) return; // already editing

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.className = 'task-edit-input';
  editInput.value = task.text;
  editInput.maxLength = 200;

  textSpan.replaceWith(editInput);
  editInput.focus();
  editInput.select();

  const commit = () => {
    const val = editInput.value.trim();
    if (val && val !== task.text) {
      updateTaskText(task.id, val);
    } else {
      // Restore without re-render
      editInput.replaceWith(textSpan);
    }
  };

  editInput.addEventListener('blur', commit);
  editInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); editInput.blur(); }
    if (e.key === 'Escape') {
      editInput.value = task.text; // discard
      editInput.removeEventListener('blur', commit);
      editInput.replaceWith(textSpan);
    }
  });
}

// ── Event Listeners ───────────────────────────────────────────────────────────

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) { input.focus(); return; }
  addTask(text, prioritySelect.value);
  input.value = '';
  prioritySelect.value = 'normal';
  input.focus();
});

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterBtns.forEach(b => b.classList.toggle('active', b === btn));
    render();
  });
});

clearBtn.addEventListener('click', clearCompleted);

// Keyboard shortcut: '/' focuses the input from anywhere
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────

render();
