/**
 * FamFinance — Application State
 * Centralised data store + computed helpers + user session.
 */

const Store = (() => {

  const state = {
    transactions: [],
    recurring: [],
    goals: [],
    loading: false,
    lastError: null,
    // Auth
    currentUser: null,     // { username, displayName } or null
    isLoggedIn: false
  };

  // ── AUTH ──────────────────────────────────────────

  function login(user) {
    state.currentUser = user;
    state.isLoggedIn = true;
    sessionStorage.setItem('famfinance-user', JSON.stringify(user));
  }

  function logout() {
    state.currentUser = null;
    state.isLoggedIn = false;
    state.transactions = [];
    state.recurring = [];
    state.goals = [];
    sessionStorage.removeItem('famfinance-user');
  }

  /** Restore session from sessionStorage on page load */
  function restoreSession() {
    const raw = sessionStorage.getItem('famfinance-user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        if (user && user.username) {
          state.currentUser = user;
          state.isLoggedIn = true;
          return true;
        }
      } catch (_) {}
    }
    return false;
  }

  // ── DATA ──────────────────────────────────────────

  function setAll(data) {
    state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
    state.recurring    = Array.isArray(data.recurring)    ? data.recurring    : [];
    state.goals        = Array.isArray(data.goals)        ? data.goals        : [];
  }

  // ── COMPUTED HELPERS ────────────────────────────

  function totalIncome() {
    return state.transactions
      .filter(t => parseFloat(t.Amount) > 0)
      .reduce((sum, t) => sum + parseFloat(t.Amount), 0);
  }

  function totalExpenses() {
    return state.transactions
      .filter(t => parseFloat(t.Amount) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.Amount)), 0);
  }

  function netBalance() {
    return state.transactions.reduce((sum, t) => sum + parseFloat(t.Amount || 0), 0);
  }

  function incomeThisMonth() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return state.transactions
      .filter(t => {
        const d = t.Date ? String(t.Date).substring(0, 7) : '';
        return d === month && parseFloat(t.Amount) > 0;
      })
      .reduce((sum, t) => sum + parseFloat(t.Amount), 0);
  }

  function expensesThisMonth() {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    return state.transactions
      .filter(t => {
        const d = t.Date ? String(t.Date).substring(0, 7) : '';
        return d === month && parseFloat(t.Amount) < 0;
      })
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.Amount)), 0);
  }

  function netThisMonth() {
    return incomeThisMonth() - expensesThisMonth();
  }

  function upcomingBillsCount() {
    const today = new Date().getDate();
    return state.recurring.filter(b => {
      const due = parseInt(b.DueDate, 10);
      return !isNaN(due) && due >= today;
    }).length;
  }

  function totalRecurringCost() {
    return state.recurring.reduce((sum, b) => sum + parseFloat(b.Amount || 0), 0);
  }

  function totalGoalProgress() {
    const totalTarget = state.goals.reduce((s, g) => s + parseFloat(g.TargetAmount || 0), 0);
    const totalSaved  = state.goals.reduce((s, g) => s + parseFloat(g.CurrentSaved || 0), 0);
    return { target: totalTarget, saved: totalSaved, pct: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0 };
  }

  function recentTransactions(n = 5) {
    return [...state.transactions]
      .sort((a, b) => {
        const da = a.Date || '0000';
        const db = b.Date || '0000';
        return db.localeCompare(da);
      })
      .slice(0, n);
  }

  return {
    state,
    login, logout, restoreSession,
    setAll,
    totalIncome, totalExpenses, netBalance,
    incomeThisMonth, expensesThisMonth, netThisMonth,
    upcomingBillsCount, totalRecurringCost,
    totalGoalProgress, recentTransactions
  };

})();
