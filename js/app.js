/* VITALIS v2 — app.js */

// ── ESTADO GLOBAL ─────────────────────────────────────────────
let currentUser    = null;
let currentProf    = null;
let currentStudent = null;
let currentAssessment = null;
let currentWorkout = null;
let allStudents    = [];
let allAssessments = [];
let fd = {};
let step = 1;
const TOTAL = 9;

// ── TEMA ──────────────────────────────────────────────────────
const moonSVG = '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>';
const sunSVG  = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

// ── INIT ──────────────────────────────────────────────────────
(async function init() {
  initTheme();

  // Esconde todas as views imediatamente — evita flash de tela errada durante carregamento
  document.getElementById('view-auth')?.classList.add('hide');
  document.getElementById('view-dash')?.classList.add('hide');
  document.getElementById('view-assessment')?.classList.add('hide');

  // Se aluno acessando via link
  if (LINK_TOKEN) {
    await loadBrandFromToken();
    showView('view-assessment');
    return;
  }

  // Verifica sessão do profissional
  const { data: { session } } = await sb.auth.getSession();

  // Limpa erros de auth na URL (link expirado, etc)
  if (window.location.hash && window.location.hash.includes('error=')) {
    history.replaceState(null, '', window.location.pathname);
    showView('view-auth');
    const errEl = document.getElementById('login-err');
    if (errEl) {
      errEl.textContent = 'O link de confirmação expirou. Faça login com seu e-mail e senha.';
      errEl.classList.add('on');
    }
  }

  if (session) {
    currentUser = session.user;
    await loadProfessional();
    showView('view-dash');
  } else {
    showView('view-auth');
  }

  // Escuta mudanças de auth — só age se não for acesso via link de aluno
  sb.auth.onAuthStateChange(async (event, session) => {
    if (LINK_TOKEN) return; // aluno acessando via link — ignora mudanças de auth
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadProfessional();
      showView('view-dash');
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProf = null;
      showView('view-auth');
    }
  });
})();

// ── VIEWS ─────────────────────────────────────────────────────
function showView(id) {
  ['view-auth','view-dash','view-assessment'].forEach(v => {
    const el = document.getElementById(v);
    if (!el) return;
    if (v === 'view-auth' || v === 'view-assessment') {
      el.classList.toggle('hide', v !== id);
    }
    if (v === 'view-dash') {
      el.classList.toggle('hide', v !== id);
      el.classList.toggle('on', v === id);
    }
  });
}

function initTheme() {
  try {
    const saved = localStorage.getItem('vt');
    const t = saved || (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
    applyTheme(t);
  } catch(e) { applyTheme('dark'); }
  const btn = document.getElementById('themeBtn');
  if (btn) btn.addEventListener('click', toggleThemeAssess);
}

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  ['themeIco','dashThemeIco','settings-theme-ico'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = t === 'dark' ? moonSVG : sunSVG;
  });
  const mc = document.getElementById('metaThemeColor');
  if (mc) mc.content = t === 'dark' ? '#080B0F' : '#F7F8FA';
  const sv = document.getElementById('settings-theme-val');
  if (sv) sv.textContent = t === 'dark' ? 'Escuro' : 'Claro';
  try { localStorage.setItem('vt', t); } catch(e) {}
}

function toggleThemeAssess() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(t);
}
function toggleThemeDash() { toggleThemeAssess(); }

// ── AUTH ──────────────────────────────────────────────────────
function showAuthPanel(id) {
  ['auth-login','auth-register'].forEach(p => {
    const el = document.getElementById(p);
    if (el) el.classList.toggle('hide', p !== id);
  });
}

async function doLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;
  const errEl = document.getElementById('login-err');
  const btn   = document.getElementById('btn-login');

  if (!email || !pass) { showErr(errEl, 'Preencha e-mail e senha'); return; }
  errEl.classList.remove('on');
  document.getElementById('login-info')?.classList.remove('on');
  btn.innerHTML = '<div class="spin-sm"></div>';
  btn.disabled = true;

  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  btn.disabled = false;
  btn.innerHTML = 'Entrar <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';

  if (error) {
    if (error.message === 'Invalid login credentials') {
      showErr(errEl, 'E-mail ou senha incorretos');
    } else if (error.message.toLowerCase().includes('email not confirmed')) {
      showErr(errEl, 'E-mail ainda não confirmado. Verifique sua caixa de entrada.');
    } else {
      showErr(errEl, error.message);
    }
    return;
  }

  if (data.session) {
    currentUser = data.session.user;
    await loadProfessional();
    showView('view-dash');
  }
}

async function doRegister() {
  const name    = document.getElementById('reg-name').value.trim();
  const academy = document.getElementById('reg-academy').value.trim();
  const email   = document.getElementById('reg-email').value.trim();
  const pass    = document.getElementById('reg-pass').value;
  const errEl   = document.getElementById('reg-err');
  const btn     = document.getElementById('btn-register');

  if (!name || !email || !pass) { showErr(errEl, 'Preencha todos os campos obrigatórios'); return; }
  if (pass.length < 6) { showErr(errEl, 'Senha mínima: 6 caracteres'); return; }

  errEl.classList.remove('on');
  btn.innerHTML = '<div class="spin-sm"></div>';
  btn.disabled = true;

  const { data, error } = await sb.auth.signUp({
    email,
    password: pass,
    options: {
      emailRedirectTo: window.location.origin,
      data: { name, academy_name: academy || null }
    }
  });
  if (error) {
    btn.disabled = false;
    btn.innerHTML = 'Criar Conta';
    showErr(errEl, error.message);
    return;
  }

  // Cria perfil do profissional
  if (data.user) {
    await sb.from('professionals').insert({
      user_id:      data.user.id,
      name,
      academy_name: academy || null,
      email
    });
  }

  btn.disabled = false;
  btn.innerHTML = 'Criar Conta';

  if (data.user && data.session) {
    // Usuário já está logado (confirmação desativada no Supabase)
    toast('Conta criada com sucesso!');
  } else {
    // Confirmação de e-mail ativada
    showErr(errEl, 'Conta criada! Clique no link enviado para ' + email + ' para ativar.');
  }
}

async function doLogout() {
  await sb.auth.signOut();
  allStudents = []; allAssessments = [];
  currentStudent = null; currentAssessment = null;
}

function showErr(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
}

function showInfo(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('on');
}

// ── PROFISSIONAL ──────────────────────────────────────────────
async function loadProfessional() {
  if (!currentUser) return;
  const { data, error } = await sb.from('professionals').select('*').eq('user_id', currentUser.id).single();

  if (error || !data) {
    // Perfil ainda não criado — cria agora com dados do auth
    const meta = currentUser.user_metadata || {};
    const { data: newProf, error: insertErr } = await sb.from('professionals').insert({
      user_id:      currentUser.id,
      name:         meta.name || currentUser.email.split('@')[0],
      academy_name: meta.academy_name || null,
      email:        currentUser.email
    }).select().single();

    if (insertErr) { toast('Erro ao carregar perfil'); console.error(insertErr); return; }
    currentProf = newProf;
  } else {
    currentProf = data;
  }

  const un = document.getElementById('dash-user-name');
  const an = document.getElementById('dash-academy-name');
  const sp = document.getElementById('settings-profile-val');
  if (un) un.textContent = currentProf.name;
  if (an) an.textContent = currentProf.academy_name || 'Vitalis';
  if (sp) sp.textContent = currentProf.name + (currentProf.academy_name ? ' · ' + currentProf.academy_name : '');
  if (currentProf.primary_color) applyPrimaryColor(currentProf.primary_color);
  const cp = document.getElementById('color-picker');
  if (cp) cp.value = currentProf.primary_color || '#6366F1';

  await loadStudents();
}

async function openProfileEdit() {
  if (!currentProf) return;
  document.getElementById('mp-name').value    = currentProf.name || '';
  document.getElementById('mp-academy').value = currentProf.academy_name || '';
  document.getElementById('mp-phone').value   = currentProf.phone || '';
  openModal('modal-profile');
}

async function saveProfile() {
  const name    = document.getElementById('mp-name').value.trim();
  const academy = document.getElementById('mp-academy').value.trim();
  const phone   = document.getElementById('mp-phone').value.trim();
  if (!name) { toast('Informe seu nome'); return; }

  const { error } = await sb.from('professionals')
    .update({ name, academy_name: academy || null, phone: phone || null })
    .eq('id', currentProf.id);

  if (error) { toast('Erro ao salvar'); return; }
  currentProf.name = name;
  currentProf.academy_name = academy;
  closeModal('modal-profile');
  await loadProfessional();
  toast('Perfil atualizado');
}

function applyPrimaryColor(hex) {
  if (!hex || !hex.startsWith('#')) return;
  document.documentElement.style.setProperty('--a', hex);
  // Converte hex para rgb para usar nos derivados com transparência
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  document.documentElement.style.setProperty('--a2',   `rgb(${r},${g},${b})`);
  document.documentElement.style.setProperty('--a-dim', `rgba(${r},${g},${b},0.10)`);
  document.documentElement.style.setProperty('--a-mid', `rgba(${r},${g},${b},0.18)`);
}

async function updatePrimaryColor(hex) {
  applyPrimaryColor(hex);
  if (!currentProf) return;
  await sb.from('professionals').update({ primary_color: hex }).eq('id', currentProf.id);
}

// ── ALUNOS ────────────────────────────────────────────────────
async function loadStudents() {
  if (!currentProf) return;
  const { data } = await sb.from('students')
    .select('*')
    .eq('professional_id', currentProf.id)
    .order('created_at', { ascending: false });

  allStudents = data || [];

  // Stats
  const { count } = await sb.from('assessments')
    .select('id', { count: 'exact', head: true })
    .eq('professional_id', currentProf.id);

  document.getElementById('stat-total').textContent  = allStudents.length;
  document.getElementById('stat-active').textContent = allStudents.filter(s => s.active).length;
  document.getElementById('stat-assess').textContent = count || 0;

  renderStudentList();
}

let currentSearchTerm = '';

function filterStudents() {
  const input = document.getElementById('student-search');
  if (input) currentSearchTerm = input.value.toLowerCase().trim();
  renderStudentList();
}

