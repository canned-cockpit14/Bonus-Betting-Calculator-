const $ = (id) => document.getElementById(id);
const num = (id) => parseFloat($(id).value) || 0;
const fmt = (n) => (n >= 0 ? '$' : '-$') + Math.abs(n).toFixed(2);

// Lay stake formulas (c = commission as decimal, e.g. 0.05):
//   Qualifying / SR free bet: layStake = (backOdds * backStake) / (layOdds - c)
//   SNR free bet:             layStake = (backOdds - 1) * freeBetStake / (layOdds - c)
//
// Liability = layStake * (layOdds - 1)

function layStakeQualifying(stake, backOdds, layOdds, c) {
  return (backOdds * stake) / (layOdds - c);
}

function layStakeSNR(stake, backOdds, layOdds, c) {
  return ((backOdds - 1) * stake) / (layOdds - c);
}

function liability(layStake, layOdds) {
  return layStake * (layOdds - 1);
}

function row(label, value) {
  return `<div class="row"><span class="label">${label}</span><span class="value">${value}</span></div>`;
}

function highlight(label, value, isProfit) {
  const cls = isProfit ? 'profit' : 'loss';
  return `<div class="highlight ${cls}"><span class="label">${label}</span><span class="value">${fmt(value)}</span></div>`;
}

function renderQualifying() {
  const stake = num('q-back-stake');
  const backOdds = num('q-back-odds');
  const layOdds = num('q-lay-odds');
  const c = num('q-commission') / 100;

  if (backOdds <= 1 || layOdds <= 1) {
    $('q-results').innerHTML = '<div class="row"><span class="label">Enter valid odds (> 1.00)</span></div>';
    return;
  }

  const layStake = layStakeQualifying(stake, backOdds, layOdds, c);
  const liab = liability(layStake, layOdds);

  // If back wins: profit = stake*(backOdds-1) - liability
  // If lay wins:  profit = layStake*(1-c) - stake
  const ifBackWins = stake * (backOdds - 1) - liab;
  const ifLayWins = layStake * (1 - c) - stake;
  const result = Math.min(ifBackWins, ifLayWins);

  $('q-results').innerHTML = [
    row('Lay stake', fmt(layStake)),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins', fmt(ifLayWins)),
    highlight('Qualifying loss / profit', result, result >= 0)
  ].join('');
}

function renderSNR() {
  const stake = num('snr-stake');
  const backOdds = num('snr-back-odds');
  const layOdds = num('snr-lay-odds');
  const c = num('snr-commission') / 100;

  if (backOdds <= 1 || layOdds <= 1) {
    $('snr-results').innerHTML = '<div class="row"><span class="label">Enter valid odds (> 1.00)</span></div>';
    return;
  }

  const layStake = layStakeSNR(stake, backOdds, layOdds, c);
  const liab = liability(layStake, layOdds);

  // SNR: stake not returned. Back wins -> profit = stake*(backOdds-1) - liability
  //                          Lay wins  -> profit = layStake*(1-c) (no qualifying stake outlay)
  const ifBackWins = stake * (backOdds - 1) - liab;
  const ifLayWins = layStake * (1 - c);
  const result = Math.min(ifBackWins, ifLayWins);
  const retention = stake > 0 ? (result / stake) * 100 : 0;

  $('snr-results').innerHTML = [
    row('Lay stake', fmt(layStake)),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins', fmt(ifLayWins)),
    row('Retention rate', retention.toFixed(2) + '%'),
    highlight('Locked-in profit', result, result >= 0)
  ].join('');
}

function renderSR() {
  const stake = num('sr-stake');
  const backOdds = num('sr-back-odds');
  const layOdds = num('sr-lay-odds');
  const c = num('sr-commission') / 100;

  if (backOdds <= 1 || layOdds <= 1) {
    $('sr-results').innerHTML = '<div class="row"><span class="label">Enter valid odds (> 1.00)</span></div>';
    return;
  }

  // SR free bet: stake IS returned, so works like a qualifying bet but you keep all winnings.
  const layStake = layStakeQualifying(stake, backOdds, layOdds, c);
  const liab = liability(layStake, layOdds);

  // Back wins -> profit = stake*backOdds - liability  (full winnings, no real stake outlay)
  // Lay wins  -> profit = layStake*(1-c)
  const ifBackWins = stake * backOdds - liab;
  const ifLayWins = layStake * (1 - c);
  const result = Math.min(ifBackWins, ifLayWins);
  const retention = stake > 0 ? (result / stake) * 100 : 0;

  $('sr-results').innerHTML = [
    row('Lay stake', fmt(layStake)),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins', fmt(ifLayWins)),
    row('Retention rate', retention.toFixed(2) + '%'),
    highlight('Locked-in profit', result, result >= 0)
  ].join('');
}

function renderRiskFree() {
  const stake = num('rf-stake');
  const backOdds = num('rf-back-odds');
  const layOdds = num('rf-lay-odds');
  const c = num('rf-commission') / 100;
  const retention = num('rf-retention');

  if (backOdds <= 1 || layOdds <= 1) {
    $('rf-results').innerHTML = '<div class="row"><span class="label">Enter valid odds (> 1.00)</span></div>';
    return;
  }

  // Risk-free: bookie refunds stake (in some form) if back loses.
  // Optimal lay stake balances expected outcomes:
  //   layStake = stake * (backOdds - retention) / (layOdds - c)
  // Back wins: profit = stake*(backOdds-1) - liability
  // Lay wins (back loses): profit = layStake*(1-c) - stake + stake*retention
  //                                = layStake*(1-c) - stake*(1-retention)
  const layStake = (stake * (backOdds - retention)) / (layOdds - c);
  const liab = liability(layStake, layOdds);
  const ifBackWins = stake * (backOdds - 1) - liab;
  const ifLayWins = layStake * (1 - c) - stake * (1 - retention);
  const guaranteed = Math.min(ifBackWins, ifLayWins);
  const ev = stake > 0 ? (guaranteed / stake) * 100 : 0;

  $('rf-results').innerHTML = [
    row('Lay stake', fmt(layStake)),
    row('Lay liability', fmt(liab)),
    row('If back bet wins', fmt(ifBackWins)),
    row('If lay bet wins (refund triggers)', fmt(ifLayWins)),
    row('Effective return on stake', ev.toFixed(2) + '%'),
    highlight('Guaranteed value', guaranteed, guaranteed >= 0)
  ].join('');
}

function renderAll() {
  renderQualifying();
  renderSNR();
  renderSR();
  renderRiskFree();
}

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
