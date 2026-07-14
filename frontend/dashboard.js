// dashboard.js — FIXED VERSION
// Fixes: nav links no longer log out user (open in new tab),
//        timetable now shows uploaded image/PDF,
//        better error handling throughout

const TOKEN_KEY = 'samayak_token';
const ROLE_KEY  = 'samayak_role';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}
function getRole() {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY);
}

// ── Auth Guard ──
if (!getToken() || getRole() !== 'student') {
  window.location.href = 'login.html';
}

function logout() {
  [localStorage, sessionStorage].forEach(s => {
    s.removeItem(TOKEN_KEY); s.removeItem(ROLE_KEY); s.removeItem('samayak_user');
  });
  window.location.href = 'login.html';
}

// FIX 5: Prevent nav links from causing logout
// Public pages (Home, Features, Contact) open in new tab so session stays alive
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('nav .nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('dashboard') && !href.includes('login')) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener');
    }
  });
});

// ── Authenticated API GET ──
async function apiGet(endpoint) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    if (res.status === 401 || res.status === 403) { logout(); return null; }
    return await res.json();
  } catch {
    return { success: false, message: 'Unable to connect. Please check your connection.' };
  }
}

// ── Section navigation ──
const SECTIONS = ['overview','attendance','marks','timetable','notices','syllabus','profile'];
const TITLES   = {
  overview:'Overview', attendance:'Attendance', marks:'Marks & Results',
  timetable:'Timetable', notices:'Notices', syllabus:'Syllabus', profile:'My Profile'
};
let loadedSections = new Set();

function showSection(name) {
  SECTIONS.forEach(s => {
    document.getElementById(`section-${s}`)?.classList.toggle('active', s === name);
    document.getElementById(`nav-${s}`)?.classList.toggle('active', s === name);
  });
  const titleEl = document.getElementById('section-title');
  if (titleEl) titleEl.textContent = TITLES[name];
  document.getElementById('sidebar')?.classList.remove('open');
  if (!loadedSections.has(name)) {
    loadedSections.add(name);
    if (name === 'attendance') loadAttendance();
    if (name === 'marks')      loadMarks();
    if (name === 'timetable')  loadTimetable('Regular', document.querySelector('.tt-tab'));
    if (name === 'notices')    loadNotices(null, document.querySelector('.notice-filter-btn'));
    if (name === 'syllabus')   loadSyllabus();
    if (name === 'profile')    loadProfile();
  }
}
function toggleSidebar() { document.getElementById('sidebar')?.classList.toggle('open'); }

// ── Helpers ──
function attColor(pct) { return pct >= 85 ? 'green' : pct >= 75 ? 'yellow' : 'red'; }
function attBadgeClass(pct) { return pct === null ? 'badge-grey' : pct >= 85 ? 'badge-green' : pct >= 75 ? 'badge-yellow' : 'badge-red'; }
function attLabel(pct) { return pct === null ? 'No Data' : pct >= 85 ? 'Excellent' : pct >= 75 ? 'Good' : pct >= 65 ? 'Average' : 'Low'; }
function marksColor(pct) { return pct >= 75 ? 'badge-green' : pct >= 50 ? 'badge-yellow' : 'badge-red'; }
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }
function fmtTime(t) {
  if (!t) return '—';
  const [h,m] = t.split(':');
  const hr = parseInt(h);
  return `${hr > 12 ? hr-12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`;
}
function noticeDotColor(cat) {
  return { Exam:'#7c5cbf', Assignment:'#3b82f6', Holiday:'#3a8c5c', Event:'#f0b429', Urgent:'#e85d8a', General:'#3a8c5c' }[cat] || '#3a8c5c';
}
function noticeBadge(cat) {
  const m = { Exam:'badge-purple', Assignment:'badge-blue', Holiday:'badge-green', Event:'badge-yellow', Urgent:'badge-red', General:'badge-green' };
  return `<span class="badge ${m[cat]||'badge-green'}">${cat}</span>`;
}
function emptyState(icon, title, msg) {
  return `<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3">${icon}</svg><h4>${title}</h4><p>${msg}</p></div>`;
}

