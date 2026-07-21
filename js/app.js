/**
 * FamFinance — Application Controller
 * Event handlers, navigation, modals, dark mode, auth, init.
 */

const App = (() => {

  let refreshTimer = null;

  // ── INIT ─────────────────────────────────────────

  async function init() {
    restoreDarkMode();
    bindEvents();

    // Try restoring a previous session
    const hasSession = Store.restoreSession();
    if (hasSession) {
      Render.showApp(Store.state.currentUser);
      await fetchSheetData();
      startAutoRefresh();
    } else {
      Render.showLogin();
    }
  }

  // ── AUTH ─────────────────────────────────────────

  async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('loginUsername').value.trim();
    const pin      = document.getElementById('loginPin').value.trim();
    const btn      = document.getElementById('loginBtn');

    Render.clearLoginError();

    if (!username || !pin) {
      Render.loginError('Please enter both username and PIN.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'SIGNING IN...';

    try {
      const data = await API.login(username, pin);
      Store.login(data.user);
      Render.showApp(data.user);
      await fetchSheetData();
      startAutoRefresh();
    } catch (err) {
      Render.loginError(err.message);
    }

    btn.disabled = false;
    btn.textContent = 'SIGN IN';
  }

  function handleLogout() {
    if (refreshTimer) clearInterval(refreshTimer);
    Store.logout();
    Render.showLogin();
    document.getElementById('loginPin').value = '';
    Render.clearLoginError();
  }

  // ── DATA FETCH ───────────────────────────────────

  async function fetchSheetData() {
    if (!Store.state.isLoggedIn) return;

    Render.syncBadge('syncing');

    try {
      const data = await API.fetchAll();
      Store.setAll(data);
      Render.syncBadge('online');
      renderCurrentView();
    } catch (err) {
      console.error('Fetch error:', err);
      Render.syncBadge('offline', 'Error: ' + err.message);
      renderCurrentView();
    }
  }

  function startAutoRefresh() {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchSheetData, 60000);
  }

  // ── TEST CONNECTION ──────────────────────────────

  async function testConnection() {
    const resultEl = document.getElementById('testResult');
    if (resultEl) {
      resultEl.textContent = 'Testing...';
      resultEl.style.color = 'var(--on-surface-variant)';
    }

    try {
      const data = await API.ping();
      if (resultEl) {
        resultEl.textContent = '✓ Connection successful! Backend is reachable.';
        resultEl.style.color = 'var(--green)';
      }
      Render.toast('Backend connection is working!');
    } catch (err) {
      if (resultEl) {
        resultEl.textContent = '✗ FAILED: ' + err.message;
        resultEl.style.color = 'var(--error)';
      }
      Render.toast('Connection failed: ' + err.message, 'error');
    }
  }

  // ── NAVIGATION ───────────────────────────────────

  function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));

    const target = document.getElementById(viewId);
    if (target) target.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
      const nav = btn.getAttribute('data-nav');
      btn.classList.toggle('active', nav === viewId);
    });

    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      const nav = btn.getAttribute('data-nav');
      btn.classList.toggle('active', nav === viewId);
    });

    renderView(viewId);
  }

  function renderView(viewId) {
    switch (viewId) {
      case 'view-dashboard':     Render.dashboard(); break;
      case 'view-transactions':  Render.transactions(getSearchQuery()); break;
      case 'view-payments':      Render.recurring(); break;
      case 'view-goals':         Render.goals(); break;
      case 'view-settings':      break;
    }
  }

  function renderCurrentView() {
    const active = document.querySelector('.app-view.active');
    if (active) renderView(active.id);
  }

  function getSearchQuery() {
    const input = document.getElementById('txnSearch');
    return input ? input.value.trim() : '';
  }

  // ── DARK MODE ────────────────────────────────────

  function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.classList.toggle('dark');
    localStorage.setItem('famfinance-dark', isDark ? '1' : '0');
    updateDarkModeIcon(isDark);
  }

  function restoreDarkMode() {
    const saved = localStorage.getItem('famfinance-dark');
    const isDark = saved === '1';
    if (isDark) document.documentElement.classList.add('dark');
    updateDarkModeIcon(isDark);
  }

  function updateDarkModeIcon(isDark) {
    const btn = document.getElementById('darkModeBtn');
    if (btn) btn.textContent = isDark ? 'light_mode' : 'dark_mode';
  }

  // ── TRANSACTION FORM ─────────────────────────────

  let editingTransactionID = null;

  async function submitTransaction(e) {
    e.preventDefault();

    const btn = document.getElementById('submitTxnBtn');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'SAVING...';

    const payload = {
      user:     document.getElementById('formUser').value,
      merchant: document.getElementById('formMerchant').value,
      category: document.getElementById('formCategory').value,
      amount:   document.getElementById('formAmount').value,
      type:     document.getElementById('formType').value,
      status:   'Settled',
      date:     new Date().toISOString().split('T')[0]
    };

    try {
      if (editingTransactionID) {
        payload.transactionID = editingTransactionID;
        await API.updateTransaction(payload);
        Render.toast('Transaction updated!');
        editingTransactionID = null;
        document.getElementById('txnFormTitle').textContent = 'RECORD NEW TRANSACTION';
      } else {
        await API.addTransaction(payload);
        Render.toast('Transaction added!');
      }

      resetTransactionForm();
      await fetchSheetData();
    } catch (err) {
      Render.toast('Error: ' + err.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = originalText;
  }

  function resetTransactionForm() {
    const form = document.getElementById('txnForm');
    if (form) form.reset();
    editingTransactionID = null;
    const btn = document.getElementById('submitTxnBtn');
    if (btn) btn.textContent = 'POST TO GOOGLE SHEET';
    const title = document.getElementById('txnFormTitle');
    if (title) title.textContent = 'RECORD NEW TRANSACTION';
    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.classList.add('hidden');
  }

  function editTransaction(transactionID) {
    const txn = Store.state.transactions.find(
      t => t.TransactionID && t.TransactionID.toString().trim() === transactionID
    );
    if (!txn) {
      Render.toast('Transaction not found.', 'error');
      return;
    }

    editingTransactionID = transactionID;

    document.getElementById('formUser').value     = txn.User || '';
    document.getElementById('formMerchant').value = txn.Merchant || '';
    document.getElementById('formCategory').value = txn.Category || 'General';
    document.getElementById('formAmount').value   = Math.abs(parseFloat(txn.Amount || 0));
    document.getElementById('formType').value     = parseFloat(txn.Amount) >= 0 ? 'INCOME' : 'EXPENSE';

    document.getElementById('submitTxnBtn').textContent = 'UPDATE TRANSACTION';
    document.getElementById('txnFormTitle').textContent = 'EDIT TRANSACTION';

    const cancelBtn = document.getElementById('cancelEditBtn');
    if (cancelBtn) cancelBtn.classList.remove('hidden');

    switchView('view-payments');
    document.getElementById('txnForm')?.scrollIntoView({ behavior: 'smooth' });
  }

  async function deleteTransaction(transactionID) {
    if (!confirm(`Delete transaction "${transactionID}"? This cannot be undone.`)) return;

    try {
      await API.deleteTransaction(transactionID);
      Render.toast('Transaction deleted.');
      editingTransactionID = null;
      resetTransactionForm();
      await fetchSheetData();
    } catch (err) {
      Render.toast('Error: ' + err.message, 'error');
    }
  }

  // ── RECURRING BILLS ──────────────────────────────

  async function addRecurring(e) {
    e.preventDefault();

    const btn = document.getElementById('addRecurringBtn');
    btn.disabled = true;
    btn.textContent = 'SAVING...';

    const payload = {
      name:     document.getElementById('recurringName').value,
      amount:   document.getElementById('recurringAmount').value,
      dueDate:  document.getElementById('recurringDueDate').value,
      category: document.getElementById('recurringCategory').value,
      payLink:  document.getElementById('recurringPayLink').value
    };

    try {
      await API.addRecurring(payload);
      Render.toast('Recurring payment added!');
      document.getElementById('recurringForm').reset();
      await fetchSheetData();
    } catch (err) {
      Render.toast('Error: ' + err.message, 'error');
    }

    btn.disabled = false;
    btn.textContent = 'ADD BILL';
  }

  function editRecurring(billID) {
    const bill = Store.state.recurring.find(
      b => b.BillID && b.BillID.toString().trim() === billID
    );
    if (!bill) { Render.toast('Bill not found.', 'error'); return; }

    openModal('Edit Recurring Payment', `
      <input type="hidden" id="modalRecurringBillID" value="${escAttr(bill.BillID)}">
      <div class="form-group">
        <label class="form-label">Name</label>
        <input id="modalRecurringName" class="form-input" value="${escAttr(bill.Name)}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Amount ($)</label>
          <input id="modalRecurringAmount" class="form-input" type="number" step="0.01" value="${parseFloat(bill.Amount || 0)}">
        </div>
        <div class="form-group">
          <label class="form-label">Due Day</label>
          <input id="modalRecurringDueDate" class="form-input" type="number" min="1" max="31" value="${escAttr(bill.DueDate)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Category</label>
        <input id="modalRecurringCategory" class="form-input" value="${escAttr(bill.Category)}">
      </div>
      <div class="form-group">
        <label class="form-label">Pay Link (URL)</label>
        <input id="modalRecurringPayLink" class="form-input" value="${escAttr(bill.PayLink)}">
      </div>
    `, async () => {
      await API.updateRecurring({
        billID:   document.getElementById('modalRecurringBillID').value,
        name:     document.getElementById('modalRecurringName').value,
        amount:   document.getElementById('modalRecurringAmount').value,
        dueDate:  document.getElementById('modalRecurringDueDate').value,
        category: document.getElementById('modalRecurringCategory').value,
        payLink:  document.getElementById('modalRecurringPayLink').value
      });
      Render.toast('Recurring payment updated.');
      await fetchSheetData();
    });
  }

  async function deleteRecurring(billID) {
    if (!confirm(`Delete recurring payment "${billID}"?`)) return;
    try {
      await API.deleteRecurring(billID);
      Render.toast('Recurring payment deleted.');
      await fetchSheetData();
    } catch (err) {
      Render.toast('Error: ' + err.message, 'error');
    }
  }

  // ── GOALS ────────────────────────────────────────

  async function contributeToGoal(goalName) {
    const amtStr = prompt(`Enter contribution amount for "${goalName}":`);
    if (!amtStr || isNaN(parseFloat(amtStr))) return;
    try {
      await API.contributeToGoal(goalName, parseFloat(amtStr));
      Render.toast('Contribution added!');
      await fetchSheetData();
    } catch (err) {
      Render.toast('Error: ' + err.message, 'error');
    }
  }

  function editGoal(goalName) {
    const goal = Store.state.goals.find(
      g => g.GoalName && g.GoalName.toString().trim().toLowerCase() === goalName.toLowerCase()
    );
    if (!goal) { Render.toast('Goal not found.', 'error'); return; }

    const origName = escAttr(goal.GoalName);
    openModal('Edit Family Goal', `
      <input type="hidden" id="modalGoalOrigName" value="${origName}">
      <div class="form-group">
        <label class="form-label">Goal Name</label>
        <input id="modalGoalName" class="form-input" value="${origName}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Target Amount ($)</label>
          <input id="modalGoalTarget" class="form-input" type="number" step="0.01" value="${parseFloat(goal.TargetAmount || 0)}">
        </div>
        <div class="form-group">
          <label class="form-label">Current Saved ($)</label>
          <input id="modalGoalSaved" class="form-input" type="number" step="0.01" value="${parseFloat(goal.CurrentSaved || 0)}">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Deadline</label>
        <input id="modalGoalDeadline" class="form-input" type="date" value="${escAttr(goal.Deadline)}">
      </div>
    `, async () => {
      const newName = document.getElementById('modalGoalName').value;
      await API.updateGoal({
        goalName:       document.getElementById('modalGoalOrigName').value,
        newGoalName:    newName !== origName ? newName : undefined,
        targetAmount:   document.getElementById('modalGoalTarget').value,
        currentSaved:   document.getElementById('modalGoalSaved').value,
        deadline:       document.getElementById('modalGoalDeadline').value
      });
      Render.toast('Goal updated.');
      await fetchSheetData();
    });
  }

  async function deleteGoal(goalName) {
    if (!confirm(`Delete goal "${goalName}"? This cannot be undone.`)) return;
    try {
      await API.deleteGoal(goalName);
      Render.toast('Goal deleted.');
      await fetchSheetData();
    } catch (err) {
      Render.toast('Error: ' + err.message, 'error');
    }
  }

  async function addGoal(e) {
    e.preventDefault();
    const btn = document.getElementById('addGoalBtn');
    btn.disabled = true;
    btn.textContent = 'SAVING...';

    const payload = {
      goalName:      document.getElementById('goalName').value,
      targetAmount:  document.getElementById('goalTarget').value,
      currentSaved:  document.getElementById('goalInitialSaved').value || '0',
      deadline:      document.getElementById('goalDeadline').value || 'N/A'
    };

    try {
      await API.addGoal(payload);
      Render.toast('Goal added!');
      document.getElementById('goalForm').reset();
      await fetchSheetData();
    } catch (err) {
      Render.toast('Error: ' + err.message, 'error');
    }
    btn.disabled = false;
    btn.textContent = 'CREATE GOAL';
  }

  // ── MODAL ────────────────────────────────────────

  let modalCallback = null;

  function openModal(title, bodyHTML, onSave) {
    const overlay = document.getElementById('modalOverlay');
    const titleEl = document.getElementById('modalTitle');
    const bodyEl   = document.getElementById('modalBody');
    if (!overlay || !titleEl || !bodyEl) return;
    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;
    modalCallback = onSave;
    overlay.classList.add('active');
  }

  function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('active');
    modalCallback = null;
  }

  async function modalSave() {
    if (typeof modalCallback === 'function') {
      const btn = document.getElementById('modalSaveBtn');
      if (btn) { btn.disabled = true; btn.textContent = 'SAVING...'; }
      try { await modalCallback(); } catch (err) { Render.toast('Error: ' + err.message, 'error'); }
      if (btn) { btn.disabled = false; btn.textContent = 'SAVE'; }
    }
    closeModal();
  }

  // ── EVENT BINDING ────────────────────────────────

  function bindEvents() {
    // Login form
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);

    // Login page dark mode toggle
    document.getElementById('loginDarkModeBtn')?.addEventListener('click', toggleDarkMode);

    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    // Sidebar nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-nav');
        if (view) switchView(view);
      });
    });

    // Mobile nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.getAttribute('data-nav');
        if (view) switchView(view);
      });
    });

    // Dark mode
    document.getElementById('darkModeBtn')?.addEventListener('click', toggleDarkMode);

    // Refresh
    document.getElementById('refreshBtn')?.addEventListener('click', fetchSheetData);

    // Test connection (settings page)
    document.getElementById('testConnBtn')?.addEventListener('click', testConnection);

    // Transaction form
    document.getElementById('txnForm')?.addEventListener('submit', submitTransaction);
    document.getElementById('cancelEditBtn')?.addEventListener('click', resetTransactionForm);

    // Recurring form
    document.getElementById('recurringForm')?.addEventListener('submit', addRecurring);

    // Goal form
    document.getElementById('goalForm')?.addEventListener('submit', addGoal);

    // Transaction search
    document.getElementById('txnSearch')?.addEventListener('input', () => {
      Render.transactions(getSearchQuery());
    });

    // Modal
    document.getElementById('modalCancelBtn')?.addEventListener('click', closeModal);
    document.getElementById('modalSaveBtn')?.addEventListener('click', modalSave);
    document.getElementById('modalOverlay')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Enter key on PIN field also submits login
    document.getElementById('loginPin')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleLogin(e);
      }
    });
  }

  // ── HELPERS ──────────────────────────────────────

  function escAttr(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ── PUBLIC API ───────────────────────────────────

  return {
    init, switchView, fetchSheetData, testConnection,
    editTransaction, deleteTransaction, submitTransaction,
    editRecurring, deleteRecurring,
    contributeToGoal, editGoal, deleteGoal,
    openModal, closeModal,
    handleLogout
  };

})();

document.addEventListener('DOMContentLoaded', () => App.init());
