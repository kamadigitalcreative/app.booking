// === FUNGSI KONEKSI DATABASE ===
function getDb() {
  if (SPREADSHEET_ID === "PASTE_ID_SPREADSHEET_ANDA_DISINI") {
    return SpreadsheetApp.getActiveSpreadsheet();
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// === SETUP DATABASE ===
function setupDatabase() {
  const ss = getDb();
  if (!ss) throw new Error("Aduh! Script tidak terhubung ke Spreadsheet. Pastikan SPREADSHEET_ID sudah benar.");

  function checkAndAddHeaders(sheetName, requiredHeaders) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(requiredHeaders);
      sheet.setFrozenRows(1);
    } else {
      let lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        sheet.appendRow(requiredHeaders);
        sheet.setFrozenRows(1);
      } else {
        const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        let newCols = [];
        requiredHeaders.forEach(h => {
          if (currentHeaders.indexOf(h) === -1) {
            newCols.push(h);
          }
        });
        if (newCols.length > 0) {
          sheet.getRange(1, lastCol + 1, 1, newCols.length).setValues([newCols]);
        }
      }
    }
  }

  let sheetUsers = ss.getSheetByName('Users');
  if (!sheetUsers) {
    sheetUsers = ss.insertSheet('Users');
    sheetUsers.appendRow(['id', 'username', 'password', 'fullname', 'role', 'akses_menu']);
    sheetUsers.appendRow(['1', 'admin', 'Demo2026!', 'Super Admin', 'Admin', 'dashboard,produk,pemasukan,pengeluaran,kalender,aruskas,todo,pengaturan']);
    sheetUsers.appendRow(['2', 'staff', 'Demo2026!', 'Staff Kama', 'Staff', 'dashboard,pemasukan,kalender']);
    sheetUsers.setFrozenRows(1);
  } else {
    checkAndAddHeaders('Users', ['id', 'username', 'password', 'fullname', 'role', 'akses_menu']);
  }

  checkAndAddHeaders('Produk', ['id', 'nama', 'harga', 'jenis', 'status', 'catatan', 'id_usaha']);
  checkAndAddHeaders('Pemasukan', ['id', 'id_trx', 'tanggal', 'client', 'phone', 'team', 'layanan', 'jumlah', 'harga', 'diskon', 'dp', 'transport', 'total', 'is_lunas', 'catatan', 'alamat', 'link_maps', 'id_usaha', 'created_at']);
  checkAndAddHeaders('Pengeluaran', ['id', 'tanggal', 'detail', 'kategori', 'nominal', 'catatan', 'status_bayar', 'id_usaha', 'created_at']);
  checkAndAddHeaders('Todo', ['id', 'task', 'kategori', 'prioritas', 'duedate', 'status', 'harga', 'id_usaha', 'created_at']);

  let sheetPengaturan = ss.getSheetByName('Pengaturan');
  if (!sheetPengaturan) {
    sheetPengaturan = ss.insertSheet('Pengaturan');
    sheetPengaturan.appendRow(['id', 'brand', 'tagline', 'phone', 'email', 'bank', 'acc', 'acc_name', 'logo_inv', 'ttd_inv', 'app_name', 'app_logo_text', 'logo_app', 'notes_inv', 'id_usaha']);
    sheetPengaturan.appendRow([1, 'Kama Visual', 'Prewedding, Wedding Documentation Etc.', '081999778556', 'kamabalicreative@gmail.com', 'Bank Central Asia', '6485602503', 'Ni Putu Ayu Nely Pradnyawati', '', '', 'Kama Visual', 'km', '', 'All prices above are fixed prices. Please confirm after payment.', '1']);
    sheetPengaturan.setFrozenRows(1);
  } else {
    checkAndAddHeaders('Pengaturan', ['id', 'brand', 'tagline', 'phone', 'email', 'bank', 'acc', 'acc_name', 'logo_inv', 'ttd_inv', 'app_name', 'app_logo_text', 'logo_app', 'notes_inv', 'id_usaha']);
  }
}