// ══════════════════════════════════════════
// INIT — load summary
// ══════════════════════════════════════════
window.addEventListener('load', async () => {
  const ts  = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const lbl = document.getElementById('last-updated-label');
  if (lbl) lbl.textContent = `Last loaded: ${ts}`;

  const res = await apiGet('/dashboard/summary');
  if (!res?.success) return;

  const { student, attendance, marks, notices } = res.data;
  const firstName = student.full_name.split(' ')[0];

  const greetEl = document.getElementById('nav-greeting');
  if (greetEl) greetEl.textContent = `Hi, ${firstName} 👋`;

  const sbName = document.getElementById('sb-name');
  const sbMeta = document.getElementById('sb-meta');
  if (sbName) sbName.textContent = student.full_name;
  if (sbMeta) sbMeta.innerHTML  = `${student.enrollment_no}<br/>${student.branch} · Sem ${student.semester}`;

  const attPct = attendance.overall;
  const statAtt = document.getElementById('stat-att');
  const statAttBadge = document.getElementById('stat-att-badge');
  if (statAtt) statAtt.textContent = attPct !== null ? `${attPct}%` : '—';
  if (statAttBadge) { statAttBadge.textContent = attLabel(attPct); statAttBadge.className = `sc-badge ${attBadgeClass(attPct)}`; }

  const statMarks = document.getElementById('stat-marks');
  if (statMarks) statMarks.textContent = marks.avg_percentage !== null ? `${marks.avg_percentage}%` : '—';

  const statNotices = document.getElementById('stat-notices');
  if (statNotices) statNotices.textContent = notices.total;

  const statSem = document.getElementById('stat-sem');
  const statBranch = document.getElementById('stat-branch');
  if (statSem)    statSem.textContent    = `Sem ${student.semester}`;
  if (statBranch) statBranch.textContent = student.branch;

  const nb = document.getElementById('notice-count');
  if (nb && notices.total > 0) { nb.textContent = notices.total; nb.style.display = 'inline'; }

  loadedSections.add('overview');
  loadOverviewAttendance();
  loadOverviewNotices();
});

// ── Overview attendance preview ──
async function loadOverviewAttendance() {
  const res  = await apiGet('/dashboard/attendance');
  const body = document.getElementById('overview-att-body');
  if (!body) return;
  if (!res?.success || !res.data.subjects.length) {
    body.innerHTML = emptyState('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>','No attendance data yet','Faculty will upload your attendance data via Excel. Check back soon.');
    return;
  }
  body.innerHTML = res.data.subjects.slice(0,5).map(s => {
    const pct   = parseFloat(s.percentage);
    const color = attColor(pct);
    return `<div class="prog-row">
      <div class="prog-meta">
        <span class="prog-label">${s.subject_name}<span class="sub-code">${s.subject_code}</span></span>
        <span class="prog-pct" style="color:${pct>=75?'var(--green-accent)':pct>=65?'#d4960a':'#e85d8a'}">${pct.toFixed(1)}%</span>
      </div>
      <div class="prog-track"><div class="prog-fill ${color}" style="width:${Math.min(pct,100)}%"></div></div>
    </div>`;
  }).join('');
}

// ── Overview notices preview ──
async function loadOverviewNotices() {
  const res  = await apiGet('/dashboard/notices?limit=3');
  const body = document.getElementById('overview-notices-body');
  if (!body) return;
  if (!res?.success || !res.data.length) {
    body.innerHTML = emptyState('<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>','No notices yet','Faculty announcements will appear here.');
    return;
  }
  body.innerHTML = res.data.map(n => `
    <div class="notice-item${n.is_pinned?' pinned':''}" onclick="openNoticeModal(${JSON.stringify(n).replace(/"/g,'&quot;')})">
      <div class="notice-dot" style="background:${noticeDotColor(n.category)}"></div>
      <div class="notice-content">
        <h4>${n.title}</h4>
        <p>${n.body.substring(0,120)}${n.body.length>120?'…':''}</p>
      </div>
      <div class="notice-meta">${noticeBadge(n.category)}<span class="notice-date">${fmtDate(n.created_at)}</span></div>
    </div>`).join('');
}