function renderStudentList() {
  const container = document.getElementById('student-list');
  const filtered = currentSearchTerm 
    ? allStudents.filter(s => s.name.toLowerCase().includes(currentSearchTerm))
    : allStudents;

  if (!allStudents.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon"><svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <div class="empty-title">Nenhum aluno ainda</div>
        <div class="empty-sub">Adicione seu primeiro aluno e envie o link de avaliação.</div>
        <button class="btn-p" style="width:auto" onclick="openAddStudent()">+ Adicionar Aluno</button>
      </div>`;
    return;
  }

  if (allStudents.length > 0 && !filtered.length) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 24px 0;">
        <div class="empty-sub">Nenhum aluno encontrado para "${escHtml(currentSearchTerm)}"</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(s => {
    const initials = s.name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
    return `
      <div class="student-row" onclick="openStudentDetail('${s.id}')">
        <div class="student-avatar">${initials}</div>
        <div class="student-info">
          <div class="student-name">${escHtml(s.name)}</div>
          <div class="student-meta">${s.email || s.phone || 'Sem contato'}</div>
        </div>
        <div class="student-badge ${s.active ? 'active' : 'inactive'}">${s.active ? 'Ativo' : 'Inativo'}</div>
        <div class="student-chev"><svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>`;
  }).join('');
}

function openAddStudent() {
  document.getElementById('modal-student-title').textContent = 'Novo Aluno';
  document.getElementById('btn-save-student').textContent = 'Salvar';
  ['ms-name','ms-email','ms-phone','ms-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('ms-birth').value = '';
  currentStudent = null;
  openModal('modal-student');
}

function openEditStudent() {
  if (!currentStudent) return;
  document.getElementById('modal-student-title').textContent = 'Editar Aluno';
  document.getElementById('ms-name').value  = currentStudent.name || '';
  document.getElementById('ms-email').value = currentStudent.email || '';
  document.getElementById('ms-phone').value = currentStudent.phone || '';
  document.getElementById('ms-birth').value = currentStudent.birth_date || '';
  document.getElementById('ms-notes').value = currentStudent.notes || '';
  openModal('modal-student');
}

async function saveStudent() {
  const name  = document.getElementById('ms-name').value.trim();
  const email = document.getElementById('ms-email').value.trim();
  const phone = document.getElementById('ms-phone').value.trim();
  const birth = document.getElementById('ms-birth').value;
  const notes = document.getElementById('ms-notes').value.trim();

  if (!name) { toast('Informe o nome do aluno'); return; }
  if (!currentProf) { toast('Sessão expirada. Faça login novamente.'); return; }

  const btn = document.getElementById('btn-save-student');
  btn.disabled = true;
  btn.textContent = 'Salvando...';

  const payload = {
    professional_id: currentProf.id,
    name,
    email: email || null,
    phone: phone || null,
    birth_date: birth || null,
    notes: notes || null
  };

  let error;
  if (currentStudent) {
    ({ error } = await sb.from('students').update(payload).eq('id', currentStudent.id));
  } else {
    ({ error } = await sb.from('students').insert(payload));
  }

  btn.disabled = false;
  btn.textContent = 'Salvar';

  if (error) {
    toast('Erro ao salvar aluno: ' + (error.message || 'tente novamente'));
    console.error('saveStudent error:', error);
    return;
  }

  toast(currentStudent ? 'Aluno atualizado!' : 'Aluno adicionado!');
  const wasEditing = currentStudent;
  closeModal('modal-student');
  await loadStudents();
  if (wasEditing) await openStudentDetail(wasEditing.id);
}

async function deleteStudent() {
  if (!currentStudent) return;
  const nome = currentStudent.name;
  if (!window.confirm(`Remover "${nome}"?\n\nTodas as avaliações deste aluno serão excluídas. Esta ação não pode ser desfeita.`)) return;

  const { error } = await sb.from('students').delete().eq('id', currentStudent.id);
  if (error) { toast('Erro ao remover aluno'); return; }

  toast(`${nome} removido`);
  currentStudent = null;
  await loadStudents();
  dashNav('ds-students');
}

async function openStudentDetail(studentId) {
  let student = allStudents.find(s => s.id === studentId);
  if (!student) {
    const { data } = await sb.from('students').select('*').eq('id', studentId).single();
    if (!data) { toast('Aluno não encontrado'); return; }
    student = data;
    allStudents = [...allStudents.filter(s => s.id !== studentId), student];
  }
  currentStudent = student;
  document.getElementById('detail-name').textContent = student.name;
  document.getElementById('detail-meta').textContent =
    [student.email, student.phone].filter(Boolean).join(' · ') || 'Sem contato';
  dashNav('ds-student-detail');
  // Sempre recarrega avaliações ao abrir o detalhe — garante dados frescos
  await loadStudentAssessments();
}

async function loadStudentAssessments() {
  if (!currentStudent || !currentProf) return;

  const container = document.getElementById('detail-assessments');
  container.innerHTML = '<div style="padding:24px 20px;text-align:center"><div class="spin-sm" style="margin:0 auto"></div></div>';

  const { data, error } = await sb.from('assessments')
    .select('*')
    .eq('student_id', currentStudent.id)
    .eq('professional_id', currentProf.id)
    .order('created_at', { ascending: false });

  if (error) {
    container.innerHTML = '<div style="padding:24px 20px;font-size:13px;color:var(--red)">Erro ao carregar avaliações.</div>';
    console.error('loadStudentAssessments:', error);
    return;
  }

  allAssessments = data || [];
  const cnt = document.getElementById('detail-assess-count');
  if (cnt) cnt.textContent = allAssessments.length + ' ' + (allAssessments.length === 1 ? 'avaliação' : 'avaliações');

  if (!allAssessments.length) {
    container.innerHTML = `<div class="empty-state" style="padding:24px 0"><div class="empty-sub">Nenhuma avaliação ainda. Envie o link para o aluno preencher.</div></div>`;
    return;
  }

  container.innerHTML = allAssessments.map((a) => {
    const date = new Date(a.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'short', year:'numeric' });
    const imcS = imcStatus(a.imc);
    return `
      <div class="assessment-card" onclick="openAssessmentView('${a.id}')">
        <div class="assessment-card-hdr">
          <span class="assessment-date">${date}</span>
          <span class="pill-badge ${imcS.cls}">${imcS.lbl}</span>
        </div>
        <div class="assessment-metrics">
          <div class="a-metric"><div class="a-metric-lbl">IMC</div><div class="a-metric-val">${(+a.imc).toFixed(1)}</div></div>
          <div class="a-metric"><div class="a-metric-lbl">Peso</div><div class="a-metric-val">${a.peso}kg</div></div>
          <div class="a-metric"><div class="a-metric-lbl">TDEE</div><div class="a-metric-val">${(+a.tdee).toLocaleString('pt-BR')}</div></div>
        </div>
      </div>`;
  }).join('');
}

let evoChartInstance = null;
function renderEvolutionChart() {
  const ctx = document.getElementById('evoChart').getContext('2d');
  
  const sorted = [...allAssessments].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  const labels = sorted.map(a => new Date(a.created_at).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'}));
  const pesoData = sorted.map(a => a.peso);
  const imcData = sorted.map(a => a.imc);
  
  if (evoChartInstance) evoChartInstance.destroy();
  
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const textColor = isDark ? '#7E8898' : '#4B5563';
  const pColor = '#6366F1';
  const imcColor = '#22D3A0';
  
  evoChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Peso (kg)', data: pesoData, borderColor: pColor, backgroundColor: pColor+'1A', tension: 0.3, yAxisID: 'y' },
        { label: 'IMC', data: imcData, borderColor: imcColor, backgroundColor: imcColor+'1A', tension: 0.3, yAxisID: 'y1' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: textColor, font: { size: 10 } } } },
      scales: {
        x: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
        y: { type: 'linear', display: true, position: 'left', grid: { color: gridColor }, ticks: { color: textColor, font: { size: 10 } } },
        y1: { type: 'linear', display: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: textColor, font: { size: 10 } } }
      }
    }
  });
}

// ── LINK DE AVALIAÇÃO ─────────────────────────────────────────
function openSendLink() {
  // Reseta o modal completamente a cada abertura
  document.getElementById('link-card').style.display = 'none';
  const btn = document.getElementById('btn-gen-link');
  btn.style.display = '';
  btn.disabled = false;
  btn.innerHTML = 'Gerar Link';
  document.getElementById('link-url-display').textContent = '';
  document.getElementById('modal-link-sub').textContent = `Gere o link para ${currentStudent?.name || 'o aluno'} preencher.`;
  window._generatedLink = null;
  window._generatedLinkStudent = null;
  openModal('modal-link');
}

async function generateLink() {
  if (!currentStudent || !currentProf) return;
  const btn = document.getElementById('btn-gen-link');
  btn.innerHTML = '<div class="spin-sm"></div>';
  btn.disabled = true;

  // Invalida links anteriores não usados para este aluno
  await sb.from('assessment_links')
    .update({ used: true })
    .eq('student_id', currentStudent.id)
    .eq('used', false);

  const { data, error } = await sb.from('assessment_links')
    .insert({ professional_id: currentProf.id, student_id: currentStudent.id })
    .select()
    .single();

  btn.disabled = false;
  btn.style.display = 'none';

  if (error || !data) {
    toast('Erro ao gerar link: ' + (error?.message || 'tente novamente'));
    console.error('generateLink error:', error);
    btn.innerHTML = 'Gerar Link';
    btn.style.display = '';
    btn.disabled = false;
    return;
  }

  const url = `${window.location.origin}${window.location.pathname}?token=${data.token}`;
  document.getElementById('link-url-display').textContent = url;
  document.getElementById('link-card').style.display = '';
  window._generatedLink = url;
  window._generatedLinkStudent = currentStudent;
}

function copyLink() {
  if (!window._generatedLink) return;
  navigator.clipboard.writeText(window._generatedLink).then(() => toast('Link copiado!'));
}

function sendLinkWA() {
  if (!window._generatedLink) return;
  const name = window._generatedLinkStudent?.name || 'aluno';
  const msg  = `Olá, ${name}! Segue o link para sua avaliação fitness:\n\n${window._generatedLink}\n\nO link é válido por 7 dias.`;
  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

function closeModalStudent(e) { if (e.target === e.currentTarget) closeModal('modal-student'); }
function closeModalLink(e)    { if (e.target === e.currentTarget) closeModal('modal-link'); }
function closeModalProfile(e) { if (e.target === e.currentTarget) closeModal('modal-profile'); }

// ── ASSESSMENT VIEW (painel) ──────────────────────────────────
async function openAssessmentView(assessmentId) {
  const assessment = allAssessments.find(a => a.id === assessmentId);
  if (!assessment) return;
  currentAssessment = assessment;

  // Preenche tela
  const date = new Date(assessment.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
  document.getElementById('av-date').textContent = date;
  document.getElementById('av-name').textContent = assessment.nome;

  const imcS = imcStatus(assessment.imc);
  document.getElementById('av-imc').textContent    = (+assessment.imc).toFixed(1);
  document.getElementById('av-imc-cat').textContent = imcS.cat;
  document.getElementById('av-imc-tag').textContent = imcS.lbl;
  document.getElementById('av-imc-tag').className  = `met-tag ${imcS.cls}`;
  document.getElementById('av-tmb').textContent    = Math.round(assessment.tmb).toLocaleString('pt-BR');
  document.getElementById('av-tdee').textContent   = Math.round(assessment.tdee).toLocaleString('pt-BR');
  document.getElementById('av-agua').textContent   = assessment.agua_ml.toLocaleString('pt-BR');

  const badge = document.getElementById('av-badge');
  badge.textContent = imcS.lbl;
  badge.className   = `score-pill ${imcS.cls === 'g' ? 'good' : imcS.cls === 'w' ? 'ok' : 'bad'}`;

  // Análise
  const fData = { ...assessment, daysSel: assessment.dias_disponiveis || [], tempo: assessment.tempo_sessao, local: assessment.local_treino, nivel: assessment.nivel, obj: assessment.objetivo };
  const { fortes, atenc, rec } = buildAnalysis(fData, assessment.imc, assessment.tmb, assessment.tdee, assessment.agua_ml);
  renderListTo('av-fortes', fortes);
  renderListTo('av-atenc', atenc);
  renderListTo('av-rec', rec);

  // Comparativo com avaliação anterior
  const idx = allAssessments.findIndex(a => a.id === assessmentId);
  if (idx < allAssessments.length - 1) {
    const prev = allAssessments[idx + 1];
    renderComparison(prev, assessment);
    document.getElementById('av-compare-block').classList.remove('hide');
  } else {
    document.getElementById('av-compare-block').classList.add('hide');
  }

  // Treino
  await loadAssessmentWorkout(assessment.id);
  dashNav('ds-assessment-view');
}

function renderComparison(prev, curr) {
  const rows = [
    { lbl: 'Peso', old: prev.peso + 'kg', curr: curr.peso + 'kg', diff: curr.peso - prev.peso, unit: 'kg', lower_better: true },
    { lbl: 'IMC', old: (+prev.imc).toFixed(1), curr: (+curr.imc).toFixed(1), diff: curr.imc - prev.imc, lower_better: true },
    { lbl: 'TDEE', old: Math.round(prev.tdee).toLocaleString('pt-BR') + 'kcal', curr: Math.round(curr.tdee).toLocaleString('pt-BR') + 'kcal', diff: curr.tdee - prev.tdee, lower_better: false },
  ];

  document.getElementById('av-compare-rows').innerHTML = rows.map(r => {
    const improved = r.lower_better ? r.diff < 0 : r.diff > 0;
    const cls = Math.abs(r.diff) < 0.1 ? 'same' : (improved ? 'up' : 'down');
    const sign = r.diff > 0 ? '+' : '';
    return `
      <div class="compare-row">
        <span class="compare-lbl">${r.lbl}</span>
        <span class="compare-old">${r.old}</span>
        <span class="compare-arrow">→</span>
        <span class="compare-new ${cls}">${r.curr} (${sign}${typeof r.diff === 'number' ? r.diff.toFixed(1) : r.diff})</span>
      </div>`;
  }).join('');
}

async function loadAssessmentWorkout(assessmentId) {
  const { data } = await sb.from('workout_plans')
    .select('*')
    .eq('assessment_id', assessmentId)
    .single();

  currentWorkout = data;
  const container = document.getElementById('av-workout');
  if (!data || !data.plan || !data.plan.length) {
    container.innerHTML = '<div style="padding:0 20px 16px;font-size:13px;color:var(--t3)">Nenhum treino registrado.</div>';
    return;
  }
  container.innerHTML = renderWorkoutHTML(data.plan);
}

// ── WORKOUT EDITOR ────────────────────────────────────────────
function openWorkoutEditor() {
  if (!currentWorkout || !currentWorkout.plan) return;
  const container = document.getElementById('workout-editor-container');
  container.innerHTML = currentWorkout.plan.map((day, di) => `
    <div class="editor-day" id="eday-${di}">
      <div class="editor-day-hdr">
        <div>
          <div class="editor-day-name">${day.dia}</div>
          <div class="editor-day-group">${day.grupo}</div>
        </div>
        <button class="btn-add-ex" onclick="addExercise(${di})">+ Exercício</button>
      </div>
      <div id="eday-exs-${di}">
        ${day.exercicios.map((ex, ei) => exEditRow(di, ei, ex)).join('')}
      </div>
    </div>`).join('');
  dashNav('ds-workout-editor');
}

function exEditRow(di, ei, ex) {
  return `
    <div class="ex-edit-row" id="ex-${di}-${ei}">
      <div class="ex-edit-num">${String(ei+1).padStart(2,'0')}</div>
      <input class="ex-edit-name" value="${escHtml(ex.nome)}" placeholder="Nome do exercício" data-di="${di}" data-ei="${ei}">
      <input class="ex-edit-sets" value="${escHtml(ex.series)}" placeholder="3×12" data-di="${di}" data-ei="${ei}">
      <button class="btn-rm-ex" onclick="removeExercise(${di},${ei})">×</button>
    </div>`;
}

function addExercise(di) {
  if (!currentWorkout?.plan?.[di]) return;
  currentWorkout.plan[di].exercicios.push({ nome: '', series: '3×12', grupo: '' });
  const ei = currentWorkout.plan[di].exercicios.length - 1;
  const container = document.getElementById(`eday-exs-${di}`);
  const div = document.createElement('div');
  div.innerHTML = exEditRow(di, ei, { nome: '', series: '3×12' });
  container.appendChild(div.firstElementChild);
  container.querySelector(`#ex-${di}-${ei} .ex-edit-name`)?.focus();
}

function removeExercise(di, ei) {
  if (!currentWorkout?.plan?.[di]) return;
  currentWorkout.plan[di].exercicios.splice(ei, 1);
  openWorkoutEditor(); // re-render
}

async function saveWorkoutEdit() {
  if (!currentWorkout) { toast('Nenhum treino carregado'); return; }

  currentWorkout.plan.forEach((day, di) => {
    day.exercicios.forEach((ex, ei) => {
      const nameEl = document.querySelector(`#ex-${di}-${ei} .ex-edit-name`);
      const setsEl = document.querySelector(`#ex-${di}-${ei} .ex-edit-sets`);
      if (nameEl) ex.nome   = nameEl.value.trim();
      if (setsEl) ex.series = setsEl.value.trim();
    });
    day.exercicios = day.exercicios.filter(ex => ex.nome);
  });

  const btn = document.querySelector('#ds-workout-editor .btn-p');
  if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }

  const { error } = await sb.from('workout_plans')
    .update({ plan: currentWorkout.plan, edited_manually: true, updated_at: new Date().toISOString() })
    .eq('id', currentWorkout.id);

  if (btn) { btn.disabled = false; btn.textContent = 'Salvar Treino'; }

  if (error) {
    toast('Erro ao salvar treino: ' + (error.message || 'tente novamente'));
    console.error('saveWorkoutEdit error:', error);
    return;
  }

  toast('Treino salvo!');
  if (currentAssessment) await loadAssessmentWorkout(currentAssessment.id);
  dashNav('ds-assessment-view');
}

