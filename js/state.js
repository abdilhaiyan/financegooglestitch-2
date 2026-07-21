/**
 * FamFinance — Application State
 * Centralised data store + computed helpers.
 */

const Store = (() => {

  const state = {
    transactions: [],
    recurring: [],
    goals: [],
    loading: false,
    lastError: null
  };

  /** Replace all data from a GET_ALL response */
  function setAll(data) {
    state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
    state.recurring    = Array.isArray(data.recurring)    ? data.recurring    : [];
    state.goals        = Array.isArray(data.goals)        ? data.goals        : [];
  }

  // ── COMPUTED HELPERS ────────────────────────────

  /** Total income (positive amounts) */
  function totalIncome() {
    return state.transactions
      .filter(t => parseFloat(t.Amount) > 0)
      .reduce((sum, t) => sum + parseFloat(t.Amount), 0);
  }

  /** Total expenses (negative amounts, absolute) */
  function totalExpenses() {
    return state.transactions
      .filter(t => parseFloat(t.Amount) < 0)
      .reduce((sum, t) => sum + Math.abs(parseFloat(t.Amount)), 0);
  }

  /** Net balance */
  function netBalance() {
    return state.transactions.reduce((sum, t) => sum + parseFloat(t.Amount || 0), 0);
  }

  /** Income this month */
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

  /** Expenses this month (absolute) */
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

  /** Net this month */
  function netThisMonth() {
    return incomeThisMonth() - expensesThisMonth();
  }

  /** Upcoming bills count (due date >= today's day of month) */
  function upcomingBillsCount() {
    const today = new Date().getDate();
    return state.recurring.filter(b => {
      const due = parseInt(b.DueDate, 10);
      return !isNaN(due) && due >= today;
    }).length;
  }

  /** Total recurring monthly cost */
  function totalRecurringCost() {
    return state.recurring.reduce((sum, b) => sum + parseFloat(b.Amount || 0), 0);
  }

  /** Total goals progress */
  function totalGoalProgress() {
    const totalTarget = state.goals.reduce((s, g) => s + parseFloat(g.TargetAmount || 0), 0);
    const totalSaved  = state.goals.reduce((s, g) => s + parseFloat(g.CurrentSaved || 0), 0);
    return { target: totalTarget, saved: totalSaved, pct: totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0 };
  }

  /** Recent N transactions */
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
    setAll,
    totalIncome, totalExpenses, netBalance,
    incomeThisMonth, expensesThisMonth, netThisMonth,
    upcomingBillsCount, totalRecurringCost,
    totalGoalProgress, recentTransactions
  };

})();