// === HELPERS ===
function safeDateFormat(value) {
  if (!value) return '';
  if (value instanceof Date) return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  return String(value);
}

function getColumnMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => { map[String(h).toLowerCase().trim()] = i; });
  return map;
}

// === CORE LOGIC: FETCH DATA ===
function getAllData() {
  const ss = getDb();
  if (!ss) return { success: false, message: 'Gagal terhubung ke Database Google Sheets.' };

  const resultData = { produk: [], pemasukan: [], pengeluaran: [], todo: [], users: [], pengaturan: [] };
  const sheets = ss.getSheets();
  const keyMap = { 'Produk': 'produk', 'Pemasukan': 'pemasukan', 'Pengeluaran': 'pengeluaran', 'Todo': 'todo', 'Users': 'users', 'Pengaturan': 'pengaturan' };

  // OPTIMASI SUPER CEPAT: getValues() 10x lebih cepat dari getDisplayValues()
  const scriptTZ = Session.getScriptTimeZone();
  sheets.forEach(sheet => {
    const sheetName = sheet.getName();
    const targetKey = keyMap[sheetName];

    if (targetKey && sheet.getLastRow() > 1) {
      const data = sheet.getDataRange().getValues();
      const headers = data[0].map(h => String(h).toLowerCase().trim());
      const idIdx = headers.indexOf('id');

      for (let i = 1; i < data.length; i++) {
        let row = data[i];
        if (idIdx !== -1 && (row[idIdx] === '' || row[idIdx] == null)) continue; // Lewati baris yang kosong

        let obj = {};
        for (let j = 0; j < headers.length; j++) {
          let val = row[j];
          if (val instanceof Date) {
            val = Utilities.formatDate(val, scriptTZ, 'yyyy-MM-dd');
          }
          obj[headers[j]] = val;
        }
        resultData[targetKey].push(obj);
      }
    }
  });

  return { success: true, data: resultData };
}

// === CORE LOGIC: SAVE DATA (UNIVERSAL) ===
function saveData(tableName, payload) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getDb();
    if (!ss) return { success: false, message: 'Gagal terhubung ke Database Google Sheets.' };

    const sheet = ss.getSheetByName(tableName);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan' };

    const map = getColumnMap(sheet);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

    if (payload.isEdit === 'true' || payload.isEdit === true) {
      const data = sheet.getDataRange().getValues();
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][map['id']]) === String(payload.id)) { rowIndex = i + 1; break; }
      }
      if (rowIndex === -1) return { success: false, message: 'Data tidak ditemukan untuk diupdate' };

      let updateRow = [];
      headers.forEach(h => {
        let key = h.toLowerCase().trim();
        updateRow.push(payload[key] !== undefined ? payload[key] : data[rowIndex - 1][map[key]]);
      });
      sheet.getRange(rowIndex, 1, 1, updateRow.length).setValues([updateRow]);
    } else {
      payload.id = payload.id || new Date().getTime();
      payload.created_at = new Date();
      let newRow = [];
      headers.forEach(h => {
        let key = h.toLowerCase().trim();
        newRow.push(payload[key] !== undefined ? payload[key] : '');
      });
      sheet.appendRow(newRow);
    }
    return { success: true };
  } catch (e) {
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}

// === CORE LOGIC: DELETE DATA (UNIVERSAL) ===
function deleteData(tableName, id) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
    const ss = getDb();
    if (!ss) return { success: false, message: 'Gagal terhubung ke Database Google Sheets.' };

    const sheet = ss.getSheetByName(tableName);
    if (!sheet) return { success: false, message: 'Sheet tidak ditemukan' };

    const data = sheet.getDataRange().getValues();
    const map = getColumnMap(sheet);
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][map['id']]) === String(id)) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    return { success: false, message: 'Data tidak ditemukan' };
  } catch (e) {
    return { success: false, message: e.toString() };
  } finally {
    lock.releaseLock();
  }
}
