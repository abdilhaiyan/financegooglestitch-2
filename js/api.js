/**
 * FamFinance — API Layer
 * All communication with the Google Apps Script backend.
 */

const API = (() => {

  function getEndpoint() {
    if (typeof FAMFINANCE_CONFIG !== 'undefined' && FAMFINANCE_CONFIG.endpoint) {
      return FAMFINANCE_CONFIG.endpoint;
    }
    console.warn('config.js not found — using placeholder endpoint.');
    return 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
  }

  /** Returns the logged-in username, or null */
  function currentUsername() {
    const user = sessionStorage.getItem('famfinance-user');
    if (user) {
      try { return JSON.parse(user).username; } catch (_) {}
    }
    return null;
  }

  async function post(payload) {
    const res = await fetch(getEndpoint(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // Google Apps Script sometimes returns opaque errors — try to get JSON
    let data;
    try {
      data = await res.json();
    } catch (_) {
      throw new Error(
        'The backend did not return valid JSON. This usually means:\n' +
        '• The Apps Script is not deployed as a Web App\n' +
        '• Or the deployment URL in js/config.js is wrong\n' +
        '• Go to Settings → check your URL, then try "Test Connection"'
      );
    }

    if (data.result === 'error') {
      throw new Error(data.error || 'Unknown server error.');
    }

    return data;
  }

  async function get(params = {}) {
    // Attach username to GET requests so backend filters transactions
    const uname = currentUsername();
    if (uname) params.username = uname;

    const url = new URL(getEndpoint());
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);

    const data = await res.json();
    if (data.result === 'error') throw new Error(data.error || 'Unknown server error.');
    return data;
  }

  // ── AUTH ──────────────────────────────────────────

  async function login(username, pin) {
    return post({ action: 'LOGIN', username, pin });
  }

  // ── DATA ──────────────────────────────────────────

  async function fetchAll() {
    return get({ action: 'GET_ALL' });
  }

  /** Ping the backend to test connectivity (no sheet access needed) */
  async function ping() {
    return get({ action: 'ping' });
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

  async function contributeToGoal(goalName, contributionAmount) {
    return post({ action: 'UPDATE_GOAL', goalName, contributionAmount });
  }

  return {
    login, ping, fetchAll,
    addTransaction, updateTransaction, deleteTransaction,
    addRecurring, updateRecurring, deleteRecurring,
    addGoal, updateGoal, deleteGoal,
    contributeToGoal
  };

})();
