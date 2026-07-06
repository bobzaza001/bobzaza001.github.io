// ==========================================================================
// SCRIPT.JS — INTERACTIVE CLIENT LOGIC & ANIMATIONS (DIAGRAM VIEWER)
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {

    // ─────────────────────────────────────────────────────────────────
    // 1. MERMAID.JS INITIALIZATION
    // ─────────────────────────────────────────────────────────────────
    mermaid.initialize({
        startOnLoad: true,
        theme: 'dark',
        themeVariables: {
            darkMode: true,
            background: 'transparent',
            primaryColor: '#1e1b4b',
            primaryTextColor: '#eef2fb',
            primaryBorderColor: '#3b7bff',
            lineColor: '#8b5cf6',
            secondaryColor: '#0f172a',
            tertiaryColor: '#0b111e',
            noteBkgColor: '#1e1b4b',
            noteTextColor: '#c7d2fe',
            noteBorderColor: '#3b7bff',
            actorBkg: '#0b111e',
            actorBorder: '#3b7bff',
            actorTextColor: '#eef2fb',
            signalColor: '#eef2fb',
            signalTextColor: '#8b95ab',
            labelBoxBkgColor: '#0b111e',
            labelBoxBorderColor: '#3b7bff',
            labelTextColor: '#eef2fb',
            loopTextColor: '#c7d2fe',
            activationBorderColor: '#8b5cf6',
            activationBkgColor: '#1e1b4b',
            sequenceNumberColor: '#fff',
            fontFamily: '"Chakra Petch", "Sora", sans-serif',
            fontSize: '13px',
            altSectionBkgColor: 'rgba(59, 123, 255, 0.05)',
        },
        flowchart: {
            htmlLabels: true,
            curve: 'basis',
            padding: 16,
            nodeSpacing: 40,
            rankSpacing: 60,
            useMaxWidth: true,
        },
        sequence: {
            diagramMarginX: 20,
            diagramMarginY: 20,
            actorMargin: 60,
            width: 180,
            height: 50,
            boxMargin: 8,
            boxTextMargin: 8,
            noteMargin: 12,
            messageMargin: 40,
            mirrorActors: true,
            bottomMarginAdj: 5,
            useMaxWidth: true,
            rightAngles: false,
            showSequenceNumbers: true,
            wrap: true,
            wrapPadding: 12,
        },
    });

    // ─────────────────────────────────────────────────────────────────
    // 2. COUNTER ANIMATIONS FOR STATS
    // ─────────────────────────────────────────────────────────────────
    function animateCounters() {
        const counters = document.querySelectorAll('.stat-num');
        counters.forEach(counter => {
            const target = parseInt(counter.dataset.target) || 0;
            counter.innerText = '0';
            if (target === 0) return;

            let n = 0;
            const duration = 1200; // Total animation duration in ms
            const intervalTime = 30; // Step interval in ms
            const totalSteps = duration / intervalTime;
            const stepVal = Math.ceil(target / totalSteps) || 1;

            const timer = setInterval(() => {
                n += stepVal;
                if (n >= target) {
                    n = target;
                    clearInterval(timer);
                }
                counter.innerText = n + (target === 100 ? '%' : '+');
            }, intervalTime);
        });
    }

    // Trigger counters when stats enter viewport
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounters();
                statsObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    const statsGrid = document.querySelector('.stats-container');
    if (statsGrid) statsObserver.observe(statsGrid);

    // ─────────────────────────────────────────────────────────────────
    // 3. SCROLL REVEAL ANIMATIONS
    // ─────────────────────────────────────────────────────────────────
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('show');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // Manual load reveals for hero area elements
    const heroElements = document.querySelectorAll('.hero .line');
    setTimeout(() => {
        heroElements.forEach(el => el.classList.add('show'));
    }, 100);

    // ─────────────────────────────────────────────────────────────────
    // 4. DIAGRAM MODAL VIEW MANAGER
    // ─────────────────────────────────────────────────────────────────
    const modalOverlay = document.getElementById('diagram-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeBtn = document.getElementById('close-modal-btn');
    const modalTabs = document.querySelectorAll('.modal-tab');
    const diagramViews = document.querySelectorAll('.diagram-view');
    const viewButtons = document.querySelectorAll('.view-diagrams-btn');

    let activeFunc = 'func1'; // 'func1' or 'func2'
    let activeTab = 'usecase'; // 'usecase', 'activity', 'sequence'

    // Legends template generator
    const legends = {
        usecase: {
            func1: `
                <h4>ผู้เกี่ยวข้อง (Actors)</h4>
                <div class="legend-grid">
                    <div class="legend-item"><span class="dot" style="background:#5E35B1"></span>👤 ผู้สมัคร (Applicant) — กรอกข้อมูลและยืนยันตัวตน</div>
                    <div class="legend-item"><span class="dot" style="background:#1565C0"></span>📧 ระบบอีเมล — ส่งลิงก์ยืนยันตัวตนทางกล่องข้อความ</div>
                    <div class="legend-item"><span class="dot" style="background:#2E7D32"></span>⏰ ตัวจับเวลา (Scheduler) — ลบบัญชีรอยืนยันที่หมดอายุ</div>
                </div>`,
            func2: `
                <h4>ผู้เกี่ยวข้อง (Actors)</h4>
                <div class="legend-grid">
                    <div class="legend-item"><span class="dot" style="background:#7B1FA2"></span>⏰ ตัวจับเวลา — ตรวจสอบระบบอัตโนมัติประจำวัน</div>
                    <div class="legend-item"><span class="dot" style="background:#1565C0"></span>👤 ผู้ยืม — รับแจ้งเตือนเลยกำหนดและทำการส่งคืน</div>
                    <div class="legend-item"><span class="dot" style="background:#D84315"></span>👨‍🏫 อาจารย์ — รับรายละเอียดและตรวจสอบเคสระดับอันตราย</div>
                    <div class="legend-item"><span class="dot" style="background:#2E7D32"></span>📧 ระบบอีเมล — ดำเนินการส่งรายงานแจ้งเตือน</div>
                </div>`
        },
        activity: {
            func1: `
                <h4>คำอธิบายสัญลักษณ์</h4>
                <div class="legend-grid">
                    <div class="legend-item"><span class="dot" style="background:#000"></span>วงกลมดำ = จุดเริ่มต้น / จุดสิ้นสุด</div>
                    <div class="legend-item"><span class="dot" style="background:#FFC107"></span>เพชร = จุดตัดสินใจแยกเงื่อนไข (Decision)</div>
                    <div class="legend-item"><span class="dot" style="background:#2196F3"></span>กล่องฟ้า = การประมวลผลข้อมูลฐานข้อมูล (SQL)</div>
                    <div class="legend-item"><span class="dot" style="background:#4CAF50"></span>กล่องเขียว = ลอจิกการส่งอีเมลตอบกลับสำเร็จ</div>
                    <div class="legend-item"><span class="dot" style="background:#F44336"></span>กล่องแดง = กระบวนการแจ้งข้อผิดพลาด</div>
                </div>`,
            func2: `
                <h4>คำอธิบายสัญลักษณ์</h4>
                <div class="legend-grid">
                    <div class="legend-item"><span class="dot" style="background:#000"></span>วงกลมดำ = จุดเริ่มต้น / จุดสิ้นสุด</div>
                    <div class="legend-item"><span class="dot" style="background:#FFC107"></span>เพชร = จุดเช็คเงื่อนไขตรวจสอบ (Decision)</div>
                    <div class="legend-item"><span class="dot" style="background:#2196F3"></span>กล่องฟ้า = สร้างและบันทึกประวัติการแจ้งเตือน</div>
                    <div class="legend-item"><span class="dot" style="background:#4CAF50"></span>กล่องเขียว = ส่งอีเมลรายงานเตือนไปยังนักศึกษา</div>
                    <div class="legend-item"><span class="dot" style="background:#F44336"></span>กล่องแดง = ยกระดับแจ้งเตือนส่งต่อให้อาจารย์ประจำวิชา</div>
                </div>`
        },
        sequence: {
            func1: `
                <h4>คำอธิบายลำดับเวลา</h4>
                <div class="legend-grid">
                    <div class="legend-item"><span class="dot" style="background:#2196F3"></span>ลูกศรเส้นทึบ → = ส่งข้อความ/การเรียกใช้งาน APIs</div>
                    <div class="legend-item"><span class="dot" style="background:#9E9E9E"></span>ลูกศรเส้นประ ⟶ = การส่งข้อมูลกลับ (Return Data)</div>
                    <div class="legend-item"><span class="dot" style="background:#4CAF50"></span>กล่องครอบบน Lifeline = ช่วงที่วัตถุมีสถานะ Active</div>
                    <div class="legend-item"><span class="dot" style="background:#FF9800"></span>alt = แยกกรณีข้อมูลผ่านเกณฑ์ หรือเกิดข้อผิดพลาด</div>
                </div>`,
            func2: `
                <h4>คำอธิบายลำดับเวลา</h4>
                <div class="legend-grid">
                    <div class="legend-item"><span class="dot" style="background:#2196F3"></span>ลูกศรเส้นทึบ → = คำสั่งเรียกการประมวลผลระบบอัตโนมัติ</div>
                    <div class="legend-item"><span class="dot" style="background:#9E9E9E"></span>ลูกศรเส้นประ ⟶ = การคืนค่าความสำเร็จจากฐานข้อมูล</div>
                    <div class="legend-item"><span class="dot" style="background:#E91E63"></span>alt [daysLate > 7] = ยกระดับแจ้งเตือนส่งรายงานให้อาจารย์</div>
                </div>`
        }
    };

    // Open Modal logic
    viewButtons.forEach(btn => {
        btn.onclick = () => {
            activeFunc = btn.dataset.func;
            
            // Set Modal Title based on function
            if (activeFunc === 'func1') {
                modalTitle.innerText = '⚙️ แผนภาพระบบลงทะเบียนผู้ใช้งานใหม่ (User Registration)';
            } else {
                modalTitle.innerText = '🚨 แผนภาพระบบแจ้งเตือนอุปกรณ์เกินกำหนดคืน (Overdue Notification)';
            }

            // Reset active tab to usecase
            switchTab('usecase');
            
            // Open Modal Overlay
            modalOverlay.classList.add('active');
        };
    });

    // Close Modal logic
    function closeModal() {
        modalOverlay.classList.remove('active');
    }

    closeBtn.onclick = closeModal;
    
    // Close modal when clicking outside contents
    modalOverlay.onclick = (e) => {
        if (e.target === modalOverlay) closeModal();
    };

    // Tabs navigation inside modal
    modalTabs.forEach(tab => {
        tab.onclick = () => {
            const targetTab = tab.dataset.tab;
            switchTab(targetTab);
        };
    });

    // Helper to switch tabs and load pre-rendered diagrams
    function switchTab(tabName) {
        activeTab = tabName;

        // Sync tab buttons active state
        modalTabs.forEach(t => {
            if (t.dataset.tab === tabName) {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });

        // Hide all diagram view layers and show target
        diagramViews.forEach(v => {
            v.classList.remove('active');
        });
        const targetView = document.getElementById(`modal-view-${tabName}`);
        targetView.classList.add('active');

        // Fetch pre-rendered Mermaid SVG markup from hidden container
        const sourceId = `render-${activeFunc}-${tabName}`;
        const sourceElement = document.getElementById(sourceId);
        const targetContainer = document.getElementById(`${tabName}-svg-container`);

        if (sourceElement && targetContainer) {
            // Copy the rendered SVG contents directly
            targetContainer.innerHTML = sourceElement.innerHTML;
        }

        // Render dynamic legends
        const legendContainer = document.getElementById(`${tabName}-legend`);
        if (legendContainer && legends[tabName] && legends[tabName][activeFunc]) {
            legendContainer.innerHTML = legends[tabName][activeFunc];
        }
    }
});