// ── WORKOUT TEMPLATES (localStorage) ──────────────────────────
function _templateKey() {
  return `vitalis_tpl_${currentProf?.id || 'default'}`;
}

function saveWorkoutTemplate() {
  if (!currentWorkout?.plan) { toast('Nenhum treino para salvar'); return; }
  // Sync edits from inputs first
  currentWorkout.plan.forEach((day, di) => {
    day.exercicios.forEach((ex, ei) => {
      const n = document.querySelector(`#ex-${di}-${ei} .ex-edit-name`);
      const s = document.querySelector(`#ex-${di}-${ei} .ex-edit-sets`);
      if (n) ex.nome = n.value.trim();
      if (s) ex.series = s.value.trim();
    });
    day.exercicios = day.exercicios.filter(e => e.nome);
  });

  const name = window.prompt('Nome desta predefinição:', 'Treino Padrão');
  if (!name) return;
  try {
    const key = _templateKey();
    const existing = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = existing.findIndex(t => t.name === name);
    const entry = { name, plan: currentWorkout.plan, savedAt: new Date().toISOString() };
    if (idx >= 0) existing[idx] = entry; else existing.push(entry);
    localStorage.setItem(key, JSON.stringify(existing));
    toast(`Predefinição "${name}" salva!`);
  } catch(e) { toast('Erro ao salvar predefinição'); }
}

