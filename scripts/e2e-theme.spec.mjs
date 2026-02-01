import { chromium } from 'playwright';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

const PORT = 4321;
const BASE_URL = `http://localhost:${PORT}`;

let devServer;
let browser;
let page;

async function startDevServer() {
  return new Promise((resolve, reject) => {
    devServer = spawn('npm', ['run', 'dev', '--', '--port', PORT], {
      env: { ...process.env, BRAND_SLUG: '_default' },
      stdio: 'pipe',
      shell: true
    });

    let output = '';
    devServer.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('ready in')) {
        console.log('✓ Dev server started');
        setTimeout(1000).then(resolve); // Give it a moment to settle
      }
    });

    devServer.stderr.on('data', (data) => {
      const msg = data.toString();
      if (!msg.includes('[vite]') && !msg.includes('Transform')) {
        console.error('Dev server error:', msg);
      }
    });

    devServer.on('error', reject);

    // Timeout after 30s
    setTimeout(30000).then(() => reject(new Error('Dev server timeout')));
  });
}

function stopDevServer() {
  if (devServer) {
    devServer.kill('SIGTERM');
    console.log('✓ Dev server stopped');
  }
}

async function getThemeState(page) {
  return await page.evaluate(() => {
    return {
      htmlHasDark: document.documentElement.classList.contains('dark'),
      localStorage: localStorage.getItem('aw-color-scheme'),
      dataTheme: document.documentElement.dataset.awTheme,
      htmlClasses: Array.from(document.documentElement.classList).filter(c => c === 'dark' || c === 'light')
    };
  });
}

async function clickToggle(page) {
  const button = page.locator('[data-aw-toggle-color-scheme]').first();
  await button.waitFor({ state: 'visible', timeout: 5000 });
  await button.click();
  await setTimeout(300); // Wait for theme transition
}

async function runTests() {
  const results = [];
  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`  ✓ ${message}`);
      results.push({ status: 'PASS', message });
      passed++;
    } else {
      console.log(`  ✗ ${message}`);
      results.push({ status: 'FAIL', message });
      failed++;
    }
  };

  try {
    // Start dev server
    await startDevServer();

    // Launch browser
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    page = await context.newPage();

    // Collect console logs
    const consoleLogs = [];
    page.on('console', msg => {
      if (msg.text().includes('[THEME-DEBUG')) {
        consoleLogs.push(msg.text());
      }
    });

    console.log('\n=== PHASE 2: AUTONOMOUS E2E REPRODUCTION ===\n');

    // TEST 1: Initial load with localStorage cleared
    console.log('Test 1: Initial page load');
    await page.goto(BASE_URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await setTimeout(500);

    let state = await getThemeState(page);
    console.log('  State:', state);

    // Homepage should respect system preference (we can't control system pref in headless, so just check consistency)
    const initialTheme = state.htmlHasDark ? 'dark' : 'light';
    console.log(`  Initial theme: ${initialTheme}`);

    // TEST 2: Toggle button click
    console.log('\nTest 2: Click toggle button');
    const beforeClick = state.htmlHasDark;
    await clickToggle(page);
    state = await getThemeState(page);
    console.log('  State after click:', state);

    assert(state.htmlHasDark !== beforeClick, `Theme toggled (was ${beforeClick ? 'dark' : 'light'}, now ${state.htmlHasDark ? 'dark' : 'light'})`);
    assert(state.localStorage !== null, `localStorage persisted (value: ${state.localStorage})`);

    // TEST 3: Navigate to subpage
    console.log('\nTest 3: Navigate to subpage');
    const themeBeforeNav = state.htmlHasDark;
    const lsBeforeNav = state.localStorage;

    await page.click('a[href="/verkaeufer"]');
    await setTimeout(1000); // Wait for view transition

    state = await getThemeState(page);
    console.log('  State on subpage:', state);

    assert(state.htmlHasDark === themeBeforeNav, `Theme persisted to subpage (expected ${themeBeforeNav ? 'dark' : 'light'}, got ${state.htmlHasDark ? 'dark' : 'light'})`);
    assert(state.localStorage === lsBeforeNav, `localStorage preserved (${state.localStorage})`);

    // TEST 4: Toggle on subpage
    console.log('\nTest 4: Toggle on subpage');
    const beforeSubpageClick = state.htmlHasDark;
    await clickToggle(page);
    state = await getThemeState(page);
    console.log('  State after subpage toggle:', state);

    assert(state.htmlHasDark !== beforeSubpageClick, `Subpage toggle worked (was ${beforeSubpageClick ? 'dark' : 'light'}, now ${state.htmlHasDark ? 'dark' : 'light'})`);

    // TEST 5: Navigate back
    console.log('\nTest 5: Navigate back to homepage');
    const themeBeforeBack = state.htmlHasDark;

    await page.goBack();
    await setTimeout(1000);

    state = await getThemeState(page);
    console.log('  State on homepage (back):', state);

    assert(state.htmlHasDark === themeBeforeBack, `Theme persisted on back navigation (expected ${themeBeforeBack ? 'dark' : 'light'}, got ${state.htmlHasDark ? 'dark' : 'light'})`);

    // TEST 6: Reload preserves choice
    console.log('\nTest 6: Page reload preserves theme');
    const themeBeforeReload = state.htmlHasDark;
    await page.reload();
    await setTimeout(500);

    state = await getThemeState(page);
    console.log('  State after reload:', state);

    assert(state.htmlHasDark === themeBeforeReload, `Theme persisted through reload (${state.htmlHasDark ? 'dark' : 'light'})`);

    // Print console logs if we collected any
    if (consoleLogs.length > 0) {
      console.log('\n=== THEME DEBUG LOGS ===');
      consoleLogs.forEach(log => console.log(log));
    }

  } catch (error) {
    console.error('\n✗ E2E Test Error:', error.message);
    results.push({ status: 'ERROR', message: error.message });
    failed++;
  } finally {
    if (browser) await browser.close();
    stopDevServer();

    console.log('\n=== RESULTS ===');
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total: ${results.length}`);

    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
