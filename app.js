/**
 * Modern Invoice Maker - Core JS Application
 */

// Blank Personal Details Defaults
const DEFAULT_PERSONAL_DETAILS = {
  name: '',
  address: '',
  email: '',
  abn: '',
  bankName: '',
  bankAcc: '',
  bankHolder: '',
  bsb: ''
};

// Blank Initial Invoice Draft
const DEFAULT_INVOICE_DRAFT = {
  id: null,
  invNo: 'INV-T001',
  date: formatDateToReadable(new Date()),
  to: '',
  instructions: '',
  paymentTerms: '7 days',
  gstOption: 'NO GST',
  items: [
    { desc: '', qty: 1, rate: 0, amount: 0 }
  ]
};

// Application State
let currentPersonalDetails = {};
let currentInvoice = JSON.parse(JSON.stringify(DEFAULT_INVOICE_DRAFT));
let savedInvoices = [];
let previewZoom = 100;

// LocalStorage Keys
const STORAGE_KEY_PERSONAL = 'invoice_maker_personal_details_v1';
const STORAGE_KEY_HISTORY = 'invoice_maker_history_v1';

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    lucide.createIcons();
  }

  loadPersonalDetails();
  loadInvoiceHistory();
  bindEvents();
  renderFormFromState();
  renderItems();
  updatePreview();
});

/* ==========================================================================
   State Management & Local Storage
   ========================================================================== */

function loadPersonalDetails() {
  const stored = localStorage.getItem(STORAGE_KEY_PERSONAL);
  if (stored) {
    try {
      currentPersonalDetails = JSON.parse(stored);
    } catch (e) {
      currentPersonalDetails = { ...DEFAULT_PERSONAL_DETAILS };
    }
  } else {
    currentPersonalDetails = { ...DEFAULT_PERSONAL_DETAILS };
  }
  updatePersonalDetailsViews();
}

function savePersonalDetailsToStorage() {
  localStorage.setItem(STORAGE_KEY_PERSONAL, JSON.stringify(currentPersonalDetails));
}

function loadInvoiceHistory() {
  const stored = localStorage.getItem(STORAGE_KEY_HISTORY);
  if (stored) {
    try {
      savedInvoices = JSON.parse(stored);
    } catch (e) {
      savedInvoices = [];
    }
  } else {
    savedInvoices = [];
  }
  updateHistoryCount();
}

function saveInvoiceHistoryToStorage() {
  localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(savedInvoices));
  updateHistoryCount();
}

function updateHistoryCount() {
  const countEl = document.getElementById('history-count');
  if (countEl) {
    countEl.textContent = savedInvoices.length;
  }
}

/* ==========================================================================
   Event Listeners & Form Binding
   ========================================================================== */

