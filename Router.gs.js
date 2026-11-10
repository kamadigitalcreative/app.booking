// =========================================================================
// 1. ROUTER GET (Untuk Render HTML & Tarik Data)
// =========================================================================
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getAll') {
    return ContentService.createTextOutput(JSON.stringify(getAllData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('BookHive Management')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// =========================================================================
// 2. ROUTER POST (API Dispatcher untuk Login, CRUD & Public Booking)
// =========================================================================
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Tidak ada data yang diterima" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var result;

    if (action === 'login' || action === 'loginUser') {
      result = loginUser(payload.username, payload.password);
    } else if (action === 'saveData') {
      result = saveData(payload.table, payload.data);
    } else if (action === 'deleteData') {
      result = deleteData(payload.table, payload.data);
    } else if (action === 'getAllData') {
      result = getAllData();
    } else if (action === 'getPublicProducts') {
      result = handleGetPublicProducts();
    } else if (action === 'getAvailableTalents') {
      result = handleGetAvailableTalents(payload.tanggal, payload.jamMulai, payload.jamSelesai);
    } else if (action === 'createPublicBooking') {
      result = handleCreatePublicBooking(payload.data);
    } else if (action === 'getPublicInvoice') {
      result = handleGetPublicInvoice(payload.invoice_id);
    } else {
      result = { success: false, message: "Aksi tidak dikenali oleh Server: " + action };
    }

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Server Error: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// =========================================================================
// 3. PUBLIC BOOKING & INVOICE HANDLERS
// =========================================================================
function handleGetPublicProducts() {
  var all = getAllData();
  if (!all.success) return all;
  var prods = all.data.produk || [];
  var available = prods.filter(function(p) {
    return !p.status || String(p.status).toLowerCase() === 'tersedia';
  });
  return { success: true, data: available.length > 0 ? available : prods };
}

function handleGetAvailableTalents(tanggal, jamMulai, jamSelesai) {
  var all = getAllData();
  if (!all.success) return all;

  var users = all.data.users || [];
  var unavail = all.data.team_unavailability || [];
  var pemasukan = all.data.pemasukan || [];

  // Filter users with talent roles
  var talents = users.filter(function(u) {
    var r = (u.role || '').toLowerCase();
    return r === 'fotografer' || r === 'mua' || r === 'videografer' || r === 'staff';
  });

  if (talents.length === 0) talents = users;

  var available = talents.filter(function(t) {
    var tName = (t.fullname || t.username || '').toLowerCase();

    // 1. Cek di Team_Unavailability
    for (var i = 0; i < unavail.length; i++) {
      var u = unavail[i];
      if (safeDateFormat(u.tanggal) === safeDateFormat(tanggal) && String(u.nama_team).toLowerCase().indexOf(tName) !== -1) {
        return false;
      }
    }

    // 2. Cek bentrok jam di Pemasukan
    for (var j = 0; j < pemasukan.length; j++) {
      var p = pemasukan[j];
      if (safeDateFormat(p.tanggal) === safeDateFormat(tanggal)) {
        var teamStr = (p.team || '').toLowerCase();
        if (teamStr.indexOf(tName) !== -1) {
          var pStart = p.jam_mulai || '';
          var pEnd = p.jam_selesai || '';
          if (jamMulai && jamSelesai && pStart && pEnd) {
            if (jamMulai < pEnd && jamSelesai > pStart) {
              return false; // Bentrok jam
            }
          }
        }
      }
    }
    return true;
  });

  return { success: true, talents: available };
}

function handleCreatePublicBooking(data) {
  if (!data) return { success: false, message: "Data booking kosong" };

  var invNumber = 'INV-' + Math.floor(100000 + Math.random() * 900000);
  data.id = data.id || new Date().getTime();
  data.id_trx = invNumber;
  data.is_lunas = false;
  data.created_at = new Date();

  var saveRes = saveData('Pemasukan', data);
  if (saveRes.success) {
    return { success: true, invoice_id: invNumber };
  } else {
    return saveRes;
  }
}

function handleGetPublicInvoice(invoiceId) {
  if (!invoiceId) return { success: false, message: "Invoice ID tidak disertakan" };

  var all = getAllData();
  if (!all.success) return all;

  var pemasukan = all.data.pemasukan || [];
  for (var i = 0; i < pemasukan.length; i++) {
    var row = pemasukan[i];
    if (String(row.id_trx).trim() === String(invoiceId).trim() || String(row.id).trim() === String(invoiceId).trim()) {
      return { success: true, invoice: row };
    }
  }

  return { success: false, message: "Invoice tidak ditemukan" };
}

// =========================================================================
// 4. UTILS ROUTER
// =========================================================================
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
