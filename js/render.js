/**
 * FamFinance — Render Engine
 * All DOM rendering functions. Pure UI — no fetch calls.
 */

const Render = (() => {

  // ── DASHBOARD ────────────────────────────────────

  function dashboard() {
    const s = Store.state;
    const income  = Store.incomeThisMonth();
    const expense = Store.expensesThisMonth();
    const net     = Store.netThisMonth();
    const goalP   = Store.totalGoalProgress();
    const upcoming = Store.upcomingBillsCount();

    // Stat cards
    setHTML('dash-income',  fmtMoney(income));
    setHTML('dash-expense', fmtMoney(expense));
    setHTML('dash-balance', fmtMoney(net));
    setHTML('dash-bills',   upcoming);
    setHTML('dash-goals',   `${goalP.pct}%`);

    // Balance card class
    const balCard = document.getElementById('dash-balance');
    if (balCard) {
      balCard.className = 'stat-value';
      if (net > 0) balCard.classList.add('amount-positive');
      else if (net < 0) balCard.classList.add('amount-negative');
    }

    // Recent transactions
    const recent = Store.recentTransactions(5);
    const tbody = document.getElementById('dashRecentTbody');
    if (tbody) {
      if (recent.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-muted" style="padding:1rem;text-align:center;">No transactions yet.</td></tr>`;
      } else {
        tbody.innerHTML = recent.map(t => recentRow(t)).join('');
      }
    }

    // Upcoming bills
    const billsDiv = document.getElementById('dashUpcomingBills');
    if (billsDiv) {
      const today = new Date().getDate();
      const upcomingBills = s.recurring.filter(b => {
        const due = parseInt(b.DueDate, 10);
        return !isNaN(due) && due >= today;
      }).slice(0, 5);

      if (upcomingBills.length === 0) {
        billsDiv.innerHTML = `<p class="text-muted text-xs">No upcoming bills this month.</p>`;
      } else {
        billsDiv.innerHTML = upcomingBills.map(b => `
          <div class="flex-between" style="padding:.35rem 0;font-size:.8125rem;">
            <span><strong>${esc(b.Name)}</strong> <span class="text-muted">· Day ${esc(b.DueDate)}</span></span>
            <span class="font-data-mono">$${parseFloat(b.Amount || 0).toFixed(2)}</span>
          </div>
        `).join('');
      }
    }
  }

  // ── TRANSACTIONS TABLE ───────────────────────────

  function transactions(filterText = '') {
    const tbody = document.getElementById('txnTableBody');
    if (!tbody) return;

    let list = Store.state.transactions;

    // Apply search filter
    if (filterText) {
      const q = filterText.toLowerCase();
      list = list.filter(t =>
        (t.Merchant || '').toLowerCase().includes(q) ||
        (t.Category || '').toLowerCase().includes(q) ||
        (t.User || '').toLowerCase().includes(q) ||
        (t.TransactionID || '').toLowerCase().includes(q)
      );
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-muted" style="padding:1.5rem;text-align:center;">No transactions found.</td></tr>`;
      return;
    }

    // Sort newest first
    list = [...list].sort((a, b) => (b.Date || '').localeCompare(a.Date || ''));

    tbody.innerHTML = list.map(t => transactionRow(t)).join('');
  }

  // ── RECURRING BILLS LIST ─────────────────────────

  function recurring() {
    const container = document.getElementById('recurringBillsList');
    if (!container) return;

    const list = Store.state.recurring;

    if (list.length === 0) {
      container.innerHTML = `<p class="text-muted">No recurring payments in the sheet.</p>`;
      return;
    }

    container.innerHTML = list.map(b => `
      <div class="bill-item">
        <div>
          <h4 style="font-weight:700;color:var(--primary);">${esc(b.Name)}</h4>
          <p class="text-xs text-muted">Due Day ${esc(b.DueDate)} · ${esc(b.Category)}</p>
        </div>
        <div style="display:flex;align-items:center;gap:.75rem;">
          <span class="font-data-mono" style="font-weight:700;">$${parseFloat(b.Amount || 0).toFixed(2)}</span>
          ${b.PayLink ? `<a href="${esc(b.PayLink)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm">Pay</a>` : ''}
          <button onclick="App.editRecurring('${esc(b.BillID)}')" class="btn btn-ghost btn-icon btn-sm" title="Edit">
            <span class="material-symbols-outlined" style="font-size:1rem;">edit</span>
          </button>
          <button onclick="App.deleteRecurring('${esc(b.BillID)}')" class="btn btn-ghost btn-icon btn-sm" title="Delete" style="color:var(--error);">
            <span class="material-symbols-outlined" style="font-size:1rem;">delete</span>
          </button>
        </div>
      </div>
    `).join('');
  }

  // ── GOALS GRID ───────────────────────────────────

  function goals() {
    const container = document.getElementById('goalsContainer');
    if (!container) return;

    const list = Store.state.goals;

    if (list.length === 0) {
      container.innerHTML = `<p class="text-muted" style="grid-column:1/-1;">No family goals in the sheet.</p>`;
      return;
    }

    container.innerHTML = list.map(g => {
      const target  = parseFloat(g.TargetAmount || 1);
      const current = parseFloat(g.CurrentSaved || 0);
      const pct = Math.min(100, Math.round((current / target) * 100));

      return `
        <div class="goal-card">
          <div class="flex-between">
            <h3 style="font-size:1.125rem;font-weight:700;color:var(--primary);">${esc(g.GoalName)}</h3>
            <span class="text-xs text-muted">Deadline: ${esc(g.Deadline || 'N/A')}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%;"></div>
          </div>
          <div class="flex-between mt-1">
            <div>
              <p class="text-xs text-muted" style="margin-bottom:2px;">SAVED / TARGET</p>
              <p class="font-data-mono" style="font-weight:700;">
                $${current.toFixed(2)} / $${target.toFixed(2)}
                <span style="font-size:.75rem;color:var(--on-surface-variant);">(${pct}%)</span>
              </p>
            </div>
          </div>
          <div style="display:flex;gap:.5rem;margin-top:.5rem;">
            <button onclick="App.contributeToGoal('${esc(g.GoalName)}')" class="btn btn-primary btn-sm">
              + Add Funds
            </button>
            <button onclick="App.editGoal('${esc(g.GoalName)}')" class="btn btn-ghost btn-icon btn-sm" title="Edit">
              <span class="material-symbols-outlined" style="font-size:1rem;">edit</span>
            </button>
            <button onclick="App.deleteGoal('${esc(g.GoalName)}')" class="btn btn-ghost btn-icon btn-sm" title="Delete" style="color:var(--error);">
              <span class="material-symbols-outlined" style="font-size:1rem;">delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── SYNC BADGE ───────────────────────────────────

  function syncBadge(status, message) {
    const badge = document.getElementById('syncStatusBadge');
    if (!badge) return;

    if (status === 'syncing') {
      badge.innerHTML = `<span class="material-symbols-outlined" style="font-size:1rem;animation:spin 1s linear infinite;">sync</span> Syncing...`;
      badge.style.color = 'var(--on-surface-variant)';
    } else if (status === 'online') {
      badge.innerHTML = `<span class="material-symbols-outlined" style="font-size:1rem;color:var(--green);">check_circle</span> ${message || 'Live Sync Active'}`;
      badge.style.color = 'var(--green)';
    } else {
      badge.innerHTML = `<span class="material-symbols-outlined" style="font-size:1rem;color:var(--yellow);">warning</span> ${message || 'Offline'}`;
      badge.style.color = 'var(--yellow)';
    }
  }

  // ── TOAST NOTIFICATION ───────────────────────────

  function toast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());

    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);

    // Auto-remove after animation
    setTimeout(() => el.remove(), 3000);
  }

  // ── HELPERS ──────────────────────────────────────

  function setHTML(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }

  function fmtMoney(val) {
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    return `${sign}$${abs.toFixed(2)}`;
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function recentRow(t) {
    const amt = parseFloat(t.Amount || 0);
    const cls = amt < 0 ? 'amount-negative' : 'amount-positive';
    return `
      <tr>
        <td class="font-data-mono" style="font-size:.6875rem;color:var(--outline);">${esc(t.TransactionID)}</td>
        <td style="font-size:.75rem;">${esc(t.Date)}</td>
        <td style="font-weight:600;">${esc(t.User)}</td>
        <td class="${cls} font-data-mono" style="text-align:right;">${fmtMoney(amt)}</td>
      </tr>
    `;
  }

  function transactionRow(t) {
    const amt = parseFloat(t.Amount || 0);
    const cls = amt < 0 ? 'amount-negative' : 'amount-positive';
    const tid = esc(t.TransactionID);
    return `
      <tr>
        <td class="font-data-mono" style="font-size:.6875rem;color:var(--outline);">${tid}</td>
        <td style="font-size:.75rem;">${esc(t.Date)}</td>
        <td style="font-weight:600;">${esc(t.User)}</td>
        <td>${esc(t.Merchant)}</td>
        <td class="text-muted text-xs">${esc(t.Category)}</td>
        <td class="${cls} font-data-mono" style="text-align:right;">${fmtMoney(amt)}</td>
        <td><span class="badge">${esc(t.Status || 'Settled')}</span></td>
        <td style="white-space:nowrap;">
          <button onclick="App.editTransaction('${tid}')" class="btn btn-ghost btn-sm" title="Edit">
            <span class="material-symbols-outlined" style="font-size:1rem;">edit</span>
          </button>
          <button onclick="App.deleteTransaction('${tid}')" class="btn btn-ghost btn-sm" title="Delete" style="color:var(--error);">
            <span class="material-symbols-outlined" style="font-size:1rem;">delete</span>
          </button>
        </td>
      </tr>
    `;
  }

  return {
    dashboard,
    transactions,
    recurring,
    goals,
    syncBadge,
    toast
  };

})();
