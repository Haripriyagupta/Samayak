// faculty-dashboard.js — FIXED VERSION
// Fixes: timetable replaced with image/PDF upload,
//        syllabus subject dropdown with add-new feature,
//        nav links no longer log out user

const TOKEN_KEY = 'samayak_token';
const ROLE_KEY  = 'samayak_role';

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}
function getRole() {
  return localStorage.getItem(ROLE_KEY) || sessionStorage.getItem(ROLE_KEY);
}

// ── Auth Guard ──
if (!getToken() || getRole() !== 'faculty') {
  window.location.href = 'login.html';
}

function logout() {
  [localStorage, sessionStorage].forEach(s => {
    s.removeItem(TOKEN_KEY); s.removeItem(ROLE_KEY); s.removeItem('samayak_user');
  });
  window.location.href = 'login.html';
}

// FIX 5: Nav links — open in same tab but preserve session
// The issue was that index.html/features.html don't check the token,
// so we override nav clicks to open those pages without clearing storage
document.addEventListener('DOMContentLoaded', () => {
  // These nav links are safe — they don't clear storage, just navigate
  // The fix is that dashboard pages should NOT have nav links to public pages
  // that redirect back. Instead show them in a new tab or handle gracefully.
  document.querySelectorAll('nav .nav-links a').forEach(link => {
    const href = link.getAttribute('href');
    if (href && !href.includes('dashboard') && !href.includes('login')) {
      link.setAttribute('target', '_blank'); // Open public pages in new tab
      link.setAttribute('rel', 'noopener');
    }
  });
});

// ── API helpers ──
async function apiFetch(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: { 'Authorization': `Bearer ${getToken()}`, ...(options.headers || {}) }
    });
    if (res.status === 401 || res.status === 403) { logout(); return null; }
    return await res.json();
  } catch { return { success: false, message: 'Unable to connect. Please check your connection.' }; }
}
async function apiGet(ep)         { return apiFetch(ep); }
async function apiPost(ep, data)  { return apiFetch(ep, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); }
async function apiDel(ep)         { return apiFetch(ep, { method:'DELETE' }); }
async function apiUpload(ep, fd)  { return apiFetch(ep, { method:'POST', body:fd }); }

// ── Section nav ──
const SECTIONS = ['overview','attendance','marks','notices','timetable','syllabus','log'];
const TITLES   = { overview:'Overview', attendance:'Upload Attendance', marks:'Upload Marks',
                   notices:'Post Notices', timetable:'Upload Timetable', syllabus:'Upload Syllabus', log:'Upload History' };
const loaded   = new Set();

function showSection(name) {
  SECTIONS.forEach(s => {
    document.getElementById(`section-${s}`)?.classList.toggle('active', s === name);
    document.getElementById(`nav-${s}`)?.classList.toggle('active', s === name);
  });
  document.getElementById('section-title').textContent = TITLES[name];
  document.getElementById('sidebar').classList.remove('open');
  if (!loaded.has(name)) { loaded.add(name); lazyLoad(name); }
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

function lazyLoad(name) {
  if (name === 'notices') loadMyNotices();
  if (name === 'log')     loadLog();
  if (name === 'syllabus') loadSylSubjects();
}

// ── Helpers ──
function fmtDate(ts) { return new Date(ts).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'}); }

function showResult(id, msg, type='success') {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `result-banner show ${type}`;
  setTimeout(() => el.classList.remove('show'), 7000);
}

function emptyState(msg) {
  return `<div class="empty-state" style="padding:32px 20px;text-align:center;color:var(--text-muted);"><p>${msg}</p></div>`;
}

// ══════════════════════════════════════════
// INIT — load profile
// ══════════════════════════════════════════
window.addEventListener('load', async () => {
  const ts = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
  const lbl = document.getElementById('last-updated-label');
  if (lbl) lbl.textContent = `Loaded: ${ts}`;

  const res = await apiGet('/faculty/profile');
  if (!res?.success) return;

  const { profile, stats } = res.data;
  const greeting = document.getElementById('nav-greeting');
  if (greeting) greeting.textContent = `Hi, ${profile.full_name.split(' ')[0]} 👋`;

  const sbName = document.getElementById('sb-name');
  const sbMeta = document.getElementById('sb-meta');
  if (sbName) sbName.textContent = profile.full_name;
  if (sbMeta) sbMeta.innerHTML  = `${profile.department} · ${profile.designation}`;

  const els = { 'stat-att': stats.attendance_uploads, 'stat-marks': stats.marks_uploads,
                'stat-notices': stats.notices_posted, 'stat-dept': profile.department };
  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });

  loaded.add('overview');
  loadOverviewLog();
});

