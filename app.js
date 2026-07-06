// ==========================================
// System Diagrams Viewer — Application Logic
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // ─────────────────────────────────────────────────────────────────
    // 1. STATE & ROUTING
    // ─────────────────────────────────────────────────────────────────
    let currentUser = null;

    // Initialize Database
    DB.init();

    // UI Elements
    const views = {
        login: document.getElementById('view-login'),
        register: document.getElementById('view-register'),
        verify: document.getElementById('view-verify'),
        dashboard: document.getElementById('view-dashboard'),
        catalog: document.getElementById('view-catalog'),
        'my-borrows': document.getElementById('view-my-borrows'),
        notifications: document.getElementById('view-notifications'),
        'overdue-manage': document.getElementById('view-overdue-manage'),
    };

    const layout = document.getElementById('app-layout');
    const navLinks = document.querySelectorAll('.nav-link');
    const topbarTitle = document.getElementById('topbar-title');

    // Toast Manager
    const toastContainer = document.getElementById('toast-container');
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        else if (type === 'error') icon = '❌';
        else if (type === 'warning') icon = '⚠️';

        toast.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-message">${message}</span>`;
        toastContainer.appendChild(toast);

        // Slide in animation handled by CSS, auto remove after 4s
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.4s ease forwards';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Modal Manager
    const modalOverlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');
    
    function showModal(title, bodyHtml, buttons = []) {
        modalTitle.innerText = title;
        modalBody.innerHTML = bodyHtml;
        modalFooter.innerHTML = '';
        
        buttons.forEach(btnSpec => {
            const btn = document.createElement('button');
            btn.className = `btn ${btnSpec.class || 'btn-secondary'}`;
            btn.innerText = btnSpec.text;
            btn.onclick = () => {
                if (btnSpec.onClick) {
                    btnSpec.onClick();
                } else {
                    closeModal();
                }
            };
            modalFooter.appendChild(btn);
        });
        
        modalOverlay.style.display = 'flex';
        // Allow display: flex to propagate before adding class for transition
        setTimeout(() => {
            modalOverlay.classList.add('active');
        }, 10);
    }

    function showSuccessModal(message, onOk) {
        showModal(
            'ทำรายการเสร็จสิ้น',
            `<div style="text-align: center; padding: 20px 0;">
                <div style="font-size: 3.5rem; margin-bottom: 15px; animation: pulse 1s infinite alternate;">✅</div>
                <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin-bottom: 10px;">สำเร็จ!</h3>
                <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;">${message}</p>
             </div>`,
            [
                {
                    text: 'ตกลง',
                    class: 'btn-success btn-block',
                    onClick: () => {
                        closeModal();
                        if (onOk) onOk();
                    }
                }
            ]
        );
    }

    function closeModal() {
        modalOverlay.classList.remove('active');
        setTimeout(() => {
            modalOverlay.style.display = 'none';
        }, 300); // match transition
    }

    document.getElementById('modal-close').onclick = closeModal;

    // View Switching Engine
    function navigateTo(viewName) {
        // Hide all views
        Object.values(views).forEach(v => v.classList.remove('active'));
        
        // Show app layout or auth view
        const isAuthView = ['login', 'register', 'verify'].includes(viewName);
        if (isAuthView) {
            layout.style.display = 'none';
            views[viewName].classList.add('active');
        } else {
            if (!currentUser) {
                navigateTo('login');
                return;
            }
            layout.style.display = 'flex';
            views[viewName].classList.add('active');

            // Update topbar title and sidebar nav active state
            updateNavigationUI(viewName);

            // Fetch state changes per view
            renderViewData(viewName);
        }
    }

    function updateNavigationUI(viewName) {
        navLinks.forEach(link => {
            if (link.dataset.view === viewName) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        const titles = {
            dashboard: '📊 แดชบอร์ดระบบหอสมุด',
            catalog: '📖 รายการหนังสือทั้งหมด',
            'my-borrows': '📋 หนังสือที่คุณยืมอยู่',
            notifications: '🔔 การแจ้งเตือนระบบ',
            'overdue-manage': '⚠️ จัดการหนังสือเกินกำหนดคืน (สำหรับอาจารย์)'
        };
        topbarTitle.innerText = titles[viewName] || 'ระบบหอสมุด';
    }

    // Nav click handlers
    navLinks.forEach(link => {
        link.onclick = (e) => {
            const viewName = link.dataset.view;
            if (viewName) {
                e.preventDefault();
                navigateTo(viewName);
            }
            // Hide sidebar on mobile
            document.getElementById('sidebar').classList.remove('active');
        };
    });

    // Mobile Hamburger Menu
    document.getElementById('hamburger').onclick = () => {
        document.getElementById('sidebar').classList.add('active');
    };
    document.getElementById('sidebar-close').onclick = () => {
        document.getElementById('sidebar').classList.remove('active');
    };

    // User session management
    function loginUser(user) {
        currentUser = user;
        localStorage.setItem('lib_session', JSON.stringify(user));
        
        // Setup User Info on sidebar & topbar
        document.getElementById('sidebar-name').innerText = user.fullName;
        document.getElementById('sidebar-role').innerText = user.role === 'teacher' ? '👨‍🏫 อาจารย์' : '👤 นักศึกษา';
        document.getElementById('sidebar-avatar').innerText = user.role === 'teacher' ? '👨‍🏫' : '👤';
        document.getElementById('topbar-name').innerText = user.fullName;

        // Show/Hide Teacher-only options
        const teacherLinks = document.querySelectorAll('.teacher-only');
        teacherLinks.forEach(link => {
            link.style.display = user.role === 'teacher' ? 'flex' : 'none';
        });

        // Hide/Show Scheduler on Dashboard based on role (optional, but keep visible for demonstration)
        
        showToast(`ยินดีต้อนรับคุณ ${user.fullName}!`, 'success');
        updateGlobalBadges();
        navigateTo('dashboard');
    }

    function logout() {
        currentUser = null;
        localStorage.removeItem('lib_session');
        showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
        navigateTo('login');
    }

    document.getElementById('logout-btn').onclick = logout;

    // Simulated Date Input Binding
    const simDateInput = document.getElementById('sim-date-input');
    if (simDateInput) {
        const today = DB.getToday();
        simDateInput.value = today.toISOString().split('T')[0];

        simDateInput.onchange = (e) => {
            const val = e.target.value;
            DB.setSimulatedToday(val);
            const newToday = DB.getToday();
            showToast(`ปรับเปลี่ยนเวลาจำลองของระบบเป็น: ${newToday.toLocaleDateString('th-TH')}`, 'info');
            
            // Re-render active view
            const activeLink = document.querySelector('.nav-link.active');
            if (activeLink) {
                renderViewData(activeLink.dataset.view);
            }
        };
    }

    // Check existing session
    const savedSession = localStorage.getItem('lib_session');
    if (savedSession) {
        const user = JSON.parse(savedSession);
        // Verify user still exists
        const actualUser = DB.users.getById(user.id);
        if (actualUser && actualUser.status === 'active') {
            loginUser(actualUser);
        } else {
            localStorage.removeItem('lib_session');
            navigateTo('login');
        }
    } else {
        navigateTo('login');
    }

    // ─────────────────────────────────────────────────────────────────
    // 2. GLOBAL BADGES & BADGES ON SIDEBAR
    // ─────────────────────────────────────────────────────────────────
    function updateGlobalBadges() {
        if (!currentUser) return;

        // 1. My Borrows count
        const borrows = DB.borrow.getActive(currentUser.id);
        const borrowCountBadge = document.getElementById('borrow-count');
        if (borrows.length > 0) {
            borrowCountBadge.innerText = borrows.length;
            borrowCountBadge.style.display = 'inline-flex';
        } else {
            borrowCountBadge.style.display = 'none';
        }

        // 2. Unread notifications count
        const unread = DB.alerts.getUnread(currentUser.id);
        const notifCountBadge = document.getElementById('notif-count');
        const topbarNotifDot = document.getElementById('notif-dot');
        if (unread.length > 0) {
            notifCountBadge.innerText = unread.length;
            notifCountBadge.style.display = 'inline-flex';
            topbarNotifDot.style.display = 'block';
        } else {
            notifCountBadge.style.display = 'none';
            topbarNotifDot.style.display = 'none';
        }

        // 3. Escalated alert count (Teacher only)
        if (currentUser.role === 'teacher') {
            const escalated = DB.alerts.getEscalated();
            const escalatedCountBadge = document.getElementById('escalated-count');
            if (escalated.length > 0) {
                escalatedCountBadge.innerText = escalated.length;
                escalatedCountBadge.style.display = 'inline-flex';
            } else {
                escalatedCountBadge.style.display = 'none';
            }
        }
    }

    // Shortcut: Click bell on topbar goes to Notifications page
    document.getElementById('topbar-notif').onclick = () => {
        navigateTo('notifications');
    };


    // ─────────────────────────────────────────────────────────────────
    // 3. RENDER DATA FOR SPECIFIC VIEWS
    // ─────────────────────────────────────────────────────────────────
    function renderViewData(viewName) {
        updateGlobalBadges();

        if (viewName === 'dashboard') {
            renderDashboard();
        } else if (viewName === 'catalog') {
            renderCatalog();
        } else if (viewName === 'my-borrows') {
            renderMyBorrows();
        } else if (viewName === 'notifications') {
            renderNotifications();
        } else if (viewName === 'overdue-manage') {
            renderOverdueManage();
        }
    }

    // Counter Animation
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-num');
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.target) || 0;
            counter.innerText = '0';
            if (target === 0) return;
            
            let n = 0;
            const speed = 25; // ms
            const step = Math.ceil(target / 15) || 1; // count up in ~15 steps
            
            const timer = setInterval(() => {
                n += step;
                if (n >= target) {
                    n = target;
                    clearInterval(timer);
                }
                counter.innerText = n;
            }, speed);
        });
    }

    // ─── VIEW 1: DASHBOARD ───
    function renderDashboard() {
        const allBooks = DB.books.getAll();
        const activeBorrows = DB.borrow.getActive(currentUser.id);
        
        // Count overdue borrows for this user
        const today = DB.getToday();
        const overdueBorrows = activeBorrows.filter(b => new Date(b.dueDate) < today);

        // Count unread alerts for this user
        const unreadAlerts = DB.alerts.getUnread(currentUser.id);

        const elTotalBooks = document.getElementById('stat-total-books');
        const elMyBorrows = document.getElementById('stat-my-borrows');
        const elOverdue = document.getElementById('stat-overdue');
        const elAlerts = document.getElementById('stat-alerts');

        if (elTotalBooks) elTotalBooks.dataset.target = allBooks.length;
        if (elMyBorrows) elMyBorrows.dataset.target = activeBorrows.length;
        if (elOverdue) elOverdue.dataset.target = overdueBorrows.length;
        if (elAlerts) elAlerts.dataset.target = unreadAlerts.length;

        animateCounters();

        // Trigger reveal animations inside dashboard
        const reveals = document.querySelectorAll('#view-dashboard .reveal');
        setTimeout(() => {
            reveals.forEach(el => el.classList.add('show'));
        }, 80);

        // Sync simulated date input on dashboard load
        const simDateInput = document.getElementById('sim-date-input');
        if (simDateInput) {
            simDateInput.value = today.toISOString().split('T')[0];
        }

        // Render recent activities (last 5 borrows/returns)
        const recentActivityContainer = document.getElementById('recent-activity');
        recentActivityContainer.innerHTML = '';

        const allBorrows = DB.borrow.getAll();
        const myBorrowsHistory = allBorrows.filter(b => b.userId === currentUser.id);

        // Sort by borrowDate desc
        myBorrowsHistory.sort((a, b) => new Date(b.borrowDate) - new Date(a.borrowDate));

        const displayHistory = myBorrowsHistory.slice(0, 5);

        if (displayHistory.length === 0) {
            recentActivityContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <p>ยังไม่มีประวัติการยืมหนังสือ</p>
                </div>`;
            return;
        }

        displayHistory.forEach(record => {
            const book = DB.books.getById(record.bookId);
            if (!book) return;

            const isReturned = record.returnDate !== null;
            const isOverdue = !isReturned && new Date(record.dueDate) < today;

            let iconClass = 'borrow';
            let iconText = '📖';
            let statusText = 'ยืมแล้ว';
            
            if (isReturned) {
                iconClass = 'return';
                iconText = '✅';
                statusText = 'คืนแล้ว';
            } else if (isOverdue) {
                iconClass = 'overdue';
                iconText = '⚠️';
                statusText = 'เกินกำหนดคืน';
            }

            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="activity-icon ${iconClass}">${iconText}</div>
                <div class="activity-content">
                    <div class="activity-text">
                        คุณทำการ <strong>${statusText}</strong> หนังสือ <strong>「${book.title}」</strong>
                    </div>
                    <div class="activity-time">
                        ${new Date(record.borrowDate).toLocaleDateString('th-TH')} 
                        ${isReturned ? `(คืนเมื่อ: ${new Date(record.returnDate).toLocaleDateString('th-TH')})` : `(กำหนดคืน: ${new Date(record.dueDate).toLocaleDateString('th-TH')})`}
                    </div>
                </div>
            `;
            recentActivityContainer.appendChild(item);
        });
    }

    // ─── VIEW 2: BOOK CATALOG ───
    let currentCategoryFilter = '';
    let currentSearchQuery = '';

    function renderCatalog() {
        const grid = document.getElementById('book-grid');
        grid.innerHTML = '';

        const books = DB.books.getAll();
        
        // Get categories for filter dropdown
        const categories = [...new Set(books.map(b => b.category))];
        const categoryFilterDropdown = document.getElementById('category-filter');
        
        // Preserve selection
        const prevSelect = categoryFilterDropdown.value;
        categoryFilterDropdown.innerHTML = '<option value="">ทุกหมวดหมู่</option>';
        categories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.innerText = cat;
            categoryFilterDropdown.appendChild(opt);
        });
        categoryFilterDropdown.value = prevSelect;

        // Filter & Search logic
        const filteredBooks = books.filter(b => {
            const matchesCategory = !currentCategoryFilter || b.category === currentCategoryFilter;
            const matchesSearch = !currentSearchQuery || 
                b.title.toLowerCase().includes(currentSearchQuery.toLowerCase()) || 
                b.author.toLowerCase().includes(currentSearchQuery.toLowerCase()) ||
                b.isbn.includes(currentSearchQuery);
            return matchesCategory && matchesSearch;
        });

        if (filteredBooks.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1;" class="empty-state">
                    <div class="empty-icon">🔍</div>
                    <p>ไม่พบหนังสือตามเงื่อนไขที่ระบุ</p>
                </div>`;
            return;
        }

        filteredBooks.forEach(book => {
            const card = document.createElement('div');
            card.className = 'book-card';
            
            // Map category to color strip class
            let stripClass = 'default';
            if (book.category.includes('โปรแกรม') || book.category.includes('ฐานข้อมูล')) stripClass = 'technology';
            else if (book.category.includes('คณิต')) stripClass = 'education';
            else if (book.category.includes('ฟิสิกส์') || book.category.includes('เคมี')) stripClass = 'science';
            else if (book.category.includes('ภาษา')) stripClass = 'arts';

            card.innerHTML = `
                <div class="book-card-strip" style="background-color: ${book.coverColor || '#6366f1'}"></div>
                <div class="book-card-body">
                    <span class="book-card-category">${book.category}</span>
                    <h4 class="book-card-title">${book.title}</h4>
                    <p class="book-card-author">ผู้แต่ง: ${book.author}</p>
                    
                    <div class="book-card-meta">
                        <span class="book-card-isbn">ISBN: ${book.isbn}</span>
                        <div class="book-card-availability">
                            <span class="badge-dot ${book.available ? 'available' : 'unavailable'}"></span>
                            <span>${book.available ? 'ว่างให้ยืม' : 'ถูกยืมอยู่'}</span>
                        </div>
                    </div>

                    <div class="book-card-footer">
                        ${book.available 
                            ? `<button class="btn btn-primary btn-block btn-borrow" data-id="${book.id}">ยืมหนังสือ</button>` 
                            : `<button class="btn btn-secondary btn-block" disabled>ไม่ว่างให้ยืม</button>`}
                    </div>
                </div>
            `;
            grid.appendChild(card);
        });

        // Set up borrow click handlers
        const borrowBtns = grid.querySelectorAll('.btn-borrow');
        borrowBtns.forEach(btn => {
            btn.onclick = () => {
                const bookId = btn.dataset.id;
                const book = DB.books.getById(bookId);
                
                // Show confirmation modal
                const returnDateStr = DB._daysFromNow(7);
                const returnDateObj = new Date(returnDateStr);
                
                showModal(
                    'ยืนยันการยืมหนังสือ',
                    `<p>คุณกำลังจะยืมหนังสือ <strong>「${book.title}」</strong></p>
                     <p>🗓️ กำหนดส่งคืนวันที่: <strong>${returnDateObj.toLocaleDateString('th-TH')}</strong> (7 วัน)</p>`,
                    [
                        { text: 'ยกเลิก', class: 'btn-secondary', onClick: () => closeModal() },
                        { 
                            text: 'ยืนยันการยืม', 
                            class: 'btn-primary',
                            onClick: () => {
                                // Create borrow record (directly modifies DB object)
                                DB.borrow.create({
                                    userId: currentUser.id,
                                    bookId: book.id,
                                    borrowDate: DB._todayISO(),
                                    dueDate: returnDateStr
                                });
                                
                                showSuccessModal(`ทำการยืมหนังสือ 「${book.title}」 เรียบร้อยแล้ว!<br>กรุณาส่งคืนภายในวันที่: ${returnDateObj.toLocaleDateString('th-TH')}`, () => {
                                    renderCatalog();
                                    updateGlobalBadges();
                                });
                            }
                        }
                    ]
                );
            };
        });
    }

    // Catalog input events
    document.getElementById('book-search').oninput = (e) => {
        currentSearchQuery = e.target.value;
        renderCatalog();
    };

    document.getElementById('category-filter').onchange = (e) => {
        currentCategoryFilter = e.target.value;
        renderCatalog();
    };


    // ─── VIEW 3: MY BORROWS ───
    function renderMyBorrows() {
        const container = document.getElementById('borrows-list');
        container.innerHTML = '';

        const activeBorrows = DB.borrow.getActive(currentUser.id);
        const today = DB.getToday();

        if (activeBorrows.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📭</div>
                    <h3>คุณไม่มีหนังสือที่ยืมค้างอยู่</h3>
                    <p>ค้นหาหนังสือที่คุณต้องการอ่านที่หน้า "รายการหนังสือ" แล้วกดยืมได้เลย</p>
                    <button class="btn btn-primary" style="margin-top: 15px;" onclick="document.querySelector('[data-view=catalog]').click()">ไปยืมหนังสือ</button>
                </div>`;
            return;
        }

        const listCard = document.createElement('div');
        listCard.className = 'card';
        listCard.innerHTML = `
            <div class="card-header">
                <h3>รายการหนังสือที่ต้องส่งคืน</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>หนังสือ</th>
                                <th>วันที่ยืม</th>
                                <th>วันครบกำหนด</th>
                                <th>สถานะ</th>
                                <th>การกระทำ</th>
                            </tr>
                        </thead>
                        <tbody id="borrows-tbody"></tbody>
                    </table>
                </div>
            </div>
        `;
        container.appendChild(listCard);

        const tbody = document.getElementById('borrows-tbody');
        
        activeBorrows.forEach(record => {
            const book = DB.books.getById(record.bookId);
            if (!book) return;

            const isOverdue = new Date(record.dueDate) < today;
            let statusBadge = '';
            let actionBtn = `<button class="btn btn-success btn-sm btn-return" data-id="${record.id}">คืนหนังสือ</button>`;

            if (isOverdue) {
                const diffTime = Math.abs(today - new Date(record.dueDate));
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                statusBadge = `<span class="badge badge-danger pulse">⚠️ เกินกำหนด ${diffDays} วัน</span>`;
            } else {
                statusBadge = `<span class="badge badge-success">ปกติ</span>`;
            }

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600; color:var(--text-primary);">${book.title}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">ผู้แต่ง: ${book.author}</div>
                </td>
                <td>${new Date(record.borrowDate).toLocaleDateString('th-TH')}</td>
                <td>${new Date(record.dueDate).toLocaleDateString('th-TH')}</td>
                <td>${statusBadge}</td>
                <td>${actionBtn}</td>
            `;
            tbody.appendChild(tr);
        });

        // Set up return click handlers
        const returnBtns = tbody.querySelectorAll('.btn-return');
        returnBtns.forEach(btn => {
            btn.onclick = () => {
                const borrowId = btn.dataset.id;
                const record = DB.borrow.getById(borrowId);
                const book = DB.books.getById(record.bookId);

                const today = DB.getToday();
                const dueDate = new Date(record.dueDate);
                const isOverdue = dueDate < today;
                let overdueWarningHtml = '';
                let daysLate = 0;

                if (isOverdue) {
                    const diffTime = Math.abs(today - dueDate);
                    daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    
                    if (daysLate > 7) {
                        overdueWarningHtml = `
                            <div class="alert alert-error" style="margin-top: 15px; border-left: 4px solid var(--accent-red); background: rgba(239, 68, 68, 0.1); color: var(--accent-red-light); flex-direction: column; align-items: flex-start; gap: 4px;">
                                <strong>⚠️ แจ้งเตือนอันตรายขั้นวิกฤต! (Critical Overdue)</strong>
                                <span>หนังสือเล่มนี้เลยกำหนดส่งคืนมาแล้ว <strong style="text-decoration: underline;">${daysLate} วัน</strong> (เกินเกณฑ์ยกระดับ 7 วัน)</span>
                                <span style="font-size: 0.8rem; color: #f87171; font-weight: 500;">* ระบบได้ทำรายการยกระดับเรื่องส่งอาจารย์ประจำวิชารับทราบแล้ว</span>
                            </div>`;
                    } else {
                        overdueWarningHtml = `
                            <div class="alert alert-warning" style="margin-top: 15px; border-left: 4px solid var(--accent-amber); background: rgba(245, 158, 11, 0.1); color: var(--accent-amber-light); flex-direction: column; align-items: flex-start; gap: 4px;">
                                <strong>⚠️ แจ้งเตือนเลยกำหนดส่งคืน! (Overdue Notice)</strong>
                                <span>หนังสือเล่มนี้เลยกำหนดส่งคืนมาแล้ว <strong style="text-decoration: underline;">${daysLate} วัน</strong></span>
                                <span style="font-size: 0.8rem; color: #fbbf24; font-weight: 500;">* กรุณาส่งคืนทันทีเพื่อหลีกเลี่ยงการยกระดับแจ้งเตือนเมื่อเกิน 7 วัน</span>
                            </div>`;
                    }
                }

                showModal(
                    'ยืนยันการคืนหนังสือ',
                    `<p>คุณต้องการที่จะทำการส่งคืนหนังสือ <strong>「${book.title}」</strong> หรือไม่?</p>
                     ${overdueWarningHtml}`,
                    [
                        { text: 'ยกเลิก', class: 'btn-secondary', onClick: () => closeModal() },
                        { 
                            text: 'ยืนยันการคืน', 
                            class: isOverdue ? (daysLate > 7 ? 'btn-danger' : 'btn-primary') : 'btn-success',
                            onClick: () => {
                                // Return Book (directly updates database)
                                DB.borrow.returnBook(borrowId);
                                
                                // Auto-resolve matching alerts
                                const matchingAlerts = DB.alerts.getByBorrowId(borrowId);
                                matchingAlerts.forEach(a => {
                                    DB.alerts.resolve(a.id);
                                });

                                let successMsg = `ส่งคืนหนังสือ 「${book.title}」 สำเร็จเรียบร้อยแล้ว!`;
                                if (isOverdue) {
                                    if (daysLate > 7) {
                                        successMsg = `ส่งคืนหนังสือ 「${book.title}」 สำเร็จ!<br><span style="color: var(--accent-red); font-weight: 700; display:block; margin-top:8px;">⚠️ แจ้งเตือน: คืนล่าช้าเกินกำหนด ${daysLate} วัน (ประวัติล่าช้าวิกฤตได้รับการส่งต่อให้อาจารย์เรียบร้อย)</span>`;
                                    } else {
                                        successMsg = `ส่งคืนหนังสือ 「${book.title}」 สำเร็จ!<br><span style="color: var(--accent-amber); font-weight: 700; display:block; margin-top:8px;">⚠️ หมายเหตุ: คืนล่าช้าเกินกำหนด ${daysLate} วัน</span>`;
                                    }
                                }

                                showSuccessModal(successMsg, () => {
                                    renderMyBorrows();
                                    updateGlobalBadges();
                                });
                            }
                        }
                    ]
                );
            };
        });
    }

    // ─── VIEW 4: NOTIFICATIONS ───
    function renderNotifications() {
        const container = document.getElementById('notif-list');
        container.innerHTML = '';

        const alerts = DB.alerts.getByUser(currentUser.id);

        if (alerts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🔔</div>
                    <h3>ยังไม่มีการแจ้งเตือน</h3>
                    <p>เมื่อหนังสือของคุณใกล้ถึงกำหนดส่ง หรือเลยกำหนดส่ง ระบบอัตโนมัติจะแจ้งเตือนคุณที่นี่</p>
                </div>`;
            return;
        }

        // Sort by date desc
        alerts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        alerts.forEach(alert => {
            const record = DB.borrow.getById(alert.borrowId);
            if (!record) return;
            const book = DB.books.getById(record.bookId);
            if (!book) return;

            const isUnread = alert.status === 'unread';
            const isResolved = alert.status === 'resolved';
            const isEscalated = alert.escalated;

            const card = document.createElement('div');
            
            // Notification card class based on status
            let cardClass = 'diagram-card card';
            if (isUnread) cardClass += ' expanded'; // auto expand if unread
            if (isEscalated && !isResolved) cardClass += ' overdue-danger-card';
            card.className = cardClass;
            
            // Build left border based on level
            let borderStyle = 'border-left: 4px solid var(--accent-blue);';
            if (isEscalated) borderStyle = 'border-left: 4px solid var(--accent-red);';
            if (isResolved) borderStyle = 'border-left: 4px solid var(--text-muted); opacity: 0.7;';

            // Custom note box text to replicate Note in diagram: {escalated: true, daysLate: int}
            const noteText = isEscalated 
                ? `<div class="note-box" style="margin-top: 10px; background: rgba(239, 68, 68, 0.08); border: 1px dashed rgba(239, 68, 68, 0.3); padding: 8px 12px; border-radius: var(--border-radius-sm); font-family: var(--font-mono); font-size: 0.75rem;">
                     📌 Note: { escalated: true, daysLate: ${alert.daysLate} }
                   </div>`
                : '';

            card.innerHTML = `
                <div class="card-header" style="${borderStyle} padding: 16px 20px; ${isEscalated && !isResolved ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
                    <div class="card-icon" style="font-size: 1.5rem; display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:50%; background:${isEscalated ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.1)'}; color:${isEscalated ? 'var(--accent-red)' : 'var(--accent-blue)'}">
                        ${isEscalated ? '🚨' : '📢'}
                    </div>
                    <div>
                        <div style="font-weight:700; display:flex; align-items:center; gap:8px; color:${isEscalated && !isResolved ? 'var(--accent-red-light)' : 'var(--text-primary)'}">
                            ${isEscalated && !isResolved ? '🚨 [ยกระดับแจ้งเตือนขั้นอันตราย]' : ''} แจ้งเตือนเลยกำหนดส่งคืน
                            ${isUnread ? '<span class="badge badge-danger btn-sm pulse">ยังไม่อ่าน</span>' : ''}
                            ${isResolved ? '<span class="badge badge-success btn-sm">ปิดการแจ้งเตือนแล้ว</span>' : ''}
                        </div>
                        <p class="card-subtitle">ส่งเมื่อ: ${new Date(alert.createdAt).toLocaleString('th-TH')}</p>
                    </div>
                    <div style="margin-left: auto; display:flex; gap: 8px;">
                        ${isUnread ? `<button class="btn btn-secondary btn-sm btn-read" data-id="${alert.id}">อ่านแล้ว</button>` : ''}
                    </div>
                </div>
                <div class="card-body" style="padding: 16px 20px; ${isEscalated && !isResolved ? 'background: rgba(239, 68, 68, 0.02);' : 'background: rgba(255,255,255,0.01);'}">
                    <p style="margin: 0; font-size:0.95rem; line-height: 1.6;">
                        หนังสือ <strong>「${book.title}」</strong> ของคุณ เลยกำหนดส่งคืนมาแล้วเป็นเวลา <strong style="color:${isEscalated ? 'var(--accent-red)' : 'var(--accent-amber)'}; font-size: 1.1rem; text-decoration: underline;">${alert.daysLate} วัน</strong> 
                        (วันกำหนดคืน: ${new Date(record.dueDate).toLocaleDateString('th-TH')})
                    </p>
                    <p style="margin-top: 8px; font-size:0.8rem; color:var(--text-secondary);">
                        📧 ระบบได้ทำการส่งอีเมลแจ้งเตือนถึงผู้ยืม (${currentUser.email}) สำเร็จ 
                        ${alert.notifiedAt ? `(เวลาส่ง: ${new Date(alert.notifiedAt).toLocaleTimeString('th-TH')})` : ''}
                    </p>
                    ${isEscalated && !isResolved
                        ? `<div style="margin-top: 12px; padding: 10px; border-radius: var(--border-radius-sm); border: 1px solid rgba(239, 68, 68, 0.2); background: rgba(239, 68, 68, 0.05); font-size:0.8rem; color:var(--accent-red-light); font-weight:600; line-height: 1.5;">
                            ⚠️ การแจ้งเตือนระดับอันตราย: ค้างส่งหนังสือเกินกำหนด 7 วันแล้ว! ระบบได้ดำเนินการส่งข้อมูลของคุณไปยังอาจารย์ประจำวิชารับทราบเรียบร้อยแล้ว
                           </div>` 
                        : ''}
                    ${noteText}
                </div>
            `;
            container.appendChild(card);
        });

        // Set up read click handlers
        const readBtns = container.querySelectorAll('.btn-read');
        readBtns.forEach(btn => {
            btn.onclick = () => {
                const alertId = btn.dataset.id;
                DB.alerts.markRead(alertId);
                showToast('ทำเครื่องหมายเป็นอ่านแล้ว', 'success');
                renderNotifications();
                updateGlobalBadges();
            };
        });
    }

    // ─── VIEW 5: OVERDUE MANAGEMENT (TEACHER) ───
    function renderOverdueManage() {
        if (currentUser.role !== 'teacher') return;

        const statsContainer = document.getElementById('overdue-stats');
        const escalated = DB.alerts.getEscalated();
        const unread = escalated.filter(a => a.status === 'unread');

        statsContainer.innerHTML = `
            <div class="stats-grid" style="margin-bottom: var(--space-xl)">
                <div class="stat-card stat-red" style="animation:none;">
                    <div class="stat-icon">🔺</div>
                    <div class="stat-value">${escalated.length}</div>
                    <div class="stat-label">เคสที่ยกระดับทั้งหมด (Escalated)</div>
                </div>
                <div class="stat-card stat-amber" style="animation:none;">
                    <div class="stat-icon">🔔</div>
                    <div class="stat-value">${unread.length}</div>
                    <div class="stat-label">เคสยังไม่รับทราบ</div>
                </div>
            </div>
        `;

        const tbody = document.getElementById('overdue-tbody');
        tbody.innerHTML = '';

        if (escalated.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px; color: var(--text-muted);">
                        🎉 ดีเยี่ยม! ไม่มีรายการหนังสือเลยกำหนดที่โดนยกระดับในขณะนี้
                    </td>
                </tr>`;
            return;
        }

        escalated.forEach(alert => {
            const record = DB.borrow.getById(alert.borrowId);
            if (!record) return;
            const book = DB.books.getById(record.bookId);
            if (!book) return;
            const student = DB.users.getById(alert.userId);
            if (!student) return;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div style="font-weight:600; color:var(--text-primary);">${student.fullName}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${student.email}</div>
                </td>
                <td>
                    <div style="font-weight:600; color:var(--text-primary);">${book.title}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">หมวดหมู่: ${book.category}</div>
                </td>
                <td>${new Date(record.borrowDate).toLocaleDateString('th-TH')}</td>
                <td>${new Date(record.dueDate).toLocaleDateString('th-TH')}</td>
                <td>
                    <strong style="color:var(--accent-red); font-size:1rem;">${alert.daysLate} วัน</strong>
                </td>
                <td>
                    <span class="badge badge-danger pulse">Escalated</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // ─────────────────────────────────────────────────────────────────
    // 4. SCHEDULER (AUTOMATIC OVERDUE CHECK)
    // ─────────────────────────────────────────────────────────────────
    const runSchedulerBtn = document.getElementById('run-scheduler-btn');
    const schedulerLog = document.getElementById('scheduler-log');

    runSchedulerBtn.onclick = () => {
        runSchedulerBtn.disabled = true;
        schedulerLog.style.display = 'block';
        schedulerLog.innerHTML = '🕒 [08:00:00] เริ่มต้นการตรวจสอบข้อมูลเกินกำหนดประจำวัน (Scheduler)...';

        setTimeout(() => {
            // STEP 2 in Diagram: SELECT * FROM borrow_records WHERE returnDate IS NULL
            const activeBorrows = DB.borrow.getAll().filter(b => b.returnDate === null);
            schedulerLog.innerHTML += `<br/>🔍 พบรายการยืมที่ยังไม่ได้คืนทั้งหมด: ${activeBorrows.length} รายการ`;

            let checked = 0;
            let notified = 0;
            let escalated = 0;
            const today = DB.getToday();

            activeBorrows.forEach(record => {
                // STEP 4 in Diagram: daysLate = today - dueDate
                const dueDate = new Date(record.dueDate);
                const diffTime = today - dueDate;
                const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                checked++;

                // STEP 5: daysLate > 0
                if (daysLate > 0) {
                    // Check if alert already exists for this borrow record
                    const existingAlert = DB.alerts.getByBorrowId(record.id);

                    if (existingAlert) {
                        // UPDATE daysLate
                        DB.alerts.update(existingAlert.id, { daysLate });
                        
                        // Check if notified today to prevent spam
                        const lastNotified = existingAlert.notifiedAt ? new Date(existingAlert.notifiedAt) : null;
                        const notifiedToday = lastNotified && lastNotified.toDateString() === today.toDateString();

                        if (!notifiedToday) {
                            // Send simulated email & update notifiedAt = now()
                            DB.alerts.update(existingAlert.id, { notifiedAt: today.toISOString() });
                            notified++;
                            
                            // Check if daysLate > 7 to escalate (nested alt in diagram)
                            if (daysLate > 7 && !existingAlert.escalated) {
                                DB.alerts.update(existingAlert.id, { escalated: true });
                                escalated++;
                            }
                        }
                    } else {
                        // INSERT INTO alerts (status='unread')
                        const newAlert = DB.alerts.create({
                            borrowId: record.id,
                            userId: record.userId,
                            daysLate
                        });

                        // Set notifiedAt
                        DB.alerts.update(newAlert.id, { notifiedAt: today.toISOString() });
                        notified++;

                        // Check if daysLate > 7 to escalate
                        if (daysLate > 7) {
                            DB.alerts.update(newAlert.id, { escalated: true });
                            escalated++;
                        }
                    }
                }
            });

            setTimeout(() => {
                schedulerLog.innerHTML += `<br/>✅ ตรวจสอบเรียบร้อย:`;
                schedulerLog.innerHTML += `<br/>├─ รายการที่ดึงมาตรวจ: ${checked} รายการ`;
                schedulerLog.innerHTML += `<br/>├─ ส่งแจ้งเตือนใหม่/อัปเดตวันนี้: ${notified} รายการ (ส่งอีเมลสำเร็จ)`;
                schedulerLog.innerHTML += `<br/>└─ ยกระดับเคส (Escalated > 7 วัน): ${escalated} รายการ`;
                schedulerLog.innerHTML += `<br/>🕗 [08:00:05] จบการทำงานของระบบอัตโนมัติประจำวัน`;
                
                runSchedulerBtn.disabled = false;
                
                showToast('ตรวจประวัติเกินกำหนดเสร็จสมบูรณ์!', 'success');
                renderViewData('dashboard');
            }, 1000);

        }, 1000);
    };


    // ─────────────────────────────────────────────────────────────────
    // 5. REGISTRATION FLOW (FUNCTION 1 DIAGRAM)
    // ─────────────────────────────────────────────────────────────────
    
    // Auth switching links
    document.getElementById('goto-register').onclick = (e) => {
        e.preventDefault();
        navigateTo('register');
    };

    document.getElementById('goto-login').onclick = (e) => {
        e.preventDefault();
        navigateTo('login');
    };

    // Auto-fill demo buttons
    const demoBtns = document.querySelectorAll('.demo-btn');
    demoBtns.forEach(btn => {
        btn.onclick = () => {
            document.getElementById('login-email').value = btn.dataset.email;
            document.getElementById('login-password').value = btn.dataset.pass;
        };
    });

    // Form inputs validation styling helpers
    function setFieldError(fieldId, errorText) {
        const errDiv = document.getElementById(`err-${fieldId}`);
        const input = document.getElementById(`reg-${fieldId}`);
        if (errorText) {
            errDiv.innerText = errorText;
            errDiv.style.display = 'block';
            input.classList.add('error');
        } else {
            errDiv.style.display = 'none';
            input.classList.remove('error');
        }
    }

    // 1. REGISTER LOGIC (Function 1 Activity & Sequence Diagrams)
    const registerForm = document.getElementById('register-form');
    registerForm.onsubmit = (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('reg-fullname').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirm = document.getElementById('reg-confirm').value;

        // Reset errors
        setFieldError('fullname', '');
        setFieldError('email', '');
        setFieldError('password', '');
        setFieldError('confirm', '');
        document.getElementById('register-error').style.display = 'none';

        let isValid = true;

        // Validation based on Activity diagram constraints
        if (!fullName) {
            setFieldError('fullname', 'กรุณากรอกชื่อ-นามสกุล');
            isValid = false;
        }

        // Email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setFieldError('email', 'กรุณากรอกรูปแบบอีเมลให้ถูกต้อง (เช่น user@domain.com)');
            isValid = false;
        }

        // Password length check
        if (password.length < 8) {
            setFieldError('password', 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร');
            isValid = false;
        }

        if (password !== confirm) {
            setFieldError('confirm', 'รหัสผ่านไม่ตรงกัน');
            isValid = false;
        }

        if (!isValid) return;

        // Step 3 in Sequence: SELECT * FROM users WHERE email = ?
        const existingUser = DB.users.getByEmail(email);
        
        // alt [email ซ้ำ]
        if (existingUser) {
            setFieldError('email', 'อีเมลนี้ถูกใช้งานในระบบแล้ว');
            document.getElementById('register-error').innerText = 'ลงทะเบียนไม่สำเร็จ: อีเมลซ้ำในระบบ';
            document.getElementById('register-error').style.display = 'block';
            showToast('ลงทะเบียนไม่สำเร็จ: อีเมลนี้มีในระบบแล้ว', 'error');
            return;
        }

        // Step 7: passwordHash = bcrypt(password)
        const passwordHash = DB.simpleHash(password);

        // Step 8: INSERT INTO users (status='pending')
        const newUser = DB.users.create({
            fullName,
            email,
            passwordHash,
            role: 'student',
            status: 'pending' // default pending status matching diagram
        });

        showToast('ลงทะเบียนเบื้องต้นสำเร็จ! กรุณายืนยันอีเมล', 'success');

        // Go to Email Verification View (Step 11 in Sequence)
        document.getElementById('verify-email-display').innerText = newUser.email;
        document.getElementById('verify-status').className = 'badge badge-warning';
        document.getElementById('verify-status').innerText = 'รอยืนยัน (pending)';
        document.getElementById('verify-btn').style.display = 'block';
        document.getElementById('verify-success').style.display = 'none';
        
        // Store temp ID on button for simulation verification
        document.getElementById('verify-btn').dataset.userid = newUser.id;

        navigateTo('verify');
    };

    // 2. EMAIL VERIFICATION SIMULATION (Sequence diagram steps 12-14)
    document.getElementById('verify-btn').onclick = () => {
        const userId = document.getElementById('verify-btn').dataset.userid;
        if (!userId) return;

        document.getElementById('verify-btn').disabled = true;
        document.getElementById('verify-btn').innerHTML = '⏳ กำลังยืนยัน...';

        setTimeout(() => {
            // Step 13 in Sequence: UPDATE users SET status='active' WHERE id = ?
            DB.users.update(userId, { status: 'active' });

            document.getElementById('verify-status').className = 'badge badge-success';
            document.getElementById('verify-status').innerText = 'เปิดใช้งานแล้ว (active)';
            document.getElementById('verify-btn').style.display = 'none';
            document.getElementById('verify-success').style.display = 'block';

            showToast('ยืนยันตัวตนสำเร็จ บัญชีเปิดใช้งานแล้ว!', 'success');

            setTimeout(() => {
                document.getElementById('verify-btn').disabled = false;
                document.getElementById('verify-btn').innerHTML = '✅ จำลองคลิกยืนยันอีเมล';
                
                // Auto login after verification
                const user = DB.users.getById(userId);
                loginUser(user);
            }, 1500);

        }, 1200);
    };

    // 3. LOGIN LOGIC
    const loginForm = document.getElementById('login-form');
    loginForm.onsubmit = (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');

        errorDiv.style.display = 'none';

        const user = DB.users.getByEmail(email);
        if (!user) {
            errorDiv.innerText = 'ไม่พบผู้ใช้ในระบบ หรืออีเมลไม่ถูกต้อง';
            errorDiv.style.display = 'block';
            showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
            return;
        }

        // Check password hash
        const passwordCorrect = DB.checkPassword(password, user.passwordHash);
        if (!passwordCorrect) {
            errorDiv.innerText = 'รหัสผ่านไม่ถูกต้อง';
            errorDiv.style.display = 'block';
            showToast('อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
            return;
        }

        // Check activation status matching diagram status constraint
        if (user.status !== 'active') {
            // Redirect back to verification for pending user
            document.getElementById('verify-email-display').innerText = user.email;
            document.getElementById('verify-status').className = 'badge badge-warning';
            document.getElementById('verify-status').innerText = 'รอยืนยัน (pending)';
            document.getElementById('verify-btn').style.display = 'block';
            document.getElementById('verify-success').style.display = 'none';
            document.getElementById('verify-btn').dataset.userid = user.id;

            showToast('บัญชีนี้ยังไม่ได้ยืนยันอีเมล!', 'warning');
            navigateTo('verify');
            return;
        }

        // Login success
        loginForm.reset();
        loginUser(user);
    };

    // 4. SCROLL REVEAL (IntersectionObserver)
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
});