// ── Attendance section ──
async function loadAttendance() {
  const res  = await apiGet('/dashboard/attendance');
  const body = document.getElementById('att-body');
  if (!body) return;
  if (!res?.success || !res.data.subjects.length) {
    body.innerHTML = emptyState('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>','No attendance data yet','Your subject-wise attendance will appear here once faculty uploads the data.');
    return;
  }
  const { subjects, summary } = res.data;

  const summTotal    = document.getElementById('summ-total');
  const summAttended = document.getElementById('summ-attended');
  const summPct      = document.getElementById('summ-pct');
  if (summTotal)    summTotal.textContent    = summary.totalClasses;
  if (summAttended) summAttended.textContent = summary.totalAttended;
  if (summPct)      summPct.textContent      = summary.overallPct ? `${summary.overallPct}%` : '—';

  const badge = document.getElementById('att-overall-badge');
  if (badge) badge.innerHTML = `<span class="badge ${attBadgeClass(parseFloat(summary.overallPct))}">${summary.status}</span>`;

  body.innerHTML = subjects.map(s => {
    const pct    = parseFloat(s.percentage);
    const color  = attColor(pct);
    const lastUp = s.last_updated ? `Updated ${fmtDate(s.last_updated)}` : '';
    return `<div class="prog-row">
      <div class="prog-meta">
        <span class="prog-label">${s.subject_name}<span class="sub-code">${s.subject_code} · ${s.attended}/${s.total_classes}</span></span>
        <div style="display:flex;align-items:center;gap:10px;">
          <span class="badge ${attBadgeClass(pct)}">${attLabel(pct)}</span>
          <span class="prog-pct" style="font-size:1rem;color:${pct>=75?'var(--green-accent)':pct>=65?'#d4960a':'#e85d8a'}">${pct.toFixed(1)}%</span>
        </div>
      </div>
      <div class="prog-track"><div class="prog-fill ${color}" style="width:${Math.min(pct,100)}%"></div></div>
      <div style="font-size:0.7rem;color:var(--text-muted);margin-top:3px;text-align:right;">${lastUp}</div>
    </div>`;
  }).join('');
}

// ── Marks section ──
async function loadMarks() {
  const res  = await apiGet('/dashboard/marks');
  const body = document.getElementById('marks-body');
  if (!body) return;
  if (!res?.success || !res.data.length) {
    body.innerHTML = `<div style="padding:20px;">${emptyState('<path d="M4 20V8l8-4 8 4v12"/><rect x="9" y="12" width="6" height="8"/>','No marks uploaded yet','MST and internal marks will appear here once faculty uploads them.')}</div>`;
    return;
  }
  let html = '<table class="marks-table"><thead><tr><th>Subject</th><th>Exam Type</th><th>Marks</th><th>Max</th><th>%</th><th>Updated</th></tr></thead><tbody>';
  for (const subj of res.data) {
    html += `<tr class="subject-group"><td colspan="6">📘 ${subj.subject_name} (${subj.subject_code})</td></tr>`;
    for (const e of subj.exams) {
      const pct = parseFloat(e.percentage);
      html += `<tr><td></td><td><span class="badge badge-grey">${e.exam_type}</span></td><td><strong>${e.marks_obtained}</strong></td><td style="color:var(--text-muted);">${e.max_marks}</td><td><span class="badge ${marksColor(pct)}">${pct}%</span></td><td style="color:var(--text-muted);font-size:0.75rem;">${fmtDate(e.last_updated)}</td></tr>`;
    }
  }
  html += '</tbody></table>';
  body.innerHTML = html;
}

