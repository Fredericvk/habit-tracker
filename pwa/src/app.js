import { seedDefaults } from './seeder.js';
import * as dayView from './screens/dayView.js';
import * as weekView from './screens/weekView.js';
import * as monthView from './screens/monthView.js';
import * as logScreen from './screens/logScreen.js';
import * as goalsScreen from './screens/goalsScreen.js';
import db from './db.js';

// Current state
let currentTab = 'overview';
let overviewSeg = 'week';

async function boot() {
  setupTabs();
  setupSegmentedControls();
  setupSettings();
  setupDayNavigation();
  setupHaptics();

  // Wait for DB to be open and ready
  await db.open();

  // Seed defaults only after DB is ready
  await seedDefaults();

  // Re-render active view whenever Dexie Cloud finishes syncing
  db.cloud.events.syncComplete.subscribe(() => {
    console.log('[sync] syncComplete fired — re-rendering');
    renderCurrentTab();
  });

  // Also re-render when sync reaches "in-sync" phase (catches initial pull)
  db.cloud.syncState.subscribe(state => {
    console.log('[sync] syncState:', state?.phase);
    if (state?.phase === 'in-sync') {
      renderCurrentTab();
    }
  });

  // Render default view (local data first)
  renderOverview();

  // Force a pull from cloud so we always show latest data on refresh
  try {
    await db.cloud.sync({ purpose: 'pull', wait: true });
    console.log('[sync] forced pull complete');
  } catch (e) {
    console.warn('[sync] forced pull failed:', e);
    // Fallback: trigger a manual sync via the internal mechanism
    try {
      await db.syncStateChangedEvent?.next?.({ phase: 'pulling' });
    } catch (_) {}
  }
}

// ===== TAB NAVIGATION =====
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
}

function switchTab(tab) {
  currentTab = tab;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));

  // Update screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const screen = document.getElementById(`screen-${tab}`);
  if (screen) screen.classList.add('active');

  // Render content
  if (tab === 'overview') renderOverview();
  else if (tab === 'log') renderLog();
  else if (tab === 'goals') renderGoals();
}

// ===== SEGMENTED CONTROLS =====
function setupSegmentedControls() {
  const overviewSC = document.getElementById('overview-seg');
  if (overviewSC) {
    overviewSC.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overviewSeg = btn.dataset.seg;
        overviewSC.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.seg === overviewSeg));
        renderOverview();
      });
    });
  }
}

// ===== SETTINGS =====
function setupSettings() {
  const overlay = document.getElementById('settings-overlay');
  const openBtn = document.getElementById('btn-settings');
  const closeBtn = document.getElementById('btn-close-settings');

  if (openBtn) openBtn.addEventListener('click', () => overlay.classList.add('open'));
  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });

  const clearBtn = document.getElementById('btn-clear-data');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm('Clear all data? This cannot be undone.')) {
        const { default: db } = await import('./db.js');
        await db.delete();
        window.location.reload();
      }
    });
  }
}

// ===== DAY NAVIGATION (from month calendar) =====
function setupDayNavigation() {
  document.addEventListener('navigateToDay', (e) => {
    const date = e.detail?.date;
    if (!date) return;
    overviewSeg = 'day';
    // Update segmented control UI
    const overviewSC = document.getElementById('overview-seg');
    if (overviewSC) {
      overviewSC.querySelectorAll('.seg-btn').forEach(b => b.classList.toggle('active', b.dataset.seg === 'day'));
    }
    dayView.setDate(date);
    switchTab('overview');
  });
}

// ===== RENDER HELPERS =====
function renderCurrentTab() {
  if (currentTab === 'overview') renderOverview();
  else if (currentTab === 'log') renderLog();
  else if (currentTab === 'goals') renderGoals();
}

function renderOverview() {
  const el = document.getElementById('overview-content');
  if (!el) return;

  if (overviewSeg === 'day') dayView.render(el);
  else if (overviewSeg === 'week') weekView.render(el);
  else if (overviewSeg === 'month') monthView.render(el);
}

function renderLog() {
  const el = document.getElementById('log-content');
  if (!el) return;
  logScreen.render(el);
}

function renderGoals() {
  const el = document.getElementById('goals-content');
  if (!el) return;
  goalsScreen.render(el);
}

// Boot
// ===== HAPTIC FEEDBACK =====
function setupHaptics() {
  const interactiveSelector = 'button, .tab-btn, .seg-btn, .drink-option, .chip, .nav-arrow, .fab-circle, .delete-btn, .stepper button, input[type="checkbox"]';
  document.addEventListener('pointerdown', (e) => {
    if (e.target.closest(interactiveSelector) && navigator.vibrate) {
      navigator.vibrate(5);
    }
  });
}

boot();
