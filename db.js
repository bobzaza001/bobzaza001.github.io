const DB = {
  // ───────────────────────────── helpers ─────────────────────────────

  _key: {
    users: 'lib_users',
    books: 'lib_books',
    borrow: 'lib_borrow_records',
    alerts: 'lib_alerts',
  },

  _read(table) {
    const raw = localStorage.getItem(this._key[table]);
    return raw ? JSON.parse(raw) : [];
  },

  _write(table, data) {
    localStorage.setItem(this._key[table], JSON.stringify(data));
  },

  generateId() {
    return '_' + Math.random().toString(36).slice(2, 11) + Date.now().toString(36);
  },

  simpleHash(password) {
    return btoa(password + '_salt_libsys');
  },

  checkPassword(password, hash) {
    return this.simpleHash(password) === hash;
  },

  // ─────────────────────── date helpers (private) ───────────────────
  getToday() {
    const sim = localStorage.getItem('lib_simulated_today');
    return sim ? new Date(sim) : new Date();
  },

  setSimulatedToday(dateStr) {
    if (dateStr) {
      localStorage.setItem('lib_simulated_today', dateStr);
    } else {
      localStorage.removeItem('lib_simulated_today');
    }
  },

  _daysAgo(n) {
    const d = this.getToday();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  },

  _daysFromNow(n) {
    const d = this.getToday();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  },

  _todayISO() {
    return this.getToday().toISOString();
  },

  // ──────────────────────────── users ────────────────────────────────

  users: {
    getAll() {
      return DB._read('users');
    },

    getById(id) {
      return DB._read('users').find((u) => u.id === id) || null;
    },

    getByEmail(email) {
      return DB._read('users').find((u) => u.email === email) || null;
    },

    create({ fullName, email, passwordHash, role, status }) {
      const rows = DB._read('users');
      const user = {
        id: DB.generateId(),
        fullName,
        email,
        passwordHash,
        role,
        status,
        createdAt: new Date().toISOString(),
      };
      rows.push(user);
      DB._write('users', rows);
      return user;
    },

    update(id, data) {
      const rows = DB._read('users');
      const idx = rows.findIndex((u) => u.id === id);
      if (idx === -1) return null;
      rows[idx] = { ...rows[idx], ...data };
      DB._write('users', rows);
      return rows[idx];
    },

    delete(id) {
      const rows = DB._read('users');
      const filtered = rows.filter((u) => u.id !== id);
      DB._write('users', filtered);
      return filtered.length < rows.length;
    },
  },

  // ──────────────────────────── books ────────────────────────────────

  books: {
    getAll() {
      return DB._read('books');
    },

    getById(id) {
      return DB._read('books').find((b) => b.id === id) || null;
    },

    getAvailable() {
      return DB._read('books').filter((b) => b.available === true);
    },

    update(id, data) {
      const rows = DB._read('books');
      const idx = rows.findIndex((b) => b.id === id);
      if (idx === -1) return null;
      rows[idx] = { ...rows[idx], ...data };
      DB._write('books', rows);
      return rows[idx];
    },
  },

  // ──────────────────────── borrow records ───────────────────────────

  borrow: {
    getAll() {
      return DB._read('borrow');
    },

    getById(id) {
      return DB._read('borrow').find((r) => r.id === id) || null;
    },

    getByUser(userId) {
      return DB._read('borrow').filter((r) => r.userId === userId);
    },

    getActive(userId) {
      return DB._read('borrow').filter(
        (r) => r.userId === userId && r.returnDate === null
      );
    },

    getOverdue() {
      const now = DB._todayISO();
      return DB._read('borrow').filter(
        (r) => r.returnDate === null && r.dueDate < now
      );
    },

    create({ userId, bookId, borrowDate, dueDate }) {
      const rows = DB._read('borrow');
      const record = {
        id: DB.generateId(),
        userId,
        bookId,
        borrowDate,
        dueDate,
        returnDate: null,
      };
      rows.push(record);
      DB._write('borrow', rows);

      // Update book status to unavailable
      DB.books.update(bookId, { available: false });

      return record;
    },

    returnBook(id) {
      const rows = DB._read('borrow');
      const idx = rows.findIndex((r) => r.id === id);
      if (idx === -1) return null;

      rows[idx].returnDate = DB._todayISO();
      DB._write('borrow', rows);

      // Mark the book as available again
      const bookId = rows[idx].bookId;
      DB.books.update(bookId, { available: true });

      return rows[idx];
    },
  },

  // ──────────────────────────── alerts ───────────────────────────────

  alerts: {
    getAll() {
      return DB._read('alerts');
    },

    getByUser(userId) {
      return DB._read('alerts').filter((a) => a.userId === userId);
    },

    getByBorrowId(borrowId) {
      return DB._read('alerts').filter((a) => a.borrowId === borrowId);
    },

    getEscalated() {
      return DB._read('alerts').filter(
        (a) => a.escalated === true && a.status !== 'resolved'
      );
    },

    getUnread(userId) {
      return DB._read('alerts').filter(
        (a) => a.userId === userId && a.status === 'unread'
      );
    },

    create({ borrowId, userId, daysLate }) {
      const rows = DB._read('alerts');
      const alert = {
        id: DB.generateId(),
        borrowId,
        userId,
        daysLate,
        status: 'unread',
        escalated: false,
        notifiedAt: null,
        createdAt: DB._todayISO(),
      };
      rows.push(alert);
      DB._write('alerts', rows);
      return alert;
    },

    update(id, data) {
      const rows = DB._read('alerts');
      const idx = rows.findIndex((a) => a.id === id);
      if (idx === -1) return null;
      rows[idx] = { ...rows[idx], ...data };
      DB._write('alerts', rows);
      return rows[idx];
    },

    markRead(id) {
      return this.update(id, { status: 'read' });
    },

    resolve(id) {
      return this.update(id, { status: 'resolved' });
    },
  },

  // ─────────────────────── seed / initialization ─────────────────────

  init() {
    // Only seed if no data exists yet
    const hasUsers = localStorage.getItem(this._key.users);
    const hasBooks = localStorage.getItem(this._key.books);
    const hasBorrow = localStorage.getItem(this._key.borrow);
    const hasAlerts = localStorage.getItem(this._key.alerts);

    if (hasUsers && hasBooks && hasBorrow && hasAlerts) return;

    // ── Books ──
    const books = [
      { id: 'b1', title: 'การเขียนโปรแกรมเบื้องต้น', author: 'สมชาย วิทยาการ', category: 'โปรแกรมมิ่ง', isbn: '978-616-001', coverColor: '#6366f1', available: false },
      { id: 'b2', title: 'คณิตศาสตร์วิศวกรรม', author: 'ดร.สุภา คำนวณ', category: 'คณิตศาสตร์', isbn: '978-616-002', coverColor: '#8b5cf6', available: true },
      { id: 'b3', title: 'ฟิสิกส์มหาวิทยาลัย', author: 'รศ.ประยุต พลังงาน', category: 'ฟิสิกส์', isbn: '978-616-003', coverColor: '#10b981', available: false },
      { id: 'b4', title: 'เคมีทั่วไป', author: 'ผศ.วิมล สารเคมี', category: 'เคมี', isbn: '978-616-004', coverColor: '#f59e0b', available: true },
      { id: 'b5', title: 'ภาษาอังกฤษเชิงวิชาการ', author: 'Prof. Sarah Johnson', category: 'ภาษา', isbn: '978-616-005', coverColor: '#ec4899', available: false },
      { id: 'b6', title: 'ระบบฐานข้อมูล', author: 'ดร.พิชัย ดาต้า', category: 'ฐานข้อมูล', isbn: '978-616-006', coverColor: '#06b6d4', available: true },
      { id: 'b7', title: 'เครือข่ายคอมพิวเตอร์', author: 'อ.ธนา เน็ตเวิร์ค', category: 'เครือข่าย', isbn: '978-616-007', coverColor: '#ef4444', available: true },
      { id: 'b8', title: 'ปัญญาประดิษฐ์เบื้องต้น', author: 'ดร.อภิชาติ ปัญญา', category: 'AI', isbn: '978-616-008', coverColor: '#a855f7', available: true },
    ];

    // ── Users ──
    const users = [
      { id: 'u1', fullName: 'อ.สมศักดิ์ ราชการ', email: 'teacher@university.ac.th', passwordHash: this.simpleHash('teacher123'), role: 'teacher', status: 'active', createdAt: new Date().toISOString() },
      { id: 'u2', fullName: 'นายธนกร ใจดี', email: 'student@university.ac.th', passwordHash: this.simpleHash('student123'), role: 'student', status: 'active', createdAt: new Date().toISOString() },
    ];

    // ── Borrow Records ──
    const borrowRecords = [
      { id: 'br1', userId: 'u2', bookId: 'b1', borrowDate: this._daysAgo(14), dueDate: this._daysAgo(7), returnDate: null },
      { id: 'br2', userId: 'u2', bookId: 'b3', borrowDate: this._daysAgo(20), dueDate: this._daysAgo(13), returnDate: null },
      { id: 'br3', userId: 'u2', bookId: 'b5', borrowDate: this._daysAgo(5), dueDate: this._daysFromNow(9), returnDate: null },
    ];

    // ── Alerts ──
    const alerts = [
      { id: 'a1', borrowId: 'br1', userId: 'u2', daysLate: 7, status: 'unread', notifiedAt: this._daysAgo(1), escalated: false, createdAt: this._daysAgo(7) },
      { id: 'a2', borrowId: 'br2', userId: 'u2', daysLate: 13, status: 'unread', notifiedAt: this._daysAgo(1), escalated: true, createdAt: this._daysAgo(13) },
    ];

    if (!hasBooks) this._write('books', books);
    if (!hasUsers) this._write('users', users);
    if (!hasBorrow) this._write('borrow', borrowRecords);
    if (!hasAlerts) this._write('alerts', alerts);
  },
};

// Auto-initialize on load
DB.init();
