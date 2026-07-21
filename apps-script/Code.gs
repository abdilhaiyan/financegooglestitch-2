/**
 * FamFinance Master Backend Script
 * Synchronized with: Transactions, RecurringPayments, and FamilyGoals
 * Deploy as a Web App (Execute as: Me, Access: Anyone)
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  var lockAcquired = lock.tryLock(10000);

  if (!lockAcquired) {
    return sendResponse({ result: "error", error: "Server busy. Please retry." });
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("No post data received.");
    }

    var data = JSON.parse(e.postData.contents);
    var action = data.action || "ADD_TRANSACTION";

    // ── TRANSACTIONS ──────────────────────────────────

    if (action === "ADD_TRANSACTION") {
      return addTransaction(ss, data);
    }

    if (action === "UPDATE_TRANSACTION") {
      return updateTransaction(ss, data);
    }

    if (action === "DELETE_TRANSACTION") {
      return deleteTransaction(ss, data);
    }

    // ── RECURRING PAYMENTS ───────────────────────────

    if (action === "ADD_RECURRING") {
      return addRecurring(ss, data);
    }

    if (action === "UPDATE_RECURRING") {
      return updateRecurring(ss, data);
    }

    if (action === "DELETE_RECURRING") {
      return deleteRecurring(ss, data);
    }

    // ── FAMILY GOALS ─────────────────────────────────

    if (action === "ADD_GOAL") {
      return addGoal(ss, data);
    }

    if (action === "UPDATE_GOAL") {
      return updateGoal(ss, data);
    }

    if (action === "DELETE_GOAL") {
      return deleteGoal(ss, data);
    }

    return sendResponse({ result: "error", error: "Invalid POST action: " + action });

  } catch (error) {
    return sendResponse({ result: "error", error: error.toString() });
  } finally {
    lock.releaseLock();
  }
}

// ─────────────────────────────────────────────────────
//  TRANSACTION HANDLERS
// ─────────────────────────────────────────────────────

function addTransaction(ss, data) {
  var sheet = ss.getSheetByName("Transactions");
  if (!sheet) throw new Error("Sheet 'Transactions' not found.");

  var amountVal = parseFloat(data.amount) || 0;

  // Force expense amounts negative for proper sum formulas
  if (data.type === "EXPENSE" && amountVal > 0) {
    amountVal = -amountVal;
  }

  var formattedDate = data.date || Utilities.formatDate(
    new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd"
  );

  var timestamp = Utilities.formatDate(
    new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm:ss"
  );

  sheet.appendRow([
    data.transactionID || "TXN-" + Math.floor(100000 + Math.random() * 900000),
    formattedDate,
    data.user || "Family Member",
    data.merchant || "Uncategorized",
    data.category || "General",
    amountVal,
    data.status || "Settled",
    timestamp
  ]);

  return sendResponse({ result: "success", message: "Transaction added." });
}

function updateTransaction(ss, data) {
  if (!data.transactionID) throw new Error("transactionID is required to update.");

  var sheet = ss.getSheetByName("Transactions");
  if (!sheet) throw new Error("Sheet 'Transactions' not found.");

  var values = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim() === data.transactionID.toString().trim()) {
      var row = i + 1; // 1-indexed

      if (data.date !== undefined) {
        sheet.getRange(row, 2).setValue(data.date);
      }
      if (data.user !== undefined) {
        sheet.getRange(row, 3).setValue(data.user);
      }
      if (data.merchant !== undefined) {
        sheet.getRange(row, 4).setValue(data.merchant);
      }
      if (data.category !== undefined) {
        sheet.getRange(row, 5).setValue(data.category);
      }
      if (data.amount !== undefined) {
        var amt = parseFloat(data.amount);
        if (data.type === "EXPENSE" && amt > 0) amt = -amt;
        sheet.getRange(row, 6).setValue(amt);
      }
      if (data.status !== undefined) {
        sheet.getRange(row, 7).setValue(data.status);
      }

      // Update timestamp
      sheet.getRange(row, 8).setValue(
        Utilities.formatDate(new Date(), ss.getSpreadsheetTimeZone(), "yyyy-MM-dd HH:mm:ss")
      );

      found = true;
      break;
    }
  }

  if (!found) throw new Error("Transaction '" + data.transactionID + "' not found.");
  return sendResponse({ result: "success", message: "Transaction updated." });
}

function deleteTransaction(ss, data) {
  if (!data.transactionID) throw new Error("transactionID is required to delete.");

  var sheet = ss.getSheetByName("Transactions");
  if (!sheet) throw new Error("Sheet 'Transactions' not found.");

  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim() === data.transactionID.toString().trim()) {
      sheet.deleteRow(i + 1);
      return sendResponse({ result: "success", message: "Transaction deleted." });
    }
  }

  throw new Error("Transaction '" + data.transactionID + "' not found.");
}

// ─────────────────────────────────────────────────────
//  RECURRING PAYMENT HANDLERS
// ─────────────────────────────────────────────────────

function addRecurring(ss, data) {
  var sheet = ss.getSheetByName("RecurringPayments");
  if (!sheet) throw new Error("Sheet 'RecurringPayments' not found.");

  sheet.appendRow([
    data.billID || "BILL-" + Math.floor(10000 + Math.random() * 90000),
    data.name || "Untitled Bill",
    parseFloat(data.amount) || 0,
    data.dueDate || "1",
    data.category || "General",
    data.payLink || ""
  ]);

  return sendResponse({ result: "success", message: "Recurring payment added." });
}

function updateRecurring(ss, data) {
  if (!data.billID) throw new Error("billID is required to update.");

  var sheet = ss.getSheetByName("RecurringPayments");
  if (!sheet) throw new Error("Sheet 'RecurringPayments' not found.");

  var values = sheet.getDataRange().getValues();
  var found = false;

  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim() === data.billID.toString().trim()) {
      var row = i + 1;

      if (data.name !== undefined) sheet.getRange(row, 2).setValue(data.name);
      if (data.amount !== undefined) sheet.getRange(row, 3).setValue(parseFloat(data.amount));
      if (data.dueDate !== undefined) sheet.getRange(row, 4).setValue(data.dueDate);
      if (data.category !== undefined) sheet.getRange(row, 5).setValue(data.category);
      if (data.payLink !== undefined) sheet.getRange(row, 6).setValue(data.payLink);

      found = true;
      break;
    }
  }

  if (!found) throw new Error("Recurring payment '" + data.billID + "' not found.");
  return sendResponse({ result: "success", message: "Recurring payment updated." });
}

function deleteRecurring(ss, data) {
  if (!data.billID) throw new Error("billID is required to delete.");

  var sheet = ss.getSheetByName("RecurringPayments");
  if (!sheet) throw new Error("Sheet 'RecurringPayments' not found.");

  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim() === data.billID.toString().trim()) {
      sheet.deleteRow(i + 1);
      return sendResponse({ result: "success", message: "Recurring payment deleted." });
    }
  }

  throw new Error("Recurring payment '" + data.billID + "' not found.");
}

// ─────────────────────────────────────────────────────
//  FAMILY GOAL HANDLERS
// ─────────────────────────────────────────────────────

function addGoal(ss, data) {
  var sheet = ss.getSheetByName("FamilyGoals");
  if (!sheet) throw new Error("Sheet 'FamilyGoals' not found.");

  sheet.appendRow([
    data.goalName || "New Goal",
    parseFloat(data.targetAmount) || 0,
    parseFloat(data.currentSaved) || 0,
    data.deadline || "N/A"
  ]);

  return sendResponse({ result: "success", message: "Goal added." });
}

function updateGoal(ss, data) {
  if (!data.goalName) throw new Error("goalName is required to update.");

  var sheet = ss.getSheetByName("FamilyGoals");
  if (!sheet) throw new Error("Sheet 'FamilyGoals' not found.");

  var values = sheet.getDataRange().getValues();
  var goalFound = false;

  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toLowerCase() === data.goalName.toString().trim().toLowerCase()) {
      var row = i + 1;

      // If contributionAmount is provided, add it to current saved
      if (data.contributionAmount !== undefined) {
        var currentSaved = parseFloat(values[i][2]) || 0;
        var contribution = parseFloat(data.contributionAmount) || 0;
        sheet.getRange(row, 3).setValue(currentSaved + contribution);
      }

      if (data.targetAmount !== undefined) {
        sheet.getRange(row, 2).setValue(parseFloat(data.targetAmount));
      }
      if (data.currentSaved !== undefined && data.contributionAmount === undefined) {
        sheet.getRange(row, 3).setValue(parseFloat(data.currentSaved));
      }
      if (data.deadline !== undefined) {
        sheet.getRange(row, 4).setValue(data.deadline);
      }
      if (data.newGoalName !== undefined) {
        sheet.getRange(row, 1).setValue(data.newGoalName);
      }

      goalFound = true;
      break;
    }
  }

  if (!goalFound) throw new Error("Goal '" + data.goalName + "' not found.");
  return sendResponse({ result: "success", message: "Goal updated." });
}

function deleteGoal(ss, data) {
  if (!data.goalName) throw new Error("goalName is required to delete.");

  var sheet = ss.getSheetByName("FamilyGoals");
  if (!sheet) throw new Error("Sheet 'FamilyGoals' not found.");

  var values = sheet.getDataRange().getValues();

  for (var i = 1; i < values.length; i++) {
    if (values[i][0].toString().trim().toLowerCase() === data.goalName.toString().trim().toLowerCase()) {
      sheet.deleteRow(i + 1);
      return sendResponse({ result: "success", message: "Goal deleted." });
    }
  }

  throw new Error("Goal '" + data.goalName + "' not found.");
}

// ─────────────────────────────────────────────────────
//  GET HANDLER
// ─────────────────────────────────────────────────────

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "GET_ALL";

  try {
    if (action === "GET_ALL") {
      return sendResponse({
        result: "success",
        transactions: fetchSheetAsJSON(ss, "Transactions"),
        recurring: fetchSheetAsJSON(ss, "RecurringPayments"),
        goals: fetchSheetAsJSON(ss, "FamilyGoals")
      });
    }

    if (action === "getTransactions") {
      return sendResponse(fetchSheetAsJSON(ss, "Transactions"));
    }

    if (action === "getRecurring") {
      return sendResponse(fetchSheetAsJSON(ss, "RecurringPayments"));
    }

    if (action === "getGoals") {
      return sendResponse(fetchSheetAsJSON(ss, "FamilyGoals"));
    }

    return sendResponse({ result: "error", error: "Invalid GET action: " + action });

  } catch (error) {
    return sendResponse({ result: "error", error: error.toString() });
  }
}

// ─────────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────────

function fetchSheetAsJSON(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  var headers = values.shift();
  var timeZone = ss.getSpreadsheetTimeZone();

  return values.map(function (row) {
    var obj = {};
    headers.forEach(function (header, i) {
      var val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, timeZone, "yyyy-MM-dd");
      }
      obj[header] = val;
    });
    return obj;
  });
}

function sendResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