// ── Overview log ──
async function loadOverviewLog() {
  const res  = await apiGet('/faculty/upload-log');
  const body = document.getElementById('overview-log-body');
  if (!body) return;
  if (!res?.success || !res.data.length) { body.innerHTML = emptyState('No uploads yet. Use the sidebar to get started.'); return; }
  body.innerHTML = res.data.slice(0,5).map(logRow).join('');
}

function logRow(item) {
  const colors = { attendance:'#e6f4ee:#3a8c5c', marks:'#ede8fa:#7c5cbf', timetable:'#e0eeff:#3b82f6' };
  const [bg, stroke] = (colors[item.upload_type] || '#f0efea:#5a5a5a').split(':');
  const badge = item.status === 'confirmed'
    ? '<span class="badge badge-green">Confirmed</span>'
    : '<span class="badge badge-red">Failed</span>';
  return `<div class="log-item">
    <div class="log-icon" style="background:${bg};">
      <svg viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8"><path d="M12 16V4M8 12l4-4 4 4"/><rect x="4" y="18" width="16" height="2" rx="1"/></svg>
    </div>
    <div class="log-info">
      <div class="log-name">${item.file_name}</div>
      <div class="log-meta">${item.upload_type} · ${item.rows_processed} saved · ${fmtDate(item.created_at)}</div>
    </div>
    <div class="log-status">${badge}</div>
  </div>`;
}

// ══════════════════════════════════════════
// ATTENDANCE UPLOAD (unchanged logic)
// ══════════════════════════════════════════
let attUploadKey = null;

function handleAttFile(input) {
  if (!input.files[0]) return;
  const fn = document.getElementById('att-filename');
  fn.textContent = '📎 ' + input.files[0].name;
  fn.style.display = 'block';
  document.getElementById('att-preview-btn').disabled = false;
}

async function uploadAttendance() {
  const semester = document.getElementById('att-semester').value;
  const file     = document.getElementById('att-file').files[0];
  if (!semester) { showResult('att-result','Please select a semester first.','error'); return; }
  if (!file)     { showResult('att-result','Please select an Excel file.','error'); return; }

  const btn = document.getElementById('att-preview-btn');
  btn.disabled = true; btn.textContent = 'Parsing…';

  const fd = new FormData(); fd.append('file', file);
  const res = await apiUpload('/faculty/upload/attendance', fd);
  btn.disabled = false; btn.textContent = 'Preview Data';

  if (!res?.success) { showResult('att-result', res?.message || 'Upload failed.', 'error'); return; }

  attUploadKey = res.uploadKey;
  document.getElementById('att-preview-msg').textContent  = `Preview: ${res.totalRows} rows found`;
  document.getElementById('att-preview-meta').textContent = `Showing first 50 · Confirm to save all ${res.totalRows}`;

  document.getElementById('att-preview-body').innerHTML = res.preview.map(r => `
    <tr class="${r.found ? '' : 'row-error'}">
      <td>${r.found ? '✅' : '⚠️'}</td>
      <td>${r.enrollment_no}</td>
      <td>${r.student_name}</td>
      <td>${r.subject_code}</td>
      <td>${r.total_classes}</td>
      <td>${r.attended}</td>
      <td><span class="badge ${parseFloat(r.percentage)>=75?'badge-green':parseFloat(r.percentage)>=65?'badge-yellow':'badge-red'}">${r.percentage}%</span></td>
    </tr>`).join('');

  document.getElementById('att-preview-wrap').classList.add('show');
}

