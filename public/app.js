const loginPanel = document.getElementById('login-panel');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout');
const refreshBtn = document.getElementById('refresh');
const toggleRuntimeBtn = document.getElementById('toggle-runtime');
const resetBtn = document.getElementById('reset-wallets');
const downloadBtn = document.getElementById('download-wallets');
const runtimeStatus = document.getElementById('runtime-status');
const actionError = document.getElementById('action-error');
const nextSendTime = document.getElementById('next-send-time');
const nextSendCountdown = document.getElementById('next-send-countdown');
const totalConfirmedField = document.getElementById('total-confirmed');
const saveConfigBtn = document.getElementById('save-config');
const configStatus = document.getElementById('config-status');
const configInputs = {
  tokenContract: document.getElementById('config-token-contract'),
  amount: document.getElementById('config-amount'),
  senderKey: document.getElementById('config-sender-key'),
  dailyTarget: document.getElementById('config-daily-target'),
  totalTarget: document.getElementById('config-total-target'),
};

const fields = {
  total: document.getElementById('total-wallets'),
  unused: document.getElementById('unused-wallets'),
  reserved: document.getElementById('reserved-wallets'),
  used: document.getElementById('used-wallets'),
  tbody: document.getElementById('dist-body'),
  tokenContract: document.getElementById('token-contract'),
  distributionAmount: document.getElementById('distribution-amount'),
  dailyTarget: document.getElementById('daily-target'),
  totalTarget: document.getElementById('total-target'),
  senderKey: document.getElementById('sender-key'),
};

function getToken() {
  return localStorage.getItem('authToken');
}

function setToken(token) {
  localStorage.setItem('authToken', token);
}

function clearToken() {
  localStorage.removeItem('authToken');
}

function showDashboard() {
  loginPanel.classList.add('hidden');
  dashboard.classList.remove('hidden');
}

function showLogin() {
  dashboard.classList.add('hidden');
  loginPanel.classList.remove('hidden');
}