function bindEvents() {
  // Invoice Input Change Listeners
  document.getElementById('input-inv-no').addEventListener('input', (e) => {
    currentInvoice.invNo = e.target.value;
    updatePreview();
  });
  document.getElementById('input-date').addEventListener('input', (e) => {
    currentInvoice.date = e.target.value;
    updatePreview();
  });
  document.getElementById('input-to').addEventListener('input', (e) => {
    currentInvoice.to = e.target.value;
    updatePreview();
  });
  document.getElementById('input-instructions').addEventListener('input', (e) => {
    currentInvoice.instructions = e.target.value;
    updatePreview();
  });
  document.getElementById('input-payment-terms').addEventListener('input', (e) => {
    currentInvoice.paymentTerms = e.target.value;
    updatePreview();
  });
  document.getElementById('select-gst').addEventListener('change', (e) => {
    currentInvoice.gstOption = e.target.value;
    updatePreview();
  });

  // Add Item Row
  document.getElementById('btn-add-item').addEventListener('click', () => {
    currentInvoice.items.push({ desc: '', amount: 0 });
    renderItems();
    updatePreview();
  });

  // Modal Controls - Personal Details
  const personalModal = document.getElementById('modal-personal');
  document.getElementById('btn-personal-modal').addEventListener('click', () => openPersonalModal());
  document.getElementById('btn-quick-edit-personal').addEventListener('click', () => openPersonalModal());
  document.getElementById('close-personal-modal').addEventListener('click', () => closePersonalModal());

  // Personal Details Form Submit
  document.getElementById('form-personal-details').addEventListener('submit', (e) => {
    e.preventDefault();
    currentPersonalDetails = {
      name: document.getElementById('p-name').value,
      address: document.getElementById('p-address').value,
      email: document.getElementById('p-email').value,
      abn: document.getElementById('p-abn').value,
      bankName: document.getElementById('p-bank-name').value,
      bankAcc: document.getElementById('p-bank-acc').value,
      bankHolder: document.getElementById('p-bank-holder').value,
      bsb: document.getElementById('p-bsb').value
    };
    savePersonalDetailsToStorage();
    updatePersonalDetailsViews();
    closePersonalModal();
    showToast('Personal details updated successfully!');
  });

  // Reset Personal Details to Defaults
  document.getElementById('btn-reset-personal-defaults').addEventListener('click', () => {
    if (confirm('Reset personal details to initial default settings?')) {
      currentPersonalDetails = { ...DEFAULT_PERSONAL_DETAILS };
      savePersonalDetailsToStorage();
      populatePersonalModalForm();
      updatePersonalDetailsViews();
      showToast('Personal details reset to default.');
    }
  });

  // Modal Controls - History
  document.getElementById('btn-history-modal').addEventListener('click', () => openHistoryModal());
  document.getElementById('close-history-modal').addEventListener('click', () => closeHistoryModal());

  // Invoice Action Buttons
  document.getElementById('btn-save-invoice').addEventListener('click', () => saveCurrentInvoice());
  document.getElementById('btn-new-invoice').addEventListener('click', () => createNewInvoiceDraft());
  document.getElementById('btn-duplicate-invoice').addEventListener('click', () => duplicateInvoice());
  document.getElementById('btn-download-pdf').addEventListener('click', () => downloadPDF());
  document.getElementById('btn-print').addEventListener('click', () => window.print());

  // Zoom Controls
  document.getElementById('btn-zoom-in').addEventListener('click', () => adjustZoom(10));
  document.getElementById('btn-zoom-out').addEventListener('click', () => adjustZoom(-10));
  document.getElementById('btn-reset-zoom').addEventListener('click', () => resetZoom());

  // Close modals when clicking overlay background
  [personalModal, document.getElementById('modal-history')].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

/* ==========================================================================
   Items List Renderer
   ========================================================================== */

function renderItems() {
  const container = document.getElementById('items-container');
  const badge = document.getElementById('items-badge');
  if (badge) {
    badge.textContent = currentInvoice.items.length;
  }

  container.innerHTML = '';

  currentInvoice.items.forEach((item, index) => {
    // Ensure item properties exist
    const qty = item.qty !== undefined ? item.qty : 1;
    const amount = item.amount !== undefined ? item.amount : 0;
    const rate = item.rate !== undefined ? item.rate : (qty ? amount / qty : amount);

    item.qty = qty;
    item.rate = rate;
    item.amount = amount;

    const row = document.createElement('div');
    row.className = 'item-card-vertical';
    row.innerHTML = `
      <div class="item-card-header">
        <span class="item-card-title"><i data-lucide="layers"></i> Item #${index + 1}</span>
        <div class="row-actions">
          <button class="btn-icon-sm btn-move-up" title="Move Up" ${index === 0 ? 'disabled' : ''}>
            <i data-lucide="chevron-up"></i>
          </button>
          <button class="btn-icon-sm btn-move-down" title="Move Down" ${index === currentInvoice.items.length - 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-down"></i>
          </button>
          <button class="btn-icon-sm btn-duplicate-item" title="Duplicate Row">
            <i data-lucide="copy"></i>
          </button>
          <button class="btn-icon-sm btn-danger btn-remove-item" title="Delete Row">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
      <div class="item-card-body">
        <div class="form-group full-width">
          <label>Description</label>
          <input type="text" class="input-desc" placeholder="e.g. Milestone 'Onboard P1'" value="${escapeHtml(item.desc)}">
        </div>
        <div class="item-card-metrics">
          <div class="form-group">
            <label>Qty</label>
            <input type="number" min="1" step="1" class="input-qty" placeholder="1" value="${qty}">
          </div>
          <div class="form-group">
            <label>Rate ($)</label>
            <input type="number" step="0.01" class="input-rate" placeholder="0.00" value="${rate || ''}">
          </div>
          <div class="form-group">
            <label>Total ($)</label>
            <input type="number" step="0.01" class="input-amount" placeholder="0.00" value="${amount || ''}">
          </div>
        </div>
      </div>
    `;

    const descInput = row.querySelector('.input-desc');
    const qtyInput = row.querySelector('.input-qty');
    const rateInput = row.querySelector('.input-rate');
    const amountInput = row.querySelector('.input-amount');
    const moveUpBtn = row.querySelector('.btn-move-up');
    const moveDownBtn = row.querySelector('.btn-move-down');
    const dupBtn = row.querySelector('.btn-duplicate-item');
    const removeBtn = row.querySelector('.btn-remove-item');

    // Sync Description
    descInput.addEventListener('input', (e) => {
      currentInvoice.items[index].desc = e.target.value;
      updatePreview();
    });

    // Qty change -> Update Amount (Amount = Qty * Rate)
    qtyInput.addEventListener('input', (e) => {
      const q = Math.max(1, parseFloat(e.target.value) || 1);
      currentInvoice.items[index].qty = q;
      const r = currentInvoice.items[index].rate || 0;
      const newAmount = q * r;
      currentInvoice.items[index].amount = newAmount;
      amountInput.value = newAmount ? newAmount : '';
      updatePreview();
    });

    // Rate change -> Update Amount (Amount = Qty * Rate)
    rateInput.addEventListener('input', (e) => {
      const r = parseFloat(e.target.value) || 0;
      currentInvoice.items[index].rate = r;
      const q = currentInvoice.items[index].qty || 1;
      const newAmount = q * r;
      currentInvoice.items[index].amount = newAmount;
      amountInput.value = newAmount ? newAmount : '';
      updatePreview();
    });

    // Direct Amount change -> Update Rate (Rate = Amount / Qty)
    amountInput.addEventListener('input', (e) => {
      const a = parseFloat(e.target.value) || 0;
      currentInvoice.items[index].amount = a;
      const q = currentInvoice.items[index].qty || 1;
      const newRate = q ? a / q : a;
      currentInvoice.items[index].rate = newRate;
      rateInput.value = newRate ? newRate : '';
      updatePreview();
    });

    // Move Up
    moveUpBtn.addEventListener('click', () => {
      if (index > 0) {
        const temp = currentInvoice.items[index];
        currentInvoice.items[index] = currentInvoice.items[index - 1];
        currentInvoice.items[index - 1] = temp;
        renderItems();
        updatePreview();
      }
    });

    // Move Down
    moveDownBtn.addEventListener('click', () => {
      if (index < currentInvoice.items.length - 1) {
        const temp = currentInvoice.items[index];
        currentInvoice.items[index] = currentInvoice.items[index + 1];
        currentInvoice.items[index + 1] = temp;
        renderItems();
        updatePreview();
      }
    });

    // Duplicate
    dupBtn.addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(currentInvoice.items[index]));
      currentInvoice.items.splice(index + 1, 0, copy);
      renderItems();
      updatePreview();
      showToast('Row duplicated');
    });

    // Remove
    removeBtn.addEventListener('click', () => {
      if (currentInvoice.items.length <= 1) {
        showToast('Invoice must have at least one line item.', 'error');
        return;
      }
      currentInvoice.items.splice(index, 1);
      renderItems();
      updatePreview();
    });

    container.appendChild(row);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

/* ==========================================================================
   Live Preview Sync & Calculations
   ========================================================================== */

function updatePreview() {
  // Sync text elements
  document.getElementById('view-inv-no').textContent = currentInvoice.invNo || '';
  document.getElementById('view-date').textContent = currentInvoice.date || '';
  document.getElementById('view-to').textContent = currentInvoice.to || '';
  document.getElementById('view-instructions').textContent = currentInvoice.instructions || '';
  document.getElementById('view-payment-terms').textContent = currentInvoice.paymentTerms || '';

  // Render Table Items in Document View
  const tbody = document.getElementById('view-items-body');
  tbody.innerHTML = '';

  let subtotal = 0;
  currentInvoice.items.forEach(item => {
    const amt = parseFloat(item.amount) || 0;
    subtotal += amt;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-desc">${escapeHtml(item.desc)}</td>
      <td class="td-amount">$${formatNumber(amt)}</td>
    `;
    tbody.appendChild(tr);
  });

  // Calculate GST & Totals
  let gstAmount = 0;
  let totalDue = subtotal;
  let gstLabelText = '(NO GST)';

  if (currentInvoice.gstOption === 'INCLUDES GST 10%') {
    gstAmount = subtotal / 11;
    gstLabelText = `(INCLUDES GST 10%: $${formatNumber(gstAmount)})`;
    totalDue = subtotal;
  } else if (currentInvoice.gstOption === 'EXCLUDES GST 10%') {
    gstAmount = subtotal * 0.1;
    gstLabelText = `(+ 10% GST: $${formatNumber(gstAmount)})`;
    totalDue = subtotal + gstAmount;
  }

  document.getElementById('view-subtotal').textContent = formatNumber(subtotal);
  document.getElementById('view-gst-label').textContent = gstLabelText;
  document.getElementById('view-total-due').textContent = `$${formatNumber(totalDue)}`;
}

function updatePersonalDetailsViews() {
  // Update Preview Document Fields
  document.getElementById('view-name').textContent = currentPersonalDetails.name || '';
  document.getElementById('view-address').textContent = currentPersonalDetails.address || '';
  document.getElementById('view-email').textContent = currentPersonalDetails.email || '';
  document.getElementById('view-abn').textContent = currentPersonalDetails.abn || '';
  document.getElementById('view-bank-name').textContent = currentPersonalDetails.bankName || '';
  document.getElementById('view-bank-acc').textContent = currentPersonalDetails.bankAcc || '';
  document.getElementById('view-bank-holder').textContent = currentPersonalDetails.bankHolder || '';
  document.getElementById('view-bsb').textContent = currentPersonalDetails.bsb || '';

  // Update Sidebar Quick Summary Fields
  document.getElementById('summary-name').textContent = currentPersonalDetails.name || '';
  document.getElementById('summary-abn').textContent = currentPersonalDetails.abn || '';
  document.getElementById('summary-bank').textContent = currentPersonalDetails.bankName || '';
  document.getElementById('summary-bsb').textContent = currentPersonalDetails.bsb || '';
  document.getElementById('summary-account').textContent = currentPersonalDetails.bankAcc || '';
}

function renderFormFromState() {
  document.getElementById('input-inv-no').value = currentInvoice.invNo || '';
  document.getElementById('input-date').value = currentInvoice.date || '';
  document.getElementById('input-to').value = currentInvoice.to || '';
  document.getElementById('input-instructions').value = currentInvoice.instructions || '';
  document.getElementById('input-payment-terms').value = currentInvoice.paymentTerms || '';
  document.getElementById('select-gst').value = currentInvoice.gstOption || 'NO GST';
}

/* ==========================================================================
   Modals & Actions
   ========================================================================== */

function openPersonalModal() {
  populatePersonalModalForm();
  document.getElementById('modal-personal').classList.add('active');
}

function closePersonalModal() {
  document.getElementById('modal-personal').classList.remove('active');
}

function populatePersonalModalForm() {
  document.getElementById('p-name').value = currentPersonalDetails.name || '';
  document.getElementById('p-address').value = currentPersonalDetails.address || '';
  document.getElementById('p-email').value = currentPersonalDetails.email || '';
  document.getElementById('p-abn').value = currentPersonalDetails.abn || '';
  document.getElementById('p-bank-name').value = currentPersonalDetails.bankName || '';
  document.getElementById('p-bank-acc').value = currentPersonalDetails.bankAcc || '';
  document.getElementById('p-bank-holder').value = currentPersonalDetails.bankHolder || '';
  document.getElementById('p-bsb').value = currentPersonalDetails.bsb || '';
}

function openHistoryModal() {
  renderHistoryList();
  document.getElementById('modal-history').classList.add('active');
}

function closeHistoryModal() {
  document.getElementById('modal-history').classList.remove('active');
}

function renderHistoryList() {
  const container = document.getElementById('history-list');
  const emptyState = document.getElementById('history-empty');

  if (savedInvoices.length === 0) {
    container.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  container.style.display = 'grid';
  emptyState.style.display = 'none';
  container.innerHTML = '';

  savedInvoices.forEach(inv => {
    let subtotal = inv.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    let total = subtotal;
    if (inv.gstOption === 'EXCLUDES GST 10%') total += subtotal * 0.1;

    const card = document.createElement('div');
    card.className = 'history-card';
    card.innerHTML = `
      <div class="history-card-header">
        <h4>${escapeHtml(inv.invNo || 'Draft')}</h4>
        <span class="history-card-date">${escapeHtml(inv.date || '')}</span>
      </div>
      <div class="history-card-client">${escapeHtml(inv.to || 'No Client')}</div>
      <div class="history-card-total">$${formatNumber(total)}</div>
      <div class="history-card-actions">
        <button class="btn btn-xs btn-primary btn-load-inv"><i data-lucide="folder-input"></i> Load</button>
        <button class="btn btn-xs btn-secondary btn-duplicate-inv" title="Copy data & create new invoice"><i data-lucide="copy"></i> Copy</button>
        <button class="btn btn-xs btn-outline-danger btn-delete-inv"><i data-lucide="trash"></i> Delete</button>
      </div>
    `;

    card.querySelector('.btn-load-inv').addEventListener('click', () => {
      currentInvoice = JSON.parse(JSON.stringify(inv));
      renderFormFromState();
      renderItems();
      updatePreview();
      closeHistoryModal();
      showToast(`Loaded invoice ${inv.invNo}`);
    });

    card.querySelector('.btn-duplicate-inv').addEventListener('click', () => {
      duplicateInvoice(inv);
      closeHistoryModal();
    });

    card.querySelector('.btn-delete-inv').addEventListener('click', () => {
      if (confirm(`Delete invoice ${inv.invNo}?`)) {
        savedInvoices = savedInvoices.filter(i => i.id !== inv.id);
        saveInvoiceHistoryToStorage();
        renderHistoryList();
        showToast('Invoice deleted');
      }
    });

    container.appendChild(card);
  });

  if (window.lucide) {
    lucide.createIcons();
  }
}

function saveCurrentInvoice() {
  if (!currentInvoice.id) {
    currentInvoice.id = 'inv_' + Date.now();
  }
  currentInvoice.savedAt = new Date().toISOString();

  const existingIndex = savedInvoices.findIndex(i => i.id === currentInvoice.id);
  if (existingIndex >= 0) {
    savedInvoices[existingIndex] = JSON.parse(JSON.stringify(currentInvoice));
  } else {
    savedInvoices.unshift(JSON.parse(JSON.stringify(currentInvoice)));
  }

  saveInvoiceHistoryToStorage();
  showToast(`Invoice ${currentInvoice.invNo} saved to local storage!`);
}

function createNewInvoiceDraft() {
  const nextNum = savedInvoices.length + 1;
  const formattedNo = `INV-T${String(nextNum).padStart(3, '0')}`;

  currentInvoice = {
    id: null,
    invNo: formattedNo,
    date: formatDateToReadable(new Date()),
    to: '',
    instructions: '',
    paymentTerms: '7 days',
    gstOption: 'NO GST',
    items: [
      { desc: '', qty: 1, rate: 0, amount: 0 }
    ]
  };

  renderFormFromState();
  renderItems();
  updatePreview();
  showToast('New blank invoice draft created.');
}

function duplicateInvoice(sourceInvoice = currentInvoice) {
  if (!sourceInvoice) return;
  const nextNum = savedInvoices.length + 1;
  const formattedNo = `INV-T${String(nextNum).padStart(3, '0')}`;

  const sourceName = sourceInvoice.invNo ? sourceInvoice.invNo : 'current invoice';

  currentInvoice = {
    id: null,
    invNo: formattedNo,
    date: formatDateToReadable(new Date()),
    to: sourceInvoice.to || '',
    instructions: sourceInvoice.instructions || '',
    paymentTerms: sourceInvoice.paymentTerms || '7 days',
    gstOption: sourceInvoice.gstOption || 'NO GST',
    items: sourceInvoice.items && sourceInvoice.items.length > 0
      ? JSON.parse(JSON.stringify(sourceInvoice.items))
      : [{ desc: '', qty: 1, rate: 0, amount: 0 }]
  };

  renderFormFromState();
  renderItems();
  updatePreview();
  showToast(`Created new invoice (${currentInvoice.invNo}) copied from ${sourceName}.`);
}

/* ==========================================================================
   PDF Download
   ========================================================================== */

function downloadPDF() {
  const element = document.getElementById('invoice-document');
  const filename = `Invoice_${currentInvoice.invNo || 'Draft'}.pdf`;

  showToast('Generating PDF...', 'info');

  // Temporarily reset CSS zoom transform so html2canvas captures element at 1:1 ratio
  const originalTransform = element.style.transform;
  element.style.transform = 'none';

  const opt = {
    margin: 0, // 0 margins so PDF fills exact A4 width with no right-side cropping
    filename: filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
  };

  if (window.html2pdf) {
    html2pdf().set(opt).from(element).save().then(() => {
      element.style.transform = originalTransform;
      showToast('PDF downloaded successfully!');
    }).catch(err => {
      console.error('PDF error:', err);
      element.style.transform = originalTransform;
      showToast('Failed to generate PDF. Trying fallback print...', 'error');
      window.print();
    });
  } else {
    element.style.transform = originalTransform;
    window.print();
  }
}

/* ==========================================================================
   Zoom Controls
   ========================================================================== */

function adjustZoom(delta) {
  previewZoom = Math.min(Math.max(previewZoom + delta, 50), 160);
  applyZoom();
}

function resetZoom() {
  previewZoom = 100;
  applyZoom();
}

function applyZoom() {
  const paper = document.getElementById('invoice-document');
  const zoomText = document.getElementById('zoom-level');
  paper.style.transform = `scale(${previewZoom / 100})`;
  zoomText.textContent = `${previewZoom}%`;
}

/* ==========================================================================
   Utility Helpers
   ========================================================================== */

function formatNumber(val) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(val);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDateToReadable(date) {
  const day = date.getDate();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  let suffix = 'th';
  if (day === 1 || day === 21 || day === 31) suffix = 'st';
  else if (day === 2 || day === 22) suffix = 'nd';
  else if (day === 3 || day === 23) suffix = 'rd';

  return `${day}${suffix} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-circle';
  if (type === 'info') iconName = 'info';

  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  if (window.lucide) {
    lucide.createIcons();
  }

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