async function confirmAttendance() {
  const semester = document.getElementById('att-semester').value;
  if (!attUploadKey) return;
  const btn = document.getElementById('att-confirm-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const res = await apiPost('/faculty/upload/attendance/confirm', { uploadKey: attUploadKey, semester });
  btn.disabled = false; btn.textContent = '✓ Confirm & Save';
  if (res?.success) {
    showResult('att-result', `✅ ${res.message}`, 'success');
    cancelUpload('att'); attUploadKey = null;
  } else {
    showResult('att-result', res?.message || 'Save failed.', 'error');
  }
}

function cancelUpload(prefix) {
  document.getElementById(`${prefix}-preview-wrap`)?.classList.remove('show');
  const fileEl = document.getElementById(`${prefix}-file`);
  if (fileEl) fileEl.value = '';
  const fnEl = document.getElementById(`${prefix}-filename`);
  if (fnEl) fnEl.style.display = 'none';
  const btnEl = document.getElementById(`${prefix}-preview-btn`);
  if (btnEl) btnEl.disabled = true;
  if (prefix === 'att')   attUploadKey = null;
  if (prefix === 'marks') marksUploadKey = null;
}

// ══════════════════════════════════════════
// MARKS UPLOAD (unchanged logic)
// ══════════════════════════════════════════
let marksUploadKey = null;

function handleMarksFile(input) {
  if (!input.files[0]) return;
  const fn = document.getElementById('marks-filename');
  fn.textContent = '📎 ' + input.files[0].name;
  fn.style.display = 'block';
  document.getElementById('marks-preview-btn').disabled = false;
}

async function uploadMarks() {
  const semester = document.getElementById('marks-semester').value;
  const file     = document.getElementById('marks-file').files[0];
  if (!semester) { showResult('marks-result','Please select a semester first.','error'); return; }
  if (!file)     { showResult('marks-result','Please select an Excel file.','error'); return; }

  const btn = document.getElementById('marks-preview-btn');
  btn.disabled = true; btn.textContent = 'Parsing…';
  const fd = new FormData(); fd.append('file', file);
  const res = await apiUpload('/faculty/upload/marks', fd);
  btn.disabled = false; btn.textContent = 'Preview Data';

  if (!res?.success) { showResult('marks-result', res?.message || 'Upload failed.', 'error'); return; }

  marksUploadKey = res.uploadKey;
  document.getElementById('marks-preview-msg').textContent  = `Preview: ${res.totalRows} rows found`;
  document.getElementById('marks-preview-meta').textContent = `Showing first 50`;

  document.getElementById('marks-preview-body').innerHTML = res.preview.map(r => `
    <tr class="${!r.found || !r.exam_type_valid ? 'row-error' : ''}">
      <td>${r.found && r.exam_type_valid ? '✅' : '⚠️'}</td>
      <td>${r.enrollment_no}</td>
      <td>${r.student_name}</td>
      <td>${r.subject_code}</td>
      <td><span class="badge badge-grey">${r.exam_type}${!r.exam_type_valid?' ⚠':''}</span></td>
      <td>${r.marks_obtained}</td>
      <td>${r.max_marks}</td>
      <td><span class="badge ${parseFloat(r.percentage)>=75?'badge-green':parseFloat(r.percentage)>=50?'badge-yellow':'badge-red'}">${r.percentage}%</span></td>
    </tr>`).join('');

  document.getElementById('marks-preview-wrap').classList.add('show');
}

async function confirmMarks() {
  const semester = document.getElementById('marks-semester').value;
  if (!marksUploadKey) return;
  const btn = document.getElementById('marks-confirm-btn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const res = await apiPost('/faculty/upload/marks/confirm', { uploadKey: marksUploadKey, semester });
  btn.disabled = false; btn.textContent = '✓ Confirm & Save';
  if (res?.success) {
    showResult('marks-result', `✅ ${res.message}`, 'success');
    cancelUpload('marks');
  } else {
    showResult('marks-result', res?.message || 'Save failed.', 'error');
  }
}

// ══════════════════════════════════════════
// NOTICES
// ══════════════════════════════════════════
async function postNotice() {
  const title     = document.getElementById('notice-title').value.trim();
  const body      = document.getElementById('notice-body').value.trim();
  const category  = document.getElementById('notice-category').value;
  const semester  = document.getElementById('notice-semester').value || null;
  const is_pinned = document.getElementById('notice-pinned').checked;

  if (!title || !body) { showResult('notice-result','Title and body are required.','error'); return; }

  const res = await apiPost('/faculty/notices', { title, body, category, semester, is_pinned });
  if (res?.success) {
    showResult('notice-result','✅ Notice posted successfully!','success');
    document.getElementById('notice-title').value = '';
    document.getElementById('notice-body').value  = '';
    document.getElementById('notice-pinned').checked = false;
    loadMyNotices();
  } else {
    showResult('notice-result', res?.message || 'Failed to post notice.', 'error');
  }
}

async function loadMyNotices() {
  const res  = await apiGet('/faculty/notices');
  const body = document.getElementById('my-notices-body');
  if (!body) return;
  if (!res?.success || !res.data.length) { body.innerHTML = emptyState('No notices posted yet.'); return; }
  body.innerHTML = res.data.map(n => `
    <div class="notice-item" style="padding:12px 16px;border-bottom:1px solid var(--border);display:flex;align-items:flex-start;gap:12px;">
      <div style="flex:1;">
        <div style="font-size:0.88rem;font-weight:700;margin-bottom:2px;">${n.is_pinned?'📌 ':''}${n.title}</div>
        <div style="font-size:0.74rem;color:var(--text-muted);">
          <span class="badge ${catBadge(n.category)}">${n.category}</span>
          &nbsp;${n.semester ? 'Sem ' + n.semester : 'All Sems'} · ${fmtDate(n.created_at)}
        </div>
      </div>
      <button onclick="deleteNotice(${n.id}, this)"
        style="background:none;border:none;color:#e85d8a;cursor:pointer;font-size:0.8rem;font-weight:700;padding:4px 8px;border-radius:6px;">
        Delete
      </button>
    </div>`).join('');
}

function catBadge(cat) {
  const m = { Exam:'badge-purple', Assignment:'badge-blue', Holiday:'badge-green',
              Event:'badge-yellow', Urgent:'badge-red', General:'badge-green' };
  return m[cat] || 'badge-grey';
}

async function deleteNotice(id, btn) {
  if (!confirm('Delete this notice?')) return;
  btn.textContent = '…';
  const res = await apiDel(`/faculty/notices/${id}`);
  if (res?.success) loadMyNotices();
  else { btn.textContent = 'Delete'; alert(res?.message || 'Delete failed.'); }
}

// ══════════════════════════════════════════
// FIX 2: TIMETABLE — replaced grid builder with image/PDF upload
// ══════════════════════════════════════════
function handleTimetableFile(input) {
  if (!input.files[0]) return;
  const fn = document.getElementById('tt-filename');
  fn.textContent = '📎 ' + input.files[0].name;
  fn.style.display = 'block';
  document.getElementById('tt-upload-btn').disabled = false;
}

async function uploadTimetableImage() {
  const semester       = document.getElementById('tt-semester').value;
  const type           = document.getElementById('tt-type').value;
  const effective_from = document.getElementById('tt-date').value;
  const file           = document.getElementById('tt-image-file').files[0];

  if (!semester)       { showResult('tt-result','Please select a semester.','error'); return; }
  if (!effective_from) { showResult('tt-result','Please set effective date.','error'); return; }
  if (!file)           { showResult('tt-result','Please select a file.','error'); return; }

  const btn = document.getElementById('tt-upload-btn');
  btn.disabled = true; btn.textContent = 'Uploading…';

  const fd = new FormData();
  fd.append('file', file);
  fd.append('semester', semester);
  fd.append('type', type);
  fd.append('effective_from', effective_from);

  const res = await apiUpload('/faculty/upload/timetable-image', fd);
  btn.disabled = false; btn.textContent = 'Upload Timetable →';

  if (res?.success) {
    showResult('tt-result','✅ Timetable uploaded! Students can now view it.','success');
    document.getElementById('tt-image-file').value = '';
    document.getElementById('tt-filename').style.display = 'none';
    btn.disabled = true;
  } else {
    showResult('tt-result', res?.message || 'Upload failed.', 'error');
  }
}

// ══════════════════════════════════════════
// FIX 3: SYLLABUS — with add-new-subject feature
// ══════════════════════════════════════════
let allSubjects = [];

async function loadSylSubjects() {
  const semEl = document.getElementById('syl-semester');
  if (!semEl) return;
  const semester = semEl.value;
  const select   = document.getElementById('syl-subject');

  if (!semester) {
    select.innerHTML = '<option value="">Select semester first</option>';
    return;
  }

  const res = await apiGet(`/faculty/subjects?semester=${semester}`);
  allSubjects = res?.data || [];

  select.innerHTML = '<option value="">Select subject</option>' +
    allSubjects.map(s => `<option value="${s.id}">${s.name} (${s.code})</option>`).join('') +
    '<option value="__new__">➕ Add New Subject…</option>';
}

// Called when subject dropdown changes
function onSubjectChange() {
  const val = document.getElementById('syl-subject').value;
  const newSubjectRow = document.getElementById('new-subject-row');
  if (val === '__new__') {
    newSubjectRow.style.display = 'block';
  } else {
    newSubjectRow.style.display = 'none';
  }
}

async function addNewSubject() {
  const name     = document.getElementById('new-subject-name').value.trim();
  const code     = document.getElementById('new-subject-code').value.trim().toUpperCase();
  const semester = document.getElementById('syl-semester').value;
  const credits  = document.getElementById('new-subject-credits').value || 4;

  if (!name || !code)  { alert('Subject name and code are required.'); return; }
  if (!semester)       { alert('Please select a semester first.'); return; }

  const res = await apiPost('/faculty/subjects/add', { name, code, semester, credits, branch: 'CSIT' });
  if (res?.success) {
    alert(`✅ Subject "${name}" added!`);
    document.getElementById('new-subject-name').value    = '';
    document.getElementById('new-subject-code').value    = '';
    document.getElementById('new-subject-row').style.display = 'none';
    await loadSylSubjects();
    // Select the newly added subject
    const select = document.getElementById('syl-subject');
    for (let i = 0; i < select.options.length; i++) {
      if (select.options[i].text.includes(code)) { select.selectedIndex = i; break; }
    }
  } else {
    alert(res?.message || 'Failed to add subject.');
  }
}

function handleSylFile(input) {
  if (!input.files[0]) return;
  const fn = document.getElementById('syl-filename');
  fn.textContent = '📎 ' + input.files[0].name;
  fn.style.display = 'block';
}

async function uploadSyllabus() {
  const semester   = document.getElementById('syl-semester').value;
  const subject_id = document.getElementById('syl-subject').value;
  const title      = document.getElementById('syl-title').value.trim();
  const file       = document.getElementById('syl-file').files[0];

  if (!semester)             { showResult('syl-result','Please select a semester.','error'); return; }
  if (!subject_id || subject_id === '__new__') { showResult('syl-result','Please select a subject.','error'); return; }
  if (!title)                { showResult('syl-result','Please enter a document title.','error'); return; }
  if (!file)                 { showResult('syl-result','Please select a file.','error'); return; }

  const fd = new FormData();
  fd.append('file', file);
  fd.append('subject_id', subject_id);
  fd.append('title', title);

  const res = await apiUpload('/faculty/upload/syllabus', fd);
  if (res?.success) {
    showResult('syl-result','✅ Document uploaded! Students can now download it.','success');
    document.getElementById('syl-title').value = '';
    document.getElementById('syl-file').value  = '';
    document.getElementById('syl-filename').style.display = 'none';
  } else {
    showResult('syl-result', res?.message || 'Upload failed.', 'error');
  }
}

// ══════════════════════════════════════════
// UPLOAD LOG
// ══════════════════════════════════════════
async function loadLog() {
  const res  = await apiGet('/faculty/upload-log');
  const body = document.getElementById('log-body');
  if (!body) return;
  if (!res?.success || !res.data.length) { body.innerHTML = emptyState('No uploads yet.'); return; }
  body.innerHTML = res.data.map(logRow).join('');
}
