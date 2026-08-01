/* ============================================================
   app.js — shared UI helpers used by admin.js / trainer.js / member.js
   ============================================================ */

/* Wires up sidebar nav buttons to show/hide .section panels */
function initNav() {
  const buttons = document.querySelectorAll('.nav button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.section).classList.add('active');
    });
  });
}

/* Renders the heart-rate pulse divider used once under each page header */
function injectPulse(el) {
  el.innerHTML = `
    <svg class="pulse" viewBox="0 0 600 24" preserveAspectRatio="none">
      <path d="M0,12 L160,12 L180,4 L200,20 L220,2 L240,22 L260,12 L600,12" />
    </svg>`;
}

/* Generic table renderer: rows is an array of arrays of strings/HTML */
function renderTable(bodyEl, rows, colCount, emptyLabel) {
  if (!rows.length) {
    bodyEl.innerHTML = `<tr class="empty-row"><td colspan="${colCount}">${emptyLabel || 'No records yet'}</td></tr>`;
    return;
  }
  bodyEl.innerHTML = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
}

function statusBadge(status) {
  const cls = ['Active', 'Paid', 'Working'].includes(status) ? 'ok'
            : ['Inactive', 'Pending', 'Maintenance'].includes(status) ? 'warn'
            : 'neutral';
  return `<span class="badge ${cls}">${status}</span>`;
}
