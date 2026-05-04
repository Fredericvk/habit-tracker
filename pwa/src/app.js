import { seedDefaults } from './seeder.js';
import * as dayView from './screens/dayView.js';
import * as weekView from './screens/weekView.js';
import * as monthView from './screens/monthView.js';
import * as logScreen from './screens/logScreen.js';
import * as goalsScreen from './screens/goalsScreen.js';
import db from './db.js';
import { handleStravaCallback, syncStravaActivities, isStravaConnected } from './utils/strava.js';

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

  // Force a pull from cloud BEFORE seeding to avoid creating duplicates
  try {
    await db.cloud.sync({ purpose: 'pull', wait: true });
  } catch (_) {
    // Cloud may not be reachable — seed with local data
  }

  // Seed defaults only after DB is ready and cloud data is pulled
  await seedDefaults();

  // Handle Strava OAuth callback (if returning from auth)
  handleStravaCallback();

  // Sync Strava activities if connected
  if (await isStravaConnected()) {
    syncStravaActivities().then(result => {
      if (result.synced > 0) renderCurrentTab();
    });
  }

  // Debounced re-render on sync events to avoid excessive renders
  let renderTimer = null;
  const scheduleRender = () => {
    if (renderTimer) return;
    renderTimer = setTimeout(() => {
      renderTimer = null;
      renderCurrentTab();
    }, 150);
  };

  db.cloud.events.syncComplete.subscribe(scheduleRender);
  db.cloud.syncState.subscribe(state => {
    if (state?.phase === 'in-sync') scheduleRender();
  });

  // Render default view
  renderOverview();
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

  if (openBtn) openBtn.addEventListener('click', async () => {
    overlay.classList.add('open');
    await updateStravaSettingsUI();
  });
  if (closeBtn) closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); });
}

async function updateStravaSettingsUI() {
  const row = document.getElementById('strava-settings-row');
  if (!row) return;
  const connected = await isStravaConnected();
  if (connected) {
    row.innerHTML = `
      <span>Strava</span>
      <span class="badge" style="background:#10B981;color:#fff;">Connected ✓</span>
      <button class="btn btn-outline btn-danger btn-sm" id="btn-strava-disconnect">Disconnect</button>
    `;
    document.getElementById('btn-strava-disconnect')?.addEventListener('click', async () => {
      if (confirm('Disconnect Strava? Synced workouts will remain.')) {
        const { disconnectStrava } = await import('./utils/strava.js');
        await disconnectStrava();
        await updateStravaSettingsUI();
      }
    });
  } else {
    row.innerHTML = `
      <span>Strava</span>
      <a href="/api/strava/auth" class="btn btn-outline">Connect</a>
    `;
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
  let userHasInteracted = false;
  const interactiveSelector = 'button, .tab-btn, .seg-btn, .drink-option, .chip, .nav-arrow, .fab-circle, .delete-btn, .stepper button, input[type="checkbox"]';
  document.addEventListener('pointerdown', (e) => {
    if (!userHasInteracted) { userHasInteracted = true; return; }
    if (e.target.closest(interactiveSelector) && navigator.vibrate) {
      navigator.vibrate(5);
    }
  });
}

boot();
