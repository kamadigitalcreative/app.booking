// === CORE LOGIC: LOGIN ===
function loginUser(username, password) {
  const ss = getDb();
  if (!ss) return { success: false, message: 'Gagal terhubung ke Database Google Sheets.' };

  const sheet = ss.getSheetByName('Users');
  if (!sheet) return { success: false, message: 'Database belum disetup.' };

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return { success: false, message: 'Database belum memiliki data pengguna.' };

  const headers = data[0];
  const map = {};
  headers.forEach((h, i) => { map[String(h).toLowerCase().trim()] = i; });

  const uIdx = map['username'];
  const pIdx = map['password'];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][uIdx]) === String(username) && String(data[i][pIdx]) === String(password)) {
      // OPTIMASI: Langsung tarik semua data sekaligus agar menghemat waktu network (tidak perlu 2x loading)
      const allDataRes = getAllData();

      return {
        success: true,
        user: {
          id: data[i][map['id']],
          username: data[i][uIdx],
          fullname: data[i][map['fullname']],
          role: data[i][map['role']],
          akses_menu: data[i][map['akses_menu']] || ''
        },
        allData: allDataRes.success ? allDataRes.data : null
      };
    }
  }
  return { success: false, message: 'Username atau Password salah!' };
}
