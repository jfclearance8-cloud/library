function doGet(e) {
    return ContentService.createTextOutput(JSON.stringify({status: "success", message: "IQRAA backend ready"})).setMimeType(ContentService.MimeType.JSON);
}
function testConnection() {
    return "Connection Successful!";
}
// Normalize IDs (numbers, floating-point string representations, etc.) to canonical string keys
function normalizeId(id) {
    // IDs are identifiers, never floating point numbers. Preserve leading zeros.
    return id == null ? "" : String(id).trim();
}
// 1. ADVANCED DASHBOARD DATA (100% Accurate Calculation)
function getDashboardData(timeFilter) {
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var booksData = ss.getSheetByName("Books").getDataRange().getValues();
        var membersData = ss.getSheetByName("Members").getDataRange().getValues();
        var tSheet = ss.getSheetByName("Transactions");
        var totalBooks = 0;
        var categories = {}; var bookNames = {};
        // Books Data Processing
        for (var i = 1; i < booksData.length; i++) {
            if (booksData[i] && booksData[i][0]) {
                var bId = normalizeId(booksData[i][0]);
                var tCop = Number(booksData[i][5]);
                if (isNaN(tCop) || tCop <= 0) tCop = 1; // എണ്ണം നൽകാൻ വിട്ടുപോയാൽ 1 ആയി പരിഗണിക്കാൻ
                var cat = booksData[i][3] ? booksData[i][3].toString().trim() : "Others";
                bookNames[bId] = booksData[i][1];
                totalBooks += tCop;
                // കാറ്റഗറി എണ്ണം: ഓരോ ബുക്കും ഓരോന്നായി എണ്ണുന്നു (കോപ്പികളുടെ എണ്ണമല്ല)
                if (!categories[cat]) categories[cat] = 0;
                categories[cat] += 1;
            }
        }
        // Members Processing
        var totalMembers = 0; var memberNames = {};
        for (var m = 1; m < membersData.length; m++) {
            if (membersData[m] && membersData[m][0]) {
                totalMembers++;
                memberNames[normalizeId(membersData[m][0])] = membersData[m][1];
            }
        }
        var issuedBooks = 0; var overdueCount = 0;
        var topReaders = []; var topBooksArr = [];
        var recentlyAdded = [];
        if (tSheet) {
            var transData = tSheet.getDataRange().getValues();
            var readerCount = {}; var bookCount = {};
            var today = new Date(); today.setHours(0, 0, 0, 0);
            for (var t = 1; t < transData.length; t++) {
                if (!transData[t] || !transData[t][0]) continue;
                var memberId = normalizeId(transData[t][2]);
                var bookId = normalizeId(transData[t][1]);
                var status = transData[t][7];
                var dueDateVal = transData[t][4];
                // കൃത്യമായ Issue Count (Transactions ൽ നിന്നെടുക്കുന്നു)
                if (status === "Issued") {
                    issuedBooks++;
                }
                // Count for Top Readers & Books
                var inPeriod = !timeFilter || timeFilter === "all" || parseLibraryDate_(transData[t][3]) >= periodStart_(timeFilter);
                if (memberId && inPeriod) { readerCount[memberId] = (readerCount[memberId] || 0) + 1; }
                if (bookId && inPeriod) { bookCount[bookId] = (bookCount[bookId] || 0) + 1; }
                // Overdue Count
                if (status === "Issued" && dueDateVal) {
                    var dueDate = parseLibraryDate_(dueDateVal);
                    dueDate.setHours(0, 0, 0, 0);
                    if (dueDate < today) overdueCount++;
                }
            }
            var sortableReaders = [];
            for (var id in readerCount) sortableReaders.push({ id: id, name: memberNames[id] || "Unknown", count: readerCount[id] });
            sortableReaders.sort((a, b) => b.count - a.count); topReaders = sortableReaders.slice(0, 3);
            var sortableBooks = [];
            for (var b_id in bookCount) sortableBooks.push({ title: bookNames[b_id] || b_id, count: bookCount[b_id] });
            sortableBooks.sort((a, b) => b.count - a.count); topBooksArr = sortableBooks.slice(0, 3);
        }
        var availableBooks = totalBooks - issuedBooks; // കൃത്യമായ Available Books കണക്ക്
        // Recently Added Books (Last 5)
        var startIndex = Math.max(1, booksData.length - 5);
        for (var r = booksData.length - 1; r >= startIndex; r--) {
            if (booksData[r] && booksData[r][0]) {
                recentlyAdded.push({ id: booksData[r][0], title: booksData[r][1], category: booksData[r][3] });
            }
        }
        return { totalBooks, issuedBooks, availableBooks, totalMembers, overdueCount, categories, recentlyAdded, topReaders, topBooksArr };
    } catch (e) { return { "error": e.toString() }; }
}
// 2. BOOKS MANAGEMENT
function addNewBook_(details) {
    details = details || {};
    var id = requiredText_(details.bookId, "Book ID"), title = requiredText_(details.title, "Title");
    var total = positiveInteger_(details.totalCopies, "Total copies");
    var sheet = sheet_("Books");
    if (findRow_(sheet, id)) throw new Error("This Book ID already exists.");
    appendTextRow_(sheet, [id, title, details.author || "", requiredText_(details.category, "Category"), details.rackNo || "", total, total, details.price || "", details.type || "Issuable"]);
    return "പുസ്തകം വിജയകരമായി ചേർത്തു!";
}
function getAllBooks() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var booksData = ss.getSheetByName("Books").getDataRange().getDisplayValues();
    var transData = ss.getSheetByName("Transactions").getDataRange().getValues();
    // യഥാർത്ഥ Available Books കണ്ടെത്താൻ Transactions പരിശോധിക്കുന്നു
    var issuedCounts = {};
    for (var t = 1; t < transData.length; t++) {
        if (transData[t][7] === "Issued") {
            var bId = transData[t][1].toString().trim();
            issuedCounts[bId] = (issuedCounts[bId] || 0) + 1;
        }
    }
    var list = [];
    for (var i = 1; i < booksData.length; i++) {
        if (booksData[i][0] !== "") {
            var bId = booksData[i][0].toString().trim();
            var total = Number(booksData[i][5]) || 1;
            var currentlyIssued = issuedCounts[bId] || 0;
            var actualAvailable = Math.max(0, total - currentlyIssued); // 100% Accurate
            list.push({ id: bId, title: booksData[i][1], author: booksData[i][2], category: booksData[i][3], rack: booksData[i][4], total: total, available: actualAvailable, type: booksData[i][8] });
        }
    }
    return list;
}
// പുസ്തകം ആരൊക്കെ എടുത്തു എന്ന് കണ്ടെത്താൻ (Book History)
function getBookHistory(bookId) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var transData = ss.getSheetByName("Transactions").getDataRange().getValues();
    var membersData = ss.getSheetByName("Members").getDataRange().getValues();
    var memberNames = {};
    for (var m = 1; m < membersData.length; m++) {
        memberNames[normalizeId(membersData[m][0])] = membersData[m][1];
    }
    var history = [];
    var searchBookId = normalizeId(bookId);
    for (var i = 1; i < transData.length; i++) {
        if (normalizeId(transData[i][1]) === searchBookId) {
            var mId = normalizeId(transData[i][2]);
            var iDate = transData[i][3] instanceof Date ? Utilities.formatDate(transData[i][3], "GMT+05:30", "dd/MM/yyyy") : transData[i][3];
            var rDate = transData[i][5] instanceof Date ? Utilities.formatDate(transData[i][5], "GMT+05:30", "dd/MM/yyyy") : (transData[i][5] || "-");
            history.push({
                student: memberNames[mId] ? memberNames[mId] + " (" + mId + ")" : mId,
                issueDate: iDate,
                returnDate: rDate,
                status: transData[i][7]
            });
        }
    }
    return history.reverse();
}
// 3. MEMBERS MANAGEMENT & HISTORY
function addNewMember_(details) {
    details = details || {};
    var id = requiredText_(details.memberId, "Student ID"), name = requiredText_(details.name, "Name");
    var sheet = sheet_("Members");
    if (findRow_(sheet, id)) throw new Error("This Student ID already exists.");
    appendTextRow_(sheet, [id, name, details.role || "Student", details.className || "", "Active"]);
    return "അംഗത്തെ വിജയകരമായി ചേർത്തു!";
}
function getAllMembers() {
    var data = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Members").getDataRange().getDisplayValues(); var list = [];
    for (var i = 1; i < data.length; i++) if (data[i][0]) list.push({ id: data[i][0], name: data[i][1], role: data[i][2], className: data[i][3], status: data[i][4] }); return list;
}
function getMemberProfileData(memberId) {
    var ss = SpreadsheetApp.getActiveSpreadsheet(); var transData = ss.getSheetByName("Transactions").getDataRange().getValues(); var booksData = ss.getSheetByName("Books").getDataRange().getValues();
    var bookNames = {}; for (var b = 1; b < booksData.length; b++) bookNames[normalizeId(booksData[b][0])] = booksData[b][1];
    var currentlyIssued = []; var history = [];
    var searchMemberId = normalizeId(memberId);
    for (var i = 1; i < transData.length; i++) {
        if (normalizeId(transData[i][2]) === searchMemberId) {
            var bName = bookNames[normalizeId(transData[i][1])] || transData[i][1];
            var iDate = transData[i][3] instanceof Date ? Utilities.formatDate(transData[i][3], "GMT+05:30", "dd/MM/yyyy") : transData[i][3];
            var dDate = transData[i][4] instanceof Date ? Utilities.formatDate(transData[i][4], "GMT+05:30", "dd/MM/yyyy") : transData[i][4];
            if (transData[i][7] === "Issued") currentlyIssued.push({ book: bName, issueDate: iDate, dueDate: dDate });
            else history.push({ book: bName, issueDate: iDate, fine: transData[i][6] || 0 });
        }
    } return { current: currentlyIssued, history: history };
}
// 4. ISSUE, RETURN, RENEW, RESERVE & FINES (COMBINED TAB)
function issueBookToStudent_(bookId, memberId, adminOverride) {
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet(); var booksSheet = ss.getSheetByName("Books"); var transSheet = ss.getSheetByName("Transactions"); var transData = transSheet.getDataRange().getValues();
        var searchBookId = normalizeId(bookId);
        var searchMemberId = normalizeId(memberId);
        if (!adminOverride) { for (var x = 1; x < transData.length; x++) { if (normalizeId(transData[x][2]) === searchMemberId && transData[x][7] === "Issued") return "WARNING: ഈ വിദ്യാർത്ഥിയുടെ കയ്യിൽ നിലവിൽ പുസ്തകമുണ്ട്. പുതിയത് നൽകണമോ?"; } }
        var booksData = booksSheet.getDataRange().getValues(); var bookRow = -1;
        for (var i = 1; i < booksData.length; i++) if (booksData[i][0] && normalizeId(booksData[i][0]) === searchBookId) { bookRow = i + 1; break; }
        if (bookRow == -1) return "Error: പുസ്തകം ലൈബ്രറിയിലില്ല!";
        if (booksData[bookRow - 1][8] == "Reference") return "Error: ഇത് റഫറൻസ് പുസ്തകമാണ്!";
        var issuedCount = 0;
        for (var t = 1; t < transData.length; t++) { if (normalizeId(transData[t][1]) === searchBookId && transData[t][7] === "Issued") issuedCount++; }
        if ((Number(booksData[bookRow - 1][5]) - issuedCount) <= 0) return "Error: പുസ്തകം നിലവിൽ സ്റ്റോക്കില്ല!";
        var membersData = ss.getSheetByName("Members").getDataRange().getValues(); var memberExists = false;
        for (var j = 1; j < membersData.length; j++) if (membersData[j][0] && normalizeId(membersData[j][0]) === searchMemberId) { memberExists = true; break; }
        if (!memberExists) return "Error: വിദ്യാർത്ഥിയെ കണ്ടെത്താനായില്ല!";
        var settings = getSystemSettings_(); var issueDate = new Date(); var dueDate = new Date(); dueDate.setDate(issueDate.getDate() + settings.maxDays);
        transSheet.appendRow(["TRN" + Utilities.getUuid(), bookId, memberId, Utilities.formatDate(issueDate, "GMT+05:30", "dd/MM/yyyy"), Utilities.formatDate(dueDate, "GMT+05:30", "dd/MM/yyyy"), "", 0, "Issued", ""]);
        var rSheet = ss.getSheetByName("Reservations");
        if (rSheet) { var rData = rSheet.getDataRange().getValues(); for (var r = 1; r < rData.length; r++) { if (rData[r][1].toString().trim() === bookId.toString().trim() && rData[r][2].toString().trim() === memberId.toString().trim() && rData[r][4] === "Waiting") rSheet.getRange(r + 1, 5).setValue("Fulfilled"); } }
        return "പുസ്തകം വിജയകരമായി ഇഷ്യൂ ചെയ്തു!";
    } catch (e) { return "Error: " + e.toString(); }
}
function returnBookFromStudent_(bookId, memberId) {
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet(); var transSheet = ss.getSheetByName("Transactions"); var transData = transSheet.getDataRange().getValues(); var transRow = -1; var dueDateStr = "";
        var searchBookId = normalizeId(bookId);
        var searchMemberId = normalizeId(memberId);
        for (var i = 1; i < transData.length; i++) { if (normalizeId(transData[i][1]) === searchBookId && normalizeId(transData[i][2]) === searchMemberId && transData[i][7] == "Issued") { transRow = i + 1; dueDateStr = transData[i][4]; break; } }
        if (transRow == -1) return "Error: ഈ പുസ്തകം എടുത്തതായി കാണുന്നില്ല!";
        var returnDate = new Date(); returnDate.setHours(0, 0, 0, 0); var fineAmount = 0; var fineStatus = "No Fine";
        if (dueDateStr) {
            var dueDate = parseLibraryDate_(dueDateStr);
            dueDate.setHours(0, 0, 0, 0);
            if (returnDate > dueDate) { var settings = getSystemSettings_(); fineAmount = Math.ceil(Math.abs(returnDate - dueDate) / (1000 * 60 * 60 * 24)) * settings.finePerDay; fineStatus = "Unpaid"; }
        }
        transSheet.getRange(transRow, 6).setValue(Utilities.formatDate(new Date(), "GMT+05:30", "dd/MM/yyyy")); transSheet.getRange(transRow, 7).setValue(fineAmount); transSheet.getRange(transRow, 8).setValue("Returned"); transSheet.getRange(transRow, 9).setValue(fineStatus);
        var msg = "പുസ്തകം വിജയകരമായി തിരികെ സ്വീകരിച്ചു!";
        if (fineAmount > 0) msg += " (Overdue ഫൈൻ: ₹" + fineAmount + ")";
        return msg;
    } catch (e) { return "Error: " + e.toString(); }
}
// പുതിയ ഓപ്ഷൻ: RENEW BOOK
function renewBook_(bookId, memberId) {
    try {
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var transSheet = ss.getSheetByName("Transactions");
        var transData = transSheet.getDataRange().getValues();
        var transRow = -1;
        var searchBookId = normalizeId(bookId);
        var searchMemberId = normalizeId(memberId);
        for (var i = 1; i < transData.length; i++) {
            if (normalizeId(transData[i][1]) === searchBookId &&
                normalizeId(transData[i][2]) === searchMemberId &&
                transData[i][7] === "Issued") {
                transRow = i + 1;
                break;
            }
        }
        if (transRow === -1) return "Error: ഈ വിദ്യാർത്ഥി ഈ പുസ്തകം എടുത്തതായി കാണുന്നില്ല!";
        var settings = getSystemSettings_();
        var newDueDate = new Date();
        newDueDate.setDate(newDueDate.getDate() + settings.maxDays);
        // അഞ്ചാമത്തെ കോളം (E Column) ആണ് Due Date
        transSheet.getRange(transRow, 5).setValue(Utilities.formatDate(newDueDate, "GMT+05:30", "dd/MM/yyyy"));
        return "പുസ്തകം വിജയകരമായി പുതുക്കി! പുതിയ തിയതി: " + Utilities.formatDate(newDueDate, "GMT+05:30", "dd/MM/yyyy");
    } catch (e) { return "Error: " + e.toString(); }
}
function getSystemSettings_() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Settings");
    if (!sheet) return { maxDays: 14, finePerDay: 1, password: "admin123" };
    var data = sheet.getDataRange().getValues();
    var settings = { maxDays: 14, finePerDay: 1, password: "admin123" };
    for (var i = 0; i < data.length; i++) {
        if (data[i][0] == "Max Days") settings.maxDays = Number(data[i][1]);
        if (data[i][0] == "Fine Per Day") settings.finePerDay = Number(data[i][1]);
        if (data[i][0] == "Admin Password") settings.password = data[i][1].toString();
    }
    return settings;
}
function updateSystemSettings_(maxDays, finePerDay, password) {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("Settings");
    if (!sheet) sheet = ss.insertSheet("Settings");
    maxDays = positiveInteger_(maxDays, "Maximum days");
    finePerDay = Number(finePerDay);
    if (!isFinite(finePerDay) || finePerDay < 0) throw new Error("Fine must be zero or greater.");
    password = password ? String(password) : getSystemSettings_().password;
    var data = sheet.getDataRange().getValues();
    var foundMaxDays = false;
    var foundFine = false;
    var foundPassword = false;
    for (var i = 0; i < data.length; i++) {
        if (data[i][0] == "Max Days") { sheet.getRange(i + 1, 2).setValue(maxDays); foundMaxDays = true; }
        if (data[i][0] == "Fine Per Day") { sheet.getRange(i + 1, 2).setValue(finePerDay); foundFine = true; }
        if (data[i][0] == "Admin Password") { sheet.getRange(i + 1, 2).setValue(password); foundPassword = true; }
    }
    if (!foundMaxDays) sheet.appendRow(["Max Days", maxDays]);
    if (!foundFine) sheet.appendRow(["Fine Per Day", finePerDay]);
    if (!foundPassword) sheet.appendRow(["Admin Password", password]);
    return "Settings Saved!";
}
function getFineDetails() { 
    var ss = SpreadsheetApp.getActiveSpreadsheet(); 
    var transData = ss.getSheetByName("Transactions").getDataRange().getValues(); 
    var membersData = ss.getSheetByName("Members").getDataRange().getValues(); 
    var memberNames = {}; 
    for (var m = 1; m < membersData.length; m++) {
        memberNames[normalizeId(membersData[m][0])] = membersData[m][1]; 
    }
    var unpaidList = []; 
    var totalPaid = 0; 
    var totalUnpaid = 0; 
    for (var i = 1; i < transData.length; i++) { 
        var amount = Number(transData[i][6]) || 0; 
        var status = transData[i][8]; 
        if (amount > 0) { 
            if (status == "Paid") {
                totalPaid += amount; 
            } else if (status == "Unpaid") { 
                totalUnpaid += amount; 
                var mId = normalizeId(transData[i][2]);
                unpaidList.push({ 
                    transId: transData[i][0], 
                    bookId: transData[i][1], 
                    memberId: transData[i][2], 
                    memberName: memberNames[mId] || "Unknown", 
                    amount: amount 
                }); 
            } 
        } 
    } 
    return { list: unpaidList, paidAmount: totalPaid, unpaidAmount: totalUnpaid }; 
}
function markFineAsPaid_(transId) { var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Transactions"); var data = sheet.getDataRange().getValues(); for (var i = 1; i < data.length; i++) { if (data[i][0] == transId) { sheet.getRange(i + 1, 9).setValue("Paid"); return "ഫൈൻ അടച്ചു!"; } } return "Error: Not found"; }
// 5. REPORTS DATA (WITH TIME FILTER)
function getReportsData(timeFilter) {
    timeFilter = timeFilter || 'all';
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var transData = ss.getSheetByName("Transactions").getDataRange().getValues();
    var membersData = ss.getSheetByName("Members").getDataRange().getValues();
    var booksData = ss.getSheetByName("Books").getDataRange().getValues();
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var filterDate = new Date(); filterDate.setHours(0, 0, 0, 0);
    if (timeFilter === 'month') filterDate.setDate(today.getDate() - 30);
    else if (timeFilter === 'year') filterDate.setDate(today.getDate() - 365);
    else filterDate = new Date(2000, 0, 1);
    var memberNames = {}; var memberClasses = {};
    for (var m = 1; m < membersData.length; m++) { 
        var mId = normalizeId(membersData[m][0]); 
        memberNames[mId] = membersData[m][1]; 
        memberClasses[mId] = membersData[m][3] || "N/A"; 
    }
    var bookNames = {}; 
    for (var b = 1; b < booksData.length; b++) {
        bookNames[normalizeId(booksData[b][0])] = booksData[b][1];
    }
    var overdueList = []; var bookCount = {}; var studentCount = {}; var classCount = {};
    var unpaidFine = 0, paidFine = 0;
    for (var i = 1; i < transData.length; i++) {
        if (!transData[i][0]) continue;
        var bId = normalizeId(transData[i][1]); 
        var mId = normalizeId(transData[i][2]);
        var status = transData[i][7]; var fineAmt = Number(transData[i][6]) || 0; var fStatus = transData[i][8];
        var issueDateVal = transData[i][3]; var issueDate = null;
        if (issueDateVal instanceof Date) issueDate = issueDateVal; else if (issueDateVal) { var p = issueDateVal.toString().split('/'); if (p.length === 3) issueDate = new Date(p[2], p[1] - 1, p[0]); }
        // Apply Filter to Stats
        if (issueDate && issueDate >= filterDate) {
            if (bId) { bookCount[bId] = (bookCount[bId] || 0) + 1; }
            if (mId) { studentCount[mId] = (studentCount[mId] || 0) + 1; var cls = memberClasses[mId]; classCount[cls] = (classCount[cls] || 0) + 1; }
            if (fineAmt > 0) { if (fStatus === "Paid") paidFine += fineAmt; else unpaidFine += fineAmt; }
        }
        // Overdue List
        if (status === "Issued") {
            var dDateVal = transData[i][4]; var dueDate = parseLibraryDate_(dDateVal);
            dueDate.setHours(0, 0, 0, 0);
            if (dueDate < today) overdueList.push({ student: memberNames[mId] + " (" + mId + ")", book: bookNames[bId] + " (" + bId + ")", days: Math.ceil(Math.abs(today - dueDate) / (1000 * 60 * 60 * 24)) });
        }
    }
    var popBooks = Object.keys(bookCount).map(k => ({ book: bookNames[k] || k, count: bookCount[k] })).sort((a, b) => b.count - a.count).slice(0, 10);
    var topStudents = Object.keys(studentCount).map(k => ({ student: memberNames[k] || k, count: studentCount[k] })).sort((a, b) => b.count - a.count).slice(0, 10);
    var classWise = Object.keys(classCount).map(k => ({ className: k, count: classCount[k] })).sort((a, b) => b.count - a.count);
    return { overdueList, popBooks, topStudents, classWise, paidFine, unpaidFine };
}
// 6. CATEGORIES WITH CUSTOM PREFIXES & BOOK EDIT DETAILS
function getCategoriesAndPrefixes() {
    var ss=SpreadsheetApp.getActiveSpreadsheet(), sheet=ss.getSheetByName("Categories"), list=[];
    if(sheet) sheet.getDataRange().getDisplayValues().slice(1).forEach(function(r){if(r[0]) list.push({category:r[0].trim(),prefix:r[1] || ""});});
    var seen={}; list.forEach(function(c){seen[c.category]=true;});
    sheet_("Books").getDataRange().getDisplayValues().slice(1).forEach(function(r){var cat=(r[3] || "").trim(); if(cat && !seen[cat]) {seen[cat]=true;list.push({category:cat,prefix:cat.replace(/[^a-zA-Z]/g,"").slice(0,3).toUpperCase() || "BK"});}});
    return list;
}
function addCategoryAndPrefix_(category, prefix) {
    try {
        category=requiredText_(category,"Category"); prefix=requiredText_(prefix,"Prefix");
        var ss = SpreadsheetApp.getActiveSpreadsheet();
        var sheet = ss.getSheetByName("Categories");
        if (!sheet) {
            sheet = ss.insertSheet("Categories");
            sheet.appendRow(["Category", "Prefix"]);
        }
        var data = sheet.getDataRange().getValues();
        var rowToUpdate = -1;
        for (var i = 1; i < data.length; i++) {
            if (data[i][0] && data[i][0].toString().toLowerCase().trim() === category.toLowerCase().trim()) {
                rowToUpdate = i + 1;
                break;
            }
        }
        if (rowToUpdate !== -1) {
            sheet.getRange(rowToUpdate, 2).setValue(prefix.toUpperCase().trim());
            return "കാറ്റഗറി കോഡ് പുതുക്കി!";
        } else {
            sheet.appendRow([category.trim(), prefix.toUpperCase().trim()]);
            return "പുതിയ കാറ്റഗറിയും കോഡും ചേർത്തു!";
        }
    } catch (e) {
        return "Error: " + e.toString();
    }
}
function updateBookDetails_(bookId, d) {
    var sheet = sheet_("Books"), row = findRow_(sheet, bookId);
    if (!row) throw new Error("Book not found.");
    var title = requiredText_(d.title, "Title"), total = positiveInteger_(d.totalCopies, "Total copies");
    var issued = sheet_("Transactions").getDataRange().getValues().slice(1).filter(function(t) { return normalizeId(t[1]) === normalizeId(bookId) && t[7] === "Issued"; }).length;
    if (total < issued) throw new Error("Total copies cannot be less than currently issued copies.");
    var values = sheet.getRange(row, 1, 1, 9).getValues()[0];
    var newId = d.newBookId === undefined ? normalizeId(bookId) : requiredText_(d.newBookId, "Book ID");
    validateIdChange_(sheet, bookId, newId);
    values[0] = newId;
    values[1] = title; values[2] = d.author || ""; values[3] = requiredText_(d.category, "Category");
    values[4] = d.rackNo || ""; values[5] = total; values[6] = total - issued;
    if (d.price !== undefined) values[7] = d.price;
    values[8] = d.type || "Issuable";
    updateWithReferences_(sheet, row, values.map(safeCell_), bookId, newId, 2);
    return "പുസ്തകത്തിന്റെ വിവരങ്ങൾ വിജയകരമായി പുതുക്കി!";
}
function updateMemberDetails_(memberId, d) {
    var sheet = sheet_("Members"), row = findRow_(sheet, memberId);
    if (!row) throw new Error("Student not found.");
    var name = requiredText_(d.name, "Name");
    var newId = d.newMemberId === undefined ? normalizeId(memberId) : requiredText_(d.newMemberId, "Student ID");
    validateIdChange_(sheet, memberId, newId);
    var values = sheet.getRange(row,1,1,5).getValues()[0];
    values[0]=newId; values[1]=safeCell_(name); values[3]=safeCell_(String(d.className || "").trim());
    updateWithReferences_(sheet,row,values,memberId,newId,3);
    return "വിദ്യാർത്ഥിയുടെ വിവരങ്ങൾ വിജയകരമായി പുതുക്കി!";
}
// --- API gateway for external connections (e.g. GitHub Pages) ---
function doPost(e) {
    var response;
    try { response = apiCall(JSON.parse(e.postData.contents)); }
    catch (err) { response = { success: false, error: err.message || String(err) }; }
    return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(ContentService.MimeType.JSON);
}

// All browser requests pass through this explicit gateway, including native Apps Script.
function apiCall(payload) {
    var lock;
    try {
        payload = payload || {};
        var name = payload.functionName, args = payload.args || [];
        if (!Array.isArray(args)) throw new Error("Invalid arguments.");
        var reads = {
            getCapabilities: function(){return {editRecordIds:true};},
            testConnection: testConnection, getDashboardData: getDashboardData,
            getAllBooks: getAllBooks, getAllMembers: getAllMembers,
            getCategoriesAndPrefixes: getCategoriesAndPrefixes,
            getSystemSettings: function() { var s = getSystemSettings_(); return {maxDays:s.maxDays, finePerDay:s.finePerDay}; }
        };
        var privateReads = {getBookHistory:getBookHistory, getMemberProfileData:getMemberProfileData, getFineDetails:getFineDetails, getReportsData:getReportsData};
        var writes = {
            addNewBook:addNewBook_, addNewMember:addNewMember_, updateBookDetails:updateBookDetails_,
            updateMemberDetails:updateMemberDetails_, issueBookToStudent:issueBookToStudent_,
            returnBookFromStudent:returnBookFromStudent_, renewBook:renewBook_,
            updateSystemSettings:updateSystemSettings_, markFineAsPaid:markFineAsPaid_,
            addCategoryAndPrefix:addCategoryAndPrefix_, deleteBook:deleteBook_, deleteMember:deleteMember_
        };
        if (name === "authenticateAdmin") return {success:true, result:authenticateAdmin_(args[0])};
        if (name === "validateSession") { requireSession_(payload.token); return {success:true,result:true}; }
        if (name === "logoutAdmin") { if (payload.token) CacheService.getScriptCache().remove("iqraa:"+payload.token); return {success:true,result:true}; }
        if (Object.prototype.hasOwnProperty.call(privateReads,name) || Object.prototype.hasOwnProperty.call(writes,name)) requireSession_(payload.token);
        var fn = Object.prototype.hasOwnProperty.call(reads,name) ? reads[name] : Object.prototype.hasOwnProperty.call(privateReads,name) ? privateReads[name] : Object.prototype.hasOwnProperty.call(writes,name) ? writes[name] : null;
        if (!fn) throw new Error("Unknown operation.");
        if (Object.prototype.hasOwnProperty.call(writes,name)) {
            lock = LockService.getScriptLock();
            if (!lock.tryLock(15000)) throw new Error("Another update is running. Please try again.");
        }
        var result = fn.apply(null,args);
        if ((typeof result === "string" && /^Error:/i.test(result)) || (result && result.error)) throw new Error(typeof result === "string" ? result : result.error);
        if (lock) SpreadsheetApp.flush();
        return {success:true,result:result};
    } catch(err) { return {success:false,error:err.message || String(err),code:err.code || "OPERATION_FAILED"}; }
    finally { if(lock) lock.releaseLock(); }
}
function authenticateAdmin_(password) {
    if (String(password || "") !== String(getSystemSettings_().password)) throw new Error("Incorrect admin password.");
    var token = Utilities.getUuid() + Utilities.getUuid();
    CacheService.getScriptCache().put("iqraa:"+token,"valid",21600);
    return {token:token, expiresAt:Date.now()+21600000};
}
function requireSession_(token) {
    if (!token || !CacheService.getScriptCache().get("iqraa:"+token)) {
        var error = new Error("Admin session expired. Please sign in again."); error.code="SESSION_EXPIRED"; throw error;
    }
}
function sheet_(name) {
    var sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
    if(!sheet) throw new Error(name+" sheet is missing."); return sheet;
}
function requiredText_(value,label) { var text=String(value == null ? "" : value).trim(); if(!text) throw new Error(label+" is required."); return text; }
function positiveInteger_(value,label) { var n=Number(value); if(!Number.isInteger(n) || n<1) throw new Error(label+" must be a positive whole number."); return n; }
function findRow_(sheet,id) {
    var rows=sheet.getDataRange().getDisplayValues(), key=normalizeId(id);
    for(var i=1;i<rows.length;i++) if(normalizeId(rows[i][0])===key) return i+1;
    return 0;
}
function safeCell_(value) { return typeof value === "string" && /^[=+@]/.test(value) ? "'"+value : value; }
function appendTextRow_(sheet,values) {
    var row=sheet.getLastRow()+1;
    sheet.getRange(row,1).setNumberFormat("@");
    sheet.getRange(row,1,1,values.length).setValues([values.map(safeCell_)]);
}
function parseLibraryDate_(value) {
    if(value instanceof Date) return new Date(value.getTime());
    var text=String(value || "").trim(), m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    return m ? new Date(Number(m[3]),Number(m[2])-1,Number(m[1])) : new Date(text);
}
function deleteRecord_(sheetName,id,transColumn) {
    var sheet=sheet_(sheetName), row=findRow_(sheet,id);
    if(!row) throw new Error("Record not found. Refresh the list and try again.");
    var history=sheet_("Transactions").getDataRange().getValues().slice(1);
    if(history.some(function(t){return normalizeId(t[transColumn])===normalizeId(id);})) throw new Error("This record has transaction history and cannot be deleted. Its history must be preserved.");
    sheet.deleteRow(row);
    return "Record deleted successfully.";
}
function deleteBook_(id) { return deleteRecord_("Books",requiredText_(id,"Book ID"),1); }
function deleteMember_(id) { return deleteRecord_("Members",requiredText_(id,"Student ID"),2); }

function periodStart_(filter) { var date=new Date(); date.setHours(0,0,0,0); if(filter==="week") date.setDate(date.getDate()-7); else if(filter==="month") date.setMonth(date.getMonth()-1); else if(filter==="year") date.setFullYear(date.getFullYear()-1); else date=new Date(2000,0,1); return date; }

function validateIdChange_(sheet,oldId,newId){
    var oldKey=normalizeId(oldId),newKey=String(newId).trim().replace(/\s+/g,"").toUpperCase();
    var rows=sheet.getDataRange().getDisplayValues().slice(1),oldMatches=rows.filter(function(r){return normalizeId(r[0])===oldKey;});
    if(oldMatches.length!==1) throw new Error("This ID occurs more than once. Resolve the duplicate records in the Sheet before editing the ID.");
    if(rows.some(function(r){return normalizeId(r[0])!==oldKey && String(r[0]).trim().replace(/\s+/g,"").toUpperCase()===newKey;})) throw new Error("The new ID already belongs to another record.");
    if(/^[=+@]/.test(newId)) throw new Error("ID cannot start with =, + or @.");
}
function updateWithReferences_(sheet,row,values,oldId,newId,column){
    var changes=[],ss=SpreadsheetApp.getActiveSpreadsheet();
    function prepare(range,newValues){changes.push({range:range,before:range.getValues(),after:newValues});}
    prepare(sheet.getRange(row,1,1,values.length),[values]);
    if(normalizeId(oldId)!==normalizeId(newId)){
        ["Transactions","Reservations"].forEach(function(name){
            var reference=ss.getSheetByName(name);if(!reference)return;
            reference.getDataRange().getValues().forEach(function(record,index){
                if(index>0 && normalizeId(record[column-1])===normalizeId(oldId))prepare(reference.getRange(index+1,column,1,1),[[String(newId)]]);
            });
        });
    }
    var applied=[];
    sheet.getRange(row,1).setNumberFormat("@");
    changes.slice(1).forEach(function(change){change.range.setNumberFormat("@");});
    try{changes.forEach(function(change){applied.push(change);change.range.setValues(change.after);});}
    catch(error){var rollbackFailed=false;applied.reverse().forEach(function(change){try{change.range.setValues(change.before);}catch(rollbackError){rollbackFailed=true;}});throw new Error(rollbackFailed?"Update interrupted. Some changes could not be restored; inspect the record and transaction IDs before retrying.":"Update failed and previous values were restored. Please try again.");}
}
