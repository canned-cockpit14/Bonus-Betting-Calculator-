const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id).value) || 0;
const fmt = (n) => (n >= 0 ? '$' : '-$') + Math.abs(n).toFixed(2);

let roundMode = 'nearest';

// Lay stake formulas (c = commission as decimal):
//   Qualifying / SR free bet: layStake = (backOdds * backStake) / (layOdds - c)
//   SNR free bet:             layStake = (backOdds - 1) * freeBetStake / (layOdds - c)
//   Risk-free:                layStake = stake * (backOdds - retention) / (layOdds - c)

function layStakeQualifying(stake, backOdds, layOdds, c) {
  return (backOdds * stake) / (layOdds - c);
}
function layStakeSNR(stake, backOdds, layOdds, c) {
  return ((backOdds - 1) * stake) / (layOdds - c);
}
function layStakeRiskFree(stake, backOdds, layOdds, c, retention) {
  return (stake * (backOdds - retention)) / (layOdds - c);
}

function applyRound(exact) {
  if (roundMode === 'up') return Math.ceil(exact * 100) / 100;
  if (roundMode === 'down') return Math.floor(exact * 100) / 100;
  if (roundMode === 'nearest') return Math.round(exact * 100) / 100;
  return exact; // 'none' / exact
}

function row(label, value) {
  return `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function layStakeRow(exact, rounded, idSuffix) {
  const showExact = roundMode !== 'none' && Math.abs(exact - rounded) > 0.0001;
  const noteHTML = showExact
    ? `<span class="exact-note">exact ${exact.toFixed(4)}</span>`
    : '';
  return `
    <div class="row lay-stake-row">
      <span class="label">▶ Lay stake</span>
      <div class="lay-stake-display">
        ${noteHTML}
        <span class="lay-stake-value" id="lay-value-${idSuffix}">${fmt(rounded)}</span>
        <button class="copy-btn" data-copy="${rounded.toFixed(2)}" data-id="${idSuffix}">Copy</button>
      </div>
    </div>`;
}

function highlight(label, value, isProfit) {
  const cls = isProfit ? 'profit' : 'loss';
  return `<div class="highlight ${cls}"><span class="label">${label}</span><span class="value">${fmt(value)}</span></div>`;
}

function invalidOdds(targetId) {
  $(targetId).innerHTML = '<div class="row"><span class="label">⚠ Enter valid odds (&gt; 1.00)</span></div>';
}

function renderQualifying() {
  const stake = num('q-back-stake');
  const backOdds = num('q-back-odds');
  const layOdds = num('q-lay-odds');
  const c = num('q-commission') / 100;

  if (backOdds <= 1 || layOdds <= 1) return invalidOdds('q-results');

  const exactLay = layStakeQualifying(stake, backOdds, layOdds, c);
  const layStake = applyRound(exactLay);
  const liab = layStake * (layOdds - 1);

  const ifBackWins = stake * (backOdds - 1) - liab;
  const ifLayWins = layStake * (1 - c) - stake;
  const worst = Math.min(ifBackWins, ifLayWins);

  $('q-results').innerHTML = [
    layStakeRow(exactLay, layStake, 'q'),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins', fmt(ifLayWins)),
    highlight('Worst-case result', worst, worst >= 0)
  ].join('');
}

function renderSNR() {
  const stake = num('snr-stake');
  const backOdds = num('snr-back-odds');
  const layOdds = num('snr-lay-odds');
  const c = num('snr-commission') / 100;

  if (backOdds <= 1 || layOdds <= 1) return invalidOdds('snr-results');

  const exactLay = layStakeSNR(stake, backOdds, layOdds, c);
  const layStake = applyRound(exactLay);
  const liab = layStake * (layOdds - 1);

  const ifBackWins = stake * (backOdds - 1) - liab;
  const ifLayWins = layStake * (1 - c);
  const worst = Math.min(ifBackWins, ifLayWins);
  const retention = stake > 0 ? (worst / stake) * 100 : 0;

  $('snr-results').innerHTML = [
    layStakeRow(exactLay, layStake, 'snr'),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins', fmt(ifLayWins)),
    row('Retention rate', retention.toFixed(2) + '%'),
    highlight('Locked-in profit', worst, worst >= 0)
  ].join('');
}

function renderSR() {
  const stake = num('sr-stake');
  const backOdds = num('sr-back-odds');
  const layOdds = num('sr-lay-odds');
  const c = num('sr-commission') / 100;

  if (backOdds <= 1 || layOdds <= 1) return invalidOdds('sr-results');

  const exactLay = layStakeQualifying(stake, backOdds, layOdds, c);
  const layStake = applyRound(exactLay);
  const liab = layStake * (layOdds - 1);

  const ifBackWins = stake * backOdds - liab;
  const ifLayWins = layStake * (1 - c);
  const worst = Math.min(ifBackWins, ifLayWins);
  const retention = stake > 0 ? (worst / stake) * 100 : 0;

  $('sr-results').innerHTML = [
    layStakeRow(exactLay, layStake, 'sr'),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins', fmt(ifLayWins)),
    row('Retention rate', retention.toFixed(2) + '%'),
    highlight('Locked-in profit', worst, worst >= 0)
  ].join('');
}

function renderRiskFree() {
  const stake = num('rf-stake');
  const backOdds = num('rf-back-odds');
  const layOdds = num('rf-lay-odds');
  const c = num('rf-commission') / 100;
  const retention = num('rf-retention');

  if (backOdds <= 1 || layOdds <= 1) return invalidOdds('rf-results');

  const exactLay = layStakeRiskFree(stake, backOdds, layOdds, c, retention);
  const layStake = applyRound(exactLay);
  const liab = layStake * (layOdds - 1);

  const ifBackWins = stake * (backOdds - 1) - liab;
  const ifLayWins = layStake * (1 - c) - stake * (1 - retention);
  const worst = Math.min(ifBackWins, ifLayWins);
  const ev = stake > 0 ? (worst / stake) * 100 : 0;

  $('rf-results').innerHTML = [
    layStakeRow(exactLay, layStake, 'rf'),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins (refund triggers)', fmt(ifLayWins)),
    row('Effective return on stake', ev.toFixed(2) + '%'),
    highlight('Guaranteed value', worst, worst >= 0)
  ].join('');
}

function renderAll() {
  renderQualifying();
  renderSNR();
  renderSR();
  renderRiskFree();
}

let toastTimer;
function showToast(msg) {
  const toast = $('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1600);
}

async function copyValue(value, btn) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    // Fallback for non-secure contexts
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch {}
    document.body.removeChild(ta);
  }
  btn.classList.add('copied');
  const original = btn.textContent;
  btn.textContent = '✓ Copied';
  showToast(`COPIED :: ${value}`);
  setTimeout(() => {
    btn.classList.remove('copied');
    btn.textContent = original;
  }, 1200);
}

// Event delegation for copy buttons (results re-render on each input change).
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  copyValue(btn.dataset.copy, btn);
});

// Tabs
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    document.getElementById(tab.dataset.tab).classList.add('active');
  });
});

// Rounding toggle
document.querySelectorAll('.round-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.round-btn').forEach((b) => {
      b.classList.remove('active');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-checked', 'true');
    roundMode = btn.dataset.round;
    renderAll();
  });
});

// Inputs
document.querySelectorAll('input[type="number"]').forEach((input) => {
  input.addEventListener('input', renderAll);
});

renderAll();
