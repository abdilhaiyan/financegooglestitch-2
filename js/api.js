/**
 * FamFinance — API Layer
 * All communication with the Google Apps Script backend.
 */

const API = (() => {

  function getEndpoint() {
    // Falls back to the config.example value if config.js is missing
    if (typeof FAMFINANCE_CONFIG !== 'undefined' && FAMFINANCE_CONFIG.endpoint) {
      return FAMFINANCE_CONFIG.endpoint;
    }
    console.warn('config.js not found — using placeholder endpoint.');
    return 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
  }

  /**
   * Generic POST helper. Returns parsed JSON or throws.
   */
  async function post(payload) {
    const res = await fetch(getEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();

    if (data.result === 'error') {
      throw new Error(data.error || 'Unknown server error.');
    }

    return data;
  }

  /**
   * Generic GET helper.
   */
  async function get(params = {}) {
    const url = new URL(getEndpoint());
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (data.result === 'error') throw new Error(data.error || 'Unknown server error.');
    return data;
  }

  // ── PUBLIC METHODS ─────────────────────────────

  /** Fetch all data in one round-trip */
  async function fetchAll() {
    return get({ action: 'GET_ALL' });
  }

  // Transactions
  async function addTransaction(txn) {
    return post({ action: 'ADD_TRANSACTION', ...txn });
  }

  async function updateTransaction(txn) {
    return post({ action: 'UPDATE_TRANSACTION', ...txn });
  }

  async function deleteTransaction(transactionID) {
    return post({ action: 'DELETE_TRANSACTION', transactionID });
  }

  // Recurring Payments
  async function addRecurring(bill) {
    return post({ action: 'ADD_RECURRING', ...bill });
  }

  async function updateRecurring(bill) {
    return post({ action: 'UPDATE_RECURRING', ...bill });
  }

  async function deleteRecurring(billID) {
    return post({ action: 'DELETE_RECURRING', billID });
  }

  // Family Goals
  async function addGoal(goal) {
    return post({ action: 'ADD_GOAL', ...goal });
  }

  async function updateGoal(goal) {
    return post({ action: 'UPDATE_GOAL', ...goal });
  }

  async function deleteGoal(goalName) {
    return post({ action: 'DELETE_GOAL', goalName });
  }

  /** Add funds to an existing goal */
  async function contributeToGoal(goalName, contributionAmount) {
    return post({ action: 'UPDATE_GOAL', goalName, contributionAmount });
  }

  return {
    fetchAll,
    addTransaction, updateTransaction, deleteTransaction,
    addRecurring, updateRecurring, deleteRecurring,
    addGoal, updateGoal, deleteGoal,
    contributeToGoal
  };

})();