// ── FIX 2: Timetable — show uploaded image OR grid fallback ──
async function loadTimetable(type, clickedBtn) {
  if (clickedBtn) {
    document.querySelectorAll('.tt-tab').forEach(t => t.classList.remove('active'));
    clickedBtn.classList.add('active');
  }
  const body = document.getElementById('timetable-body');
  if (!body) return;
  body.innerHTML = '<div class="skeleton skel-line wide"></div>';

  const res = await apiGet(`/dashboard/timetable?type=${type}`);

  // Check if timetable was uploaded as image
  if (res?.success && res.data?.imageUrl) {
    body.innerHTML = `
      <div style="background:#fff;border:1px solid var(--border);border-radius:14px;overflow:hidden;">
        <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:0.85rem;font-weight:600;">${type} Timetable · Effective ${fmtDate(res.data.effective_from)}</span>
          <a href="${res.data.imageUrl}" download style="font-size:0.78rem;color:var(--green-accent);font-weight:600;text-decoration:none;">⬇ Download</a>
        </div>
        <div style="padding:16px;text-align:center;">
          ${res.data.imageUrl.endsWith('.pdf')
            ? `<iframe src="${res.data.imageUrl}" style="width:100%;height:500px;border:none;border-radius:8px;"></iframe>`
            : `<img src="${res.data.imageUrl}" style="max-width:100%;border-radius:8px;box-shadow:0 2px 12px rgba(0,0,0,0.1);" alt="Timetable"/>`
          }
        </div>
      </div>`;
    return;
  }

  // Fallback: grid-based timetable
  if (!res?.success || !res.data.timetable?.length) {
    body.innerHTML = emptyState(
      '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 14h2M14 14h2M8 18h2M14 18h2"/>',
      `No ${type} timetable uploaded yet`,
      'Faculty will upload the timetable soon.'
    );
    return;
  }

  body.innerHTML = res.data.timetable.map(day => `
    <div class="tt-day">
      <div class="tt-day-label">${day.day}</div>
      <div class="tt-periods">
        ${day.periods.map(p => p.subject_name
          ? `<div class="tt-period"><span class="time">${fmtTime(p.start_time)} – ${fmtTime(p.end_time)}</span><span class="subject">${p.subject_name}<span class="code">${p.subject_code}</span></span><span class="room">${p.room||'—'}</span></div>`
          : `<div class="tt-period tt-break">Break</div>`
        ).join('')}
      </div>
    </div>`).join('');
}

// ── Notices ──
async function loadNotices(category, clickedBtn) {
  if (clickedBtn) {
    document.querySelectorAll('.notice-filter-btn').forEach(b => b.classList.remove('active'));
    clickedBtn.classList.add('active');
  }
  const body = document.getElementById('notices-body');
  if (!body) return;
  body.innerHTML = '<div class="skeleton skel-line wide"></div>';

  const url = `/dashboard/notices?limit=50${category ? `&category=${category}` : ''}`;
  const res = await apiGet(url);

  if (!res?.success || !res.data.length) {
    body.innerHTML = emptyState(
      '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>',
      'No notices found',
      category ? `No ${category} notices at the moment.` : 'Faculty will post notices here.'
    );
    return;
  }

  body.innerHTML = res.data.map(n => `
    <div class="notice-item${n.is_pinned?' pinned':''}" onclick="openNoticeModal(${JSON.stringify(n).replace(/"/g,'&quot;')})">
      <div class="notice-dot" style="background:${noticeDotColor(n.category)}"></div>
      <div class="notice-content">
        <h4>${n.is_pinned?'📌 ':''}${n.title}</h4>
        <p>${n.body.substring(0,160)}${n.body.length>160?'…':''}</p>
        <div style="font-size:0.72rem;color:var(--text-muted);margin-top:6px;">By ${n.posted_by_name} · ${n.posted_by_designation}</div>
      </div>
      <div class="notice-meta">${noticeBadge(n.category)}<span class="notice-date">${fmtDate(n.created_at)}</span></div>
    </div>`).join('');
}

