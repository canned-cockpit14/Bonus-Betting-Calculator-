const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id).value) || 0;
const fmt = (n) => (n >= 0 ? '$' : '-$') + Math.abs(n).toFixed(2);

// Formulas (c = commission as decimal):
//   Bonus lay stake:   (backOdds * backStake) / (layOdds - c)
//   Arbitrage stake A: total * (1/oddsA) / (1/oddsA + 1/oddsB)

function row(label, value) {
  return `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function copyRow(label, value, idSuffix) {
  return `
    <div class="row lay-stake-row">
      <span class="label">▶ ${label}</span>
      <div class="lay-stake-display">
        <span class="lay-stake-value">${fmt(value)}</span>
        <button class="copy-btn" data-copy="${value.toFixed(2)}">Copy</button>
      </div>
    </div>`;
}

function highlight(label, value, isProfit) {
  const cls = isProfit ? 'profit' : 'loss';
  return `<div class="highlight ${cls}"><span class="label">${label}</span><span class="value">${fmt(value)}</span></div>`;
}

function invalid(targetId, msg) {
  $(targetId).innerHTML = `<div class="row"><span class="label">⚠ ${msg}</span></div>`;
}

function renderQualifying() {
  const stake = num('q-back-stake');
  const backOdds = num('q-back-odds');
  const layOdds = num('q-lay-odds');
  const c = num('q-commission') / 100;

  if (backOdds <= 1 || layOdds <= 1) return invalid('q-results', 'Enter valid odds (&gt; 1.00)');

  const layStake = (backOdds * stake) / (layOdds - c);
  const liab = layStake * (layOdds - 1);
  const ifBackWins = stake * (backOdds - 1) - liab;
  const ifLayWins = layStake * (1 - c) - stake;
  const worst = Math.min(ifBackWins, ifLayWins);

  $('q-results').innerHTML = [
    copyRow('Lay stake', layStake, 'q'),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins', fmt(ifLayWins)),
    highlight('Worst-case result', worst, worst >= 0)
  ].join('');
}

function renderArbitrage() {
  const total = num('arb-total');
  const oA = num('arb-odds-a');
  const oB = num('arb-odds-b');

  if (oA <= 1 || oB <= 1) return invalid('arb-results', 'Enter valid odds (&gt; 1.00)');
  if (total <= 0) return invalid('arb-results', 'Enter a total stake');

  const pA = 1 / oA;
  const pB = 1 / oB;
  const market = pA + pB;
  const isArb = market < 1;

  const stakeA = total * pA / market;
  const stakeB = total * pB / market;
  const payout = total / market;
  const profit = payout - total;
  const yieldPct = (profit / total) * 100;
  const statusLabel = isArb ? '▲ ARB' : '▼ NO ARB';

  $('arb-results').innerHTML = [
    row('Implied market %', `${(market * 100).toFixed(2)}% &nbsp;<span class="tag ${isArb ? 'tag-good' : 'tag-bad'}">${statusLabel}</span>`),
    copyRow('Stake on A', stakeA, 'arb-a'),
    copyRow('Stake on B', stakeB, 'arb-b'),
    row('Guaranteed payout', fmt(payout)),
    row('Yield', yieldPct.toFixed(2) + '%'),
    highlight('Guaranteed profit', profit, profit >= 0)
  ].join('');
}

function renderAll() {
  renderQualifying();
  renderArbitrage();
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

document.addEventListener('click', (e) => {
  const btn = e.target.closest('.copy-btn');
  if (!btn) return;
  copyValue(btn.dataset.copy, btn);
});

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

document.querySelectorAll('input[type="number"]').forEach((input) => {
  input.addEventListener('input', renderAll);
});

renderAll();
