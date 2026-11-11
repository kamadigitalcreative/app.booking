/**
 * BookHive Internationalization (i18n) Engine
 * Supported Languages: 'id' (Indonesian), 'en' (English)
 */

const BookHiveI18n = {
  currentLang: localStorage.getItem('bookhive_lang') || 'id',

  translations: {
    id: {
      // General / Brand
      app_platform: 'BookHive',
      app_tagline: 'SIMPLY BOOK. STAY ORGANIZED',
      lang_id: 'Indonesia',
      lang_en: 'English',
      lang_code_id: 'ID',
      lang_code_en: 'EN',
      mode_dark: 'Mode Malam',
      mode_light: 'Mode Terang',
      logout: 'Logout',
      
      // Loading & Status
      loading_system: 'MEMUAT SISTEM & SINKRONISASI DATA...',
      loading_general: 'Memuat data...',
      saving_data: 'Menyimpan data...',
      processing: 'Memproses...',
      please_wait: 'Mohon tunggu...',
      syncing: 'Menyinkronkan...',
      
      // Common Actions
      btn_save: 'Simpan',
      btn_cancel: 'Batal',
      btn_close: 'Tutup',
      btn_delete: 'Hapus',
      btn_edit: 'Edit',
      btn_detail: 'Detail',
      btn_filter: 'Filter',
      btn_export: 'Export Data',
      btn_add: 'Tambah',
      btn_confirm: 'Konfirmasi',
      btn_copy: 'Salin',
      btn_download: 'Unduh',
      btn_back: 'Kembali',
      actions: 'Aksi',
      status: 'Status',
      notes: 'Catatan',
      
      // Auth / Login
      auth_username: 'Username',
      auth_password: 'Password',
      auth_remember_me: 'Ingat Saya',
      auth_forgot_pwd: 'Lupa Password?',
      auth_login_btn: 'Masuk',
      auth_no_account: 'Belum punya akun?',
      auth_register_link: 'Daftar disini',
      auth_register_title: 'Daftar Akun Tim',
      auth_register_subtitle: 'Daftar sebagai fotografer / MUA / crew baru',
      auth_fullname_placeholder: 'Nama Lengkap / Studio',
      auth_email_placeholder: 'Alamat Email',
      auth_phone_placeholder: 'Nomor Handphone (WA)',
      auth_select_role: 'Pilih Role Pengguna',
      auth_role_admin: 'Owner / Admin',
      auth_role_photographer: 'Fotografer / Talent',
      auth_role_mua: 'MUA / Makeup Artist',
      auth_register_btn: 'Daftar Sekarang',
      auth_have_account: 'Sudah punya akun?',
      auth_back_to_login: 'Kembali ke Login',
      auth_forgot_title: 'Lupa Password',
      auth_forgot_subtitle: 'Masukkan email untuk reset password',
      auth_reset_btn: 'Reset Password',
      auth_reset_sent: 'Tautan reset password telah dikirim ke email Anda.',
      auth_fill_credentials: 'Isi username & password',
      auth_login_success: 'Login Berhasil',
      auth_login_welcome: 'Selamat Datang',
      auth_invalid_credentials: 'Username atau Password salah',
      
      // Sidebar Categories & Menus
      sidebar_overview: 'OVERVIEW & RINGKASAN',
      sidebar_dashboard: 'Dashboard Utama',
      sidebar_kalender: 'Kalender Booking',
      sidebar_client_group: 'CLIENT & BOOKING',
      sidebar_crm: 'Database Client (CRM)',
      sidebar_order: 'Order & Pemasukan',
      sidebar_booking_link: 'Booking Online & Link Publik',
      sidebar_team_group: 'TIM & JADWAL TALENT',
      sidebar_team_hub: 'Tim & Talent Hub',
      sidebar_block_day: 'Slot Libur / Block Day',
      sidebar_finance_group: 'KEUANGAN & KATALOG',
      sidebar_produk: 'Katalog Layanan & Paket',
      sidebar_pengeluaran: 'Pengeluaran Operasional',
      sidebar_aruskas: 'Arus Kas (Cash Flow)',
      sidebar_admin_group: 'INTERNAL & SISTEM',
      sidebar_todo: 'Task / To-Do Tim',
      sidebar_settings: 'Pengaturan Sistem',

      // Dashboard
      dash_title: 'Dashboard Laporan Usaha',
      dash_subtitle: 'Ringkasan performa usaha & jadwal kerja studio',
      dash_year_prefix: 'Tahun: ',
      dash_all_months: 'Semua Bulan',
      stat_total_job: 'Total Job',
      stat_total_income: 'Pemasukan Total',
      stat_total_expense: 'Pengeluaran (All)',
      stat_team_fee: 'Distribusi Fee Team',
      stat_receivable: 'Piutang Client',
      stat_net_profit: 'Laba Bersih',
      dash_pkg_sales: 'Rekap Paket Terjual',
      dash_no_pkg: 'Belum ada paket yang terjual pada periode ini.',
      dash_revenue_src: 'Sumber Penghasilan',
      dash_team_bonus: 'Kinerja Team & Bonus Bulan Ini',
      dash_bonus_formula: 'Bonus dihitung kelipatan {n} job PAKET dengan fee tim ≤ Rp {max}. Nominal: Rp {nom} per {n} job.',
      th_product_name: 'NAMA PRODUK',
      th_sold: 'TERJUAL',
      th_amount: 'NOMINAL',

      // Calendar
      cal_title: 'Kalender Booking',
      cal_subtitle: 'Jadwal booking acara, event & sesi kerja',

      // CRM
      crm_title: 'Database Client (CRM)',
      crm_subtitle: 'Kelola riwayat booking, loyalty & data client',
      crm_search_placeholder: 'Cari nama / WhatsApp client...',
      crm_add_btn: 'Tambah Client Manual',
      crm_total_clients: 'Total Database Client',
      crm_repeat_order: 'Client Repeat Order',
      crm_new_month: 'Client Baru Bulan Ini',
      th_client_name: 'Nama Client',
      th_phone: 'No. WhatsApp',
      th_total_booking: 'Total Booking',
      th_total_spend: 'Total Belanja',
      th_loyalty: 'Loyalty Level',

      // Orders & Revenue
      order_title: 'Order & Pemasukan',
      order_subtitle: 'Catatan pesanan client & transaksi masuk',
      order_add_btn: 'Tambah Order Manual',
      filter_all: 'Semua',
      filter_paid: 'Lunas',
      filter_unpaid: 'Belum Lunas',
      badge_paid: 'LUNAS',
      badge_unpaid: 'BELUM LUNAS',
      th_trx_id: 'ID Trx',
      th_date: 'Tanggal',
      th_client: 'Client',
      th_crew: 'Crew',
      th_service: 'Layanan',
      th_qty: 'Qty',
      th_total: 'Total',

      // Booking Online Link
      booklink_title: 'Booking Online & Link Publik',
      booklink_subtitle: 'Bagikan formulir booking resmi ke client secara mudah',
      booklink_open: 'Buka Link Form',
      booklink_copy: 'Copy Link',
      booklink_qr: 'QR Code',
      booklink_wa_temp: 'Template WhatsApp Client',
      booklink_invite_opt: '1. Undangan Form Booking Online (Client Baru)',
      booklink_reminder_opt: '2. Pengingat H-1 Event / Photoshoot',
      booklink_confirm_opt: '3. Konfirmasi DP / Pembayaran Diterima',
      booklink_gallery_opt: '4. Informasi Link Hasil Foto & File Selesai',
      booklink_copied: 'Link Berhasil Disalin!',
      booklink_copied_desc: 'Link Form Booking Publik berhasil tersimpan ke clipboard Anda.',

      // Expenses
      exp_title: 'Pengeluaran Operasional',
      exp_subtitle: 'Catatan biaya operasional, belanja studio & fee tim',
      exp_add_btn: 'Tambah Pengeluaran',
      th_category: 'Kategori',
      th_nominal: 'Nominal',

      // Cash Flow
      cash_title: 'Arus Kas (Cash Flow)',
      cash_subtitle: 'Rekapitulasi arus dana masuk & keluar',
      cash_income_section: 'RINCIAN PEMASUKAN',
      cash_expense_section: 'RINCIAN PENGELUARAN',
      cash_no_income: 'Tidak ada pemasukan pada periode ini.',
      cash_no_expense: 'Tidak ada pengeluaran pada periode ini.',
      cash_total_income: 'Total Pemasukan Operasional',
      cash_total_expense: 'Total Pengeluaran Operasional',
      cash_net_profit: 'LABA BERSIH (NET PROFIT)',

      // Tasks / To-Do
      todo_title: 'Task / To-Do Tim',
      todo_subtitle: 'Daftar tugas, deadline & jadwal kerja tim',
      todo_add_btn: 'Tambah Task Baru',

      // Settings
      set_title: 'Pengaturan Sistem',
      set_subtitle: 'Kelola identitas usaha, akun bank & pengguna',
      tab_profile: 'Profil Usaha',
      tab_app: 'Aplikasi & Tampilan',
      tab_users: 'Manajemen User & Crew',
      tab_bonus: 'Skema Bonus',
      set_brand: 'Nama Brand Studio',
      set_tagline: 'Slogan / Tagline',
      set_phone: 'Nomor WhatsApp Usaha',
      set_email: 'Alamat Email Usaha',
      set_bank: 'Nama Bank',
      set_acc: 'Nomor Rekening',
      set_acc_name: 'Atas Nama (A/N)',
      set_notes: 'Catatan di Bawah Invoice',
      set_save_btn: 'Simpan Pengaturan',
      set_app_name: 'Nama Aplikasi',
      set_logo_text: 'Inisial Logo (Jika tanpa gambar)',
      set_logo_image: 'Upload Logo Aplikasi / Brand',

      // Booking Portal (Client Facing)
      booking_portal_loading: 'Memuat Portal Booking...',
      booking_sec1: '1. Informasi Client',
      booking_fullname: 'Nama Lengkap *',
      booking_phone: 'No. WhatsApp *',
      booking_address: 'Alamat / Lokasi Acara',
      booking_address_ph: 'Detail lokasi acara...',
      booking_sec2: '2. Tanggal & Rentang Jam Acara',
      booking_add_day: 'Tambah Hari / Tanggal',
      booking_day_prefix: 'Hari',
      booking_date: 'Tanggal Acara *',
      booking_start: 'Jam Mulai *',
      booking_end: 'Jam Selesai *',
      booking_sec3: '3. Pilih Paket Layanan',
      booking_sec4: '4. Pilih Crew',
      booking_crew_wait: 'Pilih tanggal & jam acara terlebih dahulu untuk melihat crew yang tersedia.',
      booking_base_price: 'Harga Paket Base:',
      booking_crew_fee: 'Biaya Crew Surcharge:',
      booking_grand_total: 'Total Estimasi Booking:',
      booking_notes: 'Catatan Khusus (Opsional)',
      booking_notes_ph: 'Permintaan khusus konsep / busana...',
      booking_confirm_btn: 'Konfirmasi Booking',
      booking_success_title: 'Booking Berhasil!',
      booking_success_desc: 'Mengarahkan ke halaman rincian invoice...',
      booking_crew_loading: 'Memeriksa ketersediaan crew...',
      booking_no_service: 'Belum ada layanan yang tersedia.',

      // Alerts / Modals
      swal_success: 'Berhasil!',
      swal_error: 'Terjadi Kesalahan',
      swal_warning: 'Perhatian',
      swal_confirm_delete: 'Apakah Anda yakin ingin menghapus data ini?',
      swal_deleted_success: 'Data berhasil dihapus.',
      swal_saved_success: 'Data berhasil disimpan.',
      swal_fill_required: 'Harap isi semua kolom wajib bertanda (*).'
    },

    en: {
      // General / Brand
      app_platform: 'BookHive',
      app_tagline: 'SIMPLY BOOK. STAY ORGANIZED',
      lang_id: 'Indonesian',
      lang_en: 'English',
      lang_code_id: 'ID',
      lang_code_en: 'EN',
      mode_dark: 'Dark Mode',
      mode_light: 'Light Mode',
      logout: 'Sign Out',
      
      // Loading & Status
      loading_system: 'LOADING SYSTEM & SYNCING DATA...',
      loading_general: 'Loading data...',
      saving_data: 'Saving data...',
      processing: 'Processing...',
      please_wait: 'Please wait...',
      syncing: 'Syncing...',
      
      // Common Actions
      btn_save: 'Save',
      btn_cancel: 'Cancel',
      btn_close: 'Close',
      btn_delete: 'Delete',
      btn_edit: 'Edit',
      btn_detail: 'Details',
      btn_filter: 'Filter',
      btn_export: 'Export Data',
      btn_add: 'Add',
      btn_confirm: 'Confirm',
      btn_copy: 'Copy',
      btn_download: 'Download',
      btn_back: 'Back',
      actions: 'Actions',
      status: 'Status',
      notes: 'Notes',
      
      // Auth / Login
      auth_username: 'Username',
      auth_password: 'Password',
      auth_remember_me: 'Remember Me',
      auth_forgot_pwd: 'Forgot Password?',
      auth_login_btn: 'Sign In',
      auth_no_account: "Don't have an account?",
      auth_register_link: 'Register here',
      auth_register_title: 'Register Team Account',
      auth_register_subtitle: 'Sign up as a photographer / MUA / new crew member',
      auth_fullname_placeholder: 'Full Name / Studio',
      auth_email_placeholder: 'Email Address',
      auth_phone_placeholder: 'Phone Number (WA)',
      auth_select_role: 'Select User Role',
      auth_role_admin: 'Owner / Admin',
      auth_role_photographer: 'Photographer / Talent',
      auth_role_mua: 'MUA / Makeup Artist',
      auth_register_btn: 'Register Now',
      auth_have_account: 'Already have an account?',
      auth_back_to_login: 'Back to Sign In',
      auth_forgot_title: 'Forgot Password',
      auth_forgot_subtitle: 'Enter your email to receive a password reset link',
      auth_reset_btn: 'Reset Password',
      auth_reset_sent: 'A password reset link has been sent to your email.',
      auth_fill_credentials: 'Enter username & password',
      auth_login_success: 'Sign In Successful',
      auth_login_welcome: 'Welcome',
      auth_invalid_credentials: 'Invalid username or password',
      
      // Sidebar Categories & Menus
      sidebar_overview: 'OVERVIEW & SUMMARY',
      sidebar_dashboard: 'Main Dashboard',
      sidebar_kalender: 'Booking Calendar',
      sidebar_client_group: 'CLIENT & BOOKING',
      sidebar_crm: 'Client Database (CRM)',
      sidebar_order: 'Orders & Revenue',
      sidebar_booking_link: 'Online Booking & Public Links',
      sidebar_team_group: 'TEAM & CREW SCHEDULE',
      sidebar_team_hub: 'Team & Talent Hub',
      sidebar_block_day: 'Off Days / Block Dates',
      sidebar_finance_group: 'FINANCE & CATALOG',
      sidebar_produk: 'Services & Package Catalog',
      sidebar_pengeluaran: 'Operating Expenses',
      sidebar_aruskas: 'Cash Flow',
      sidebar_admin_group: 'INTERNAL & SYSTEM',
      sidebar_todo: 'Team Tasks / To-Do',
      sidebar_settings: 'System Settings',

      // Dashboard
      dash_title: 'Business Report Dashboard',
      dash_subtitle: 'Business performance summary & studio schedule',
      dash_year_prefix: 'Year: ',
      dash_all_months: 'All Months',
      stat_total_job: 'Total Jobs',
      stat_total_income: 'Total Revenue',
      stat_total_expense: 'Total Expenses',
      stat_team_fee: 'Team Fee Distribution',
      stat_receivable: 'Receivables',
      stat_net_profit: 'Net Profit',
      dash_pkg_sales: 'Package Sales Summary',
      dash_no_pkg: 'No packages sold in this period.',
      dash_revenue_src: 'Revenue Breakdown',
      dash_team_bonus: 'Team Performance & Bonus This Month',
      dash_bonus_formula: 'Bonus calculated in multiples of {n} PACKAGE jobs with crew fee ≤ Rp {max}. Amount: Rp {nom} per {n} jobs.',
      th_product_name: 'PRODUCT NAME',
      th_sold: 'SOLD',
      th_amount: 'AMOUNT',

      // Calendar
      cal_title: 'Booking Calendar',
      cal_subtitle: 'Event booking, session & work schedule',

      // CRM
      crm_title: 'Client Database (CRM)',
      crm_subtitle: 'Manage client booking history, contacts & loyalty',
      crm_search_placeholder: 'Search client name / WhatsApp...',
      crm_add_btn: 'Add Client Manually',
      crm_total_clients: 'Total Database Clients',
      crm_repeat_order: 'Repeat Order Clients',
      crm_new_month: 'New Clients This Month',
      th_client_name: 'Client Name',
      th_phone: 'WhatsApp No.',
      th_total_booking: 'Total Bookings',
      th_total_spend: 'Total Spent',
      th_loyalty: 'Loyalty Level',

      // Orders & Revenue
      order_title: 'Orders & Revenue',
      order_subtitle: 'Client order logs & incoming transactions',
      order_add_btn: 'Add Manual Order',
      filter_all: 'All',
      filter_paid: 'Paid',
      filter_unpaid: 'Unpaid',
      badge_paid: 'PAID',
      badge_unpaid: 'UNPAID',
      th_trx_id: 'Trx ID',
      th_date: 'Date',
      th_client: 'Client',
      th_crew: 'Crew',
      th_service: 'Service',
      th_qty: 'Qty',
      th_total: 'Total',

      // Booking Online Link
      booklink_title: 'Online Booking & Public Links',
      booklink_subtitle: 'Share interactive online booking forms easily with prospective clients',
      booklink_open: 'Open Booking Form',
      booklink_copy: 'Copy Link',
      booklink_qr: 'QR Code',
      booklink_wa_temp: 'Client WhatsApp Templates',
      booklink_invite_opt: '1. Online Booking Form Invitation (New Client)',
      booklink_reminder_opt: '2. D-1 Event / Photoshoot Reminder',
      booklink_confirm_opt: '3. Down Payment / Payment Confirmation',
      booklink_gallery_opt: '4. Photo Results & Gallery Link',
      booklink_copied: 'Link Copied!',
      booklink_copied_desc: 'Public Booking Form link has been copied to your clipboard.',

      // Expenses
      exp_title: 'Operating Expenses',
      exp_subtitle: 'Operational costs, studio expenses & team fees',
      exp_add_btn: 'Add Expense',
      th_category: 'Category',
      th_nominal: 'Amount',

      // Cash Flow
      cash_title: 'Cash Flow',
      cash_subtitle: 'Inflow and outflow cash summary',
      cash_income_section: 'REVENUE BREAKDOWN',
      cash_expense_section: 'EXPENSE BREAKDOWN',
      cash_no_income: 'No revenue in this period.',
      cash_no_expense: 'No expenses in this period.',
      cash_total_income: 'Total Operating Revenue',
      cash_total_expense: 'Total Operating Expenses',
      cash_net_profit: 'NET PROFIT',

      // Tasks / To-Do
      todo_title: 'Team Tasks / To-Do',
      todo_subtitle: 'Task list, deadlines & team schedule',
      todo_add_btn: 'Add New Task',

      // Settings
      set_title: 'System Settings',
      set_subtitle: 'Configure business identity, bank accounts & user access',
      tab_profile: 'Business Profile',
      tab_app: 'App & Appearance',
      tab_users: 'User & Crew Management',
      tab_bonus: 'Bonus Scheme',
      set_brand: 'Studio Brand Name',
      set_tagline: 'Slogan / Tagline',
      set_phone: 'Business WhatsApp Number',
      set_email: 'Business Email Address',
      set_bank: 'Bank Name',
      set_acc: 'Account Number',
      set_acc_name: 'Account Holder Name',
      set_notes: 'Invoice Footer Notes',
      set_save_btn: 'Save Settings',
      set_app_name: 'Application Name',
      set_logo_text: 'Logo Initials (If no image)',
      set_logo_image: 'Upload App / Brand Logo',

      // Booking Portal (Client Facing)
      booking_portal_loading: 'Loading Booking Portal...',
      booking_sec1: '1. Client Information',
      booking_fullname: 'Full Name *',
      booking_phone: 'WhatsApp No. *',
      booking_address: 'Event Address / Location',
      booking_address_ph: 'Event location details...',
      booking_sec2: '2. Event Date & Time Range',
      booking_add_day: 'Add Day / Date',
      booking_day_prefix: 'Day',
      booking_date: 'Event Date *',
      booking_start: 'Start Time *',
      booking_end: 'End Time *',
      booking_sec3: '3. Select Service Package',
      booking_sec4: '4. Select Crew',
      booking_crew_wait: 'Select event date & time first to view available crew.',
      booking_base_price: 'Base Package Price:',
      booking_crew_fee: 'Crew Surcharge:',
      booking_grand_total: 'Total Estimated Booking:',
      booking_notes: 'Special Notes (Optional)',
      booking_notes_ph: 'Specific requests, outfits, concept...',
      booking_confirm_btn: 'Confirm Booking',
      booking_success_title: 'Booking Successful!',
      booking_success_desc: 'Redirecting to your invoice details...',
      booking_crew_loading: 'Checking crew availability...',
      booking_no_service: 'No services available at this moment.',

      // Alerts / Modals
      swal_success: 'Success!',
      swal_error: 'An Error Occurred',
      swal_warning: 'Notice',
      swal_confirm_delete: 'Are you sure you want to delete this record?',
      swal_deleted_success: 'Record successfully deleted.',
      swal_saved_success: 'Data successfully saved.',
      swal_fill_required: 'Please fill in all required fields marked with (*).'
    }
  },

  /**
   * Get translation for a key
   */
  t(key, fallback = '') {
    const lang = this.currentLang || 'id';
    if (this.translations[lang] && this.translations[lang][key] !== undefined) {
      return this.translations[lang][key];
    }
    if (this.translations['id'] && this.translations['id'][key] !== undefined) {
      return this.translations['id'][key];
    }
    return fallback || key;
  },

  /**
   * Set language and re-apply across DOM
   */
  setLanguage(lang) {
    if (lang !== 'id' && lang !== 'en') lang = 'id';
    this.currentLang = lang;
    localStorage.setItem('bookhive_lang', lang);
    document.documentElement.setAttribute('lang', lang);

    this.applyTranslations();

    // Notify other components if needed
    if (typeof window.routeRender === 'function' && typeof window.isDataLoaded !== 'undefined' && window.isDataLoaded) {
      window.routeRender();
    }
    if (typeof window.loadAppBranding === 'function') {
      window.loadAppBranding();
    }
  },

  /**
   * Toggle between 'id' and 'en'
   */
  toggleLanguage() {
    const nextLang = this.currentLang === 'id' ? 'en' : 'id';
    this.setLanguage(nextLang);
  },

  /**
   * Update all DOM elements with data-i18n attributes
   */
  applyTranslations() {
    const lang = this.currentLang || 'id';
    const dict = this.translations[lang] || this.translations['id'];

    // 1. Text elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (dict[key] !== undefined) {
        el.textContent = dict[key];
      }
    });

    // 2. HTML elements
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (dict[key] !== undefined) {
        el.innerHTML = dict[key];
      }
    });

    // 3. Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (dict[key] !== undefined) {
        el.setAttribute('placeholder', dict[key]);
      }
    });

    // 4. Tooltips / Titles
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (dict[key] !== undefined) {
        el.setAttribute('title', dict[key]);
      }
    });

    // 5. Update language code badges
    document.querySelectorAll('.lang-code-display').forEach(el => {
      el.textContent = (lang === 'id' ? 'ID' : 'EN');
    });

    // 6. Synchronize language select elements
    document.querySelectorAll('.lang-select-input').forEach(sel => {
      sel.value = lang;
    });

    // 7. Update Loader text if loader is visible
    const loaderText = document.getElementById('loaderText');
    if (loaderText) {
      loaderText.textContent = dict['loading_system'] || 'MEMUAT SISTEM & SINKRONISASI DATA...';
    }

    // 8. Update Theme Toggle Labels according to current theme
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    document.querySelectorAll('.theme-toggle-label').forEach(el => {
      el.textContent = currentTheme === 'dark' ? dict['mode_light'] : dict['mode_dark'];
    });
  }
};

// Global shorthand helper
window.t = function(key, fallback = '') {
  return BookHiveI18n.t(key, fallback);
};
window.setLanguage = function(lang) {
  BookHiveI18n.setLanguage(lang);
};
window.toggleLanguage = function() {
  BookHiveI18n.toggleLanguage();
};

document.addEventListener('DOMContentLoaded', () => {
  BookHiveI18n.applyTranslations();
});