function openNoticeModal(n) {
  if (typeof n === 'string') n = JSON.parse(n);
  document.getElementById('notice-modal-content').innerHTML = `
    <div style="margin-bottom:16px;">${noticeBadge(n.category)}${n.is_pinned?'<span class="badge badge-yellow" style="margin-left:6px;">📌 Pinned</span>':''}</div>
    <h2 style="font-size:1.15rem;font-weight:700;margin-bottom:10px;">${n.title}</h2>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-bottom:18px;">
      By <strong>${n.posted_by_name}</strong> (${n.posted_by_designation}) · ${fmtDate(n.created_at)}
    </p>
    <hr style="border:none;border-top:1px solid var(--border);margin-bottom:18px;"/>
    <p style="font-size:0.9rem;line-height:1.75;white-space:pre-wrap;">${n.body}</p>`;
  document.getElementById('notice-modal').style.display = 'flex';
}
function closeNoticeModal() { document.getElementById('notice-modal').style.display = 'none'; }
document.getElementById('notice-modal')?.addEventListener('click', function(e) { if (e.target===this) closeNoticeModal(); });

// ── Syllabus ──
async function loadSyllabus() {
  const res  = await apiGet('/dashboard/syllabus');
  const body = document.getElementById('syllabus-body');
  if (!body) return;
  if (!res?.success || !res.data.length) {
    body.innerHTML = emptyState('<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>','No syllabus uploaded yet','Faculty will upload subject syllabi. They\'ll appear here.');
    return;
  }
  body.innerHTML = res.data.map(subj => `
    <div class="syllabus-group">
      <div class="syllabus-group-title">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--green-accent)" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        ${subj.subject_name} <span style="color:var(--text-muted);font-weight:400;">(${subj.subject_code})</span>
      </div>
      ${subj.files.map(f => `
        <div class="syllabus-file">
          <div class="sf-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
          <div class="sf-info">
            <div class="sf-title">${f.title}</div>
            <div class="sf-meta">${f.file_name} ${f.file_size_kb?`· ${f.file_size_kb} KB`:''} · By ${f.uploaded_by} · ${fmtDate(f.created_at)}</div>
          </div>
          <button class="sf-download" onclick="downloadSyllabus(${f.id}, '${f.file_name}')">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 16V4M8 12l4 4 4-4"/><rect x="4" y="18" width="16" height="2" rx="1"/></svg>
  Download
</button>
        </div>`).join('')}
    </div>`).join('');
}

// ── Profile ──
async function loadProfile() {
  const res  = await apiGet('/dashboard/profile');
  const body = document.getElementById('profile-body');
  if (!body) return;
  if (!res?.success) { body.innerHTML = '<p style="color:var(--text-muted);">Could not load profile.</p>'; return; }
  const s = res.data;
  body.innerHTML = `
    <div style="display:flex;gap:20px;align-items:center;flex-wrap:wrap;margin-bottom:28px;">
      <div style="width:72px;height:72px;background:var(--green-dark);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#a8c5b5" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
      </div>
      <div>
        <h2 style="font-size:1.3rem;font-weight:700;margin-bottom:4px;">${s.full_name}</h2>
        <p style="font-size:0.83rem;color:var(--text-muted);">${s.branch} Department · Semester ${s.semester}</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
      ${[['Enrollment Number',s.enrollment_no],['College Email',s.college_email],
         ['Branch',s.branch],['Semester',`Semester ${s.semester}`],
         ['Account Status',s.is_verified?'✅ Verified':'⚠️ Not Verified'],
         ['Member Since',fmtDate(s.created_at)]]
        .map(([label,val])=>`
          <div style="background:var(--cream);border:1px solid var(--border);border-radius:12px;padding:14px 16px;">
            <div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.4px;margin-bottom:5px;font-weight:600;">${label}</div>
            <div style="font-size:0.9rem;font-weight:600;">${val}</div>
          </div>`).join('')}
    </div>`;
}
// ── Syllabus download with auth token ──
async function downloadSyllabus(id, fileName) {
  try {
    const res = await fetch(`${API_BASE_URL}/dashboard/syllabus/download/${id}`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    });

    if (!res.ok) {
      alert('Download failed. Please try again.');
      return;
    }

    // Convert response to blob and trigger browser download
    const blob = await res.blob();
    const url  = window.URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  } catch (err) {
    alert('Download failed. Please check your connection.');
  }
}