async function apiGet(path) {
  const token = getToken();
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

async function apiPost(path, payload) {
  const token = getToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

function setActionError(message) {
  if (actionError) {
    actionError.textContent = message || '';
  }
}

function setConfigStatus(message) {
  if (configStatus) {
    configStatus.textContent = message || '';
  }
}

async function loadSummary() {
  const data = await apiGet('/api/wallets/summary');
  fields.total.textContent = data.total;
  fields.unused.textContent = data.unused;
  fields.reserved.textContent = data.reserved;
  fields.used.textContent = data.used;
}

function updateRuntimeUi(running) {
  if (!runtimeStatus || !toggleRuntimeBtn) return;
  runtimeStatus.textContent = running ? 'Running' : 'Stopped';
  runtimeStatus.classList.toggle('stopped', !running);
  toggleRuntimeBtn.textContent = running ? 'Stop' : 'Start';
  toggleRuntimeBtn.dataset.running = running ? 'true' : 'false';
}

let nextSendAtValue = null;
let countdownTimer = null;

function formatCountdown(target) {
  if (!target) return '-';
  const diffMs = target - Date.now();
  if (diffMs <= 0) return 'Now';
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (v) => String(v).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function updateCountdown() {
  if (!nextSendCountdown) return;
  if (!nextSendAtValue) {
    nextSendCountdown.textContent = '-';
    return;
  }
  nextSendCountdown.textContent = formatCountdown(nextSendAtValue);
}

async function loadRuntimeStatus() {
  const data = await apiGet('/api/admin/status');
  updateRuntimeUi(Boolean(data.running));
  if (nextSendTime) {
    nextSendAtValue = data.nextSendAt ? new Date(data.nextSendAt).getTime() : null;
    nextSendTime.textContent = data.nextSendAt
      ? new Date(data.nextSendAt).toLocaleString()
      : '-';
  }
  if (totalConfirmedField) {
    totalConfirmedField.textContent =
      typeof data.totalConfirmed === 'number' ? data.totalConfirmed : '-';
  }
  updateCountdown();
  if (!countdownTimer) {
    countdownTimer = setInterval(updateCountdown, 1000);
  }
}

async function loadConfig() {
  const data = await apiGet('/api/admin/config');
  fields.tokenContract.textContent = data.tokenContract || '-';
  fields.distributionAmount.textContent = data.distributionAmount || '-';
  if (fields.dailyTarget) {
    fields.dailyTarget.textContent = data.dailyTarget ?? '-';
  }
  if (fields.totalTarget) {
    fields.totalTarget.textContent = data.totalTarget ?? '-';
  }
  if (fields.senderKey) {
    fields.senderKey.textContent = data.senderPrivateKeyMasked || '-';
  }
  if (configInputs.tokenContract) {
    configInputs.tokenContract.value = data.tokenContract || '';
  }
  if (configInputs.amount) {
    configInputs.amount.value = data.distributionAmount || '';
  }
  if (configInputs.dailyTarget) {
    configInputs.dailyTarget.value = data.dailyTarget ?? '';
  }
  if (configInputs.totalTarget) {
    configInputs.totalTarget.value = data.totalTarget ?? '';
  }
  if (configInputs.senderKey) {
    configInputs.senderKey.value = '';
  }
}

function formatHash(hash) {
  if (!hash) return '-';
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

async function loadDistributions() {
  const data = await apiGet('/api/distributions/recent');
  fields.tbody.innerHTML = '';
  data.forEach((row) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${row.walletId || '-'}</td>
      <td>${row.amount}</td>
      <td>${row.status}</td>
      <td>${new Date(row.scheduledFor).toLocaleString()}</td>
      <td>${formatHash(row.txHash)}</td>
    `;
    fields.tbody.appendChild(tr);
  });
}

async function loadDashboard() {
  await loadSummary();
  await loadDistributions();
  await loadConfig();
  await loadRuntimeStatus();
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.textContent = '';

  const form = new FormData(loginForm);
  const payload = {
    userId: form.get('userId'),
    password: form.get('password'),
  };

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error('Login failed');
    const data = await res.json();
    setToken(data.token);
    showDashboard();
    await loadDashboard();
  } catch (err) {
    loginError.textContent = 'Invalid credentials or server error.';
  }
});

logoutBtn.addEventListener('click', () => {
  clearToken();
  showLogin();
});

refreshBtn.addEventListener('click', async () => {
  await loadDashboard();
});

if (toggleRuntimeBtn) {
  toggleRuntimeBtn.addEventListener('click', async () => {
    setActionError('');
    try {
      const running = toggleRuntimeBtn.dataset.running === 'true';
      if (running) {
        await apiPost('/api/admin/stop');
      } else {
        await apiPost('/api/admin/start');
      }
      await loadRuntimeStatus();
    } catch (err) {
      setActionError('Failed to update runtime state.');
    }
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', async () => {
    setActionError('');
    const ok = confirm(
      'This will delete all wallets and distributions, then regenerate the wallet pool. Continue?'
    );
    if (!ok) return;
    try {
      await apiPost('/api/admin/reset');
      await loadDashboard();
    } catch (err) {
      setActionError('Reset failed.');
    }
  });
}

if (downloadBtn) {
  downloadBtn.addEventListener('click', async () => {
    setActionError('');
    try {
      const token = getToken();
      const res = await fetch('/api/admin/wallets/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const match = /filename=([^;]+)/i.exec(disposition);
      const filename = match ? match[1].replace(/"/g, '') : 'wallets.csv';

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setActionError('Download failed.');
    }
  });
}

if (saveConfigBtn) {
  saveConfigBtn.addEventListener('click', async () => {
    setConfigStatus('');
    setActionError('');
    try {
      const payload = {
        tokenContract: configInputs.tokenContract?.value?.trim(),
        distributionAmount: configInputs.amount?.value?.trim(),
        treasuryPrivateKey: configInputs.senderKey?.value?.trim(),
        dailyDistributionTarget: Number(configInputs.dailyTarget?.value),
        totalDistributionTarget: Number(configInputs.totalTarget?.value),
      };
      await apiPost('/api/admin/config', payload);
      setConfigStatus('Saved.');
      await loadConfig();
    } catch (err) {
      setConfigStatus('Save failed.');
    }
  });
}

if (getToken()) {
  showDashboard();
  loadDashboard().catch(() => showLogin());
} else {
  showLogin();
}