function openLoadTemplate() {
  try {
    const templates = JSON.parse(localStorage.getItem(_templateKey()) || '[]');
    if (!templates.length) { toast('Nenhuma predefinição salva ainda'); return; }

    // Build a modal-like overlay inline
    const existing = document.getElementById('tpl-picker');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'tpl-picker';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.15s';
    overlay.innerHTML = `
      <div style="background:var(--bg-card);border-radius:var(--r16) var(--r16) 0 0;width:100%;max-width:480px;padding:20px;padding-bottom:calc(20px + env(safe-area-inset-bottom));max-height:70vh;overflow-y:auto;">
        <div style="font-size:15px;font-weight:600;color:var(--t1);margin-bottom:4px">Predefinições de Treino</div>
        <div style="font-size:12px;color:var(--t3);margin-bottom:16px">Toque para aplicar. O treino atual será substituído.</div>
        ${templates.map((t,i) => `
          <div onclick="applyTemplate(${i})" style="padding:12px 16px;border:1px solid var(--line-2);border-radius:var(--r8);margin-bottom:8px;cursor:pointer;transition:background 0.13s" onmouseenter="this.style.background='var(--bg-raised)'" onmouseleave="this.style.background=''">
            <div style="font-size:14px;font-weight:500;color:var(--t1)">${escHtml(t.name)}</div>
            <div style="font-size:11px;color:var(--t3);margin-top:2px">${t.plan.length} dias · Salvo em ${new Date(t.savedAt).toLocaleDateString('pt-BR')}</div>
          </div>`).join('')}
        <button class="btn-s" style="margin-top:8px;width:100%" onclick="document.getElementById('tpl-picker').remove()">Cancelar</button>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
  } catch(e) { toast('Erro ao carregar predefinições'); }
}

function applyTemplate(idx) {
  try {
    const templates = JSON.parse(localStorage.getItem(_templateKey()) || '[]');
    const tpl = templates[idx];
    if (!tpl || !currentWorkout) return;
    currentWorkout.plan = JSON.parse(JSON.stringify(tpl.plan)); // deep clone
    document.getElementById('tpl-picker')?.remove();
    openWorkoutEditor();
    toast(`Predefinição "${tpl.name}" aplicada!`);
  } catch(e) { toast('Erro ao aplicar predefinição'); }
}

// ── DASHBOARD NAV ─────────────────────────────────────────────
function dashNav(screenId) {
  document.querySelectorAll('.dash-scr').forEach(s => s.classList.remove('on'));
  const el = document.getElementById(screenId);
  if (el) { el.classList.add('on'); window.scrollTo(0,0); }
}

function switchTab(tab) {
  ['students','settings'].forEach(t => {
    document.getElementById('tab-'+t)?.classList.toggle('active', t === tab);
  });
  dashNav(tab === 'students' ? 'ds-students' : 'ds-settings');
}

// ── BRAND VIA TOKEN (aluno) ───────────────────────────────────
async function loadBrandFromToken() {
  if (!LINK_TOKEN) return;
  const { data: link } = await sb.from('assessment_links')
    .select('professional_id, student_id')
    .eq('token', LINK_TOKEN)
    .eq('used', false)
    .gt('expires_at', new Date().toISOString())
    .single();

  if (!link) {
    const hero = document.getElementById('s-hero');
    if (hero) {
      const sub = hero.querySelector('.hero-sub');
      const btn = hero.querySelector('.btn-p');
      if (sub) sub.textContent = 'Este link expirou ou já foi utilizado. Solicite um novo link ao seu profissional.';
      if (btn) btn.style.display = 'none';
    }
    return;
  }

  // Guarda globalmente para uso no saveAssessmentToSupabase
  window._linkProfId    = link.professional_id;
  window._linkStudentId = link.student_id;

  const { data: prof } = await sb.from('professionals')
    .select('name, academy_name, primary_color')
    .eq('id', link.professional_id)
    .single();

  if (prof) {
    const bn = document.getElementById('assess-brand-name');
    if (bn) bn.textContent = prof.academy_name || prof.name || 'Vitalis';
    if (prof.primary_color) applyPrimaryColor(prof.primary_color);
  }

  // Restore any saved draft for this token
  restoreDraft();
}

// ── FORMULÁRIO DO ALUNO ───────────────────────────────────────
// Option buttons
try {
  document.querySelectorAll('.og, .oi-wrap').forEach(g => {
    g.querySelectorAll('.ob').forEach(b => {
      b.addEventListener('click', function() {
        g.querySelectorAll('.ob').forEach(x => x.classList.remove('sel'));
        this.classList.add('sel');
      });
      b.addEventListener('touchend', function(e) { e.preventDefault(); this.click(); }, { passive: false });
    });
  });
} catch(e) {}

// Day buttons
try {
  document.querySelectorAll('.day-btn').forEach(b => {
    b.addEventListener('click', function() { this.classList.toggle('sel'); });
    b.addEventListener('touchend', function(e) { e.preventDefault(); this.click(); }, { passive: false });
  });
} catch(e) {}

// Pain scale
try {
  document.querySelectorAll('.pain-btn').forEach(b => {
    b.addEventListener('click', function() {
      document.querySelectorAll('.pain-btn').forEach(x => x.classList.remove('sel'));
      this.classList.add('sel');
    });
  });
} catch(e) {}

// Toggles
function tgl(id) { const el = document.getElementById(id); if (el) el.classList.toggle('on'); }
try {
  document.querySelectorAll('.tgl-row').forEach(r => {
    r.addEventListener('touchend', function(e) { e.preventDefault(); this.click(); }, { passive: false });
  });
} catch(e) {}

// Tag input
function addTag(e, cid) {
  if (e && e.key && e.key !== 'Enter' && e.key !== ',') return;
  if (e && e.preventDefault) e.preventDefault();
  const box = document.getElementById(cid);
  if (!box) return;
  const inp = box.querySelector('.tag-in');
  if (!inp) return;
  const val = inp.value.trim().replace(/,/g, '');
  if (!val) return;
  const t = document.createElement('div');
  t.className = 'tag-item';
  t.innerHTML = `<span>${escHtml(val)}</span><button class="tag-rm" onclick="this.parentElement.remove()" type="button" aria-label="Remover">×</button>`;
  box.insertBefore(t, inp);
  inp.value = '';
  inp.focus();
}
window.addTag = addTag;
try {
  document.querySelectorAll('.tag-box').forEach(b => {
    b.addEventListener('click', function(e) { if (e.target === this) this.querySelector('.tag-in').focus(); });
  });
} catch(e) {}

function getTags(boxId) {
  const items = [];
  document.querySelectorAll(`#${boxId} .tag-item span`).forEach(s => items.push(s.textContent));
  return items;
}

function selVal(gid) { const s = document.querySelector(`#${gid} .ob.sel`); return s ? s.dataset.v : null; }
function selDays()   { const ds = []; document.querySelectorAll('.day-btn.sel').forEach(d => ds.push(d.dataset.d)); return ds; }
function selPain()   { const s = document.querySelector('.pain-btn.sel'); return s ? +s.dataset.pain : 0; }

function startForm() {
  step = 1;
  show('s-form');
  updatePrg();
}

function show(id) {
  document.querySelectorAll('.scr').forEach(s => s.classList.remove('on'));
  const el = document.getElementById(id);
  if (el) { el.classList.add('on'); window.scrollTo(0,0); }
}

function updatePrg() {
  const pct = Math.round((step / TOTAL) * 100);
  const pf = document.getElementById('prgFill');
  if (pf) pf.style.width = pct + '%';
  const pl = document.getElementById('prgLbl');
  if (pl) pl.textContent = `Etapa ${step} de ${TOTAL}`;
  const pp = document.getElementById('prgPct');
  if (pp) pp.textContent = pct + '%';
  for (let i = 1; i <= TOTAL; i++) {
    const el = document.getElementById(`st${i}`);
    if (el) el.classList.toggle('hide', i !== step);
  }
  const bv = document.getElementById('btnVoltar');
  if (bv) bv.style.display = step === 1 ? 'none' : '';
  const bp = document.getElementById('btnProx');
  if (bp) {
    bp.innerHTML = step === TOTAL
      ? 'Processar Avaliação <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>'
      : 'Próximo <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
  }
  if (step === TOTAL) buildSummary();
}

function validate(s) {
  if (s === 1) {
    if (!document.getElementById('f-nome').value.trim()) { toast('Informe seu nome'); return false; }
    const idade = +document.getElementById('f-idade').value;
    if (!idade || idade < 10 || idade > 99) { toast('Informe uma idade válida (10–99)'); return false; }
    const alt = +document.getElementById('f-altura').value;
    if (!alt || alt < 100 || alt > 250) { toast('Informe altura em cm'); return false; }
    const peso = +document.getElementById('f-peso').value;
    if (!peso || peso < 30 || peso > 300) { toast('Informe peso em kg'); return false; }
    if (!document.getElementById('f-genero').value) { toast('Selecione seu gênero'); return false; }
  }
  return true;
}

function nextStp() {
  if (!validate(step)) return;
  if (step < TOTAL) {
    step++;
    saveDraft();
    updatePrg();
    window.scrollTo(0,0);
  } else {
    collectData();
    process();
  }
}

function prevStp() {
  if (step > 1) { step--; updatePrg(); window.scrollTo(0,0); }
  else show('s-hero');
}

// ── RASCUNHO (localStorage) ───────────────────────────────
// Saves the entire raw form state (input values, selects, toggles, tags)
function saveDraft() {
  if (!LINK_TOKEN) return;
  try {
    const snap = {
      step,
      nome: document.getElementById('f-nome')?.value || '',
      idade: document.getElementById('f-idade')?.value || '',
      genero: document.getElementById('f-genero')?.value || '',
      altura: document.getElementById('f-altura')?.value || '',
      peso: document.getElementById('f-peso')?.value || '',
      pdej: document.getElementById('f-pdej')?.value || '',
      prazo: document.getElementById('f-prazo')?.value || '',
      objCurto: document.getElementById('f-obj-curto')?.value || '',
      objLongo: document.getElementById('f-obj-longo')?.value || '',
      mot: document.getElementById('f-mot')?.value || '',
      dias: document.getElementById('f-dias')?.value || '3',
      sono: document.getElementById('f-sono')?.value || '7',
      agua: document.getElementById('f-agua')?.value || '2',
      pressao: document.getElementById('f-pressao')?.value || '',
      sedentario: document.getElementById('f-sedentario')?.value || '',
      // Selected option buttons
      selObj: selVal('og-obj'), selNiv: selVal('og-niv'),
      selLoc: selVal('og-loc'), selTmp: selVal('ow-tmp'),
      selSono: selVal('ow-sono'), selStr: selVal('ow-str'),
      selFrut: selVal('ow-frut'), selInd: selVal('ow-ind'),
      // Toggles
      tPers: document.getElementById('t-pers')?.classList.contains('on') || false,
      tNutri: document.getElementById('t-nutri')?.classList.contains('on') || false,
      tCardio: document.getElementById('t-cardio')?.classList.contains('on') || false,
      tFuma: document.getElementById('t-fuma')?.classList.contains('on') || false,
      tAlcool: document.getElementById('t-alcool')?.classList.contains('on') || false,
      // Tags
      doencas: getTags('tb-doencas'), lesoes: getTags('tb-lesoes'), meds: getTags('tb-meds'),
      esportes: getTags('tb-esportes'), cirurgias: getTags('tb-cirurgias'), aler: getTags('tb-aler'),
      // Days
      daysSel: selDays(),
      // Pain
      pain: selPain(),
    };
    localStorage.setItem('vitalis_draft_' + LINK_TOKEN, JSON.stringify(snap));
  } catch(e) {}
}

function restoreDraft() {
  if (!LINK_TOKEN) return;
  try {
    const raw = localStorage.getItem('vitalis_draft_' + LINK_TOKEN);
    if (!raw) return;
    const d = JSON.parse(raw);

    // Restore text inputs
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('f-nome', d.nome); set('f-idade', d.idade); set('f-genero', d.genero);
    set('f-altura', d.altura); set('f-peso', d.peso); set('f-pdej', d.pdej);
    set('f-prazo', d.prazo); set('f-obj-curto', d.objCurto); set('f-obj-longo', d.objLongo);
    set('f-mot', d.mot); set('f-dias', d.dias); set('f-sono', d.sono);
    set('f-agua', d.agua); set('f-pressao', d.pressao); set('f-sedentario', d.sedentario);

    // Update range display labels
    document.getElementById('rv-dias').textContent = (d.dias || 3) + ((+d.dias === 1) ? ' dia' : ' dias');
    document.getElementById('rv-sono').textContent = (d.sono || 7) + 'h';
    document.getElementById('rv-agua').textContent = parseFloat(d.agua || 2).toFixed(1) + 'L';

    // Restore option button selections
    const selOpt = (gid, val) => {
      if (!val) return;
      const btn = document.querySelector(`#${gid} .ob[data-v="${val}"]`);
      if (btn) { document.querySelectorAll(`#${gid} .ob`).forEach(b => b.classList.remove('sel')); btn.classList.add('sel'); }
    };
    selOpt('og-obj', d.selObj); selOpt('og-niv', d.selNiv); selOpt('og-loc', d.selLoc);
    selOpt('ow-tmp', d.selTmp); selOpt('ow-sono', d.selSono); selOpt('ow-str', d.selStr);
    selOpt('ow-frut', d.selFrut); selOpt('ow-ind', d.selInd);

    // Restore toggles
    const setTgl = (id, on) => { const el = document.getElementById(id); if (el) { if (on) el.classList.add('on'); else el.classList.remove('on'); } };
    setTgl('t-pers', d.tPers); setTgl('t-nutri', d.tNutri);
    setTgl('t-cardio', d.tCardio); setTgl('t-fuma', d.tFuma); setTgl('t-alcool', d.tAlcool);

    // Restore tags
    const setTags = (boxId, tags) => {
      if (!tags?.length) return;
      const box = document.getElementById(boxId);
      if (!box) return;
      const inp = box.querySelector('.tag-in');
      tags.forEach(val => {
        const t = document.createElement('div');
        t.className = 'tag-item';
        t.innerHTML = `<span>${escHtml(val)}</span><button class="tag-rm" onclick="this.parentElement.remove()" type="button" aria-label="Remover">×</button>`;
        box.insertBefore(t, inp);
      });
    };
    setTags('tb-doencas', d.doencas); setTags('tb-lesoes', d.lesoes); setTags('tb-meds', d.meds);
    setTags('tb-esportes', d.esportes); setTags('tb-cirurgias', d.cirurgias); setTags('tb-aler', d.aler);

    // Restore days
    if (d.daysSel?.length) {
      document.querySelectorAll('.day-btn').forEach(b => {
        if (d.daysSel.includes(b.dataset.d)) b.classList.add('sel');
        else b.classList.remove('sel');
      });
    }

    // Restore pain
    if (d.pain !== undefined) {
      document.querySelectorAll('.pain-btn').forEach(b => {
        b.classList.toggle('sel', +b.dataset.pain === d.pain);
      });
    }

    // Jump to saved step
    if (d.step && d.step > 1) {
      step = Math.min(d.step, TOTAL - 1); // don't jump to last step (summary)
      updatePrg();
      show('s-form');
      toast('Rascunho restaurado! Continue de onde parou.');
    }
  } catch(e) {}
}

function clearDraft() {
  if (!LINK_TOKEN) return;
  try { localStorage.removeItem('vitalis_draft_' + LINK_TOKEN); } catch(e) {}
}

function collectData() {
  fd = {
    nome:       document.getElementById('f-nome').value.trim(),
    idade:      +document.getElementById('f-idade').value,
    altura:     +document.getElementById('f-altura').value,
    peso:       +document.getElementById('f-peso').value,
    genero:     document.getElementById('f-genero').value,
    obj:        selVal('og-obj') || 'fitness-geral',
    pesoDej:    +document.getElementById('f-pdej').value || 0,
    prazo:      document.getElementById('f-prazo').value,
    objCurto:   document.getElementById('f-obj-curto').value.trim(),
    objLongo:   document.getElementById('f-obj-longo').value.trim(),
    motiv:      document.getElementById('f-mot').value.trim(),
    nivel:      selVal('og-niv') || 'intermediario',
    dias:       +document.getElementById('f-dias').value || 3,
    pers:       document.getElementById('t-pers')?.classList.contains('on') || false,
    nutri:      document.getElementById('t-nutri')?.classList.contains('on') || false,
    doencas:    getTags('tb-doencas'),
    lesoes:     getTags('tb-lesoes'),
    meds:       getTags('tb-meds'),
    // Anamnese
    pressao:    document.getElementById('f-pressao').value.trim(),
    sedentario: document.getElementById('f-sedentario').value,
    cardioHist: document.getElementById('t-cardio')?.classList.contains('on') || false,
    fuma:       document.getElementById('t-fuma')?.classList.contains('on') || false,
    alcool:     document.getElementById('t-alcool')?.classList.contains('on') || false,
    esportes:   getTags('tb-esportes'),
    cirurgias:  getTags('tb-cirurgias'),
    nivelDor:   selPain(),
    // Hábitos
    sono:       selVal('ow-sono') || 'boa',
    sonoH:      +document.getElementById('f-sono').value || 7,
    stress:     selVal('ow-str') || 'moderado',
    agua:       +document.getElementById('f-agua').value || 2,
    // Alimentação
    frutas:     selVal('ow-frut') || 'diario',
    indust:     selVal('ow-ind') || 'raramente',
    aler:       getTags('tb-aler'),
    // Disponibilidade
    daysSel:    selDays(),
    tempo:      +(selVal('ow-tmp') || 60),
    local:      selVal('og-loc') || 'academia',
  };
}

// ── MÉTRICAS ──────────────────────────────────────────────────
function calcIMC(p, h)       { return p / ((h/100) * (h/100)) }
function calcTMB(p, h, i, g) { return g === 'feminino' ? 447.593+9.247*p+3.098*h-4.330*i : 88.362+13.397*p+4.799*h-5.677*i }
const actFactor = { iniciante:1.375, intermediario:1.55, avancado:1.725 };

function imcStatus(v) {
  v = +v;
  if (v < 18.5) return { lbl:'Abaixo do Peso', cls:'w', cat:'< 18.5' };
  if (v < 25)   return { lbl:'Peso Saudável',  cls:'g', cat:'18.5–24.9' };
  if (v < 30)   return { lbl:'Sobrepeso',      cls:'w', cat:'25–29.9' };
  return              { lbl:'Obesidade',        cls:'b', cat:'≥ 30' };
}

const genLabel = { masculino:'Masculino', feminino:'Feminino', outro:'Outro' };
const objLabel = { 'perder-peso':'Perder Peso','ganhar-massa':'Ganhar Massa','resistencia':'Resistência','fitness-geral':'Fitness Geral' };
const nivLabel = { iniciante:'Iniciante', intermediario:'Intermediário', avancado:'Avançado' };
const locLabel = { casa:'Casa', academia:'Academia', 'ar-livre':'Ar Livre', misto:'Misto' };

// ── PROCESSO ──────────────────────────────────────────────────
function process() {
  show('s-load');
  const steps = ['ls1','ls2','ls3','ls4'];
  let idx = 0;

  function advance() {
    if (idx > 0) {
      const prev = document.getElementById(steps[idx-1]);
      if (prev) { prev.classList.remove('act'); prev.classList.add('done'); }
    }
    if (idx < steps.length) {
      const curr = document.getElementById(steps[idx]);
      if (curr) curr.classList.add('act');
      idx++;
      const delay = idx === steps.length ? 700 : 500 + Math.random() * 300;
      setTimeout(advance, delay);
    } else {
      const last = document.getElementById(steps[steps.length-1]);
      if (last) { last.classList.remove('act'); last.classList.add('done'); }
      setTimeout(() => processResults(), 400);
    }
  }
  advance();
}

async function processResults() {
  const d = fd;
  const imc  = calcIMC(d.peso, d.altura);
  const tmb  = calcTMB(d.peso, d.altura, d.idade, d.genero);
  const tdee = Math.round(tmb * (actFactor[d.nivel] || 1.55));
  const aguaML = Math.round(d.peso * 35);
  const imcS = imcStatus(imc);

  // Preenche UI
  document.getElementById('r-nm').textContent   = d.nome;
  document.getElementById('r-imc').textContent  = imc.toFixed(1);
  document.getElementById('r-imc-cat').textContent = imcS.cat;
  document.getElementById('r-tmb').textContent  = Math.round(tmb).toLocaleString('pt-BR');
  document.getElementById('r-tdee').textContent = tdee.toLocaleString('pt-BR');
  document.getElementById('r-agua').textContent = aguaML.toLocaleString('pt-BR');
  const imcBg = document.getElementById('r-imc-bg');
  if (imcBg) { imcBg.textContent = imcS.lbl; imcBg.className = `met-tag ${imcS.cls}`; }
  const badge = document.getElementById('r-badge');
  if (badge) { badge.textContent = imcS.lbl; badge.className = `score-pill ${imcS.cls === 'g' ? 'good' : imcS.cls === 'w' ? 'ok' : 'bad'}`; }

  const { fortes, atenc, rec } = buildAnalysis(d, imc, tmb, tdee, aguaML);
  renderListTo('r-fortes', fortes);
  renderListTo('r-atenc', atenc);
  renderListTo('r-rec', rec);

  // Gera treino inteligente
  const workoutPlan = buildSmartWorkout(d);
  renderWorkoutOnPage(workoutPlan);

  // Salva no Supabase (se veio de link)
  if (LINK_TOKEN) {
    await saveAssessmentToSupabase(d, imc, tmb, tdee, aguaML, workoutPlan);
  }

  show('s-res');
}

// ── ANÁLISE ───────────────────────────────────────────────────
function buildAnalysis(d, imc, tmb, tdee, aguaML) {
  const fortes = [], atenc = [], rec = [];

  if (d.sonoH >= 7) fortes.push({ ic:'g', sy:'◎', tx:`Sono adequado (${d.sonoH}h) — favorece a recuperação muscular.` });
  if ((d.agua || 0) >= 2) fortes.push({ ic:'g', sy:'◎', tx:`Hidratação regular (${d.agua}L/dia) suporta desempenho e metabolismo.` });
  if (d.frutas === 'diario') fortes.push({ ic:'g', sy:'◎', tx:'Consumo diário de frutas e verduras — excelente para micronutrientes.' });
  if (d.nivel === 'avancado') fortes.push({ ic:'g', sy:'◎', tx:'Nível avançado indica disciplina e base sólida para progressão.' });
  if (d.pers) fortes.push({ ic:'g', sy:'◎', tx:'Acompanhamento com personal trainer maximiza resultados e segurança.' });
  if (fortes.length === 0) fortes.push({ ic:'g', sy:'◎', tx:'Comprometimento com a avaliação é o primeiro passo para resultados.' });

  if ((d.sonoH || 0) < 6) atenc.push({ ic:'w', sy:'△', tx:`Sono insuficiente (${d.sonoH}h) compromete hormônios anabólicos e recuperação.` });
  if (d.stress === 'alto' || d.stress === 'muito-alto') atenc.push({ ic:'w', sy:'△', tx:'Estresse elevado eleva cortisol — priorize recuperação ativa e respiração.' });
  if ((d.agua || 0) < 1.5) atenc.push({ ic:'w', sy:'△', tx:`Hidratação abaixo do ideal. Meta recomendada: ${aguaML}ml/dia.` });
  if (d.indust === 'diario') atenc.push({ ic:'w', sy:'△', tx:'Consumo diário de industrializados dificulta controle calórico e aumenta inflamação.' });
  if ((d.doencas || []).length > 0) atenc.push({ ic:'w', sy:'△', tx:'Condições de saúde registradas — consulte seu médico antes de iniciar.' });
  if ((d.lesoes || []).length > 0) atenc.push({ ic:'w', sy:'△', tx:`Lesões registradas (${d.lesoes.join(', ')}): adapte exercícios com orientação profissional.` });
  if ((d.nivelDor || 0) >= 4) atenc.push({ ic:'w', sy:'△', tx:`Nível de dor ${d.nivelDor}/10 — avalie com médico antes de intensificar treinos.` });
  if (d.fuma) atenc.push({ ic:'w', sy:'△', tx:'Tabagismo reduz capacidade cardiorrespiratória e recuperação muscular.' });
  if (atenc.length === 0) atenc.push({ ic:'w', sy:'△', tx:'Nenhum ponto crítico identificado. Mantenha a consistência.' });

  const cals = d.obj === 'perder-peso' ? Math.round(tdee * 0.85) : d.obj === 'ganhar-massa' ? Math.round(tdee * 1.12) : tdee;
  rec.push({ ic:'i', sy:'→', tx:`Meta calórica: ${cals.toLocaleString('pt-BR')} kcal/dia para ${objLabel[d.obj] || d.obj}.` });
  rec.push({ ic:'i', sy:'→', tx:`Proteína diária: ${Math.round((d.peso||70) * 1.8)}–${Math.round((d.peso||70) * 2.2)}g para suportar treino ${nivLabel[d.nivel] || ''}.` });
  if ((d.daysSel || []).length > 0) rec.push({ ic:'i', sy:'→', tx:`Plano de ${d.daysSel.length} dias semanais gerado: ${d.daysSel.join(', ')}.` });
  if (d.objCurto) rec.push({ ic:'i', sy:'→', tx:`Curto prazo: "${d.objCurto}". Avalie progresso em 30 dias.` });

  return { fortes, atenc, rec };
}

// ── TREINO INTELIGENTE ────────────────────────────────────────
function buildSmartWorkout(d) {
  const dias   = d.daysSel?.length > 0 ? d.daysSel : ['Seg','Qua','Sex'];
  const lesoes = (d.lesoes || []).map(l => l.toLowerCase());
  const local  = d.local || 'academia';
  const nivel  = d.nivel || 'intermediario';
  const obj    = d.obj   || 'fitness-geral';
  const tempo  = d.tempo || 60;

  const hasJoelho   = lesoes.some(l => l.includes('joelho'));
  const hasOmbro    = lesoes.some(l => l.includes('ombro'));
  const hasColunaLombar = lesoes.some(l => l.includes('lombar') || l.includes('coluna'));
  const isCasa      = local === 'casa' || local === 'ar-livre';

  // Biblioteca de exercícios adaptada
  const ex = {
    peito:     isCasa
      ? [{n:'Flexão de Braço', s: nivel==='iniciante'?'3×10':'4×15', g:'PEITO'},{n:'Flexão Inclinada',s:'3×12',g:'PEITO'}]
      : (hasOmbro
          ? [{n:'Supino Reto Neutro',s:'3×12',g:'PEITO'},{n:'Crucifixo',s:'3×15',g:'PEITO'}]
          : [{n:'Supino Reto',s:'4×10-12',g:'PEITO'},{n:'Supino Inclinado',s:'3×10',g:'PEITO'},{n:'Crucifixo',s:'3×12-15',g:'PEITO'}]),
    costas:    isCasa
      ? [{n:'Remada com Elástico',s:'3×12',g:'COSTAS'},{n:'Superman',s:'3×15',g:'COSTAS'}]
      : [{n:'Puxada Frente',s:'4×10-12',g:'COSTAS'},{n:'Remada Curvada',s:'4×10',g:'COSTAS'},{n:'Remada Unilateral',s:'3×12',g:'COSTAS'}],
    biceps:    [{n:'Rosca Direta',s:'3×12',g:'BÍCEPS'},{n:'Rosca Martelo',s:'3×10',g:'BÍCEPS'}],
    triceps:   [{n:'Tríceps Corda',s:'3×12',g:'TRÍCEPS'},{n:'Tríceps Francês',s:'3×10',g:'TRÍCEPS'}],
    ombros:    hasOmbro
      ? [{n:'Elevação Lateral Leve',s:'3×15',g:'OMBROS'},{n:'Rotação Interna',s:'3×15',g:'OMBROS'}]
      : [{n:'Desenvolvimento',s:'4×10',g:'OMBROS'},{n:'Elevação Lateral',s:'3×15',g:'OMBROS'}],
    pernas:    hasJoelho
      ? [{n:'Leg Press 45°',s:'4×15',g:'QUAD'},{n:'Mesa Flexora',s:'3×15',g:'POSTERIOR'},{n:'Panturrilha',s:'4×20',g:'PANTUR'}]
      : (isCasa
          ? [{n:'Agachamento Livre',s:'4×15',g:'QUAD'},{n:'Afundo',s:'3×12',g:'QUAD'},{n:'Stiff',s:'3×15',g:'POSTERIOR'}]
          : [{n:'Agachamento Livre',s:'4×10-12',g:'QUAD'},{n:'Leg Press',s:'4×12',g:'QUAD'},{n:'Mesa Flexora',s:'3×12',g:'POSTERIOR'},{n:'Panturrilha',s:'4×15',g:'PANTUR'}]),
    core:      hasColunaLombar
      ? [{n:'Prancha',s:'3×30s',g:'CORE'},{n:'Bird Dog',s:'3×10',g:'CORE'}]
      : [{n:'Prancha',s:'3×60s',g:'CORE'},{n:'Abdominal Reto',s:'3×20',g:'CORE'},{n:'Oblíquo',s:'3×15',g:'CORE'}],
    cardio:    local === 'academia'
      ? [{n:'Esteira',s:`1×${Math.round(tempo*0.3)}min`,g:'CARDIO'},{n:'Bike Ergométrica',s:`1×${Math.round(tempo*0.2)}min`,g:'CARDIO'}]
      : [{n:'Caminhada Rápida',s:`1×${Math.round(tempo*0.4)}min`,g:'CARDIO'},{n:'HIIT',s:'8×30s',g:'CARDIO'}],
  };

  // Templates por objetivo
  const templates = {
    'ganhar-massa': [
      { grupo:'Peito + Tríceps',  exs: [...ex.peito, ...ex.triceps] },
      { grupo:'Costas + Bíceps',  exs: [...ex.costas, ...ex.biceps] },
      { grupo:'Pernas + Glúteos', exs: [...ex.pernas] },
      { grupo:'Ombros + Core',    exs: [...ex.ombros, ...ex.core] },
    ],
    'perder-peso': [
      { grupo:'Full Body A + Cardio', exs: [ex.pernas[0], ex.peito[0], ex.costas[0], ...ex.core, ex.cardio[0]] },
      { grupo:'Full Body B + Cardio', exs: [ex.pernas[1]||ex.pernas[0], ex.costas[1]||ex.costas[0], ex.ombros[0], ...ex.cardio] },
      { grupo:'HIIT + Core',          exs: [...ex.cardio, ...ex.core] },
    ],
    'fitness-geral': [
      { grupo:'Superior A',       exs: [...ex.peito, ...ex.costas.slice(0,1), ...ex.biceps.slice(0,1), ...ex.triceps.slice(0,1)] },
      { grupo:'Inferior',         exs: [...ex.pernas, ...ex.core.slice(0,2)] },
      { grupo:'Superior B + Core',exs: [...ex.ombros, ...ex.costas.slice(1), ...ex.core] },
    ],
    'resistencia': [
      { grupo:'Resistência + Força A', exs: [ex.cardio[0], ...ex.pernas.slice(0,2), ...ex.core] },
      { grupo:'HIIT + Força B',        exs: [...ex.cardio, ...ex.costas.slice(0,2), ...ex.ombros] },
      { grupo:'Endurance',             exs: [ex.cardio[1]||ex.cardio[0], ...ex.peito.slice(0,1), ...ex.core] },
    ],
  };

  const template = templates[obj] || templates['fitness-geral'];

  return dias.map((dia, i) => {
    const t = template[i % template.length];
    return {
      dia,
      grupo: t.grupo,
      exercicios: t.exs.filter(Boolean).map(e => ({ nome: e.n, series: e.s, grupo: e.g || '' }))
    };
  });
}

function renderWorkoutOnPage(plan) {
  document.getElementById('wk-container').innerHTML = renderWorkoutHTML(plan, true);
  // Abre primeiro dia
  const first = document.querySelector('#wk-container .wd');
  if (first) first.classList.add('open');
}

function renderWorkoutHTML(plan, withToggle = false) {
  return plan.map((day, i) => {
    const id = `wd${i}`;
    return `<div class="wd ${withToggle && i===0 ? 'open':''}" id="${id}">
      <div class="wd-hdr" onclick="toggleWD('${id}')">
        <div class="wd-left">
          <div class="wd-day">${day.dia}</div>
          <div class="wd-name">${day.grupo}</div>
          <div class="wd-meta">${day.exercicios.length} exercícios</div>
        </div>
        <div class="wd-chev"><svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg></div>
      </div>
      <div class="wd-exs">
        ${day.exercicios.map((ex, j) => `
          <div class="ex-row">
            <div class="ex-num">${String(j+1).padStart(2,'0')}</div>
            <div class="ex-inf"><div class="ex-n">${escHtml(ex.nome)}</div><div class="ex-d">${escHtml(ex.series)}</div></div>
            <div class="ex-tg">${escHtml(ex.grupo||'')}</div>
          </div>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function toggleWD(id) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('open');
}

// ── SALVAR NO SUPABASE ────────────────────────────────────────
async function saveAssessmentToSupabase(d, imc, tmb, tdee, aguaML, workoutPlan) {
  if (!LINK_TOKEN) return;

  const profId    = window._linkProfId;
  const studentId = window._linkStudentId;

  if (!profId || !studentId) {
    console.error('saveAssessmentToSupabase: profId ou studentId ausente');
    return;
  }

  const payload = {
    professional_id:  profId,
    student_id:       studentId,
    link_token:       LINK_TOKEN,
    nome: d.nome, idade: d.idade, genero: d.genero, altura: d.altura, peso: d.peso,
    objetivo: d.obj, peso_desejado: d.pesoDej || null, prazo: d.prazo,
    motivacao: d.motiv, nivel: d.nivel, dias_semana: d.dias,
    tem_personal: d.pers, tem_nutri: d.nutri,
    doencas: d.doencas, lesoes: d.lesoes, medicamentos: d.meds,
    sono_qualidade: d.sono, sono_horas: d.sonoH,
    estresse: d.stress, agua_litros: d.agua,
    frutas: d.frutas, industrializados: d.indust, alergias: d.aler,
    dias_disponiveis: d.daysSel, tempo_sessao: d.tempo, local_treino: d.local,
    anamnese: {
      pressao: d.pressao, sedentario: d.sedentario,
      cardioHist: d.cardioHist, fuma: d.fuma, alcool: d.alcool,
      esportes: d.esportes, cirurgias: d.cirurgias, nivelDor: d.nivelDor,
      objCurto: d.objCurto, objLongo: d.objLongo,
    },
    imc: +imc.toFixed(2),
    tmb: +tmb.toFixed(2),
    tdee,
    agua_ml: aguaML,
    imc_categoria: imcStatus(imc).lbl,
  };

  const { data: assessment, error } = await sb.from('assessments')
    .insert(payload)
    .select()
    .single();

  if (error || !assessment) {
    console.error('Erro ao salvar avaliação:', error);
    return;
  }

  clearDraft(); // Limpa rascunho após salvar com sucesso

  await sb.from('workout_plans').insert({
    assessment_id:   assessment.id,
    professional_id: profId,
    student_id:      studentId,
    plan:            workoutPlan,
    edited_manually: false,
  });
}

// ── RESUMO ────────────────────────────────────────────────────
function buildSummary() {
  const nome  = document.getElementById('f-nome').value.trim() || '—';
  const idade = document.getElementById('f-idade').value || '—';
  const alt   = document.getElementById('f-altura').value || '—';
  const peso  = document.getElementById('f-peso').value || '—';
  const gen   = document.getElementById('f-genero').value || '—';
  const obj   = selVal('og-obj') || '—';
  const niv   = selVal('og-niv') || '—';
  const dias  = document.getElementById('f-dias').value;
  const loc   = selVal('og-loc') || '—';

  document.getElementById('st9').innerHTML = `
    <div class="stp-eyebrow">Etapa 9</div>
    <div class="stp-t">Confirmar Dados</div>
    <div class="stp-s">Revise antes de processar sua avaliação.</div>
    <div class="sum-block">
      <div class="sum-head">Dados Pessoais</div>
      <div class="sum-row"><span class="s-lbl">Nome</span><span class="s-val">${escHtml(nome)}</span></div>
      <div class="sum-row"><span class="s-lbl">Idade</span><span class="s-val">${idade} anos</span></div>
      <div class="sum-row"><span class="s-lbl">Altura</span><span class="s-val">${alt} cm</span></div>
      <div class="sum-row"><span class="s-lbl">Peso</span><span class="s-val">${peso} kg</span></div>
      <div class="sum-row"><span class="s-lbl">Gênero</span><span class="s-val">${genLabel[gen]||gen}</span></div>
    </div>
    <div class="sum-block" style="margin-top:8px">
      <div class="sum-head">Treino & Objetivos</div>
      <div class="sum-row"><span class="s-lbl">Objetivo</span><span class="s-val">${objLabel[obj]||obj}</span></div>
      <div class="sum-row"><span class="s-lbl">Nível</span><span class="s-val">${nivLabel[niv]||niv}</span></div>
      <div class="sum-row"><span class="s-lbl">Dias / semana</span><span class="s-val">${dias}</span></div>
      <div class="sum-row"><span class="s-lbl">Local</span><span class="s-val">${locLabel[loc]||loc}</span></div>
    </div>
    <div class="notice-local" style="margin-top:12px">
      <span>⚿</span>
      <span>Dados salvos com segurança no sistema do seu profissional.</span>
    </div>`;
}

// ── PDF ───────────────────────────────────────────────────────
function exportPDF() {
  if (!fd || !fd.nome) { toast('Complete a avaliação primeiro'); return; }
  generatePDF(fd, currentProf);
}

function exportAssessmentPDF() {
  if (!currentAssessment) return;
  generatePDF(currentAssessment, currentProf);
}

function generatePDF(data, prof) {
  try {
    const jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDF) { toast('Erro: jsPDF não carregado'); return; }

    const doc   = new jsPDF({ unit:'pt', format:'a4' });
    const pW    = doc.internal.pageSize.getWidth();
    const pH    = doc.internal.pageSize.getHeight();
    const m     = 44;
    const maxW  = pW - m * 2;
    let y       = m;

    const addPage = () => { doc.addPage(); y = m; };
    const checkY  = (need) => { if (y + need > pH - m) addPage(); };

    const hex2rgb = (hex) => {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return [r,g,b];
    };

    const accent = prof?.primary_color || '#6366F1';
    const [ar,ag,ab] = hex2rgb(accent);

    // ── Cabeçalho
    doc.setFillColor(ar,ag,ab);
    doc.rect(0, 0, pW, 64, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(18);
    doc.setFont('helvetica','bold');
    doc.text(prof?.academy_name || 'Vitalis', m, 36);
    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.text('Avaliação Fitness', m, 52);

    // Data
    const dateStr = new Date().toLocaleDateString('pt-BR', {day:'2-digit',month:'long',year:'numeric'});
    doc.setFontSize(10);
    doc.text(dateStr, pW - m, 36, { align:'right' });

    y = 88;
    doc.setTextColor(0,0,0);

    // ── Nome e badge
    const nome = data.nome || 'Usuário';
    const imc  = +(data.imc || calcIMC(data.peso, data.altura));
    const imcS = imcStatus(imc);

    doc.setFontSize(20);
    doc.setFont('helvetica','bold');
    doc.text(nome, m, y);
    y += 20;

    doc.setFontSize(10);
    doc.setFont('helvetica','normal');
    doc.setTextColor(120,120,120);
    doc.text(imcS.lbl, m, y);
    y += 24;

    // ── Métricas (grid 2x2)
    doc.setTextColor(0,0,0);
    const metW = (maxW - 12) / 2;
    const metrics = [
      { lbl:'IMC', val: imc.toFixed(1), unit: imcS.cat },
      { lbl:'TMB', val: Math.round(data.tmb || calcTMB(data.peso,data.altura,data.idade,data.genero)).toLocaleString('pt-BR'), unit:'kcal/dia' },
      { lbl:'TDEE', val: Math.round(data.tdee || 0).toLocaleString('pt-BR'), unit:'kcal/dia' },
      { lbl:'Hidratação', val: (data.agua_ml || Math.round((data.peso||70)*35)).toLocaleString('pt-BR'), unit:'ml/dia' },
    ];

    metrics.forEach((met, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const mx = m + col * (metW + 12);
      const my = y + row * 70;

      doc.setFillColor(248,249,250);
      doc.roundedRect(mx, my, metW, 58, 4, 4, 'F');
      doc.setFontSize(9);
      doc.setTextColor(140,140,140);
      doc.setFont('helvetica','bold');
      doc.text(met.lbl.toUpperCase(), mx + 12, my + 18);
      doc.setFontSize(20);
      doc.setFont('helvetica','bold');
      doc.setTextColor(20,20,20);
      doc.text(met.val, mx + 12, my + 38);
      doc.setFontSize(9);
      doc.setFont('helvetica','normal');
      doc.setTextColor(160,160,160);
      doc.text(met.unit, mx + 12, my + 52);
    });

    y += 160;

    // ── Seção helper
    const writeSection = (title, items, color) => {
      checkY(40 + items.length * 20);
      doc.setFontSize(11);
      doc.setFont('helvetica','bold');
      doc.setTextColor(...color);
      doc.text(title, m, y);
      y += 16;
      doc.setFontSize(10);
      doc.setFont('helvetica','normal');
      doc.setTextColor(60,60,60);
      items.forEach(it => {
        const lines = doc.splitTextToSize('• ' + (it.tx || it), maxW - 8);
        checkY(14 * lines.length);
        doc.text(lines, m + 4, y);
        y += 14 * lines.length;
      });
      y += 10;
    };

    // ── Análise
    const nome2 = data.nome;
    const tmb2  = data.tmb || calcTMB(data.peso,data.altura,data.idade,data.genero);
    const tdee2 = +data.tdee || Math.round((+calcTMB(+data.peso,+data.altura,+data.idade,data.genero)) * (actFactor[data.nivel] || 1.55));
    const aguaML2 = data.agua_ml || Math.round((data.peso||70)*35);
    const { fortes, atenc, rec } = buildAnalysis(
      {
        ...data,
        peso:    +data.peso    || 70,
        altura:  +data.altura  || 170,
        idade:   +data.idade   || 25,
        agua:    +data.agua_litros || +data.agua || 2,
        sonoH:   +data.sono_horas  || +data.sonoH || 7,
        daysSel: data.dias_disponiveis || data.daysSel || [],
        local:   data.local_treino || data.local,
        nivel:   data.nivel,
        obj:     data.objetivo || data.obj,
      },
      imc,
      +tmb2,
      +tdee2,
      +aguaML2
    );

    writeSection('Pontos Fortes', fortes, [5, 150, 105]);
    writeSection('Pontos de Atenção', atenc, [180, 120, 0]);
    writeSection('Recomendações', rec, [ar,ag,ab]);

    // ── Plano de Treino
    let plan = [];
    if (currentWorkout?.plan) {
      plan = currentWorkout.plan;
    } else if (data.daysSel || data.dias_disponiveis) {
      plan = buildSmartWorkout({ ...data, daysSel: data.dias_disponiveis||data.daysSel||[], local: data.local_treino||data.local||'academia', nivel: data.nivel||'intermediario', obj: data.objetivo||data.obj||'fitness-geral', tempo: data.tempo_sessao||data.tempo||60 });
    }

    if (plan.length > 0) {
      checkY(32);
      doc.setFontSize(13);
      doc.setFont('helvetica','bold');
      doc.setTextColor(ar,ag,ab);
      doc.text('Plano de Treino', m, y);
      y += 20;

      plan.forEach(day => {
        checkY(44);
        doc.setFillColor(ar,ag,ab);
        doc.rect(m, y - 13, 3, 16, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica','bold');
        doc.setTextColor(20,20,20);
        doc.text(`${day.dia} — ${day.grupo}`, m + 10, y);
        y += 18;
        doc.setFontSize(9);
        doc.setFont('helvetica','normal');
        doc.setTextColor(80,80,80);
        (day.exercicios || []).forEach(ex => {
          checkY(14);
          const line = `   ${ex.nome}  ${ex.series}${ex.grupo ? '  · ' + ex.grupo : ''}`;
          doc.text(line, m, y);
          y += 13;
        });
        y += 8;
      });
    }

    // ── Rodapé
    const totalPages = doc.internal.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(180,180,180);
      doc.text(`Gerado pelo Vitalis${prof?.name ? ' · ' + prof.name : ''} · Página ${p} de ${totalPages}`, pW/2, pH - 20, { align:'center' });
    }

    const safe = nome.replace(/[^a-zA-Z0-9 _-]/g,'').trim() || 'avaliacao';
    doc.save(`${safe}_vitalis.pdf`);
    toast('PDF gerado com sucesso');
  } catch(e) {
    console.error(e);
    toast('Erro ao gerar PDF');
  }
}

// ── WHATSAPP ──────────────────────────────────────────────────
function shareWA() {
  if (!fd || !fd.nome) { toast('Complete a avaliação primeiro'); return; }
  const imc  = calcIMC(fd.peso, fd.altura);
  const tmb  = Math.round(calcTMB(fd.peso, fd.altura, fd.idade, fd.genero));
  const tdee = Math.round(tmb * (actFactor[fd.nivel] || 1.55));
  const imcS = imcStatus(imc);
  const cals = fd.obj === 'perder-peso' ? Math.round(tdee*0.85) : fd.obj === 'ganhar-massa' ? Math.round(tdee*1.12) : tdee;

  const days = (fd.daysSel||[]).join(', ') || 'A definir';
  const lesoes = (fd.lesoes||[]).length > 0 ? fd.lesoes.join(', ') : 'Nenhuma';

  const msg = [
    `*Vitalis — Avaliação Fitness*`,
    ``,
    `👤 *${fd.nome}*`,
    `📅 ${new Date().toLocaleDateString('pt-BR')}`,
    ``,
    `*📊 Métricas*`,
    `IMC: ${imc.toFixed(1)} — ${imcS.lbl}`,
    `Peso: ${fd.peso}kg | Altura: ${fd.altura}cm`,
    `TMB: ${tmb.toLocaleString('pt-BR')} kcal/dia`,
    `TDEE: ${tdee.toLocaleString('pt-BR')} kcal/dia`,
    `Hidratação: ${Math.round(fd.peso*35).toLocaleString('pt-BR')} ml/dia`,
    ``,
    `*🎯 Objetivo*`,
    `${objLabel[fd.obj]||fd.obj} — Meta: ${cals.toLocaleString('pt-BR')} kcal/dia`,
    `Prazo: ${fd.prazo || 'Não definido'}`,
    ``,
    `*💪 Treino*`,
    `Nível: ${nivLabel[fd.nivel]||fd.nivel}`,
    `Dias: ${days}`,
    `Duração: ${fd.tempo}min/sessão`,
    `Local: ${locLabel[fd.local]||fd.local}`,
    ``,
    `*🏥 Saúde*`,
    `Sono: ${fd.sonoH}h/noite (${fd.sono})`,
    `Estresse: ${fd.stress}`,
    `Lesões: ${lesoes}`,
    ``,
    `_Gerado pelo Vitalis Fitness OS_`,
  ].join('\n');

  window.open('https://wa.me/?text=' + encodeURIComponent(msg), '_blank');
}

// ── RESET AVALIAÇÃO ───────────────────────────────────────────
function resetAssessment() {
  fd = {}; step = 1;
  ['f-nome','f-idade','f-altura','f-peso','f-pdej','f-mot','f-obj-curto','f-obj-longo','f-pressao'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  ['f-genero','f-prazo','f-sedentario'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.querySelectorAll('.ob.sel').forEach(b => b.classList.remove('sel'));
  document.querySelectorAll('.day-btn.sel').forEach(b => b.classList.remove('sel'));
  document.querySelectorAll('.tgl.on').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.tag-item').forEach(t => t.remove());
  document.querySelectorAll('.pain-btn').forEach(b => b.classList.remove('sel'));
  document.querySelector('.pain-btn[data-pain="0"]')?.classList.add('sel');
  ['ow-frut','ow-ind','ow-tmp','og-loc'].forEach(gid => {
    const defs = { 'ow-frut':'diario','ow-ind':'nunca','ow-tmp':'60','og-loc':'academia' };
    document.querySelector(`#${gid} [data-v="${defs[gid]}"]`)?.classList.add('sel');
  });
  ['ls1','ls2','ls3','ls4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('act','done');
  });
  show('s-hero');
}

// ── HELPERS ───────────────────────────────────────────────────
function renderListTo(id, items) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map(i => `<div class="a-item"><div class="a-ic ${i.ic}">${i.sy}</div><div>${i.tx}</div></div>`).join('');
}

function escHtml(s) {
  if (typeof s !== 'string') return String(s || '');
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(s));
  return d.innerHTML;
}

function openModal(id)  { const el = document.getElementById(id); if (el) el.classList.add('on'); }
function closeModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('on'); }

function toast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(t._tid);
  t._tid = setTimeout(() => t.classList.remove('on'), 2800);
}

