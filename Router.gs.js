// === 1. ROUTER GET (Untuk Render HTML & Tarik Data) ===
function doGet(e) {
  if (e && e.parameter && e.parameter.action === 'getAll') {
    return ContentService.createTextOutput(JSON.stringify(getAllData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Kama Visual Management')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// === 2. ROUTER POST (Untuk Login, Save, & Delete Data via API) ===
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Tidak ada data yang diterima" }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var result;

    if (action === 'login') result = loginUser(payload.username, payload.password);
    else if (action === 'saveData') result = saveData(payload.table, payload.data);
    else if (action === 'deleteData') result = deleteData(payload.table, payload.data);
    else result = { success: false, message: "Aksi tidak dikenali oleh Server" };

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: "Server Error: " + err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// === 3. UTILS ROUTER ===
// Fungsi ini dipanggil dari Index.html untuk memasukkan CSS.html dan JS.html
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
