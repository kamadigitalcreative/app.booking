

    // 1. STATE
    var currentUser = null, activePage = 'dashboard', isDataLoaded = false, currentInvoiceTrx = null;
    var dbProduk = [], dbPemasukan = [], dbPengeluaran = [], dbTodo = [], dbUsers = [], dbPengaturan = [];

    // 2. GAS BRIDGE (DECOUPLED API)
    const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbx_MRP6SWoCXMqGuLaxEDWZR8CowGZ08ccICHoAfdVw6hbfz_8PJbJA2adXcJYHaGQx/exec';
    
    function gasRun(funcName, ...args) {
      return new Promise((resolve, reject) => {
        let payload = { action: funcName };
        if (funcName === 'loginUser') {
          payload.username = args[0];
          payload.password = args[1];
        } else if (funcName === 'saveData' || funcName === 'deleteData') {
          payload.table = args[0];
          payload.data = args[1];
        }

        fetch(GAS_WEB_APP_URL, {
          redirect: "follow",
          method: "POST",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
        })
        .then(response => {
          if (!response.ok) throw new Error("Gagal terhubung ke server.");
          return response.json();
        })
        .then(data => resolve(data))
        .catch(err => reject(err));
      });
    }

    function loadAppBranding() {
      // Ambil data pengaturan jika sudah dimuat, jika belum pakai standar
      let set = (typeof dbPengaturan !== 'undefined' && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
      let appName = set.app_name || 'Kama Visual';
      let logoText = set.app_logo_text || 'km';
      let logoImg = set.logo_app || '';

      // 1. Ubah semua teks nama aplikasi
      document.querySelectorAll('.appNameDisplay').forEach(el => {
        el.innerText = appName;
      });

      // 2. Atur tampilan Logo (apakah pakai gambar atau teks inisial)
      document.querySelectorAll('.appLogoContainer').forEach(container => {
        let txtEl = container.querySelector('.appLogoText');
        let imgEl = container.querySelector('.appLogoImage');

        if (logoImg && logoImg.trim() !== '') {
          // Jika ada gambar logo, tampilkan gambar, sembunyikan teks
          if (txtEl) txtEl.classList.add('d-none');
          if (imgEl) {
            imgEl.src = logoImg;
            imgEl.classList.remove('d-none');
          }
        } else {
          // Jika tidak ada gambar, tampilkan teks inisial, sembunyikan gambar
          if (imgEl) imgEl.classList.add('d-none');
          if (txtEl) {
            txtEl.innerText = logoText;
            txtEl.classList.remove('d-none');
          }
        }
      });
    }

    // 3. UTILS
    function formatRp(num) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num || 0); }
    function safeDate(val) {
      if (!val) return '-';
      if (typeof val === 'string') val = val.trim();
      if (typeof val === 'string' && val.includes(',')) {
        return val.split(',').map(d => { let t = d.trim(); if (t.match(/^\d{4}-\d{2}-\d{2}/)) return t.substring(0, 10); try { return new Date(t).toISOString().substring(0, 10); } catch (e) { return '-'; } }).join(', ');
      }
      if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return val.substring(0, 10);
      try { return new Date(val).toISOString().substring(0, 10); } catch (e) { return '-'; }
    }
    function showFullPageLoading(msg) { document.getElementById('loaderText').innerText = msg; document.getElementById('fullPageLoader').style.display = 'flex'; }
    function hideFullPageLoading() { document.getElementById('fullPageLoader').style.display = 'none'; }
    function showSectionLoading(id) { const c = document.getElementById(id); if (c) c.innerHTML = `<div class="card border-0 shadow-sm mb-3"><div class="card-body placeholder-glow"><span class="placeholder col-7 rounded mb-2"></span><br><span class="placeholder col-4 rounded"></span></div></div>`.repeat(3); }
    function toggleSidebar() { document.querySelector('.sidebar').classList.toggle('active'); document.querySelector('.sidebar-overlay').classList.toggle('active'); }
    window.copyToClipboard = function (text) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          Swal.fire({ icon: 'success', title: 'Dicopy!', text: 'Link disalin', timer: 1500, showConfirmButton: false });
        }).catch(err => window.fallbackCopyTextToClipboard(text));
      } else {
        window.fallbackCopyTextToClipboard(text);
      }
    };
    window.fallbackCopyTextToClipboard = function (text) {
      var textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.top = "0"; textArea.style.left = "0"; textArea.style.position = "fixed"; textArea.style.opacity = "0";
      var activeContainer = document.querySelector('.modal.show') || document.body;
      activeContainer.appendChild(textArea);
      textArea.focus(); textArea.select();
      try {
        var successful = document.execCommand('copy');
        if (successful) Swal.fire({ icon: 'success', title: 'Dicopy!', text: 'Link disalin', timer: 1500, showConfirmButton: false });
        else Swal.fire('Oops', 'Gagal copy link (Ditolak oleh browser)', 'error');
      } catch (err) { Swal.fire('Oops', 'Browser tidak mendukung copy otomatis', 'error'); }
      activeContainer.removeChild(textArea);
    };

    // 4. AUTH
    window.handleLogin = function () {
      var u = document.getElementById('username').value.trim();
      var p = document.getElementById('password').value.trim();
      if (!u || !p) return Swal.fire('Oops', 'Isi username & password', 'warning');
      showFullPageLoading('Memuat Sistem & Sinkronisasi Data...');

      gasRun('loginUser', u, p).then(res => {
        hideFullPageLoading();
        if (res.success) {
          currentUser = res.user;

          // PRE-LOAD DATA (Menghindari request tambahan)
          if (res.allData) {
            dbProduk = res.allData.produk || [];
            dbPemasukan = res.allData.pemasukan || [];
            dbPengeluaran = res.allData.pengeluaran || [];
            dbTodo = res.allData.todo || [];
            dbUsers = res.allData.users || [];
            dbPengaturan = res.allData.pengaturan || [];
            isDataLoaded = true;
            updateDynamicYears();
          }

          checkLoginState();
        }
        else { Swal.fire('Error', res.message || 'Username/Password salah', 'error'); }
      }).catch(err => {
        hideFullPageLoading();
        Swal.fire('Error', "System Error: " + err.message, 'error');
      });
    };

    function checkLoginState() {
      if (currentUser) {
        document.getElementById('loginPage').classList.add('d-none');
        document.getElementById('mainApp').classList.remove('d-none');
        document.getElementById('displayUser').innerText = currentUser.fullname;
        document.getElementById('displayRole').innerText = currentUser.role;
        loadAppBranding(); applyMenuAccess();
        let firstMenu = 'dashboard';
        const allowedMenus = currentUser.akses_menu ? currentUser.akses_menu.split(',') : [];
        if (currentUser.role !== 'Admin' && allowedMenus.length > 0) { firstMenu = allowedMenus[0]; }
        showPage(firstMenu);
      } else {
        document.getElementById('mainApp').classList.add('d-none');
        document.getElementById('loginPage').classList.remove('d-none');
        loadAppBranding();
      }
    }

    function applyMenuAccess() {
      const role = currentUser.role;
      const aksesArr = (currentUser.akses_menu || '').split(',').map(s => s.trim());
      document.querySelectorAll('.nav-item-custom[data-menu]').forEach(el => {
        const menu = el.getAttribute('data-menu');
        el.style.display = (role === 'Admin' || aksesArr.includes(menu)) ? 'flex' : 'none';
      });
    }
    function logout() { currentUser = null; isDataLoaded = false; checkLoginState(); }

    window.showPage = function (pageName, navEl) {
      activePage = pageName;
      document.querySelectorAll('.nav-item-custom').forEach(n => n.classList.remove('active'));
      if (navEl) navEl.classList.add('active'); else { const el = document.querySelector(`.nav-item-custom[data-menu="${pageName}"]`); if (el) el.classList.add('active'); }
      document.querySelectorAll('[id^="page"]').forEach(p => p.classList.add('d-none'));
      const target = document.getElementById('page-' + pageName); if (target) target.classList.remove('d-none');
      if (window.innerWidth < 992) toggleSidebar();
      loadDataMaster();
    };

    function loadDataMaster(silent = false) {
      if (isDataLoaded && !silent) { routeRender(); return; }
      if (!silent) {
        if (activePage === 'dashboard') showSectionLoading('dashboardContainer');
        else if (activePage === 'produk') showSectionLoading('tbody-produk');
        else if (activePage === 'pemasukan') showSectionLoading('tbody-pemasukan');
        else if (activePage === 'pengaturan') showSectionLoading('tbody-users');
        else if (activePage === 'pengeluaran') { showSectionLoading('tbody-pengeluaran-fee'); showSectionLoading('tbody-pengeluaran-ops'); }
      }
      gasRun('getAllData').then(res => {
        if (res.success) {
          dbProduk = res.data.produk || []; dbPemasukan = res.data.pemasukan || []; dbPengeluaran = res.data.pengeluaran || []; dbTodo = res.data.todo || []; dbUsers = res.data.users || []; dbPengaturan = res.data.pengaturan || [];
          isDataLoaded = true; updateDynamicYears(); routeRender(); loadAppBranding();
        } else { Swal.fire('Error', res.message, 'error'); }
      }).catch(err => Swal.fire('Error', "Gagal mengambil data: " + err.message, 'error'));
    }

    function updateDynamicYears() {
      let years = new Set(); const currYear = new Date().getFullYear();
      const extractYear = (dateVal) => {
        if (!dateVal) return null;
        if (typeof dateVal === 'string' && dateVal.includes(',')) dateVal = dateVal.split(',')[0].trim();
        if (typeof dateVal === 'string' && dateVal.length >= 4) { const y = parseInt(dateVal.substring(0, 4)); if (!isNaN(y) && y > 2000 && y < 2100) return y; }
        const y2 = new Date(dateVal).getFullYear(); if (!isNaN(y2) && y2 > 2000 && y2 < 2100) return y2; return null;
      };
      dbPemasukan.forEach(x => { const y = extractYear(x.tanggal); if (y) years.add(y); }); dbPengeluaran.forEach(x => { const y = extractYear(x.tanggal); if (y) years.add(y); });
      const yearArr = Array.from(years); const minY = yearArr.length > 0 ? Math.min(...yearArr, currYear - 1) : currYear - 1; const maxY = yearArr.length > 0 ? Math.max(...yearArr, currYear + 1) : currYear + 1;
      const sortedYears = []; for (let y = minY; y <= Math.max(maxY, currYear + 1); y++) { sortedYears.push(y); }
      ['dashTahun', 'calTahun', 'akTahun', 'pemTahun', 'pengTahun'].forEach(id => {
        const sel = document.getElementById(id); if (sel) {
          const oldVal = sel.value || currYear; sel.innerHTML = '';
          sortedYears.forEach(y => { const opt = document.createElement('option'); opt.value = y; opt.text = (id === 'dashTahun' || id === 'akTahun') ? 'Tahun: ' + y : y; if (y == oldVal || (!sel.value && y == currYear)) opt.selected = true; sel.appendChild(opt); });
          if (sortedYears.includes(parseInt(oldVal))) sel.value = oldVal;
        }
      });
    }

    function routeRender() {
      if (activePage === 'dashboard') renderDashboard(); if (activePage === 'produk') renderProduk(); if (activePage === 'pemasukan') renderPemasukan();
      if (activePage === 'pengeluaran') renderPengeluaran(); if (activePage === 'kalender') renderKalender(); if (activePage === 'aruskas') renderArusKas();
      if (activePage === 'todo') renderTodo(); if (activePage === 'pengaturan') { loadSettingsUI(); renderUsers(); }
    }

    // 5. RENDER Dashboard
    let dashChart = null;
    window.renderDashboard = function () {
      const container = document.getElementById('dashboardContainer');
      const tahun = document.getElementById('dashTahun').value; const bulan = document.getElementById('dashBulan').value;

      let filteredPem = dbPemasukan.filter(p => { let tgl = String(p.tanggal).split(',')[0].trim(); return (tahun === 'all' || tgl.startsWith(tahun)) && (bulan === 'all' || tgl.substring(5, 7) === bulan); });
      let filteredPeng = dbPengeluaran.filter(peng => {
        let efD = String(peng.tanggal);
        if (peng.kategori === 'Fee Team' && peng.catatan && peng.catatan.includes('PEM_ID:')) {
          let match = peng.catatan.match(/PEM_ID:(\d+)/); if (match && match[1]) { let pem = dbPemasukan.find(x => String(x.id) === match[1]); if (pem && pem.tanggal) efD = String(pem.tanggal).split(',')[0].trim(); }
        }
        return (tahun === 'all' || efD.startsWith(tahun)) && (bulan === 'all' || efD.substring(5, 7) === bulan);
      });

      const totalJob = filteredPem.length;
      const totalPemasukan = filteredPem.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
      const totalPengeluaran = filteredPeng.filter(x => String(x.status_bayar).trim().toLowerCase() !== 'belum dibayar').reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
      const totalFeeTeam = filteredPeng.filter(x => String(x.kategori).trim().toLowerCase() === 'fee team' && String(x.status_bayar).trim().toLowerCase() !== 'belum dibayar').reduce((sum, item) => sum + (Number(item.nominal) || 0), 0);
      const piutangClient = filteredPem.filter(x => x.is_lunas !== true && String(x.is_lunas) !== 'true').reduce((sum, item) => sum + (Number(item.total) || 0) - (Number(item.dp) || 0), 0);
      const labaBersih = totalPemasukan - totalPengeluaran;

      const salesByProd = {}; const teamStats = {}; let maxTeamJobs = 0;
      filteredPem.forEach(p => {
        if (!salesByProd[p.layanan]) salesByProd[p.layanan] = { qty: 0, nominal: 0 };
        salesByProd[p.layanan].qty += Number(p.jumlah) || 1; salesByProd[p.layanan].nominal += Number(p.total) || 0;
        if (p.team) {
          const members = p.team.split(/&|,| dan |\|/i).map(s => s.trim()).filter(s => s !== '');
          members.forEach(m => {
            if (!teamStats[m]) teamStats[m] = { count: 0, eligibleCount: 0 }; teamStats[m].count++;
            const feeRecord = dbPengeluaran.find(x => String(x.kategori).trim().toLowerCase() === 'fee team' && x.catatan === `PEM_ID:${p.id}|MEMBER:${m}`);
            let prodData = dbProduk.find(x => x.nama === p.layanan);
            let isPaket = (prodData && String(prodData.jenis).trim().toLowerCase() === 'paket');
            if (feeRecord && Number(feeRecord.nominal) <= 800000 && isPaket) teamStats[m].eligibleCount++;
            if (teamStats[m].count > maxTeamJobs) maxTeamJobs = teamStats[m].count;
          });
        }
      });

      // Tambahan: Cek Pengeluaran Operasional yang menyebutkan nama team di Catatan
      let allKnownMembers = new Set(Object.keys(teamStats));
      dbPemasukan.forEach(p => { if (p.team) p.team.split(/&|,| dan |\|/i).forEach(m => { let clean = m.trim(); if (clean) allKnownMembers.add(clean); }); });

      filteredPeng.forEach(peng => {
        if (String(peng.kategori).trim().toLowerCase() !== 'fee team') {
          allKnownMembers.forEach(m => {
            let regex = new RegExp("\\b" + m + "\\b", "i");
            if (regex.test(String(peng.catatan || ''))) {
              if (!teamStats[m]) teamStats[m] = { count: 0, eligibleCount: 0 };
              teamStats[m].count++;
              if (teamStats[m].count > maxTeamJobs) maxTeamJobs = teamStats[m].count;
            }
          });
        }
      });

      let tbodyHtml = ''; let countSales = 0;
      dbProduk.forEach(p => { let stat = salesByProd[p.nama]; if (stat && stat.qty > 0) { countSales++; tbodyHtml += `<tr><td>${p.nama}</td><td class="text-center">${stat.qty}</td><td class="text-end fw-bold">${formatRp(stat.nominal)}</td></tr>`; } });
      if (countSales === 0) tbodyHtml = '<tr><td colspan="3" class="text-center text-muted small py-4">Belum ada paket yang terjual pada periode ini.</td></tr>';

      const sortedTeam = Object.keys(teamStats).sort((a, b) => teamStats[b].count - teamStats[a].count);
      let teamHtml = '';
      if (sortedTeam.length === 0) teamHtml = '<div class="text-center text-muted small py-4 w-100">Belum ada data team yang bekerja.</div>';
      else {
        teamHtml = '<div class="row g-3">'; const colors = ['#0072ff', '#00c6ff', '#20c997', '#f6d365', '#ff6b6b', '#6f42c1', '#fd79a8', '#e84393'];
        sortedTeam.forEach((name, index) => {
          const count = teamStats[name].count; const eligible = teamStats[name].eligibleCount; const percent = maxTeamJobs > 0 ? (count / maxTeamJobs) * 100 : 0; const bonus = Math.floor(eligible / 2) * 25000; const color = colors[index % colors.length];
          teamHtml += `<div class="col-md-6 col-lg-4 col-xl-3"><div class="p-3 border-0 rounded-4 shadow-sm h-100 d-flex flex-column justify-content-between" style="background: rgba(255,255,255,0.7); backdrop-filter: blur(10px); position: relative; overflow: hidden; transition: transform 0.2s;" onmouseover="this.style.transform='translateY(-3px)'" onmouseout="this.style.transform='translateY(0)'"><div style="position: absolute; left:0; top:0; bottom:0; width: 5px; background: ${color};"></div><div class="ms-2"><div class="d-flex justify-content-between align-items-start mb-2"><div class="fw-bold text-dark text-truncate pe-2 fs-6" title="${name}"><i class="fa-solid fa-circle-user me-2" style="color: ${color};"></i>${name}</div><div class="badge rounded-pill shadow-sm" style="background: ${color};">${count} Job</div></div><div class="progress mt-3 shadow-none" style="height: 6px; background-color: rgba(255,255,255,0.5);"><div class="progress-bar rounded-pill" style="width: ${percent}%; background: ${color};"></div></div><div class="small text-muted mt-2" style="font-size: 10px;">${eligible} Job Paket (Fee â‰¤ 800k)</div></div><div class="mt-3 ms-2 pt-3 d-flex justify-content-between align-items-center" style="border-top: 1px solid rgba(0,0,0,0.1);"><span class="small text-muted fw-medium"><i class="fa-solid fa-gift text-warning me-1"></i> Bonus</span><span class="fw-bold text-success small bg-success bg-opacity-10 px-2 py-1 rounded">${formatRp(bonus)}</span></div><button class="btn btn-sm btn-light border-primary text-primary w-100 mt-3 fw-bold shadow-sm" style="font-size:11px; border-radius: 8px;" onclick="showDetailTeam('${name}')"><i class="fa-solid fa-list me-1"></i> Rincian Kinerja</button></div></div>`;
        }); teamHtml += '</div>';
      }

      container.innerHTML = `<div class="row g-2 mb-4"><div class="col-md-2 col-6"><div class="card border-0 shadow-sm h-100" style="border-left: 4px solid #00c6ff !important;"><div class="card-body px-2 py-3"><h6 class="text-muted mb-1" style="font-size:11px;">Total Job</h6><h5 class="fw-bold mb-0 text-primary">${totalJob}</h5></div></div></div><div class="col-md-2 col-6"><div class="card border-0 shadow-sm h-100" style="border-left: 4px solid #20c997 !important;"><div class="card-body px-2 py-3"><h6 class="text-muted mb-1" style="font-size:11px;">Pemasukan Total</h6><h6 class="fw-bold mb-0 text-success" style="font-size:13px;">${formatRp(totalPemasukan)}</h6></div></div></div><div class="col-md-2 col-6"><div class="card border-0 shadow-sm h-100" style="border-left: 4px solid #dc3545 !important;"><div class="card-body px-2 py-3"><h6 class="text-muted mb-1" style="font-size:11px;">Pengeluaran (All)</h6><h6 class="fw-bold mb-0 text-danger" style="font-size:13px;">${formatRp(totalPengeluaran)}</h6></div></div></div><div class="col-md-2 col-6"><div class="card border-0 shadow-sm h-100" style="border-left: 4px solid #fd7e14 !important;"><div class="card-body px-2 py-3"><h6 class="text-muted mb-1" style="font-size:11px;">Distribusi Fee Team</h6><h6 class="fw-bold mb-0" style="color:#fd7e14; font-size:13px;">${formatRp(totalFeeTeam)}</h6></div></div></div><div class="col-md-2 col-6"><div class="card border-0 shadow-sm h-100" style="border-left: 4px solid #f6d365 !important;"><div class="card-body px-2 py-3"><h6 class="text-muted mb-1" style="font-size:11px;">Piutang Client</h6><h6 class="fw-bold mb-0 text-warning" style="font-size:13px;">${formatRp(piutangClient)}</h6></div></div></div><div class="col-md-2 col-6"><div class="card border-0 shadow-sm h-100" style="border-left: 4px solid #6f42c1 !important;"><div class="card-body px-2 py-3"><h6 class="text-muted mb-1" style="font-size:11px;">Laba Bersih</h6><h6 class="fw-bold mb-0" style="color:#6f42c1; font-size:13px;">${formatRp(labaBersih)}</h6></div></div></div></div><div class="row g-4 mb-4"><div class="col-md-6"><div class="card shadow-sm h-100"><div class="card-header border-0 pt-4 pb-0"><h6 class="fw-bold text-gradient mb-0"><i class="fa-solid fa-list text-primary me-2"></i> Rekap Paket</h6></div><div class="card-body p-3"><div class="table-responsive"><table class="table table-sm table-custom mb-0 align-middle"><thead class="bg-light"><tr><th class="border-0 rounded-start">Nama Produk</th><th class="border-0 text-center">Terjual</th><th class="border-0 text-end rounded-end">Nominal</th></tr></thead><tbody>${tbodyHtml}</tbody></table></div></div></div></div><div class="col-md-6"><div class="card shadow-sm h-100"><div class="card-header border-0 pt-4 pb-0"><h6 class="fw-bold text-gradient mb-0"><i class="fa-solid fa-chart-pie text-primary me-2"></i> Sumber Penghasilan</h6></div><div class="card-body d-flex justify-content-center align-items-center"><canvas id="pieChart" style="max-height: 250px;"></canvas></div></div></div></div><div class="card border-0 shadow-sm mb-4 bg-transparent" style="background: transparent !important; box-shadow: none !important; border: none !important; backdrop-filter: none;"><div class="card-header bg-transparent border-0 px-0 pb-3"><h5 class="fw-bold text-gradient mb-0"><i class="fa-solid fa-people-group text-primary me-2"></i> Kinerja Team & Bonus Bulan Ini</h5><p class="text-muted small mb-0 mt-1">Bonus dihitung kelipatan 2 job PAKET dengan fee tim â‰¤ Rp 800.000/job.</p></div><div class="card-body p-0">${teamHtml}</div></div>`;
      if (dashChart) dashChart.destroy();
      const ctx = document.getElementById('pieChart'); if (ctx && Object.keys(salesByProd).length > 0) { dashChart = new Chart(ctx, { type: 'pie', data: { labels: Object.keys(salesByProd), datasets: [{ data: Object.values(salesByProd).map(v => v.nominal), backgroundColor: ['#0072ff', '#00c6ff', '#20c997', '#f6d365', '#fda085', '#6f42c1'] }] }, options: { responsive: true, plugins: { legend: { position: 'right' } } } }); }
    };

    window.showDetailTeam = function (name) {
      const tahun = document.getElementById('dashTahun').value; const bulan = document.getElementById('dashBulan').value;
      let filteredPem = dbPemasukan.filter(p => { let tgl = String(p.tanggal).split(',')[0].trim(); return (tahun === 'all' || tgl.startsWith(tahun)) && (bulan === 'all' || tgl.substring(5, 7) === bulan); });

      let filteredPengOps = dbPengeluaran.filter(peng => {
        let efD = String(peng.tanggal);
        return (tahun === 'all' || efD.startsWith(tahun)) && (bulan === 'all' || efD.substring(5, 7) === bulan);
      });

      let combinedJobs = [];
      let totalFee = 0;
      let eligibleJobs = 0;

      // 1. Kumpulkan Data Pemasukan (Pekerjaan Client)
      filteredPem.forEach(p => {
        if (!p.team) return;

        let teamArr = String(p.team).split('|');
        let tglArr = String(p.tanggal).split(',');

        let isMemberInProject = false;
        let workedDatesHtml = [];
        let firstSortDate = '';

        // Cek nama tim per harinya (D1 dan D2)
        teamArr.forEach((tm, idx) => {
          let dayMembers = tm.split(/&|,| dan /i).map(s => s.trim()).filter(s => s !== '');
          if (dayMembers.includes(name)) {
            isMemberInProject = true;
            if (tglArr[idx]) {
              let cleanDate = tglArr[idx].trim();
              if (!firstSortDate) firstSortDate = cleanDate; // Tanggal pertama kerja untuk sorting

              if (tglArr.length > 1) {
                workedDatesHtml.push(`<div class="mb-1"><span class="badge bg-light text-dark border"><i class="fa-regular fa-calendar me-1"></i>D${idx + 1}: ${safeDate(cleanDate)}</span></div>`);
              } else {
                workedDatesHtml.push(safeDate(cleanDate));
              }
            }
          }
        });

        if (isMemberInProject) {
          const feeRecord = dbPengeluaran.find(x => x.kategori === 'Fee Team' && x.catatan === `PEM_ID:${p.id}|MEMBER:${name}`);
          let feeNominal = 0;
          let isLunas = false;
          let isRecorded = false;

          if (feeRecord) {
            isRecorded = true;
            feeNominal = Number(feeRecord.nominal) || 0;
            isLunas = (String(feeRecord.status_bayar).trim().toLowerCase() === 'lunas');
            let prodData = dbProduk.find(x => x.nama === p.layanan);
            let isPaket = (prodData && String(prodData.jenis).trim().toLowerCase() === 'paket');
            if (feeNominal <= 800000 && isPaket) eligibleJobs++;
          }

          combinedJobs.push({
            type: 'pemasukan',
            sortDate: firstSortDate || String(p.tanggal).split(',')[0].trim(),
            tglHtml: workedDatesHtml.join(''),
            client: p.client || '-',
            layanan: p.layanan || '-',
            feeNominal: feeNominal,
            isLunas: isLunas,
            isRecorded: isRecorded
          });
        }
      });

      // 2. Kumpulkan Data Pengeluaran Operasional (jika ada nama team di catatan)
      filteredPengOps.forEach(peng => {
        if (String(peng.kategori).trim().toLowerCase() !== 'fee team') {
          let regex = new RegExp("\\b" + name + "\\b", "i");
          if (regex.test(String(peng.catatan || ''))) {
            let nominalPeng = Number(peng.nominal) || 0;
            combinedJobs.push({
              type: 'operasional',
              sortDate: String(peng.tanggal).trim(),
              tglHtml: safeDate(peng.tanggal),
              detail: peng.detail || '-',
              feeNominal: nominalPeng,
              isLunas: (String(peng.status_bayar).trim().toLowerCase() === 'lunas'),
              isRecorded: true
            });
          }
        }
      });

      // 3. Urutkan Data Berdasarkan Tanggal (Awal -> Akhir)
      combinedJobs.sort((a, b) => new Date(a.sortDate) - new Date(b.sortDate));

      // 4. Render ke Tabel HTML
      let html = '';
      let count = 1;

      combinedJobs.forEach(job => {
        totalFee += job.feeNominal;
        let nominalHtml = '';
        let statusHtml = '';

        if (job.isRecorded) {
          nominalHtml = `<span class="fw-bold text-dark">${formatRp(job.feeNominal)}</span>`;
          statusHtml = job.isLunas ? '<span class="badge bg-success" style="font-size:10px;">Lunas</span>' : '<span class="badge bg-warning text-dark" style="font-size:10px;">Belum Dibayar</span>';
        } else {
          nominalHtml = '<span class="text-muted fst-italic" style="font-size:11px;">Belum diset</span>';
          statusHtml = '<span class="badge bg-secondary" style="font-size:10px;">Belum Diatur</span>';
        }

        if (job.type === 'pemasukan') {
          html += `<tr><td>${count++}</td><td>${job.tglHtml}</td><td><div class="fw-bold text-dark">${job.client}</div><div class="text-muted" style="font-size:11px;">${job.layanan}</div></td><td>${nominalHtml}</td><td>${statusHtml}</td></tr>`;
        } else {
          html += `<tr><td>${count++}</td><td>${job.tglHtml}</td><td><div class="fw-bold text-dark">${job.detail}</div><div class="text-muted" style="font-size:11px;">Operasional / Lainnya</div></td><td>${nominalHtml}</td><td>${statusHtml}</td></tr>`;
        }
      });

      if (html === '') html = '<tr><td colspan="5" class="text-center text-muted py-4">Tidak ada data pekerjaan untuk periode ini.</td></tr>';

      document.getElementById('detailTeamName').innerText = `Rincian Kinerja: ${name}`;
      document.getElementById('detailTeamBody').innerHTML = html;
      document.getElementById('detailTeamTotalFee').innerText = formatRp(totalFee);
      document.getElementById('detailTeamBonus').innerText = formatRp(Math.floor(eligibleJobs / 2) * 25000);

      new bootstrap.Modal(document.getElementById('modalDetailTeam')).show();
    };

    // --- FUNGSI HELPER PEMASUKAN ---
    window.calcTotalPem = function () {
      let qty = Number(document.getElementById('pemQty').value) || 0;
      let harga = Number(document.getElementById('pemHarga').value) || 0;
      let transport = Number(document.getElementById('pemTransport').value) || 0;
      let diskon = Number(document.getElementById('pemDiskon').value) || 0;

      let total = (qty * harga) + transport - diskon;
      document.getElementById('pemTotal').value = total;
      document.getElementById('displayTotalPem').innerText = formatRp(total);
    };

    window.toggleExclusiveFields = function () {
      const layanan = document.getElementById('pemLayanan').value;
      const isExclusive = layanan && layanan.toLowerCase().includes('exclusive');

      if (isExclusive) {
        let elTgl = document.getElementById('exclusiveTglRow'); if (elTgl) elTgl.classList.remove('d-none');
        let elAlm = document.getElementById('exclusiveAlamatRow'); if (elAlm) elAlm.classList.remove('d-none');
        let elTm = document.getElementById('exclusiveTeamRow'); if (elTm) elTm.classList.remove('d-none');
        document.getElementById('lblTgl1').innerText = 'Tanggal Acara Day 1';
        document.getElementById('lblAlamat1').innerText = 'Alamat Acara Day 1';
        document.getElementById('lblMaps1').innerText = 'Share Lokasi Day 1';
        document.getElementById('lblTeam1').innerText = 'Nama Team Day 1';
      } else {
        let elTgl = document.getElementById('exclusiveTglRow'); if (elTgl) elTgl.classList.add('d-none');
        let elAlm = document.getElementById('exclusiveAlamatRow'); if (elAlm) elAlm.classList.add('d-none');
        let elTm = document.getElementById('exclusiveTeamRow'); if (elTm) elTm.classList.add('d-none');
        document.getElementById('lblTgl1').innerText = 'Tanggal Acara';
        document.getElementById('lblAlamat1').innerText = 'Alamat Acara';
        document.getElementById('lblMaps1').innerText = 'Share Lokasi';
        document.getElementById('lblTeam1').innerText = 'Nama Team';
      }
    };

    window.autoFillHarga = function () {
      const sel = document.getElementById('pemLayanan');
      if (sel.selectedIndex > 0) {
        const opt = sel.options[sel.selectedIndex];
        document.getElementById('pemHarga').value = opt.getAttribute('data-harga') || 0;
      } else {
        document.getElementById('pemHarga').value = 0;
      }
      toggleExclusiveFields();
      calcTotalPem();
    };

    window.autoFillClient = function () {
      const trxId = document.getElementById('pemTrx').value.trim();
      if (!trxId) return;

      // Cari data transaksi dengan ID TRX yang sama di database lokal
      const existingData = dbPemasukan.find(x => String(x.id_trx).trim() === trxId);
      if (existingData) {
        document.getElementById('pemClient').value = existingData.client || '';
        document.getElementById('pemPhone').value = existingData.phone || '';
      }
    };

    // 6. RENDER PRODUK & PEMASUKAN
    window.renderProduk = function () { const tb = document.getElementById('tbody-produk'); if (dbProduk.length === 0) { tb.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Belum ada produk</td></tr>`; return; } tb.innerHTML = dbProduk.map((p, i) => `<tr class="${p._isSyncing ? 'syncing-item' : ''}"><td>${i + 1}</td><td class="fw-bold">${p.nama}</td><td class="text-primary fw-bold">${formatRp(p.harga)}</td><td><span class="badge bg-light text-dark border">${p.jenis}</span></td><td><span class="badge ${p.status === 'Tersedia' ? 'bg-success' : 'bg-secondary'} bg-opacity-10 text-${p.status === 'Tersedia' ? 'success' : 'secondary'} border border-${p.status === 'Tersedia' ? 'success' : 'secondary'} px-3 rounded-pill">${p.status}</span></td><td class="small text-muted">${p.catatan || '-'}</td><td>${p._isSyncing ? '<span class="spinner-border spinner-border-sm text-primary"></span>' : `<button class="btn btn-sm btn-light border me-1 text-primary shadow-sm" onclick="editProduk(${p.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light border text-danger shadow-sm" onclick="delData('Produk', ${p.id})"><i class="fa-solid fa-trash"></i></button>`}</td></tr>`).join(''); };
    window.openModalProduk = function () { document.getElementById('formProduk').reset(); document.getElementById('prodId').value = ''; document.getElementById('prodIsEdit').value = 'false'; new bootstrap.Modal(document.getElementById('modalProduk')).show(); };
    window.editProduk = function (id) { const p = dbProduk.find(x => x.id == id); if (!p) return; document.getElementById('prodId').value = p.id; document.getElementById('prodIsEdit').value = 'true'; document.getElementById('prodNama').value = p.nama; document.getElementById('prodHarga').value = p.harga; document.getElementById('prodJenis').value = p.jenis; document.getElementById('prodStatus').value = p.status; document.getElementById('prodCatatan').value = p.catatan; new bootstrap.Modal(document.getElementById('modalProduk')).show(); };
    window.saveProduk = function () { const payload = { id: document.getElementById('prodId').value, isEdit: document.getElementById('prodIsEdit').value, nama: document.getElementById('prodNama').value, harga: document.getElementById('prodHarga').value, jenis: document.getElementById('prodJenis').value, status: document.getElementById('prodStatus').value, catatan: document.getElementById('prodCatatan').value }; handleOptimisticSave('Produk', payload, dbProduk, 'modalProduk'); };

    window.renderPemasukan = function () {
      const tb = document.getElementById('tbody-pemasukan');
      const filterStatus = document.getElementById('filterStatusPemasukan') ? document.getElementById('filterStatusPemasukan').value : 'all';
      const fTahun = document.getElementById('pemTahun') ? document.getElementById('pemTahun').value : 'all';
      const fBulan = document.getElementById('pemBulan') ? document.getElementById('pemBulan').value : 'all';

      let filteredData = dbPemasukan.filter(x => { let tgl = String(x.tanggal).split(',')[0].trim(); return (fTahun === 'all' || tgl.startsWith(fTahun)) && (fBulan === 'all' || tgl.substring(5, 7) === fBulan); });
      if (filterStatus === 'lunas') filteredData = filteredData.filter(p => p.is_lunas === true || String(p.is_lunas) === 'true');
      else if (filterStatus === 'belum') filteredData = filteredData.filter(p => p.is_lunas !== true && String(p.is_lunas) !== 'true');

      if (filteredData.length === 0) { tb.innerHTML = `<tr><td colspan="10" class="text-center text-muted py-4">Tidak ada transaksi ditemukan</td></tr>`; return; }

      tb.innerHTML = filteredData.map((p, i) => {
        let rawDate = String(p.tanggal || ''); let tglHtml = '';
        if (rawDate.includes(',')) { let tglArr = rawDate.split(','); tglHtml = `<div class="d-flex flex-column gap-1"><span class="badge bg-light text-dark border"><i class="fa-regular fa-clock me-1"></i>D1: ${safeDate(tglArr[0])}</span><span class="badge bg-light text-dark border"><i class="fa-regular fa-clock me-1"></i>D2: ${safeDate(tglArr[1])}</span></div>`; } else { tglHtml = safeDate(p.tanggal); }
        let rawTeam = String(p.team || ''); let teamHtml = '';
        if (rawTeam.includes('|')) { let tmArr = rawTeam.split('|'); teamHtml = `<div class="d-flex flex-column gap-1"><span class="small text-muted fw-bold">D1: ${tmArr[0] ? tmArr[0].trim() : '-'}</span><span class="small text-muted fw-bold">D2: ${tmArr[1] ? tmArr[1].trim() : '-'}</span></div>`; } else { teamHtml = `<span class="small">${p.team || '-'}</span>`; }

        return `<tr class="${p._isSyncing ? 'syncing-item' : ''}"><td class="d-none d-md-table-cell">${i + 1}</td><td class="d-none d-md-table-cell"><span class="badge bg-light text-dark border shadow-sm">${p.id_trx || '-'}</span></td><td class="d-none d-md-table-cell">${tglHtml}</td><td><div class="fw-bold text-dark" style="font-size: 14px;">${p.client || '-'}</div><div class="d-md-none mt-1 mb-1">${tglHtml}</div><div class="d-md-none mt-1"><span class="badge" style="background: rgba(0, 114, 255, 0.1); color: #0072ff; font-size:10px;">${p.layanan || '-'}</span></div></td><td class="d-none d-md-table-cell">${teamHtml}</td><td class="d-none d-md-table-cell"><span class="badge" style="background: rgba(0, 114, 255, 0.2); color: #0072ff;">${p.layanan || '-'}</span></td><td class="text-center fw-bold d-none d-md-table-cell">${p.jumlah || 1}</td><td><div class="fw-bold text-dark">${formatRp(p.total)}</div><div class="d-md-none mt-1">${p.is_lunas === true || String(p.is_lunas) === 'true' ? '<span class="badge bg-success shadow-sm" style="font-size:9px;">LUNAS</span>' : '<span class="badge bg-danger shadow-sm" style="font-size:9px;">BELUM LUNAS</span>'}</div></td><td class="d-none d-md-table-cell">${p.is_lunas === true || String(p.is_lunas) === 'true' ? '<span class="badge bg-success shadow-sm">LUNAS</span>' : '<span class="badge bg-danger shadow-sm">BELUM LUNAS</span>'}</td><td>${p._isSyncing ? '<span class="spinner-border spinner-border-sm text-success"></span>' : `<div class="d-flex gap-1 flex-wrap align-items-center" style="max-width: 90px;"><button class="btn btn-sm btn-secondary text-white shadow-sm" style="padding:4px 8px; font-size:11px;" onclick="showDetailPemasukan(${p.id})" title="Detail"><i class="fa-solid fa-circle-info"></i></button><button class="btn btn-sm btn-info text-white shadow-sm" style="padding:4px 8px; font-size:11px; background: linear-gradient(135deg, #17ead9 0%, #6078ea 100%); border:none;" onclick="openInvoicePreview(${p.id})" title="Invoice"><i class="fa-solid fa-print"></i></button><button class="btn btn-sm btn-light border text-primary shadow-sm" style="padding:4px 8px; font-size:11px;" onclick="editPemasukan(${p.id})" title="Edit"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light border text-danger shadow-sm" style="padding:4px 8px; font-size:11px;" onclick="delData('Pemasukan', ${p.id})" title="Hapus"><i class="fa-solid fa-trash"></i></button></div>`}</td></tr>`;
      }).join('');
    };

    window.showDetailPemasukan = function (id) {
      const p = dbPemasukan.find(x => x.id == id); if (!p) return;
      const statusHtml = p.is_lunas === true || String(p.is_lunas) === 'true' ? '<span class="badge bg-success">LUNAS</span>' : '<span class="badge bg-danger">BELUM LUNAS</span>';
      let tglArr = (p.tanggal || '').split(','); let teamArr = (p.team || '').split('|'); let alamatArr = (p.alamat || '').split('|'); let mapsArr = (p.link_maps || '').split('|');
      let tglHtml = (tglArr.length > 1) ? `<div class="mb-1"><span class="badge bg-light text-dark border">Day 1: ${safeDate(tglArr[0])}</span></div><div><span class="badge bg-light text-dark border">Day 2: ${safeDate(tglArr[1])}</span></div>` : safeDate(p.tanggal);
      let teamHtml = (teamArr.length > 1) ? `<div class="mb-1"><span class="small fw-bold">Day 1: ${teamArr[0].trim()}</span></div><div><span class="small fw-bold">Day 2: ${teamArr[1] ? teamArr[1].trim() : '-'}</span></div>` : `<span class="fw-bold">${p.team || '-'}</span>`;
      const isValidMap = (url) => url && url.trim() !== '' && url.trim() !== '-';
      let lokasiHtmlDisplay = '';
      if (alamatArr.length > 1) {
        let btnMaps1 = isValidMap(mapsArr[0]) ? `<div class="d-flex align-items-center gap-2 mt-1 mb-2"><a href="${mapsArr[0].trim()}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm" style="font-size: 10px;"><i class="fa-solid fa-map-location-dot me-1"></i> Buka Maps D1</a><button class="btn btn-sm btn-light border rounded-pill text-secondary px-3 shadow-sm" style="font-size: 10px;" onclick="copyToClipboard('${mapsArr[0].trim()}')"><i class="fa-regular fa-copy"></i></button></div>` : '<div class="mb-2"></div>';
        let btnMaps2 = isValidMap(mapsArr[1]) ? `<div class="d-flex align-items-center gap-2 mt-1"><a href="${mapsArr[1].trim()}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm" style="font-size: 10px;"><i class="fa-solid fa-map-location-dot me-1"></i> Buka Maps D2</a><button class="btn btn-sm btn-light border rounded-pill text-secondary px-3 shadow-sm" style="font-size: 10px;" onclick="copyToClipboard('${mapsArr[1].trim()}')"><i class="fa-regular fa-copy"></i></button></div>` : '';
        lokasiHtmlDisplay = `<div class="mb-1 fw-bold small text-dark">Day 1:</div><div class="small fw-medium text-muted" style="white-space: pre-wrap;">${alamatArr[0].trim() || '-'}</div>${btnMaps1}<div class="mb-1 fw-bold small text-dark mt-2">Day 2:</div><div class="small fw-medium text-muted" style="white-space: pre-wrap;">${alamatArr[1].trim() || '-'}</div>${btnMaps2}`;
      } else {
        let btnMaps = isValidMap(mapsArr[0]) ? `<div class="d-flex align-items-center gap-2 mt-2"><a href="${mapsArr[0].trim()}" target="_blank" class="btn btn-sm btn-outline-primary rounded-pill px-3 shadow-sm" style="font-size: 11px;"><i class="fa-solid fa-map-location-dot me-1"></i> Buka Maps</a><button class="btn btn-sm btn-light border rounded-pill text-secondary px-3 shadow-sm" style="font-size: 11px;" onclick="copyToClipboard('${mapsArr[0].trim()}')"><i class="fa-regular fa-copy me-1"></i> Copy Link</button></div>` : '';
        let textAlamat = p.alamat && p.alamat.trim() !== '-' ? p.alamat : '<span class="text-muted fst-italic">Belum ada detail alamat</span>';
        lokasiHtmlDisplay = `<div class="small fw-medium mb-1 text-muted" style="white-space: pre-wrap;">${textAlamat}</div>${btnMaps}`;
      }
      document.getElementById('detailPemasukanContent').innerHTML = `<div class="d-flex flex-column gap-3"><div class="p-3 rounded-4 shadow-sm" style="background: rgba(0, 114, 255, 0.05); border: 1px solid rgba(0, 114, 255, 0.1);"><div class="d-flex justify-content-between align-items-start mb-2"><div><small class="text-muted fw-bold d-block mb-1">ID TRX: ${p.id_trx || '-'}</small><h5 class="fw-bold text-dark mb-0">${p.client || '-'}</h5><div class="text-muted small mt-1"><i class="fa-brands fa-whatsapp me-1 text-success"></i> ${p.phone || '-'}</div></div>${statusHtml}</div></div><div><h6 class="fw-bold text-primary mb-2 small"><i class="fa-regular fa-calendar-check me-2"></i>Detail Acara</h6><table class="table table-sm table-borderless mb-0" style="font-size: 13px;"><tr><td class="text-muted" style="width: 120px;">Tanggal</td><td class="fw-bold">${tglHtml}</td></tr><tr><td class="text-muted">Paket</td><td class="fw-bold text-info">${p.layanan || '-'}</td></tr><tr><td class="text-muted">Team</td><td>${teamHtml}</td></tr></table></div><div><h6 class="fw-bold text-primary mb-2 small"><i class="fa-solid fa-location-dot me-2"></i>Lokasi Acara</h6><div class="ps-3 border-start border-2 border-primary">${lokasiHtmlDisplay}</div></div><hr class="opacity-10 my-1"><div><h6 class="fw-bold text-primary mb-2 small"><i class="fa-solid fa-receipt me-2"></i>Rincian Biaya</h6><table class="table table-sm table-borderless mb-0" style="font-size: 13px;"><tr><td class="text-muted">Harga Satuan</td><td class="text-end fw-bold">${formatRp(p.harga)}</td></tr><tr><td class="text-muted">Jumlah (Qty)</td><td class="text-end fw-bold">${p.jumlah || 1}</td></tr><tr><td class="text-muted">Transport</td><td class="text-end fw-bold">${formatRp(p.transport)}</td></tr><tr><td class="text-muted">Diskon</td><td class="text-end fw-bold text-danger">- ${formatRp(p.diskon)}</td></tr><tr><td class="text-muted">Down Payment</td><td class="text-end fw-bold text-warning">- ${formatRp(p.dp)}</td></tr><tr style="border-top: 1px dashed #ccc;"><td class="fw-bold pt-2">Total Akhir</td><td class="text-end fw-bold text-success fs-6 pt-2">${formatRp(p.total)}</td></tr></table></div><div class="p-3 rounded-4 bg-light border shadow-sm"><h6 class="fw-bold text-muted mb-1 small"><i class="fa-solid fa-note-sticky me-1"></i>Catatan Tambahan</h6><div class="small text-dark" style="white-space: pre-wrap;">${p.catatan || '<span class="text-muted fst-italic">Tidak ada catatan</span>'}</div></div></div>`;
      new bootstrap.Modal(document.getElementById('modalDetailPemasukan')).show();
    };

    window.openModalPemasukan = function () {
      document.getElementById('formPemasukan').reset(); document.getElementById('pemId').value = ''; document.getElementById('pemIsEdit').value = 'false'; document.getElementById('titlePemasukan').innerText = 'Order Baru'; document.getElementById('pemTanggal').value = safeDate(new Date()); document.getElementById('displayTotalPem').innerText = 'Rp 0'; document.getElementById('pemLunas').checked = false; document.getElementById('pemAlamat').value = ''; if (document.getElementById('pemAlamat2')) document.getElementById('pemAlamat2').value = ''; document.getElementById('pemLinkMaps').value = ''; if (document.getElementById('pemLinkMaps2')) document.getElementById('pemLinkMaps2').value = '';
      document.getElementById('pemLayanan').innerHTML = '<option value="">-- Pilih Paket --</option>' + dbProduk.map(p => `<option value="${p.nama}" data-harga="${p.harga}">${p.nama}</option>`).join('');
      toggleExclusiveFields(); new bootstrap.Modal(document.getElementById('modalPemasukan')).show();
    };

    window.editPemasukan = function (id) {
      const p = dbPemasukan.find(x => x.id == id); if (!p) return;
      document.getElementById('pemId').value = p.id; document.getElementById('pemIsEdit').value = 'true'; document.getElementById('titlePemasukan').innerText = 'Edit Order'; document.getElementById('pemTrx').value = p.id_trx || '';
      let tglArr = (p.tanggal || '').split(','); document.getElementById('pemTanggal').value = safeDate(tglArr[0]); if (document.getElementById('pemTanggal2')) document.getElementById('pemTanggal2').value = tglArr[1] ? safeDate(tglArr[1]) : '';
      const sel = document.getElementById('pemLayanan'); sel.innerHTML = '<option value="">-- Pilih Paket --</option>' + dbProduk.map(prod => `<option value="${prod.nama}" data-harga="${prod.harga}">${prod.nama}</option>`).join(''); sel.value = p.layanan || '';
      document.getElementById('pemClient').value = p.client || ''; document.getElementById('pemPhone').value = p.phone || '';
      let teamArr = (p.team || '').split('|'); document.getElementById('pemTeam').value = teamArr[0] ? teamArr[0].trim() : ''; if (document.getElementById('pemTeam2')) document.getElementById('pemTeam2').value = teamArr[1] ? teamArr[1].trim() : '';
      let alamatArr = (p.alamat || '').split('|'); document.getElementById('pemAlamat').value = alamatArr[0] ? alamatArr[0].trim() : ''; if (document.getElementById('pemAlamat2')) document.getElementById('pemAlamat2').value = alamatArr[1] ? alamatArr[1].trim() : '';
      let mapsArr = (p.link_maps || '').split('|'); document.getElementById('pemLinkMaps').value = mapsArr[0] ? mapsArr[0].trim() : ''; if (document.getElementById('pemLinkMaps2')) document.getElementById('pemLinkMaps2').value = mapsArr[1] ? mapsArr[1].trim() : '';
      document.getElementById('pemCatatan').value = p.catatan || ''; document.getElementById('pemQty').value = p.jumlah || 1; document.getElementById('pemHarga').value = p.harga || 0; document.getElementById('pemTransport').value = p.transport || 0; document.getElementById('pemDiskon').value = p.diskon || 0; document.getElementById('pemDp').value = p.dp || 0; document.getElementById('pemLunas').checked = (p.is_lunas === true || String(p.is_lunas) === 'true');
      calcTotalPem(); toggleExclusiveFields(); new bootstrap.Modal(document.getElementById('modalPemasukan')).show();
    };

    window.savePemasukan = function () {
      let tgl1 = document.getElementById('pemTanggal').value; let tgl2 = document.getElementById('pemTanggal2') ? document.getElementById('pemTanggal2').value : ''; let tglFinal = (tgl2 && !document.getElementById('exclusiveTglRow').classList.contains('d-none')) ? tgl1 + ', ' + tgl2 : tgl1;
      let tm1 = document.getElementById('pemTeam').value; let tm2 = document.getElementById('pemTeam2') ? document.getElementById('pemTeam2').value : ''; let tmFinal = (tm2 && !document.getElementById('exclusiveTeamRow').classList.contains('d-none')) ? tm1 + ' | ' + tm2 : tm1;
      let alm1 = document.getElementById('pemAlamat').value; let alm2 = document.getElementById('pemAlamat2') ? document.getElementById('pemAlamat2').value : ''; let almFinal = (alm2 && !document.getElementById('exclusiveAlamatRow').classList.contains('d-none')) ? alm1 + ' | ' + alm2 : alm1;
      let maps1 = document.getElementById('pemLinkMaps').value; let maps2 = document.getElementById('pemLinkMaps2') ? document.getElementById('pemLinkMaps2').value : ''; let mapsFinal = (maps2 && !document.getElementById('exclusiveAlamatRow').classList.contains('d-none')) ? maps1 + ' | ' + maps2 : maps1;

      const payload = {
        id: document.getElementById('pemId').value, isEdit: document.getElementById('pemIsEdit').value, id_trx: document.getElementById('pemTrx').value, tanggal: tglFinal, client: document.getElementById('pemClient').value, phone: document.getElementById('pemPhone').value, team: tmFinal, layanan: document.getElementById('pemLayanan').value, jumlah: document.getElementById('pemQty').value, harga: document.getElementById('pemHarga').value, diskon: document.getElementById('pemDiskon').value, dp: document.getElementById('pemDp').value, transport: document.getElementById('pemTransport').value, total: document.getElementById('pemTotal').value, is_lunas: document.getElementById('pemLunas').checked, catatan: document.getElementById('pemCatatan').value, alamat: almFinal, link_maps: mapsFinal
      };
      handleOptimisticSave('Pemasukan', payload, dbPemasukan, 'modalPemasukan');
    };

    // 7. CRUD PENGELUARAN
    window.renderPengeluaran = function () {
      const tbOps = document.getElementById('tbody-pengeluaran-ops');
      const fTahun = document.getElementById('pengTahun').value; const fBulan = document.getElementById('pengBulan').value;

      const dataOps = dbPengeluaran.filter(x => {
        const kat = String(x.kategori).trim().toLowerCase();
        if (kat === 'fee team' || kat === 'feeteam') return false;
        let tgl = String(x.tanggal); return (fTahun === 'all' || tgl.startsWith(fTahun)) && (fBulan === 'all' || tgl.substring(5, 7) === fBulan);
      });

      if (dataOps.length === 0) tbOps.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">Belum ada pengeluaran operasional</td></tr>`;
      else tbOps.innerHTML = dataOps.map((p, i) => {
        const isLunas = String(p.status_bayar).trim().toLowerCase() === 'lunas'; const badgeStatus = isLunas ? '<span class="badge bg-success shadow-sm">LUNAS</span>' : '<span class="badge bg-warning text-dark shadow-sm">Belum Dibayar</span>';
        return `<tr class="${p._isSyncing ? 'syncing-item' : ''}"><td class="d-none d-md-table-cell">${i + 1}</td><td class="d-none d-md-table-cell">${safeDate(p.tanggal)}</td><td><div class="fw-bold">${p.detail}</div><div class="d-md-none mt-1 small text-muted"><i class="fa-regular fa-calendar me-1"></i>${safeDate(p.tanggal)}</div><div class="d-md-none mt-1"><span class="badge bg-danger rounded-pill bg-opacity-75" style="font-size:10px;">${p.kategori}</span></div></td><td class="d-none d-md-table-cell"><span class="badge bg-danger rounded-pill bg-opacity-75">${p.kategori}</span></td><td><div class="fw-bold text-danger">${formatRp(p.nominal)}</div><div class="d-md-none mt-1 small text-muted fst-italic">${p.catatan || ''}</div><div class="d-md-none mt-1">${badgeStatus}</div></td><td class="small d-none d-md-table-cell">${p.catatan || '-'}</td><td class="d-none d-md-table-cell">${badgeStatus}</td><td>${p._isSyncing ? '<span class="spinner-border spinner-border-sm text-danger"></span>' : `<div class="d-flex gap-1"><button class="btn btn-sm btn-light border text-primary shadow-sm" style="padding:4px 8px; font-size:11px;" onclick="editPengeluaran(${p.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light border text-danger shadow-sm" style="padding:4px 8px; font-size:11px;" onclick="delData('Pengeluaran', ${p.id})"><i class="fa-solid fa-trash"></i></button></div>`}</td></tr>`;
      }).join('');

      const tbFee = document.getElementById('tbody-pengeluaran-fee'); let htmlFee = ''; let countFee = 1;
      let filteredPemForFee = dbPemasukan.filter(p => { let tgl = String(p.tanggal).split(',')[0].trim(); return (fTahun === 'all' || tgl.startsWith(fTahun)) && (fBulan === 'all' || tgl.substring(5, 7) === fBulan); });

      filteredPemForFee.forEach(p => {
        if (!p.team) return;
        const members = p.team.split(/&|,| dan |\|/i).map(s => s.trim()).filter(s => s !== '');
        members.forEach(m => {
          const feeRecord = dbPengeluaran.find(x => String(x.kategori).trim().toLowerCase() === 'fee team' && String(x.catatan).trim() === `PEM_ID:${p.id}|MEMBER:${m}`);
          const isRecorded = !!feeRecord; const isPaid = isRecorded && String(feeRecord.status_bayar).trim().toLowerCase() === 'lunas';
          let tglKerja = p.tanggal ? safeDate(p.tanggal.split(',')[0]) : '-';
          const tglBayar = isRecorded ? safeDate(feeRecord.tanggal) : '-'; const nominal = isRecorded ? formatRp(feeRecord.nominal) : '-';
          let statusBadge = '<span class="badge bg-secondary shadow-sm">Belum Diatur</span>';
          if (isPaid) statusBadge = '<span class="badge bg-success shadow-sm">LUNAS</span>'; else if (isRecorded) statusBadge = '<span class="badge bg-warning text-dark shadow-sm">Belum Dibayar</span>';
          let btnAksi = '';
          if (feeRecord && feeRecord._isSyncing) btnAksi = '<span class="spinner-border spinner-border-sm text-primary"></span>';
          else if (isRecorded) btnAksi = `<div class="d-flex gap-1"><button class="btn btn-sm btn-outline-primary shadow-sm" style="font-size:11px;" onclick="openModalBayarFee(${p.id}, '${m.replace(/'/g, "\\'")}', '${(p.client || '').replace(/'/g, "\\'")}', ${feeRecord.id})" title="Edit / Lunasi"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-outline-danger shadow-sm" style="font-size:11px;" onclick="delData('Pengeluaran', ${feeRecord.id})" title="Hapus Fee"><i class="fa-solid fa-trash"></i></button></div>`;
          else btnAksi = `<button class="btn btn-sm btn-primary-gradient shadow-sm" style="font-size:11px;" onclick="openModalBayarFee(${p.id}, '${m.replace(/'/g, "\\'")}', '${(p.client || '').replace(/'/g, "\\'")}')">Set Fee</button>`;
          htmlFee += `<tr><td>${countFee++}</td><td>${tglKerja}</td><td class="fw-bold">${m}</td><td class="small">${p.client || '-'} <br><span class="text-muted">${p.layanan || '-'}</span></td><td class="fw-bold text-success">${nominal}</td><td>${tglBayar}</td><td>${statusBadge}</td><td>${btnAksi}</td></tr>`;
        });
      });
      if (htmlFee === '') htmlFee = `<tr><td colspan="8" class="text-center text-muted py-4">Belum ada tim yang bekerja pada periode ini</td></tr>`; tbFee.innerHTML = htmlFee;
    };

    window.openModalPengeluaran = function () {
      document.getElementById('formPengeluaran').reset(); document.getElementById('pengId').value = ''; document.getElementById('pengIsEdit').value = 'false'; document.getElementById('titlePengeluaran').innerText = 'Pencatatan Pengeluaran Manual'; document.getElementById('pengTanggal').value = safeDate(new Date());
      const elStat = document.getElementById('pengStatus'); if (elStat) elStat.value = 'Lunas'; new bootstrap.Modal(document.getElementById('modalPengeluaran')).show();
    };

    window.editPengeluaran = function (id) {
      const p = dbPengeluaran.find(x => x.id == id); if (!p) return;
      document.getElementById('pengId').value = p.id; document.getElementById('pengIsEdit').value = 'true'; document.getElementById('pengTanggal').value = safeDate(p.tanggal); document.getElementById('pengDetail').value = p.detail; document.getElementById('pengKategori').value = p.kategori; document.getElementById('pengNominal').value = p.nominal; document.getElementById('pengCatatan').value = p.catatan || '';
      const elStat = document.getElementById('pengStatus'); if (elStat) elStat.value = (String(p.status_bayar).trim().toLowerCase() === 'lunas') ? 'Lunas' : 'Belum Dibayar';
      document.getElementById('titlePengeluaran').innerText = 'Edit Pengeluaran'; new bootstrap.Modal(document.getElementById('modalPengeluaran')).show();
    };

    window.savePengeluaran = function () {
      const elStat = document.getElementById('pengStatus');
      const payload = { id: document.getElementById('pengId').value, isEdit: document.getElementById('pengIsEdit').value, tanggal: document.getElementById('pengTanggal').value, detail: document.getElementById('pengDetail').value, kategori: document.getElementById('pengKategori').value, nominal: document.getElementById('pengNominal').value, catatan: document.getElementById('pengCatatan').value, status_bayar: elStat ? elStat.value : 'Lunas' };
      handleOptimisticSave('Pengeluaran', payload, dbPengeluaran, 'modalPengeluaran');
      setTimeout(() => { const tabEl = document.querySelector('button[data-bs-target="#tab-operasional"]'); if (tabEl) new bootstrap.Tab(tabEl).show(); }, 500);
    };

    window.openModalBayarFee = function (pemId, memberName, clientName, existingId = null) {
      document.getElementById('formBayarFee').reset(); document.getElementById('feePemId').value = pemId; document.getElementById('feeMemberName').value = memberName; document.getElementById('feePengId').value = existingId || ''; document.getElementById('displayFeeMember').innerText = memberName; document.getElementById('displayFeeJob').innerText = clientName || 'Project';
      if (existingId) {
        const feeRecord = dbPengeluaran.find(x => x.id == existingId);
        if (feeRecord) { document.getElementById('feeTanggal').value = safeDate(feeRecord.tanggal); document.getElementById('feeNominal').value = feeRecord.nominal; const elStatus = document.getElementById('feeStatus'); if (elStatus) elStatus.value = String(feeRecord.status_bayar).trim().toLowerCase() === 'lunas' ? 'Lunas' : 'Belum Dibayar'; }
      } else { document.getElementById('feeTanggal').value = safeDate(new Date()); const elStatus = document.getElementById('feeStatus'); if (elStatus) elStatus.value = 'Belum Dibayar'; }
      new bootstrap.Modal(document.getElementById('modalBayarFee')).show();
    };

    window.saveFeeTeam = function () {
      const pemId = document.getElementById('feePemId').value; const member = document.getElementById('feeMemberName').value; const pengId = document.getElementById('feePengId').value; const isEdit = pengId !== ''; const elStatus = document.getElementById('feeStatus');
      const payload = { id: isEdit ? pengId : Date.now(), isEdit: isEdit ? 'true' : 'false', tanggal: document.getElementById('feeTanggal').value, detail: `Fee Team: ${member}`, kategori: 'Fee Team', nominal: document.getElementById('feeNominal').value, catatan: `PEM_ID:${pemId}|MEMBER:${member}`, status_bayar: elStatus ? elStatus.value : 'Lunas' };
      handleOptimisticSave('Pengeluaran', payload, dbPengeluaran, 'modalBayarFee');
    };

    // 8. KALENDER & ARUS KAS
    let calendar = null;
    window.renderKalender = function () {
      const calEl = document.getElementById('calendarArea');
      if (calendar) { calendar.destroy(); calendar = null; }

      let events = [];
      dbPemasukan.forEach(p => {
        if (p.tanggal) {
          let tglArr = String(p.tanggal).split(',');
          let teamArr = String(p.team || '').split('|');
          tglArr.forEach((d, idx) => {
            let trimD = d.trim();
            if (trimD) {
              let tName = teamArr.length > idx ? teamArr[idx].trim() : (teamArr[0] || 'TBA');
              events.push({
                title: `${p.client || 'Client'} (${tName})`,
                start: safeDate(trimD),
                backgroundColor: '#0072ff',
                borderColor: '#0072ff',
                allDay: true
              });
            }
          });
        }
      });

      calendar = new FullCalendar.Calendar(calEl, {
        initialView: 'dayGridMonth',
        events: events,
        height: 550,
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,listMonth'
        },
        buttonText: {
          dayGridMonth: 'Kotak',
          listMonth: 'List'
        },
        datesSet: function (info) {
          const d = info.view.currentStart;
          document.getElementById('calTahun').value = d.getFullYear();
          document.getElementById('calBulan').value = String(d.getMonth() + 1).padStart(2, '0');
        }
      });
      calendar.render();
    };

    window.changeCalendarDate = function () { if (!calendar) return; const y = document.getElementById('calTahun').value; const m = document.getElementById('calBulan').value; calendar.gotoDate(`${y}-${m}-01`); };

    window.renderArusKas = function () {
      const tahun = document.getElementById('akTahun').value; const bulan = document.getElementById('akBulan').value;
      let pem = dbPemasukan.filter(p => { let tgl = String(p.tanggal).split(',')[0].trim(); return (tahun === 'all' || tgl.startsWith(tahun)) && (bulan === 'all' || tgl.substring(5, 7) === bulan); });
      let peng = dbPengeluaran.filter(p => {
        let effectiveDate = String(p.tanggal);
        if (p.kategori === 'Fee Team' && p.catatan && p.catatan.includes('PEM_ID:')) { let match = p.catatan.match(/PEM_ID:(\d+)/); if (match && match[1]) { let pms = dbPemasukan.find(x => String(x.id) === match[1]); if (pms && pms.tanggal) effectiveDate = String(pms.tanggal).split(',')[0].trim(); } }
        return (tahun === 'all' || effectiveDate.startsWith(tahun)) && (bulan === 'all' || effectiveDate.substring(5, 7) === bulan);
      });

      let groupPem = {}; pem.forEach(x => { groupPem[x.layanan || 'Lainnya'] = (groupPem[x.layanan || 'Lainnya'] || 0) + Number(x.total); });
      let groupPeng = {}; peng.filter(x => String(x.status_bayar).trim().toLowerCase() !== 'belum dibayar').forEach(x => { groupPeng[x.kategori || 'Lainnya'] = (groupPeng[x.kategori || 'Lainnya'] || 0) + Number(x.nominal); });
      const totalPem = pem.reduce((s, i) => s + (Number(i.total) || 0), 0);
      const totalPeng = peng.filter(x => String(x.status_bayar).trim().toLowerCase() !== 'belum dibayar').reduce((s, i) => s + (Number(i.nominal) || 0), 0);
      const labaBersih = totalPem - totalPeng;

      let pemRows = Object.keys(groupPem).map(k => `<tr><td class="ps-4 text-muted"><i class="fa-solid fa-check text-success me-2"></i> ${k}</td><td class="text-end">${formatRp(groupPem[k])}</td></tr>`).join('');
      if (!pemRows) pemRows = `<tr><td colspan="2" class="text-center text-muted fst-italic">Tidak ada pemasukan</td></tr>`;
      let pengRows = Object.keys(groupPeng).map(k => `<tr><td class="ps-4 text-muted"><i class="fa-solid fa-minus text-danger me-2"></i> ${k}</td><td class="text-end text-danger">${formatRp(groupPeng[k])}</td></tr>`).join('');
      if (!pengRows) pengRows = `<tr><td colspan="2" class="text-center text-muted fst-italic">Tidak ada pengeluaran</td></tr>`;

      document.getElementById('arusKasContainer').innerHTML = `<div class="card border-0 shadow-sm overflow-hidden mb-4"><div class="card-body p-0"><table class="table mb-0 table-custom"><tr style="background: rgba(32, 201, 151, 0.1);"><th class="fs-6 py-3 px-4 rounded-0 border-0 text-success"><i class="fa-solid fa-wallet me-2"></i> RINCIAN PEMASUKAN</th><th class="text-end border-0"></th></tr>${pemRows}<tr class="bg-light"><td class="fw-bold px-4 py-3">Total Pemasukan Operasional</td><td class="text-end fw-bold text-success fs-5 py-3">${formatRp(totalPem)}</td></tr><tr style="background: rgba(220, 53, 69, 0.1);"><th class="fs-6 py-3 px-4 rounded-0 border-0 text-danger"><i class="fa-solid fa-money-bill-transfer me-2"></i> RINCIAN PENGELUARAN</th><th class="text-end border-0"></th></tr>${pengRows}<tr class="bg-light"><td class="fw-bold px-4 py-3">Total Pengeluaran Operasional</td><td class="text-end fw-bold text-danger fs-5 py-3">${formatRp(totalPeng)}</td></tr><tr style="background: linear-gradient(135deg, rgba(0, 198, 255, 0.1), rgba(0, 114, 255, 0.1));"><th class="fs-4 py-4 px-4 border-0 text-primary">LABA BERSIH (NET PROFIT)</th><th class="text-end fs-3 fw-bold border-0 py-4 px-4 text-primary">${formatRp(labaBersih)}</th></tr></table></div></div>`;
    };

    // 9. TODO LIST
    window.renderTodo = function () {
      const tb = document.getElementById('tbody-todo'); if (dbTodo.length === 0) { tb.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">Belum ada task</td></tr>`; return; }
      tb.innerHTML = dbTodo.map((t, i) => `<tr class="${t._isSyncing ? 'syncing-item' : ''}"><td>${i + 1}</td><td class="fw-bold ${t.status === 'Done' ? 'text-decoration-line-through text-muted opacity-50' : ''}">${t.task}</td><td><span class="badge bg-light text-dark border">${t.kategori}</span></td><td><span class="badge ${t.prioritas === 'High' ? 'bg-danger' : t.prioritas === 'Medium' ? 'bg-warning' : 'bg-info'} bg-opacity-75">${t.prioritas}</span></td><td>${safeDate(t.duedate)}</td><td class="fw-bold text-success">${t.harga ? formatRp(t.harga) : '-'}</td><td class="${t.status === 'Done' ? 'text-success fw-bold' : 'text-muted'}">${t.status}</td><td><input type="checkbox" class="form-check-input shadow-sm" style="transform: scale(1.3);" ${t.status === 'Done' ? 'checked' : ''} onclick="toggleTodo(${t.id})"></td><td>${t._isSyncing ? '<span class="spinner-border spinner-border-sm text-primary"></span>' : `<button class="btn btn-sm btn-light border me-1 text-primary shadow-sm" onclick="editTodo(${t.id})"><i class="fa-solid fa-pen"></i></button><button class="btn btn-sm btn-light border text-danger shadow-sm" onclick="delData('Todo', ${t.id})"><i class="fa-solid fa-trash"></i></button>`}</td></tr>`).join('');
    };
    window.toggleTodo = function (id) { const t = dbTodo.find(x => x.id == id); if (!t) return; t.status = t.status === 'Done' ? 'Not started' : 'Done'; handleOptimisticSave('Todo', { id: t.id, isEdit: 'true', status: t.status }, dbTodo, null); };
    window.openModalTodo = function () { document.getElementById('formTodo').reset(); document.getElementById('todoId').value = ''; document.getElementById('todoIsEdit').value = 'false'; document.getElementById('titleTodo').innerText = 'Tambah Task / Alat'; document.getElementById('todoDuedate').value = safeDate(new Date()); document.getElementById('todoHarga').value = ''; new bootstrap.Modal(document.getElementById('modalTodo')).show(); };
    window.editTodo = function (id) { const t = dbTodo.find(x => x.id == id); if (!t) return; document.getElementById('todoId').value = t.id; document.getElementById('todoIsEdit').value = 'true'; document.getElementById('titleTodo').innerText = 'Edit Task / Alat'; document.getElementById('todoTask').value = t.task; document.getElementById('todoKategori').value = t.kategori; document.getElementById('todoPrioritas').value = t.prioritas; document.getElementById('todoDuedate').value = safeDate(t.duedate); document.getElementById('todoHarga').value = t.harga || ''; new bootstrap.Modal(document.getElementById('modalTodo')).show(); };
    window.saveTodo = function () { const payload = { id: document.getElementById('todoId').value, isEdit: document.getElementById('todoIsEdit').value, task: document.getElementById('todoTask').value, kategori: document.getElementById('todoKategori').value, prioritas: document.getElementById('todoPrioritas').value, duedate: document.getElementById('todoDuedate').value, harga: document.getElementById('todoHarga').value, status: 'Not started' }; if (payload.isEdit === 'true') { const existing = dbTodo.find(x => String(x.id) === payload.id); if (existing) payload.status = existing.status; } handleOptimisticSave('Todo', payload, dbTodo, 'modalTodo'); };

    // 10. INVOICE LOGIC & EXPORT WA
    window.openInvoicePreview = function (id) {
      const targetTrx = dbPemasukan.find(x => x.id == id); if (!targetTrx) return;
      let itemsToProcess = [targetTrx]; if (targetTrx.id_trx && String(targetTrx.id_trx).trim() !== '') itemsToProcess = dbPemasukan.filter(x => String(x.id_trx).trim() === String(targetTrx.id_trx).trim());
      currentInvoiceTrx = itemsToProcess[0];

      let set = dbPengaturan.length > 0 ? dbPengaturan[0] : {};
      document.getElementById('invBrandName').innerText = set.brand || 'Kama Visual'; document.getElementById('invBrandTagline').innerText = set.tagline || 'Prewedding, Wedding Documentation Etc.'; document.getElementById('invPhoneKama').innerText = set.phone || '081999778556'; document.getElementById('invEmailKama').innerText = set.email || 'kamabalicreative@gmail.com'; document.getElementById('invBankName').innerText = set.bank || 'Bank Central Asia'; document.getElementById('invBankAcc').innerText = set.acc || '6485602503'; document.getElementById('invBankAccName').innerText = set.acc_name || 'Ni Putu Ayu Nely Pradnyawati'; document.getElementById('invSignName').innerText = set.brand || 'Kama Visual'; document.getElementById('invNotesText').innerText = set.notes_inv || 'All prices above are fixed prices. Please confirm after payment.';

      const logoCont = document.getElementById('invLogoContainer'); if (set.logo_inv && set.logo_inv.length > 20) { logoCont.innerHTML = `<img src="${set.logo_inv}" alt="Logo" style="max-height:100%; max-width:100%; object-fit:contain;">`; logoCont.style.border = 'none'; } else { logoCont.innerHTML = `km`; logoCont.style.border = '2px solid #000'; }
      const signCont = document.getElementById('invSignatureContainer'); if (set.ttd_inv && set.ttd_inv.length > 20) { signCont.innerHTML = `<img src="${set.ttd_inv}" style="max-height: 60px; max-width: 150px; object-fit: contain;">`; } else { signCont.innerHTML = `<svg width="150" height="40" viewBox="0 0 150 40"><path d="M10,35 C30,20 60,10 80,15 C100,20 120,30 140,20" stroke="black" fill="transparent" stroke-width="2"/><path d="M50,30 C70,10 90,5 110,25" stroke="black" fill="transparent" stroke-width="1"/></svg>`; }

      document.getElementById('invNo').innerText = `#INV/ ${currentInvoiceTrx.id_trx || Date.now().toString().slice(-5)}`; document.getElementById('invClient').innerText = currentInvoiceTrx.client || '-'; document.getElementById('invClientPhone').innerText = currentInvoiceTrx.phone || '-';

      let allDates = []; itemsToProcess.forEach(c => { if (c.tanggal) c.tanggal.split(',').forEach(d => { let trimD = d.trim(); if (trimD && !allDates.includes(trimD)) allDates.push(trimD); }); });
      let dateStrings = allDates.map(ds => { const d = new Date(ds); return isNaN(d) ? ds : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); }).join(' & ');
      let dueDateStr = '-'; if (allDates.length > 0) { const firstD = new Date(allDates[0]); if (!isNaN(firstD)) { firstD.setDate(firstD.getDate() + 7); dueDateStr = firstD.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } }
      document.getElementById('invDate').innerText = dateStrings || '-'; document.getElementById('invDueDate').innerText = dueDateStr;

      let itemsHtml = ''; let sumSub = 0, sumTrans = 0, sumDisc = 0, sumDP = 0;
      let anyLunas = itemsToProcess.some(c => c.is_lunas === true || String(c.is_lunas) === 'true');

      itemsToProcess.forEach(trx => {
        const rowSub = (Number(trx.harga) || 0) * (Number(trx.jumlah) || 1); const rowDiskon = Number(trx.diskon) || 0;
        itemsHtml += `<tr><td>${trx.layanan}</td><td style="text-align:center;">${trx.jumlah || 1}</td><td style="text-align:right;">${formatRp(trx.harga)}</td><td style="text-align:right;">${formatRp(rowDiskon)}</td><td style="text-align:right;">${formatRp(rowSub - rowDiskon)}</td></tr>`;
        sumSub += (rowSub - rowDiskon); sumTrans += Number(trx.transport) || 0; sumDisc += rowDiskon; sumDP += Number(trx.dp) || 0;
      });

      document.getElementById('invItemsBody').innerHTML = itemsHtml; document.getElementById('invSubTotal').innerText = formatRp(sumSub); document.getElementById('invTransport').innerText = formatRp(sumTrans); document.getElementById('invDiskon').innerText = formatRp(sumDisc); document.getElementById('invDP').innerText = formatRp(sumDP);

      let grandTotal = sumSub + sumTrans - sumDP; document.getElementById('invGrandTotal').innerText = formatRp(grandTotal);
      const wm = document.getElementById('invWatermark'); wm.className = 'invoice-watermark'; wm.innerText = '';

      if (anyLunas || grandTotal <= 0) { grandTotal = Math.max(0, grandTotal); wm.innerText = 'LUNAS'; wm.classList.add('watermark-lunas'); }
      else if (sumDP > 0) { wm.innerText = 'DP'; wm.classList.add('watermark-dp'); }

      document.getElementById('invBalance').innerText = formatRp(grandTotal);
      document.getElementById('mainApp').style.display = 'none'; document.getElementById('invoicePreviewWrapper').style.display = 'block'; window.scrollTo(0, 0);
    };

    window.closeInvoicePreview = function () { document.getElementById('invoicePreviewWrapper').style.display = 'none'; document.getElementById('mainApp').style.display = ''; currentInvoiceTrx = null; };

    window.exportJPG = function (isForWA = false) {
      const area = document.getElementById('invoicePrintArea'); const noInv = currentInvoiceTrx.id_trx || Date.now(); Swal.fire({ title: 'Memproses Gambar...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      html2canvas(area, { scale: 2, useCORS: true }).then(canvas => { const link = document.createElement('a'); link.download = `Invoice_${noInv}.jpg`; link.href = canvas.toDataURL('image/jpeg', 1.0); link.click(); Swal.close(); if (!isForWA) Swal.fire({ icon: 'success', title: 'Berhasil', text: 'JPG berhasil didownload', timer: 1500, showConfirmButton: false }); });
    };

    window.exportPDF = function () {
      const area = document.getElementById('invoicePrintArea'); const noInv = currentInvoiceTrx.id_trx || Date.now(); Swal.fire({ title: 'Memproses PDF...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });
      html2canvas(area, { scale: 2, useCORS: true }).then(canvas => { const imgData = canvas.toDataURL('image/jpeg', 1.0); const { jsPDF } = window.jspdf; const pdf = new jsPDF('p', 'mm', 'a4'); const pdfWidth = pdf.internal.pageSize.getWidth(); const pdfHeight = (canvas.height * pdfWidth) / canvas.width; pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight); pdf.save(`Invoice_${noInv}.pdf`); Swal.close(); });
    };

    window.kirimWA = function () {
      if (!currentInvoiceTrx) return; let phone = currentInvoiceTrx.phone;
      if (!phone) return Swal.fire('Oops', 'Nomor HP Client kosong. Silakan lengkapi di data Order.', 'warning');
      phone = String(phone).replace(/\D/g, '');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      let msg = `Halo kak berikut kami kirimkan invoicenya ya kak.\nTerima kasih kak`;
      const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      exportJPG(true);
      Swal.fire({ icon: 'info', title: 'Membuka WhatsApp...', text: 'JPG Invoice sedang didownload. Silakan paste/attach gambar tersebut di ruang obrolan WhatsApp.', showConfirmButton: true, confirmButtonText: 'Buka WA Sekarang' }).then(() => { window.open(waLink, '_blank'); });
    };

    // 11. CORE ENGINE (SAVE & DELETE)
    function handleOptimisticSave(tableName, payload, dbArray, modalId) {
      let tempId = (payload.isEdit === 'true' || payload.isEdit === true) ? payload.id : Date.now();
      payload.id = tempId; // Ensure frontend and backend use same ID
      let tempItem = { ...payload, _isSyncing: true };
      let backup = JSON.parse(JSON.stringify(dbArray));
      if (payload.isEdit === 'true' || payload.isEdit === true) { let idx = dbArray.findIndex(x => x.id == tempId); if (idx !== -1) Object.assign(dbArray[idx], tempItem); } else { dbArray.unshift(tempItem); }
      updateDynamicYears(); routeRender(); if (modalId) { let mod = bootstrap.Modal.getInstance(document.getElementById(modalId)); if (mod) mod.hide(); }
      Swal.fire({ icon: 'info', title: 'Menyimpan...', toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000 });
      gasRun('saveData', tableName, payload).then(res => {
        if (res.success) {
          let savedItem = dbArray.find(x => x.id == tempId);
          if (savedItem) delete savedItem._isSyncing;
          routeRender();
        } else { dbArray.splice(0, dbArray.length, ...backup); updateDynamicYears(); routeRender(); Swal.fire('Error', res.message || 'Gagal menyimpan', 'error'); }
      }).catch(err => { dbArray.splice(0, dbArray.length, ...backup); updateDynamicYears(); routeRender(); Swal.fire('Error', err.message, 'error'); });
    }

    window.delData = function (tableName, id) {
      Swal.fire({ title: 'Hapus data?', text: 'Data tidak bisa dikembalikan!', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Ya, Hapus' }).then(res => {
        if (!res.isConfirmed) return;
        let dbArray; if (tableName === 'Produk') dbArray = dbProduk; else if (tableName === 'Pemasukan') dbArray = dbPemasukan; else if (tableName === 'Pengeluaran') dbArray = dbPengeluaran; else if (tableName === 'Users') dbArray = dbUsers; else dbArray = dbTodo;
        let backup = JSON.parse(JSON.stringify(dbArray)); let idx = dbArray.findIndex(x => x.id == id); if (idx !== -1) dbArray.splice(idx, 1);
        updateDynamicYears(); routeRender();
        gasRun('deleteData', tableName, id).then(r => { if (!r.success) { dbArray.splice(0, dbArray.length, ...backup); updateDynamicYears(); routeRender(); Swal.fire('Error', r.message, 'error'); } });
      });
    };

    document.addEventListener('DOMContentLoaded', () => { checkLoginState(); });
  



