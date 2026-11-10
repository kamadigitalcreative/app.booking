// ==========================================
// 0. THEME ENGINE (LIGHT & DARK MODE)
// ==========================================
window.initTheme = function() {
  const saved = localStorage.getItem('bookhive_theme') || 'light';
  window.applyTheme(saved);
};

window.toggleTheme = function() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const nextTheme = current === 'dark' ? 'light' : 'dark';
  window.applyTheme(nextTheme);
};

window.applyTheme = function(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  localStorage.setItem('bookhive_theme', theme);

  document.querySelectorAll('.theme-toggle-icon').forEach(icon => {
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun text-amber-400 theme-toggle-icon';
    } else {
      icon.className = 'fa-solid fa-moon text-indigo-600 theme-toggle-icon';
    }
  });

  document.querySelectorAll('.theme-toggle-label').forEach(el => {
    el.innerText = theme === 'dark' ? 'Mode Terang' : 'Mode Malam';
  });

  if (dashChart) {
    const isDark = theme === 'dark';
    if (dashChart.options && dashChart.options.plugins && dashChart.options.plugins.legend && dashChart.options.plugins.legend.labels) {
      dashChart.options.plugins.legend.labels.color = isDark ? '#F8FAFC' : '#1E293B';
      dashChart.update();
    }
  }
};