// Prevent double-tap zoom iOS
let _lt = 0;
document.addEventListener('touchend', function(e) {
  const now = Date.now();
  const tag = e.target.tagName;
  if (now - _lt < 350 && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') e.preventDefault();
  _lt = now;
}, { passive: false });

// Globals
window.startForm       = startForm;
window.nextStp         = nextStp;
window.prevStp         = prevStp;
window.show            = show;
window.tgl             = tgl;
window.addTag          = addTag;
window.exportPDF       = exportPDF;
window.exportAssessmentPDF = exportAssessmentPDF;
window.shareWA         = shareWA;
window.resetAssessment = resetAssessment;
window.toggleWD        = toggleWD;
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  const isPass = inp.type === 'password';
  inp.type = isPass ? 'text' : 'password';
  btn.style.color = isPass ? 'var(--a2)' : 'var(--t3)';
}
window.togglePass = togglePass;
window.doLogin         = doLogin;
window.doRegister      = doRegister;
window.doLogout        = doLogout;
window.showAuthPanel   = showAuthPanel;
window.openAddStudent  = openAddStudent;
window.openEditStudent = openEditStudent;
window.saveStudent     = saveStudent;
window.deleteStudent   = deleteStudent;
window.openStudentDetail = openStudentDetail;
window.openSendLink    = openSendLink;
window.generateLink    = generateLink;
window.copyLink        = copyLink;
window.sendLinkWA      = sendLinkWA;
window.closeModal      = closeModal;
window.closeModalStudent = closeModalStudent;
window.closeModalLink  = closeModalLink;
window.closeModalProfile = closeModalProfile;
window.switchTab       = switchTab;
window.dashNav         = dashNav;
window.openAssessmentView = openAssessmentView;
window.openWorkoutEditor = openWorkoutEditor;
window.addExercise     = addExercise;
window.removeExercise  = removeExercise;
window.saveWorkoutEdit = saveWorkoutEdit;
window.openProfileEdit = openProfileEdit;
window.saveProfile     = saveProfile;
window.updatePrimaryColor = updatePrimaryColor;
window.toggleThemeDash = toggleThemeDash;