// 1. STATE
var currentUser = null, activePage = 'dashboard', isDataLoaded = false, currentInvoiceTrx = null;
    var dbProduk = [], dbPemasukan = [], dbPengeluaran = [], dbTodo = [], dbUsers = [], dbPengaturan = [], dbTeamUnavailability = [];

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

        console.log("Mengirim request API:", payload);

        fetch(GAS_WEB_APP_URL, {
          redirect: "follow",
          method: "POST",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "text/plain;charset=utf-8",
          },
        })
        .then(response => {
          console.log("Menerima response dari server dengan status:", response.status);
          if (!response.ok) throw new Error("Gagal terhubung ke server. Status: " + response.status);
          return response.text(); // Ambil sebagai teks dulu agar bisa di-debug
        })
        .then(text => {
          console.log("Data mentah dari server:", text);
          try {
            let data = JSON.parse(text);
            resolve(data);
          } catch (e) {
            console.error("Gagal parse JSON dari server. Teks:", text);
            reject(new Error("Server mengembalikan data yang tidak valid (bukan JSON). Coba periksa pengaturan Deploy GAS Anda."));
          }
        })
        .catch(err => {
          console.error("Fetch Error:", err);
          reject(err);
        });
      });
    }

    function loadAppBranding() {
      // 1. Ambil data dari memory atau cache localStorage
      let cached = {};
      try { cached = JSON.parse(localStorage.getItem('bookhive_app_settings') || '{}'); } catch(e){}

      let set = (typeof dbPengaturan !== 'undefined' && dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : cached;
      if (set && Object.keys(set).length > 0) {
        try { localStorage.setItem('bookhive_app_settings', JSON.stringify(set)); } catch(e){}
      }

      let appName = (set.app_name && set.app_name.trim() !== '') ? set.app_name.trim() : 'BookHive';
      let logoImg = set.logo_app || '';
      let brandName = (set.brand && set.brand.trim() !== '') ? set.brand.trim() : 'Kama Visual';

      // 1. Teks judul atas tetap konsisten nama platform aslinya: BookHive
      document.querySelectorAll('.appNameDisplay').forEach(el => {
        el.classList.remove('text-slate-100', 'text-white');
        el.innerHTML = 'Book<span style="color: #ECA935;">Hive</span>';
      });

      // 2. Ubah semua teks nama vendor (Subtitle di bawah logo / Login / Sidebar)
      let brandUpper = (brandName || 'KAMA VISUAL').toUpperCase();
      let vendorName = (typeof currentUser !== 'undefined' && currentUser && (currentUser.fullname || currentUser.username))
        ? (currentUser.fullname || currentUser.username)
        : brandName;

      document.querySelectorAll('.vendorNameDisplay, .appVendorDisplay').forEach(el => {
        el.classList.remove('text-amber-400', 'text-amber-400/90');
        // Jangan timpa teks loader jika loader sedang aktif
        if (el.id === 'loaderText' && el.getAttribute('data-is-loader') === 'true') return;
        if (el.id === 'authSubtitle' || !currentUser) {
          el.innerText = brandUpper;
        } else {
          el.innerText = (vendorName || brandName).toUpperCase();
        }
      });

      // 3. Atur tampilan Logo (apakah pakai gambar atau teks inisial/SVG)
      document.querySelectorAll('.appLogoContainer').forEach(container => {
        let txtEl = container.querySelector('.appLogoText');
        let imgEl = container.querySelector('.appLogoImage');

        if (logoImg && logoImg.trim() !== '') {
          if (txtEl) txtEl.classList.add('d-none');
          if (imgEl) {
            imgEl.src = logoImg;
            imgEl.classList.remove('d-none');
          }
        } else {
          if (imgEl) imgEl.classList.add('d-none');
          if (txtEl) {
            txtEl.classList.remove('d-none');
          }
        }
      });

      // 4. Update Judul Browser Tab
      document.title = `${appName} - ${vendorName}`;
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
    function showFullPageLoading(msg) {
      const loader = document.getElementById('fullPageLoader');
      if (loader) {
        document.getElementById('loaderText').innerText = msg;
        loader.classList.remove('d-none');
        loader.style.display = 'flex';
      }
    }
    function hideFullPageLoading() {
      const loader = document.getElementById('fullPageLoader');
      if (loader) {
        loader.classList.add('d-none');
        loader.style.display = 'none';
      }
    }
    function showSectionLoading(id) { const c = document.getElementById(id); if (c) c.innerHTML = `<div class="card border-0 shadow-sm mb-3"><div class="card-body placeholder-glow"><span class="placeholder col-7 rounded mb-2"></span><br><span class="placeholder col-4 rounded"></span></div></div>`.repeat(3); }
    function toggleSidebar() { document.querySelector('.sidebar').classList.toggle('active'); document.querySelector('.sidebar-overlay').classList.toggle('active'); }
    window.copyToClipboard = function (text) {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(() => {
          Swal.fire({
            icon: 'success',
            title: '📋 Link Disalin!',
            html: 'Link Form Booking Publik berhasil tersimpan ke clipboard Anda.',
            timer: 2000,
            toast: true,
            position: 'top-end',
            showConfirmButton: false
          });
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
        if (successful) Swal.fire({ icon: 'success', title: '📋 Link Disalin!', html: 'Link Form Booking Publik berhasil tersimpan ke clipboard Anda.', timer: 2000, toast: true, position: 'top-end', showConfirmButton: false });
        else Swal.fire('Oops', 'Gagal copy link (Ditolak oleh browser)', 'error');
      } catch (err) { Swal.fire('Oops', 'Browser tidak mendukung copy otomatis', 'error'); }
      activeContainer.removeChild(textArea);
    };

    // 4. AUTH
    window.handleLogin = function () {
      var u = document.getElementById('username').value.trim();
      var p = document.getElementById('password').value.trim();
      if (!u || !p) return Swal.fire('Oops', 'Isi username & password', 'warning');

      const btnLogin = document.getElementById('btnLogin') || document.querySelector('#formLogin button[type="submit"]');
      if (btnLogin) {
        btnLogin.disabled = true;
        btnLogin.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin me-2"></i> Memproses Masuk...`;
      }

      showFullPageLoading('Memuat Sistem & Sinkronisasi Data...');

      gasRun('loginUser', u, p).then(res => {
        hideFullPageLoading();
        if (btnLogin) {
          btnLogin.disabled = false;
          btnLogin.innerHTML = `Masuk <i class="fa-solid fa-right-to-bracket ml-1.5"></i>`;
        }
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
            dbTeamUnavailability = res.allData.team_unavailability || [];
            isDataLoaded = true;
            updateDynamicYears();
          }

          checkLoginState();

          let vendorName = (currentUser && (currentUser.fullname || currentUser.username)) ? (currentUser.fullname || currentUser.username) : 'Kama Visual';
          Swal.fire({
            icon: 'success',
            title: 'Berhasil Masuk!',
            text: `Selamat Datang "${vendorName}"`,
            timer: 2500,
            showConfirmButton: false,
            background: '#0F172A',
            color: '#FFFFFF',
            iconColor: '#ECA935'
          });
        }
        else { Swal.fire('Error', res.message || 'Username/Password salah', 'error'); }
      }).catch(err => {
        hideFullPageLoading();
        if (btnLogin) {
          btnLogin.disabled = false;
          btnLogin.innerHTML = `Masuk <i class="fa-solid fa-right-to-bracket ml-1.5"></i>`;
        }
        Swal.fire('Error', "System Error: " + err.message, 'error');
      });
    };

    function checkLoginState() {
      if (currentUser) {
        document.getElementById('loginPage').classList.add('d-none');
        document.getElementById('mainApp').classList.remove('d-none');
        const vendorName = currentUser.fullname || currentUser.username || 'Vendor';
        if (document.getElementById('displayUser')) document.getElementById('displayUser').innerText = vendorName;
        if (document.getElementById('displayRole')) document.getElementById('displayRole').innerText = currentUser.role;
        document.querySelectorAll('.vendorNameDisplay').forEach(el => {
          el.innerText = vendorName;
        });
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
      if (!currentUser) return;
      const role = currentUser.role;
      const aksesArr = (currentUser.akses_menu || '').split(',').map(s => s.trim());
      document.querySelectorAll('.nav-item-custom[data-menu]').forEach(el => {
        const menu = el.getAttribute('data-menu');
        if (role === 'Admin') {
          el.style.display = 'flex';
        } else {
          el.style.display = (aksesArr.length === 0 || aksesArr.includes(menu)) ? 'flex' : 'none';
        }
      });
    }
    function logout() { currentUser = null; isDataLoaded = false; checkLoginState(); }

    window.toggleSidebarMenu = function (menuId, btn) {
      const menu = document.getElementById(menuId);
      if (!menu) return;
      const chevron = btn.querySelector('.chevron-icon');
      const isHidden = menu.classList.contains('d-none');
      
      if (isHidden) {
        menu.classList.remove('d-none');
        if (chevron) chevron.style.transform = 'rotate(0deg)';
      } else {
        menu.classList.add('d-none');
        if (chevron) chevron.style.transform = 'rotate(-90deg)';
      }
    };

    window.showPage = function (pageName, navEl) {
      activePage = pageName;
      document.querySelectorAll('.nav-item-custom').forEach(n => n.classList.remove('active'));
      const activeEl = navEl || document.querySelector(`.nav-item-custom[data-menu="${pageName}"]`);
      if (activeEl) {
        activeEl.classList.add('active');
        const parentSub = activeEl.closest('.sidebar-submenu');
        if (parentSub && parentSub.classList.contains('d-none')) {
          parentSub.classList.remove('d-none');
          const pBtn = parentSub.previousElementSibling;
          if (pBtn && pBtn.querySelector('.chevron-icon')) {
            pBtn.querySelector('.chevron-icon').style.transform = 'rotate(0deg)';
          }
        }
      }
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
        else if (activePage === 'client') showSectionLoading('tbody-client');
        else if (activePage === 'tim-schedule') showSectionLoading('talentCardsContainer');
      }
      gasRun('getAllData').then(res => {
        if (res.success) {
          dbProduk = res.data.produk || []; dbPemasukan = res.data.pemasukan || []; dbPengeluaran = res.data.pengeluaran || []; dbTodo = res.data.todo || []; dbUsers = res.data.users || []; dbPengaturan = res.data.pengaturan || []; dbTeamUnavailability = res.data.team_unavailability || [];
          if (dbPengaturan && dbPengaturan.length > 0) {
            try { localStorage.setItem('bookhive_app_settings', JSON.stringify(dbPengaturan[0])); } catch(e){}
          }
          isDataLoaded = true; updateDynamicYears(); routeRender(); loadAppBranding();
        } else { Swal.fire('Error', res.message, 'error'); }
      }).catch(err => Swal.fire('Error', "Gagal mengambil data: " + err.message, 'error'));
    }

    function updateDynamicYears() {
      let years = new Set();
      const currYear = new Date().getFullYear();

      // Secara default sediakan rentang tahun mulai dari 2 tahun lalu hingga minimal 4 tahun ke depan
      // Contoh: saat ini 2026, maka 2024, 2025, 2026, 2027, 2028, 2029, 2030 langsung tersedia otomatis!
      for (let y = currYear - 2; y <= currYear + 4; y++) {
        years.add(y);
      }

      // Pindai semua tahun dari data pemasukan / booking (termasuk jika booking multi-hari bertahun 2028 dst)
      const extractYears = (dateVal) => {
        if (!dateVal) return [];
        let str = String(dateVal);
        let found = [];
        let matches = str.match(/\b(20[2-9][0-9])\b/g);
        if (matches) {
          matches.forEach(m => {
            let y = parseInt(m);
            if (!isNaN(y) && y >= 2020 && y <= 2099) found.push(y);
          });
        }
        return found;
      };

      if (typeof dbPemasukan !== 'undefined' && Array.isArray(dbPemasukan)) {
        dbPemasukan.forEach(x => { extractYears(x.tanggal).forEach(y => years.add(y)); });
      }
      if (typeof dbPengeluaran !== 'undefined' && Array.isArray(dbPengeluaran)) {
        dbPengeluaran.forEach(x => { extractYears(x.tanggal).forEach(y => years.add(y)); });
      }

      const sortedYears = Array.from(years).sort((a, b) => a - b);
      ['dashTahun', 'calTahun', 'akTahun', 'pemTahun', 'pengTahun'].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
          const oldVal = sel.value || currYear;
          sel.innerHTML = '';
          sortedYears.forEach(y => {
            const opt = document.createElement('option');
            opt.value = y;
            opt.text = (id === 'dashTahun' || id === 'akTahun') ? 'Tahun: ' + y : y;
            if (y == oldVal || (!sel.value && y == currYear)) opt.selected = true;
            sel.appendChild(opt);
          });
          if (sortedYears.includes(parseInt(oldVal))) sel.value = oldVal;
        }
      });
    }

    function routeRender() {
      if (activePage === 'dashboard') renderDashboard();
      if (activePage === 'produk') renderProduk();
      if (activePage === 'pemasukan') renderPemasukan();
      if (activePage === 'pengeluaran') renderPengeluaran();
      if (activePage === 'kalender') renderKalender();
      if (activePage === 'aruskas') renderArusKas();
      if (activePage === 'todo') renderTodo();
      if (activePage === 'pengaturan') { loadSettingsUI(); renderUsers(); }
      if (activePage === 'client') renderClient();
      if (activePage === 'booking-link') renderBookingLink();
      if (activePage === 'tim-schedule') renderTimSchedule();
      if (activePage === 'unavailability') renderUnavailability();
    }

    // PENGATURAN LOGIC
    window.loadSettingsUI = function () {
      let set = (dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
      
      if (document.getElementById('setBrand')) document.getElementById('setBrand').value = set.brand || 'Simply Book';
      if (document.getElementById('setTagline')) document.getElementById('setTagline').value = set.tagline || '';
      if (document.getElementById('setPhone')) document.getElementById('setPhone').value = set.phone || '';
      if (document.getElementById('setEmail')) document.getElementById('setEmail').value = set.email || '';
      if (document.getElementById('setBank')) document.getElementById('setBank').value = set.bank || '';
      if (document.getElementById('setAcc')) document.getElementById('setAcc').value = set.acc || '';
      if (document.getElementById('setAccName')) document.getElementById('setAccName').value = set.acc_name || '';
      if (document.getElementById('setNotes')) document.getElementById('setNotes').value = set.notes_inv || '';

      if (document.getElementById('setAppName')) document.getElementById('setAppName').value = set.app_name || 'BookHive';
      if (document.getElementById('setAppLogoText')) document.getElementById('setAppLogoText').value = set.app_logo_text || 'BH';

      if (document.getElementById('setBonusMode')) document.getElementById('setBonusMode').value = set.bonus_mode || 'kelipatan_job';
      if (document.getElementById('setBonusMinJob')) document.getElementById('setBonusMinJob').value = set.bonus_min_job !== undefined ? set.bonus_min_job : 2;
      if (document.getElementById('setBonusNominal')) document.getElementById('setBonusNominal').value = set.bonus_nominal !== undefined ? set.bonus_nominal : 25000;
      if (document.getElementById('setBonusMaxFee')) document.getElementById('setBonusMaxFee').value = set.bonus_max_fee !== undefined ? set.bonus_max_fee : 800000;
      if (document.getElementById('setBonusNote')) document.getElementById('setBonusNote').value = set.bonus_note || 'Bonus dihitung kelipatan 2 job PAKET dengan fee tim ≤ Rp 800.000/job.';

      const invLogoPrev = document.getElementById('previewInvLogo');
      if (invLogoPrev && set.logo_inv) {
        invLogoPrev.src = set.logo_inv;
        invLogoPrev.classList.remove('d-none');
      }
      const ttdPrev = document.getElementById('previewTtdInvoice');
      if (ttdPrev && set.ttd_inv) {
        ttdPrev.src = set.ttd_inv;
        ttdPrev.classList.remove('d-none');
      }
      const appLogoPrev = document.getElementById('previewAppLogo');
      if (appLogoPrev && set.logo_app) {
        appLogoPrev.src = set.logo_app;
        appLogoPrev.classList.remove('d-none');
      }
    };

    window.saveSettings = function () {
      let set = (dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
      const payload = {
        id: set.id || 1,
        isEdit: 'true',
        brand: document.getElementById('setBrand') ? document.getElementById('setBrand').value.trim() : (set.brand || 'Simply Book'),
        tagline: document.getElementById('setTagline') ? document.getElementById('setTagline').value : '',
        phone: document.getElementById('setPhone') ? document.getElementById('setPhone').value : '',
        email: document.getElementById('setEmail') ? document.getElementById('setEmail').value : '',
        bank: document.getElementById('setBank') ? document.getElementById('setBank').value : '',
        acc: document.getElementById('setAcc') ? document.getElementById('setAcc').value : '',
        acc_name: document.getElementById('setAccName') ? document.getElementById('setAccName').value : '',
        notes_inv: document.getElementById('setNotes') ? document.getElementById('setNotes').value : '',
        logo_inv: document.getElementById('setLogoInvoiceHidden') ? document.getElementById('setLogoInvoiceHidden').value : (set.logo_inv || ''),
        ttd_inv: document.getElementById('setTtdInvoiceHidden') ? document.getElementById('setTtdInvoiceHidden').value : (set.ttd_inv || ''),
        app_name: set.app_name || 'BookHive',
        app_logo_text: set.app_logo_text || 'BH',
        logo_app: set.logo_app || '',
        bonus_mode: set.bonus_mode || 'kelipatan_job',
        bonus_min_job: set.bonus_min_job !== undefined ? set.bonus_min_job : 2,
        bonus_nominal: set.bonus_nominal !== undefined ? set.bonus_nominal : 25000,
        bonus_max_fee: set.bonus_max_fee !== undefined ? set.bonus_max_fee : 800000,
        bonus_note: set.bonus_note || ''
      };

      if (!dbPengaturan || dbPengaturan.length === 0) dbPengaturan = [payload];
      else Object.assign(dbPengaturan[0], payload);
      try { localStorage.setItem('bookhive_app_settings', JSON.stringify(dbPengaturan[0])); } catch(e){}
      loadAppBranding();

      handleOptimisticSave('Pengaturan', payload, dbPengaturan, null);
    };

    window.saveAppSetup = function () {
      let set = (dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
      const newAppName = document.getElementById('setAppName') ? document.getElementById('setAppName').value.trim() : (set.app_name || 'BookHive');
      const newLogoText = document.getElementById('setAppLogoText') ? document.getElementById('setAppLogoText').value.trim() : (set.app_logo_text || 'BH');
      const newLogoApp = document.getElementById('setLogoAppHidden') ? document.getElementById('setLogoAppHidden').value : (set.logo_app || '');

      const payload = {
        id: set.id || 1,
        isEdit: 'true',
        brand: set.brand || 'Simply Book',
        tagline: set.tagline || '',
        phone: set.phone || '',
        email: set.email || '',
        bank: set.bank || '',
        acc: set.acc || '',
        acc_name: set.acc_name || '',
        notes_inv: set.notes_inv || '',
        logo_inv: set.logo_inv || '',
        ttd_inv: set.ttd_inv || '',
        app_name: newAppName,
        app_logo_text: newLogoText,
        logo_app: newLogoApp,
        bonus_mode: set.bonus_mode || 'kelipatan_job',
        bonus_min_job: set.bonus_min_job !== undefined ? set.bonus_min_job : 2,
        bonus_nominal: set.bonus_nominal !== undefined ? set.bonus_nominal : 25000,
        bonus_max_fee: set.bonus_max_fee !== undefined ? set.bonus_max_fee : 800000,
        bonus_note: set.bonus_note || ''
      };

      if (!dbPengaturan || dbPengaturan.length === 0) dbPengaturan = [payload];
      else Object.assign(dbPengaturan[0], payload);
      try { localStorage.setItem('bookhive_app_settings', JSON.stringify(dbPengaturan[0])); } catch(e){}
      loadAppBranding();

      handleOptimisticSave('Pengaturan', payload, dbPengaturan, null);
    };

    window.handleImageUpload = function(inputEl, previewImgId, hiddenInputId) {
      if (inputEl.files && inputEl.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const base64 = e.target.result;
          const prev = document.getElementById(previewImgId);
          if (prev) {
            prev.src = base64;
            prev.classList.remove('d-none');
          }
          const hidden = document.getElementById(hiddenInputId);
          if (hidden) hidden.value = base64;
        };
        reader.readAsDataURL(inputEl.files[0]);
      }
    };

    window.calcTeamBonus = function (stat, set) {
      if (!set) set = (dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
      const mode = set.bonus_mode || 'kelipatan_job';
      const minJob = Number(set.bonus_min_job) > 0 ? Number(set.bonus_min_job) : 2;
      const nominal = Number(set.bonus_nominal) >= 0 ? Number(set.bonus_nominal) : 25000;

      if (mode === 'off') return 0;
      if (mode === 'per_job') return (stat.eligibleCount || 0) * nominal;
      if (mode === 'persen_fee') return Math.round((stat.totalFeeEligible || 0) * (nominal / 100));
      return Math.floor((stat.eligibleCount || 0) / minJob) * nominal;
    };

    // 5. RENDER Dashboard
    let dashChart = null;
    window.renderDashboard = function () {
      const container = document.getElementById('dashboardContainer');
      if (!container) return;

      const tahun = document.getElementById('dashTahun') ? document.getElementById('dashTahun').value : 'all';
      const bulan = document.getElementById('dashBulan') ? document.getElementById('dashBulan').value : 'all';

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
      let setBonus = (dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
      let bMaxFee = (setBonus.bonus_max_fee !== undefined && setBonus.bonus_max_fee !== '') ? Number(setBonus.bonus_max_fee) : 800000;
      let bMode = setBonus.bonus_mode || 'kelipatan_job';
      let bMinJob = Number(setBonus.bonus_min_job) > 0 ? Number(setBonus.bonus_min_job) : 2;
      let bNominal = Number(setBonus.bonus_nominal) >= 0 ? Number(setBonus.bonus_nominal) : 25000;

      let bNote = setBonus.bonus_note;
      if (!bNote || bNote.trim() === '') {
        if (bMode === 'off') {
          bNote = 'Bonus tim saat ini dinonaktifkan oleh Owner.';
        } else if (bMode === 'per_job') {
          bNote = `Bonus dihitung Rp ${formatRp(bNominal)} per job PAKET dengan fee tim ≤ ${formatRp(bMaxFee)}/job.`;
        } else if (bMode === 'persen_fee') {
          bNote = `Bonus dihitung ${bNominal}% dari total fee tim (fee ≤ ${formatRp(bMaxFee)}/job).`;
        } else {
          bNote = `Bonus dihitung kelipatan ${bMinJob} job PAKET dengan fee tim ≤ ${formatRp(bMaxFee)}/job. Nominal: ${formatRp(bNominal)} per ${bMinJob} job.`;
        }
      }

      const salesByProd = {}; const teamStats = {}; let maxTeamJobs = 0;

      // Register all team members from dbUsers
      if (dbUsers && dbUsers.length > 0) {
        dbUsers.forEach(u => {
          if (u.fullname && (u.role === 'Fotografer' || u.role === 'MUA' || u.role === 'Staff' || u.role === 'Videografer')) {
            let name = u.fullname.trim();
            if (!teamStats[name]) teamStats[name] = { count: 0, eligibleCount: 0, totalFeeEligible: 0 };
          }
        });
      }

      filteredPem.forEach(p => {
        if (!salesByProd[p.layanan]) salesByProd[p.layanan] = { qty: 0, nominal: 0 };
        salesByProd[p.layanan].qty += Number(p.jumlah) || 1; salesByProd[p.layanan].nominal += Number(p.total) || 0;
        
        let teamCombined = [p.team, p.team2].filter(x => x && String(x).trim() !== '').join(' & ');
        if (teamCombined) {
          const members = Array.from(new Set(teamCombined.split(/&|,| dan |\|/i).map(s => s.trim()).filter(s => s !== '')));
          members.forEach(m => {
            if (!teamStats[m]) teamStats[m] = { count: 0, eligibleCount: 0, totalFeeEligible: 0 };
            teamStats[m].count++;
            
            const feeRecord = dbPengeluaran.find(x => String(x.kategori).trim().toLowerCase() === 'fee team' && (x.catatan === `PEM_ID:${p.id}|MEMBER:${m}` || String(x.catatan || '').toLowerCase().includes(m.toLowerCase())));
            let prodData = dbProduk.find(x => x.nama === p.layanan);
            let isPaket = (!prodData || String(prodData.jenis || 'paket').trim().toLowerCase() === 'paket');
            let feeNom = feeRecord ? Number(feeRecord.nominal) || 0 : 0;

            if (isPaket && (bMaxFee === 0 || feeNom <= bMaxFee)) {
              teamStats[m].eligibleCount++;
              teamStats[m].totalFeeEligible += feeNom;
            }
            if (teamStats[m].count > maxTeamJobs) maxTeamJobs = teamStats[m].count;
          });
        }
      });

      let allKnownMembers = new Set(Object.keys(teamStats));
      dbPemasukan.forEach(p => { 
        let teamCombined = [p.team, p.team2].filter(x => x && String(x).trim() !== '').join(' & ');
        if (teamCombined) teamCombined.split(/&|,| dan |\|/i).forEach(m => { let clean = m.trim(); if (clean) allKnownMembers.add(clean); }); 
      });

      filteredPeng.forEach(peng => {
        if (String(peng.kategori).trim().toLowerCase() !== 'fee team') {
          allKnownMembers.forEach(m => {
            let regex = new RegExp("\\b" + m + "\\b", "i");
            if (regex.test(String(peng.catatan || ''))) {
              if (!teamStats[m]) teamStats[m] = { count: 0, eligibleCount: 0, totalFeeEligible: 0 };
              teamStats[m].count++;
              if (teamStats[m].count > maxTeamJobs) maxTeamJobs = teamStats[m].count;
            }
          });
        }
      });

      let tbodyHtml = ''; let countSales = 0;
      dbProduk.forEach(p => { 
        let stat = salesByProd[p.nama]; 
        if (stat && stat.qty > 0) { 
          countSales++; 
          tbodyHtml += `<tr class="border-b" style="border-color: var(--table-td-border);">
            <td class="font-medium" style="color: var(--text-main);">${p.nama}</td>
            <td class="text-center font-bold text-amber-500">${stat.qty}</td>
            <td class="text-end font-extrabold text-emerald-600 dark:text-emerald-400">${formatRp(stat.nominal)}</td>
          </tr>`; 
        } 
      });
      if (countSales === 0) tbodyHtml = '<tr><td colspan="3" class="text-center text-muted font-medium small py-4 bg-transparent">Belum ada paket yang terjual pada periode ini.</td></tr>';

      const sortedTeam = Object.keys(teamStats).sort((a, b) => teamStats[b].count - teamStats[a].count);
      let teamHtml = '';
      if (sortedTeam.length === 0) teamHtml = '<div class="text-center text-muted small py-4 w-100">Belum ada data team yang bekerja.</div>';
      else {
        teamHtml = '<div class="row g-3">'; const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'];
        sortedTeam.forEach((name, index) => {
          const count = teamStats[name].count; const eligible = teamStats[name].eligibleCount; const percent = maxTeamJobs > 0 ? (count / maxTeamJobs) * 100 : 0; const bonus = calcTeamBonus(teamStats[name], setBonus); const color = colors[index % colors.length];
          teamHtml += `<div class="col-md-6 col-lg-4 col-xl-3">
            <div class="card glass-card p-3.5 border shadow-sm h-100 d-flex flex-column justify-content-between position-relative overflow-hidden" style="border-left: 4px solid ${color} !important;">
              <div>
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <div class="fw-bold text-truncate pe-2 fs-6" style="color: var(--text-main);" title="${name}">
                    <i class="fa-solid fa-circle-user me-1.5" style="color: ${color};"></i>${name}
                  </div>
                  <span class="badge rounded-pill font-bold" style="background: ${color}20; color: ${color}; border: 1px solid ${color}40;">${count} Job</span>
                </div>
                <div class="progress mt-2.5 shadow-none" style="height: 5px; background-color: var(--border-color);">
                  <div class="progress-bar rounded-pill" style="width: ${percent}%; background: ${color};"></div>
                </div>
                <div class="small text-muted mt-2" style="font-size: 11px;">${eligible} Job Paket (Fee ≤ ${formatRp(bMaxFee)})</div>
              </div>
              <div class="mt-3 pt-2.5 d-flex justify-content-between align-items-center border-top" style="border-color: var(--border-color) !important;">
                <span class="small text-muted fw-semibold"><i class="fa-solid fa-gift text-amber-500 me-1"></i> Bonus</span>
                <span class="fw-extrabold text-emerald-600 dark:text-emerald-400 small px-2 py-0.5 rounded" style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.2);">${formatRp(bonus)}</span>
              </div>
              <button class="btn btn-sm w-100 mt-2.5 fw-bold shadow-none" style="font-size: 11px; border-radius: 8px; background: var(--bg-card-subtle); color: var(--text-main); border: 1px solid var(--border-color);" onclick="showDetailTeam('${name}')">
                <i class="fa-solid fa-list me-1 text-muted"></i> Rincian Kinerja
              </button>
            </div>
          </div>`;
        }); teamHtml += '</div>';
      }

      container.innerHTML = `
      <div class="row g-3 mb-4">
        <div class="col-md-2 col-6">
          <div class="card glass-card p-3.5 h-100 shadow-sm border" style="border-left: 3.5px solid #0284c7 !important;">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted fw-semibold" style="font-size: 11px;">Total Job</span>
              <i class="fa-solid fa-calendar-check text-sky-500 text-xs"></i>
            </div>
            <h5 class="fw-extrabold mb-0 text-sky-600 dark:text-sky-400">${totalJob}</h5>
          </div>
        </div>
        <div class="col-md-2 col-6">
          <div class="card glass-card p-3.5 h-100 shadow-sm border" style="border-left: 3.5px solid #10b981 !important;">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted fw-semibold" style="font-size: 11px;">Pemasukan</span>
              <i class="fa-solid fa-arrow-down-left text-emerald-500 text-xs"></i>
            </div>
            <h6 class="fw-extrabold mb-0 text-emerald-600 dark:text-emerald-400" style="font-size: 13px;">${formatRp(totalPemasukan)}</h6>
          </div>
        </div>
        <div class="col-md-2 col-6">
          <div class="card glass-card p-3.5 h-100 shadow-sm border" style="border-left: 3.5px solid #ef4444 !important;">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted fw-semibold" style="font-size: 11px;">Pengeluaran</span>
              <i class="fa-solid fa-arrow-up-right text-rose-500 text-xs"></i>
            </div>
            <h6 class="fw-extrabold mb-0 text-rose-600 dark:text-rose-400" style="font-size: 13px;">${formatRp(totalPengeluaran)}</h6>
          </div>
        </div>
        <div class="col-md-2 col-6">
          <div class="card glass-card p-3.5 h-100 shadow-sm border" style="border-left: 3.5px solid #f97316 !important;">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted fw-semibold" style="font-size: 11px;">Fee Team</span>
              <i class="fa-solid fa-users text-orange-500 text-xs"></i>
            </div>
            <h6 class="fw-extrabold mb-0 text-orange-600 dark:text-orange-400" style="font-size: 13px;">${formatRp(totalFeeTeam)}</h6>
          </div>
        </div>
        <div class="col-md-2 col-6">
          <div class="card glass-card p-3.5 h-100 shadow-sm border" style="border-left: 3.5px solid #f59e0b !important;">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted fw-semibold" style="font-size: 11px;">Piutang Klien</span>
              <i class="fa-solid fa-hourglass-half text-amber-500 text-xs"></i>
            </div>
            <h6 class="fw-extrabold mb-0 text-amber-600 dark:text-amber-400" style="font-size: 13px;">${formatRp(piutangClient)}</h6>
          </div>
        </div>
        <div class="col-md-2 col-6">
          <div class="card glass-card p-3.5 h-100 shadow-sm border" style="border-left: 3.5px solid #6366f1 !important;">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="text-muted fw-semibold" style="font-size: 11px;">Laba Bersih</span>
              <i class="fa-solid fa-chart-line text-indigo-500 text-xs"></i>
            </div>
            <h6 class="fw-extrabold mb-0 text-indigo-600 dark:text-indigo-400" style="font-size: 13px;">${formatRp(labaBersih)}</h6>
          </div>
        </div>
      </div>
      
      <div class="row g-4 mb-4">
        <div class="col-md-6">
          <div class="card glass-card shadow-sm h-100 border">
            <div class="card-header border-0 pt-4 pb-2 bg-transparent d-flex justify-content-between align-items-center">
              <h6 class="fw-extrabold mb-0" style="color: var(--text-main);"><i class="fa-solid fa-list-check text-indigo-600 me-2"></i> Rekap Paket Terjual</h6>
            </div>
            <div class="card-body p-3">
              <div class="table-responsive">
                <table class="table table-sm table-custom mb-0 align-middle">
                  <thead>
                    <tr>
                      <th class="border-0 uppercase font-extrabold">Nama Produk</th>
                      <th class="border-0 text-center uppercase font-extrabold">Terjual</th>
                      <th class="border-0 text-end uppercase font-extrabold">Nominal</th>
                    </tr>
                  </thead>
                  <tbody>${tbodyHtml}</tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="card glass-card shadow-sm h-100 border">
            <div class="card-header border-0 pt-4 pb-2 bg-transparent d-flex justify-content-between align-items-center">
              <h6 class="fw-extrabold mb-0" style="color: var(--text-main);"><i class="fa-solid fa-chart-pie text-indigo-600 me-2"></i> Sumber Penghasilan</h6>
            </div>
            <div class="card-body d-flex justify-content-center align-items-center p-4">
              <canvas id="pieChart" style="max-height: 250px;"></canvas>
            </div>
          </div>
        </div>
      </div>
      
      <div class="card glass-card shadow-sm mb-4 border p-4">
        <div class="d-flex flex-wrap justify-content-between align-items-center pb-3 mb-3 border-bottom" style="border-color: var(--border-color) !important;">
          <div>
            <h5 class="fw-extrabold mb-1" style="color: var(--text-main);"><i class="fa-solid fa-people-group text-indigo-600 me-2"></i> Kinerja Team & Bonus Bulan Ini</h5>
            <p class="text-muted small mb-0">${bNote}</p>
          </div>
        </div>
        <div>${teamHtml}</div>
      </div>`;

      if (dashChart) dashChart.destroy();
      const ctx = document.getElementById('pieChart'); 
      if (ctx && Object.keys(salesByProd).length > 0) { 
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        dashChart = new Chart(ctx, { 
          type: 'doughnut', 
          data: { 
            labels: Object.keys(salesByProd), 
            datasets: [{ 
              data: Object.values(salesByProd).map(v => v.nominal), 
              backgroundColor: ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#3b82f6'],
              borderWidth: 2,
              borderColor: isDark ? '#111827' : '#ffffff'
            }] 
          }, 
          options: { 
            responsive: true, 
            cutout: '65%',
            plugins: { 
              legend: { 
                position: 'right', 
                labels: { 
                  color: isDark ? '#F8FAFC' : '#1E293B', 
                  font: { weight: 'bold', family: "'Plus Jakarta Sans', sans-serif" },
                  padding: 12
                } 
              } 
            } 
          } 
        }); 
      }
    };

    window.showDetailTeam = function (name) {
      const tahun = document.getElementById('dashTahun') ? document.getElementById('dashTahun').value : 'all';
      const bulan = document.getElementById('dashBulan') ? document.getElementById('dashBulan').value : 'all';
      let filteredPem = dbPemasukan.filter(p => { let tgl = String(p.tanggal).split(',')[0].trim(); return (tahun === 'all' || tgl.startsWith(tahun)) && (bulan === 'all' || tgl.substring(5, 7) === bulan); });

      let filteredPengOps = dbPengeluaran.filter(peng => {
        let efD = String(peng.tanggal);
        return (tahun === 'all' || efD.startsWith(tahun)) && (bulan === 'all' || efD.substring(5, 7) === bulan);
      });

      let setBonus = (dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
      let bMaxFee = (setBonus.bonus_max_fee !== undefined && setBonus.bonus_max_fee !== '') ? Number(setBonus.bonus_max_fee) : 800000;

      let combinedJobs = [];
      let totalFee = 0;
      let eligibleJobs = 0;
      let totalFeeEligible = 0;

      filteredPem.forEach(p => {
        let teamCombined = [p.team, p.team2].filter(x => x && String(x).trim() !== '').join(' & ');
        if (!teamCombined) return;

        let teamArr = teamCombined.split('|');
        let tglArr = String(p.tanggal).split(',');

        let isMemberInProject = false;
        let workedDatesHtml = [];
        let firstSortDate = '';

        teamArr.forEach((tm, idx) => {
          let dayMembers = tm.split(/&|,| dan /i).map(s => s.trim()).filter(s => s !== '');
          if (dayMembers.includes(name)) {
            isMemberInProject = true;
            if (tglArr[idx]) {
              let cleanDate = tglArr[idx].trim();
              if (!firstSortDate) firstSortDate = cleanDate;

              if (tglArr.length > 1) {
                workedDatesHtml.push(`<div class="mb-1"><span class="badge bg-light text-dark border"><i class="fa-regular fa-calendar me-1"></i>D${idx + 1}: ${safeDate(cleanDate)}</span></div>`);
              } else {
                workedDatesHtml.push(safeDate(cleanDate));
              }
            }
          }
        });

        if (isMemberInProject) {
          const feeRecord = dbPengeluaran.find(x => String(x.kategori).trim().toLowerCase() === 'fee team' && (x.catatan === `PEM_ID:${p.id}|MEMBER:${name}` || String(x.catatan || '').toLowerCase().includes(name.toLowerCase())));
          let feeNominal = 0;
          let isLunas = false;
          let isRecorded = false;

          if (feeRecord) {
            isRecorded = true;
            feeNominal = Number(feeRecord.nominal) || 0;
            isLunas = (String(feeRecord.status_bayar).trim().toLowerCase() === 'lunas');
            let prodData = dbProduk.find(x => x.nama === p.layanan);
            let isPaket = (!prodData || String(prodData.jenis || 'paket').trim().toLowerCase() === 'paket');
            if (feeNominal <= bMaxFee && isPaket) {
              eligibleJobs++;
              totalFeeEligible += feeNominal;
            }
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

      let calcBonus = calcTeamBonus({ eligibleCount: eligibleJobs, totalFeeEligible: totalFeeEligible }, setBonus);

      document.getElementById('detailTeamName').innerText = `Rincian Kinerja: ${name}`;
      document.getElementById('detailTeamBody').innerHTML = html;
      document.getElementById('detailTeamTotalFee').innerText = formatRp(totalFee);
      document.getElementById('detailTeamBonus').innerText = formatRp(calcBonus);

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

      document.getElementById('arusKasContainer').innerHTML = `<div class="card glass-card border shadow-sm overflow-hidden mb-4"><div class="card-body p-0"><table class="table mb-0 table-custom"><tr style="background: rgba(16, 185, 129, 0.12);"><th class="fs-6 py-3 px-4 rounded-0 border-0 text-emerald-600 dark:text-emerald-400"><i class="fa-solid fa-wallet me-2"></i> RINCIAN PEMASUKAN</th><th class="text-end border-0"></th></tr>${pemRows}<tr style="background: var(--bg-card-subtle);"><td class="fw-bold px-4 py-3" style="color: var(--text-main);">Total Pemasukan Operasional</td><td class="text-end fw-bold text-emerald-600 dark:text-emerald-400 fs-5 py-3">${formatRp(totalPem)}</td></tr><tr style="background: rgba(239, 68, 68, 0.12);"><th class="fs-6 py-3 px-4 rounded-0 border-0 text-rose-600 dark:text-rose-400"><i class="fa-solid fa-money-bill-transfer me-2"></i> RINCIAN PENGELUARAN</th><th class="text-end border-0"></th></tr>${pengRows}<tr style="background: var(--bg-card-subtle);"><td class="fw-bold px-4 py-3" style="color: var(--text-main);">Total Pengeluaran Operasional</td><td class="text-end fw-bold text-rose-600 dark:text-rose-400 fs-5 py-3">${formatRp(totalPeng)}</td></tr><tr style="background: var(--bg-card-subtle); border-top: 2px solid var(--border-color);"><th class="fs-5 py-3 px-4 border-0 text-indigo-600 dark:text-indigo-400">LABA BERSIH (NET PROFIT)</th><th class="text-end fs-4 fw-bold border-0 py-3 px-4 text-indigo-600 dark:text-indigo-400">${formatRp(labaBersih)}</th></tr></table></div></div>`;
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

    // Helper function for user-friendly table labels
    function getTableLabel(tableName) {
      switch (tableName) {
        case 'Produk': return 'Data Produk & Layanan';
        case 'Pemasukan': return 'Data Order & Pemasukan';
        case 'Pengeluaran': return 'Data Pengeluaran';
        case 'Users': return 'Data User & Talent';
        case 'Pengaturan': return 'Pengaturan Sistem & Branding';
        case 'Team_Unavailability': return 'Jadwal Block / Off Day';
        case 'Todo': return 'Task & Peralatan';
        default: return 'Data Sistem';
      }
    }

    // 11. CORE ENGINE (SAVE & DELETE)
    function handleOptimisticSave(tableName, payload, dbArray, modalId) {
      let tempId = (payload.isEdit === 'true' || payload.isEdit === true) ? payload.id : Date.now();
      payload.id = tempId; // Ensure frontend and backend use same ID
      let tempItem = { ...payload, _isSyncing: true };
      let backup = JSON.parse(JSON.stringify(dbArray));
      let isEditMode = (payload.isEdit === 'true' || payload.isEdit === true);

      if (isEditMode) { let idx = dbArray.findIndex(x => x.id == tempId); if (idx !== -1) Object.assign(dbArray[idx], tempItem); } else { dbArray.unshift(tempItem); }
      updateDynamicYears(); routeRender(); if (modalId) { let mod = bootstrap.Modal.getInstance(document.getElementById(modalId)); if (mod) mod.hide(); }
      
      const label = getTableLabel(tableName);
      
      Swal.fire({
        icon: 'info',
        title: '💾 Menyimpan Data',
        html: `Sedang memproses perubahan <b>${label}</b>...`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 1800
      });

      gasRun('saveData', tableName, payload).then(res => {
        if (res.success) {
          let savedItem = dbArray.find(x => x.id == tempId);
          if (savedItem) delete savedItem._isSyncing;
          routeRender();
          
          Swal.fire({
            icon: 'success',
            title: '✅ Berhasil Disimpan!',
            html: `<b>${label}</b> telah sukses diperbarui di cloud database.`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2500
          });
        } else {
          dbArray.splice(0, dbArray.length, ...backup);
          updateDynamicYears();
          routeRender();
          Swal.fire({
            icon: 'error',
            title: '❌ Gagal Menyimpan',
            html: `Gagal menyimpan <b>${label}</b>:<br><span style="color:#f87171;">${res.message || 'Respons server tidak valid'}</span>`,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4500
          });
        }
      }).catch(err => {
        dbArray.splice(0, dbArray.length, ...backup);
        updateDynamicYears();
        routeRender();
        Swal.fire({
          icon: 'error',
          title: '❌ Network / Server Error',
          html: `Gagal memperbarui <b>${label}</b>:<br><span style="color:#f87171;">${err.message}</span>`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4500
        });
      });
    }

    window.delData = function (tableName, id) {
      const label = getTableLabel(tableName);
      Swal.fire({
        title: 'Konfirmasi Hapus Data',
        html: `Apakah Anda yakin ingin menghapus item dari <b>${label}</b>?<br><small style="color:#fbbf24;">Tindakan ini tidak dapat dibatalkan.</small>`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        cancelButtonColor: '#475569',
        confirmButtonText: '<i class="fa-solid fa-trash me-1"></i> Ya, Hapus Data',
        cancelButtonText: 'Batal'
      }).then(res => {
        if (!res.isConfirmed) return;
        let dbArray; if (tableName === 'Produk') dbArray = dbProduk; else if (tableName === 'Pemasukan') dbArray = dbPemasukan; else if (tableName === 'Pengeluaran') dbArray = dbPengeluaran; else if (tableName === 'Users') dbArray = dbUsers; else if (tableName === 'Team_Unavailability') dbArray = dbTeamUnavailability; else dbArray = dbTodo;
        let backup = JSON.parse(JSON.stringify(dbArray)); let idx = dbArray.findIndex(x => x.id == id); if (idx !== -1) dbArray.splice(idx, 1);
        updateDynamicYears(); routeRender();
        
        Swal.fire({
          icon: 'info',
          title: '🗑️ Menghapus Data...',
          html: `Sedang memproses penghapusan dari <b>${label}</b>...`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 1500
        });

        gasRun('deleteData', tableName, id).then(r => {
          if (r.success) {
            Swal.fire({
              icon: 'success',
              title: '🗑️ Data Terhapus',
              html: `Item dari <b>${label}</b> telah berhasil dihapus.`,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 2500
            });
          } else {
            dbArray.splice(0, dbArray.length, ...backup);
            updateDynamicYears();
            routeRender();
            Swal.fire({
              icon: 'error',
              title: '❌ Gagal Menghapus',
              html: `Gagal menghapus item <b>${label}</b>: ${r.message}`,
              toast: true,
              position: 'top-end',
              showConfirmButton: false,
              timer: 4000
            });
          }
        });
      });
    };

    // 12. TEAM UNAVAILABILITY & SLOT CONFLICT MANAGEMENT
    window.renderUnavailability = function () {
      const tb = document.getElementById('tbody-unavailability');
      if (!tb) return;
      
      let items = dbTeamUnavailability;
      if (currentUser && (currentUser.role === 'Fotografer' || currentUser.role === 'MUA')) {
        items = dbTeamUnavailability.filter(x => String(x.nama_team).toLowerCase().includes(currentUser.fullname.toLowerCase()));
      }

      if (items.length === 0) {
        tb.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Belum ada tanggal blackout / libur</td></tr>`;
        return;
      }

      tb.innerHTML = items.map((u, i) => `
        <tr class="${u._isSyncing ? 'syncing-item' : ''}">
          <td>${i + 1}</td>
          <td class="fw-bold text-slate-800">${u.nama_team || '-'}</td>
          <td><span class="badge bg-rose-500/10 text-rose-600 border border-rose-200 font-bold">${safeDate(u.tanggal)}</span></td>
          <td><span class="badge bg-indigo-500/10 text-indigo-600 border border-indigo-200 font-bold">${u.jam_mulai || '00:00'} - ${u.jam_selesai || '23:59'}</span></td>
          <td class="text-slate-600 font-medium">${u.alasan || 'Off Day / Job Luar'}</td>
          <td class="text-center">
            ${u._isSyncing ? '<span class="spinner-border spinner-border-sm text-primary"></span>' : `
              <button class="btn btn-sm btn-light border text-danger" onclick="delData('Team_Unavailability', ${u.id})"><i class="fa-solid fa-trash"></i></button>
            `}
          </td>
        </tr>
      `).join('');
    };

    window.openModalUnavailability = function () {
      if (document.getElementById('formUnavailability')) document.getElementById('formUnavailability').reset();
      if (document.getElementById('unavailId')) document.getElementById('unavailId').value = '';
      if (document.getElementById('unavailTgl')) document.getElementById('unavailTgl').value = safeDate(new Date());
      if (document.getElementById('unavailTeamName')) document.getElementById('unavailTeamName').value = currentUser ? currentUser.fullname : '';
      new bootstrap.Modal(document.getElementById('modalUnavailability')).show();
    };

    window.saveUnavailability = function () {
      const payload = {
        id: document.getElementById('unavailId').value || Date.now(),
        isEdit: false,
        user_id: currentUser ? currentUser.id : '',
        nama_team: document.getElementById('unavailTeamName').value || (currentUser ? currentUser.fullname : ''),
        tanggal: document.getElementById('unavailTgl').value,
        jam_mulai: document.getElementById('unavailJamMulai').value || '00:00',
        jam_selesai: document.getElementById('unavailJamSelesai').value || '23:59',
        alasan: document.getElementById('unavailAlasan').value || 'Off Day / Job Luar'
      };
      handleOptimisticSave('Team_Unavailability', payload, dbTeamUnavailability, 'modalUnavailability');
    };


    // USER MANAGEMENT IMPLEMENTATION
    window.openModalUser = function () {
      if (document.getElementById('formUser')) document.getElementById('formUser').reset();
      if (document.getElementById('userId')) document.getElementById('userId').value = '';
      if (document.getElementById('userIsEdit')) document.getElementById('userIsEdit').value = 'false';
      if (document.getElementById('uCategory')) document.getElementById('uCategory').value = 'Fotografer';
      if (document.getElementById('uSurcharge')) document.getElementById('uSurcharge').value = 0;
      if (document.getElementById('uFeeDefault')) document.getElementById('uFeeDefault').value = 0;
      if (document.getElementById('uMaxJob')) document.getElementById('uMaxJob').value = 2;
      new bootstrap.Modal(document.getElementById('modalUser')).show();
    };

    window.editUser = function (id) {
      const u = dbUsers.find(x => x.id == id);
      if (!u) return;
      document.getElementById('userId').value = u.id;
      document.getElementById('userIsEdit').value = 'true';
      document.getElementById('uName').value = u.username;
      document.getElementById('uPass').value = u.password;
      document.getElementById('uFull').value = u.fullname;
      document.getElementById('uRole').value = u.role || 'Staff';
      if (document.getElementById('uCategory')) document.getElementById('uCategory').value = u.kategori || u.role;
      if (document.getElementById('uSurcharge')) document.getElementById('uSurcharge').value = u.talent_surcharge || 0;
      if (document.getElementById('uFeeDefault')) document.getElementById('uFeeDefault').value = u.fee_default || 0;
      if (document.getElementById('uMaxJob')) document.getElementById('uMaxJob').value = u.max_job_per_day || 2;

      const aksesArr = (u.akses_menu || '').split(',');
      document.querySelectorAll('.menu-check').forEach(cb => {
        cb.checked = aksesArr.includes(cb.value);
      });

      new bootstrap.Modal(document.getElementById('modalUser')).show();
    };

    window.saveUser = function () {
      const selectedMenus = Array.from(document.querySelectorAll('.menu-check:checked')).map(c => c.value).join(',');
      const payload = {
        id: document.getElementById('userId').value,
        isEdit: document.getElementById('userIsEdit').value,
        username: document.getElementById('uName').value,
        password: document.getElementById('uPass').value,
        fullname: document.getElementById('uFull').value,
        role: document.getElementById('uRole').value,
        akses_menu: selectedMenus,
        kategori: document.getElementById('uCategory') ? document.getElementById('uCategory').value : '',
        talent_surcharge: document.getElementById('uSurcharge') ? document.getElementById('uSurcharge').value : 0,
        fee_default: document.getElementById('uFeeDefault') ? document.getElementById('uFeeDefault').value : 0,
        max_job_per_day: document.getElementById('uMaxJob') ? document.getElementById('uMaxJob').value : 2
      };
      handleOptimisticSave('Users', payload, dbUsers, 'modalUser');
    };

    window.renderUsers = function () {
      const tb = document.getElementById('tbody-users');
      if (!tb) return;
      if (dbUsers.length === 0) {
        tb.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Belum ada user</td></tr>`;
        return;
      }
      tb.innerHTML = dbUsers.map(u => `
        <tr class="${u._isSyncing ? 'syncing-item' : ''}">
          <td class="fw-bold text-slate-800">${u.username}</td>
          <td>${u.fullname}</td>
          <td><span class="badge ${u.role === 'Admin' ? 'bg-indigo-600 text-white' : u.role === 'Fotografer' ? 'bg-teal-600 text-white' : u.role === 'MUA' ? 'bg-pink-600 text-white' : 'bg-slate-500 text-white'}">${u.role}</span></td>
          <td class="small text-slate-600">
            ${u.role === 'Fotografer' || u.role === 'MUA' ? `<span class="font-bold text-indigo-600">Surcharge: ${formatRp(u.talent_surcharge)}</span> | Max ${u.max_job_per_day || 2} job/hari` : (u.akses_menu || '-')}
          </td>
          <td class="text-center">
            ${u._isSyncing ? '<span class="spinner-border spinner-border-sm text-primary"></span>' : `
              <button class="btn btn-sm btn-light border text-primary me-1" onclick="editUser(${u.id})"><i class="fa-solid fa-pen"></i></button>
              <button class="btn btn-sm btn-light border text-danger" onclick="delData('Users', ${u.id})"><i class="fa-solid fa-trash"></i></button>
            `}
          </td>
        </tr>
      `).join('');
    };

    window.checkOrderConflict = function() {
      const tglEl = document.getElementById('pemTanggal');
      if (!tglEl) return;
      const tgl = tglEl.value;
      const sTime = document.getElementById('pemJamMulai') ? document.getElementById('pemJamMulai').value : '';
      const eTime = document.getElementById('pemJamSelesai') ? document.getElementById('pemJamSelesai').value : '';
      const team1 = document.getElementById('pemTeam') ? document.getElementById('pemTeam').value.trim() : '';
      const team2 = document.getElementById('pemTeam2') ? document.getElementById('pemTeam2').value.trim() : '';

      const allTeams = [team1, team2].filter(x => x !== '');
      const alertBox = document.getElementById('conflictAlert');
      if (!alertBox) return;

      if (!tgl || allTeams.length === 0) {
        alertBox.innerHTML = '';
        return;
      }

      let conflicts = [];
      allTeams.forEach(tName => {
        // Check Unavailability Sheet
        let unavail = dbTeamUnavailability.find(u => safeDate(u.tanggal) === safeDate(tgl) && String(u.nama_team).toLowerCase().includes(tName.toLowerCase()));
        if (unavail) {
          conflicts.push(`🔴 <b>${tName}</b> di-block / libur pada tanggal ${tgl} (${unavail.alasan || 'Libur'})`);
        }

        // Check Existing Booked Orders
        dbPemasukan.forEach(p => {
          if (safeDate(p.tanggal) === safeDate(tgl) && p.team && String(p.team).toLowerCase().includes(tName.toLowerCase())) {
            let pStart = p.jam_mulai || '';
            let pEnd = p.jam_selesai || '';
            if (sTime && eTime && pStart && pEnd) {
              if (sTime < pEnd && eTime > pStart) {
                conflicts.push(`🔴 <b>${tName}</b> bentrok jam acara dengan Client: ${p.client} (${pStart} - ${pEnd})`);
              }
            }
          }
        });
      });

      if (conflicts.length > 0) {
        alertBox.innerHTML = `<div class="p-3 bg-rose-500/10 border border-rose-300 text-rose-700 rounded-xl text-xs space-y-1">${conflicts.join('<br>')}</div>`;
      } else {
        alertBox.innerHTML = `<div class="p-2.5 bg-emerald-500/10 border border-emerald-300 text-emerald-700 rounded-xl text-xs font-bold flex items-center gap-2"><i class="fa-solid fa-circle-check"></i> Tim Tersedia / Ready! Tidak ada bentrok jam.</div>`;
      }
    };

    // ==========================================
    // 14. RENDER PAGE: DATABASE CLIENT (CRM)
    // ==========================================
    window.renderClient = function () {
      const tb = document.getElementById('tbody-client');
      const statsContainer = document.getElementById('clientStatsContainer');
      if (!tb) return;

      const searchVal = (document.getElementById('searchClientInput') ? document.getElementById('searchClientInput').value : '').toLowerCase().trim();
      const filterStatus = document.getElementById('filterStatusClient') ? document.getElementById('filterStatusClient').value : 'all';

      // Group dbPemasukan by client phone / name to form client CRM database
      const clientMap = {};

      dbPemasukan.forEach(p => {
        const clientName = (p.client || 'Client Tanpa Nama').trim();
        const clientPhone = (p.phone || '').trim();
        const key = clientPhone ? clientPhone : clientName.toLowerCase();

        if (!clientMap[key]) {
          clientMap[key] = {
            name: clientName,
            phone: clientPhone || '-',
            totalBookings: 0,
            totalSpend: 0,
            lastOrderDate: p.tanggal || '-',
            lastPackage: p.layanan || '-',
            history: []
          };
        }

        clientMap[key].totalBookings += 1;
        clientMap[key].totalSpend += parseFloat(p.total || 0);
        clientMap[key].history.push(p);

        if (p.tanggal && p.tanggal > clientMap[key].lastOrderDate) {
          clientMap[key].lastOrderDate = p.tanggal;
          clientMap[key].lastPackage = p.layanan;
        }
      });

      let clients = Object.values(clientMap);

      // Total stats calculations
      const totalUniqueClients = clients.length;
      const vipClients = clients.filter(c => c.totalBookings >= 3);
      const totalCrmRevenue = clients.reduce((acc, c) => acc + c.totalSpend, 0);
      const avgSpend = totalUniqueClients > 0 ? (totalCrmRevenue / totalUniqueClients) : 0;

      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="p-4 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-md shadow-md flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-600 flex items-center justify-center text-xl font-bold">
              <i class="fa-solid fa-users"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-500 uppercase">Total Client CRM</div>
              <div class="text-xl font-extrabold text-slate-900">${totalUniqueClients} Client</div>
            </div>
          </div>
          <div class="p-4 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-md shadow-md flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center text-xl font-bold">
              <i class="fa-solid fa-crown"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-500 uppercase">Client VIP (3+ Job)</div>
              <div class="text-xl font-extrabold text-amber-600">${vipClients.length} VIP</div>
            </div>
          </div>
          <div class="p-4 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-md shadow-md flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center text-xl font-bold">
              <i class="fa-solid fa-wallet"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-500 uppercase">Total Spent Client</div>
              <div class="text-lg font-extrabold text-emerald-600">${formatRp(totalCrmRevenue)}</div>
            </div>
          </div>
          <div class="p-4 rounded-2xl bg-white/40 border border-white/60 backdrop-blur-md shadow-md flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-600 flex items-center justify-center text-xl font-bold">
              <i class="fa-solid fa-chart-line"></i>
            </div>
            <div>
              <div class="text-[11px] font-bold text-slate-500 uppercase">Rata-rata Spend/Client</div>
              <div class="text-lg font-extrabold text-purple-600">${formatRp(avgSpend)}</div>
            </div>
          </div>
        `;
      }

      // Filtering clients
      if (searchVal) {
        clients = clients.filter(c => c.name.toLowerCase().includes(searchVal) || c.phone.includes(searchVal));
      }

      if (filterStatus === 'VIP') {
        clients = clients.filter(c => c.totalBookings >= 3);
      } else if (filterStatus === 'Reguler') {
        clients = clients.filter(c => c.totalBookings < 3);
      }

      if (clients.length === 0) {
        tb.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-6 font-semibold">Belum ada data client tercatat. Data client akan terisi otomatis saat order dibuat.</td></tr>`;
        return;
      }

      tb.innerHTML = clients.map((c, i) => {
        const isVip = c.totalBookings >= 3;
        const cleanPhone = c.phone.replace(/[^0-9]/g, '');
        const waLink = cleanPhone ? `https://wa.me/${cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone}` : '#';
        const encPhone = encodeURIComponent(c.phone);
        const encName = encodeURIComponent(c.name);

        return `
          <tr class="hover:bg-white/30 transition-colors">
            <td class="py-3 px-4 font-bold text-slate-400">${i + 1}</td>
            <td class="py-3 px-4 font-bold text-slate-900">${c.name}</td>
            <td class="py-3 px-4 font-semibold text-slate-700">${c.phone}</td>
            <td class="py-3 px-4 text-center font-extrabold text-indigo-600">${c.totalBookings} Booking</td>
            <td class="py-3 px-4 text-right font-extrabold text-emerald-600">${formatRp(c.totalSpend)}</td>
            <td class="py-3 px-4 font-medium text-slate-600">${safeDate(c.lastOrderDate)}</td>
            <td class="py-3 px-4 text-center">
              ${isVip ? '<span class="px-3 py-1 bg-amber-500/20 text-amber-700 border border-amber-300 font-extrabold rounded-xl text-[11px]"><i class="fa-solid fa-crown me-1"></i> VIP Client</span>' : '<span class="px-3 py-1 bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px]">⭐ Client Reguler</span>'}
            </td>
            <td class="py-3 px-4 text-center">
              <button onclick="showClientHistory('${encPhone}', '${encName}')" class="py-1.5 px-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1 shadow-sm transition-all me-1">
                <i class="fa-solid fa-clock-rotate-left"></i> Histori
              </button>
              ${cleanPhone ? `
                <a href="${waLink}" target="_blank" class="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs inline-flex items-center gap-1 shadow-sm transition-all me-1">
                  <i class="fa-brands fa-whatsapp"></i> Chat WA
                </a>
              ` : ''}
            </td>
          </tr>
        `;
      }).join('');
    };

    window.showClientHistory = function (encPhone, encName) {
      const phone = decodeURIComponent(encPhone);
      const name = decodeURIComponent(encName);

      const clientOrders = dbPemasukan.filter(p => {
        if (phone && phone !== '-') return (p.phone || '').trim() === phone.trim();
        return (p.client || '').toLowerCase().trim() === name.toLowerCase().trim();
      });

      document.getElementById('chClientName').innerText = name;
      document.getElementById('chClientPhone').innerText = phone || '-';
      document.getElementById('chTotalBookings').innerText = `${clientOrders.length} Booking`;
      
      const totalSpent = clientOrders.reduce((acc, x) => acc + parseFloat(x.total || 0), 0);
      document.getElementById('chTotalSpent').innerText = formatRp(totalSpent);

      const tb = document.getElementById('chTableBody');
      if (!tb) return;

      if (clientOrders.length === 0) {
        tb.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">Tidak ada histori order.</td></tr>`;
      } else {
        tb.innerHTML = clientOrders.map(p => {
          const isLunas = p.is_lunas === true || String(p.is_lunas) === 'true';
          return `
            <tr>
              <td class="py-2.5 px-4 font-bold text-slate-800">#${p.id_trx || p.id}</td>
              <td class="py-2.5 px-4 font-semibold text-slate-700">${safeDate(p.tanggal)} (${p.jam_mulai || ''} - ${p.jam_selesai || ''})</td>
              <td class="py-2.5 px-4 font-bold text-indigo-700">${p.layanan || '-'}</td>
              <td class="py-2.5 px-4 font-medium text-slate-600">${p.team || '-'}</td>
              <td class="py-2.5 px-4 text-right font-extrabold text-emerald-600">${formatRp(p.total)}</td>
              <td class="py-2.5 px-4 text-center">
                ${isLunas ? '<span class="badge bg-emerald-600 text-white">✅ LUNAS</span>' : '<span class="badge bg-amber-500 text-white">⏳ BELUM LUNAS</span>'}
              </td>
              <td class="py-2.5 px-4 text-center">
                <button onclick="openInvoicePreview(${p.id})" class="btn btn-sm btn-light border text-indigo-600 font-bold"><i class="fa-solid fa-file-invoice"></i> Invoice</button>
              </td>
            </tr>
          `;
        }).join('');
      }

      new bootstrap.Modal(document.getElementById('modalClientHistory')).show();
    };

    window.changeWaTemplate = function () {
      const type = document.getElementById('waTemplateType') ? document.getElementById('waTemplateType').value : 'invite';
      const waTemplate = document.getElementById('waInviteTemplate');
      if (!waTemplate) return;

      let set = (dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
      let brandName = set.brand || 'Kama Visual';
      let baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      let bookingUrl = baseUrl + 'booking.html';

      if (type === 'invite') {
        waTemplate.value = `Halo Kak {NAMA},\n\nTerima kasih telah menghubungi ${brandName}! ✨\n\nUntuk mempermudah pemilihan paket photoshoot, cek ketersediaan tanggal, serta menentukan slot jam acara, silakan isi Form Booking Online resmi kami di link berikut:\n\n🔗 ${bookingUrl}\n\nJika ada pertanyaan mengenai detail paket, jangan ragu untuk tanyakan ke kami ya Kak. Terima kasih! 🙏`;
      } else if (type === 'reminder') {
        waTemplate.value = `Halo Kak {NAMA},\n\nIni adalah pengingat dari ${brandName} bahwa besok adalah jadwal photoshoot/event Anda. 📸\n\nMohon untuk hadir tepat waktu sesuai lokasi & jam yang telah disepakati ya Kak. Sampai jumpa besok! ✨`;
      } else if (type === 'confirmDp') {
        waTemplate.value = `Halo Kak {NAMA},\n\nPembayaran Down Payment (DP) / Pelunasan Anda untuk sesi foto bersama ${brandName} telah kami terima dengan baik. Terima kasih atas kepercayaannya! 🌟\n\nJadwal Anda telah resmi terkunci di sistem kami. Sampai jumpa di hari H! 🎉`;
      } else if (type === 'gallery') {
        waTemplate.value = `Halo Kak {NAMA},\n\nHasil foto & dokumentasi dari ${brandName} sudah selesai diedit dan siap diunduh! 📁✨\n\nSilakan akses link galeri foto Kakak di bawah ini:\n[TEMPEL_LINK_DRIVE_DISINI]\n\nTerima kasih banyak telah memilih ${brandName}! Jangan lupa tag kami di sosial media ya Kak! ❤️`;
      }
    };

    window.openModalAddClient = function () {
      if (document.getElementById('formAddClient')) document.getElementById('formAddClient').reset();
      new bootstrap.Modal(document.getElementById('modalAddClient')).show();
    };

    window.saveManualClient = function () {
      const name = document.getElementById('cliName').value.trim();
      const phone = document.getElementById('cliPhone').value.trim();
      const notes = document.getElementById('cliNotes').value.trim();

      if (!name || !phone) return Swal.fire('Oops', 'Isi Nama dan Nomor HP Client', 'warning');

      const payload = {
        id: Date.now(),
        isEdit: 'false',
        id_trx: 'CLI-' + Date.now().toString().slice(-6),
        tanggal: safeDate(new Date()),
        client: name,
        phone: phone,
        team: '-',
        layanan: 'Pendaftaran Client Baru (CRM)',
        jumlah: 1,
        harga: 0,
        diskon: 0,
        dp: 0,
        transport: 0,
        total: 0,
        is_lunas: true,
        catatan: notes || 'Client terdaftar manual di CRM'
      };

      handleOptimisticSave('Pemasukan', payload, dbPemasukan, 'modalAddClient');
    };

    // ==========================================
    // 15. RENDER PAGE: BOOKING ONLINE & LINK PUBLIK
    // ==========================================
    window.renderBookingLink = function () {
      const publicUrlInput = document.getElementById('publicBookingUrlInput');
      const qrImg = document.getElementById('qrCodeImage');
      const waTemplate = document.getElementById('waInviteTemplate');

      if (!publicUrlInput) return;

      // Construct booking.html absolute URL
      let baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
      let bookingUrl = baseUrl + 'booking.html';
      publicUrlInput.value = bookingUrl;

      // Update QR Code image
      if (qrImg) {
        qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(bookingUrl)}`;
      }

      // Preset WA Invitation template
      if (waTemplate && !waTemplate.value) {
        let set = (dbPengaturan && dbPengaturan.length > 0) ? dbPengaturan[0] : {};
        let brandName = set.brand || 'Kama Visual';
        waTemplate.value = `Halo Kak {NAMA},\n\nTerima kasih telah menghubungi ${brandName}! ✨\n\nUntuk mempermudah pemilihan paket photoshoot, cek ketersediaan tanggal, serta menentukan slot jam acara, silakan isi Form Booking Online resmi kami di link berikut:\n\n🔗 ${bookingUrl}\n\nJika ada pertanyaan mengenai detail paket, jangan ragu untuk tanyakan ke kami ya Kak. Terima kasih! 🙏`;
      }
    };

    window.copyPublicBookingUrl = function () {
      const input = document.getElementById('publicBookingUrlInput');
      if (input && input.value) {
        copyToClipboard(input.value);
      }
    };

    window.downloadQRCode = function () {
      const qrImg = document.getElementById('qrCodeImage');
      if (qrImg && qrImg.src) {
        const a = document.createElement('a');
        a.href = qrImg.src;
        a.download = 'QR_Code_Booking_KamaVisual.png';
        a.target = '_blank';
        a.click();
      }
    };

    window.sendWaInvite = function () {
      const phoneInput = document.getElementById('waInvitePhone');
      const nameInput = document.getElementById('waInviteName');
      const templateInput = document.getElementById('waInviteTemplate');

      if (!phoneInput || !phoneInput.value.trim()) {
        return Swal.fire('Oops', 'Masukkan nomor WhatsApp client terlebih dahulu', 'warning');
      }

      let phone = phoneInput.value.trim().replace(/[^0-9]/g, '');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);

      let msg = templateInput ? templateInput.value : '';
      if (nameInput && nameInput.value.trim()) {
        msg = msg.replace(/\{NAMA\}/g, nameInput.value.trim());
      } else {
        msg = msg.replace(/\{NAMA\}/g, 'Kak');
      }

      const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      window.open(waUrl, '_blank');
    };

    // ==========================================
    // 16. RENDER PAGE: TIM & TALENT HUB
    // ==========================================
    window.renderTimSchedule = function () {
      const container = document.getElementById('talentCardsContainer');
      if (!container) return;

      if (!dbUsers || dbUsers.length === 0) {
        container.innerHTML = `<div class="col-span-full text-center text-slate-500 py-8 font-semibold">Belum ada data tim/talent. Silahkan tambah user baru.</div>`;
        return;
      }

      container.innerHTML = dbUsers.map(u => {
        // Count jobs handled by this talent in dbPemasukan
        const handledJobs = dbPemasukan.filter(p => (p.team && String(p.team).toLowerCase().includes(u.fullname.toLowerCase())) || (p.team2 && String(p.team2).toLowerCase().includes(u.fullname.toLowerCase())));
        const totalFeeCollected = dbPengeluaran.filter(peng => peng.kategori === 'Fee Team' && String(peng.detail).toLowerCase().includes(u.fullname.toLowerCase())).reduce((acc, x) => acc + parseFloat(x.nominal || 0), 0);

        const isTalent = u.role === 'Fotografer' || u.role === 'MUA' || u.kategori === 'Photographer' || u.kategori === 'Videographer' || u.kategori === 'MUA';

        return `
          <div class="p-6 rounded-3xl bg-white/30 backdrop-blur-md border border-white/50 shadow-xl space-y-4 flex flex-col justify-between">
            <div class="space-y-3">
              <div class="flex justify-between items-start">
                <div class="flex items-center gap-3">
                  <div class="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md">
                    ${u.fullname ? u.fullname.charAt(0).toUpperCase() : 'T'}
                  </div>
                  <div>
                    <h5 class="font-extrabold text-slate-900 text-base leading-tight">${u.fullname}</h5>
                    <span class="text-xs font-bold text-indigo-600">${u.username}</span>
                  </div>
                </div>
                <span class="badge ${u.role === 'Admin' ? 'bg-indigo-600 text-white' : u.role === 'Fotografer' ? 'bg-teal-600 text-white' : u.role === 'MUA' ? 'bg-pink-600 text-white' : 'bg-slate-700 text-white'} rounded-xl px-2.5 py-1 text-xs">
                  ${u.role}
                </span>
              </div>

              <div class="p-3.5 rounded-2xl bg-white/40 border border-white/60 space-y-2 text-xs">
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 font-semibold">Total Job Ditangani:</span>
                  <span class="font-extrabold text-slate-900">${handledJobs.length} Job</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 font-semibold">Total Fee Diterima:</span>
                  <span class="font-extrabold text-emerald-600">${formatRp(totalFeeCollected)}</span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-slate-500 font-semibold">Fee Default / Rate:</span>
                  <span class="font-extrabold text-indigo-600">${formatRp(u.fee_default || 0)}</span>
                </div>
                ${isTalent ? `
                  <div class="flex justify-between items-center">
                    <span class="text-slate-500 font-semibold">Surcharge Request:</span>
                    <span class="font-extrabold text-amber-600">${formatRp(u.talent_surcharge || 0)}</span>
                  </div>
                  <div class="flex justify-between items-center">
                    <span class="text-slate-500 font-semibold">Beban Max Job / Hari:</span>
                    <span class="font-bold text-slate-800">${u.max_job_per_day || 2} Job</span>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="pt-2 flex gap-2">
              <button onclick="editUser(${u.id})" class="flex-1 py-2 px-3 bg-white/60 hover:bg-white text-slate-800 font-bold text-xs rounded-xl border border-white/80 transition-all text-center">
                <i class="fa-solid fa-pen me-1"></i> Edit Talent / Rate
              </button>
            </div>
          </div>
        `;
      }).join('');
    };

    document.addEventListener('DOMContentLoaded', () => { 
      initTheme(); 
      loadAppBranding();
      checkLoginState(); 
      // Silently fetch latest settings in background to refresh login page branding
      if (!currentUser) {
        gasRun('getAllData').then(res => {
          if (res.success && res.data.pengaturan && res.data.pengaturan.length > 0) {
            dbPengaturan = res.data.pengaturan;
            try { localStorage.setItem('bookhive_app_settings', JSON.stringify(dbPengaturan[0])); } catch(e){}
            loadAppBranding();
          }
        }).catch(() => {});
      }
    });
