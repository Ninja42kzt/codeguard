/**
 * CodeGuard Frontend Application
 * Handles UI interactions and API communication
 */

// Global state
let currentAnalysisResults = null;
let currentSeverityFilter = 'all';

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeTabs();
  initializeForms();
  initializeFileUpload();
});

/**
 * Initialize tab switching
 */
function initializeTabs() {
  const tabButtons = document.querySelectorAll('.tab-button');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      
      // Update active tab button
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update active tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });
      document.getElementById(`${tabName}-tab`).classList.add('active');
    });
  });
}

/**
 * Initialize form submissions
 */
function initializeForms() {
  // GitHub form
  const githubForm = document.getElementById('github-form');
  githubForm.addEventListener('submit', handleGitHubSubmit);
  
  // Upload form
  const uploadForm = document.getElementById('upload-form');
  uploadForm.addEventListener('submit', handleUploadSubmit);
  
  // New analysis button
  const newAnalysisBtn = document.getElementById('new-analysis');
  if (newAnalysisBtn) {
    newAnalysisBtn.addEventListener('click', resetAnalysis);
  }
  
  // Download report button
  const downloadBtn = document.getElementById('download-report');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadReport);
  }
  
  // Severity filter tabs
  const severityTabs = document.querySelectorAll('.severity-tab');
  severityTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const severity = tab.dataset.severity;
      filterBySeverity(severity);
      
      severityTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
    });
  });
}

/**
 * Initialize file upload functionality
 */
function initializeFileUpload() {
  const fileInput = document.getElementById('file-upload');
  const fileUploadArea = document.getElementById('file-upload-area');
  const fileList = document.getElementById('file-list');
  const submitBtn = document.getElementById('upload-submit');
  
  // Click to upload
  fileUploadArea.addEventListener('click', () => {
    fileInput.click();
  });
  
  // File selection
  fileInput.addEventListener('change', (e) => {
    handleFileSelection(e.target.files);
  });
  
  // Drag and drop
  fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.style.borderColor = 'var(--primary-color)';
  });
  
  fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.style.borderColor = 'var(--border-color)';
  });
  
  fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.style.borderColor = 'var(--border-color)';
    handleFileSelection(e.dataTransfer.files);
  });
}

/**
 * Handle file selection
 */
function handleFileSelection(files) {
  const fileList = document.getElementById('file-list');
  const submitBtn = document.getElementById('upload-submit');
  const fileInput = document.getElementById('file-upload');
  
  fileList.innerHTML = '';
  
  if (files.length === 0) {
    submitBtn.disabled = true;
    return;
  }
  
  Array.from(files).forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
      <div class="file-item-name">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
          <polyline points="13 2 13 9 20 9"></polyline>
        </svg>
        <span>${file.name}</span>
      </div>
      <button type="button" class="file-item-remove" onclick="removeFile(${index})">Remove</button>
    `;
    fileList.appendChild(fileItem);
  });
  
  submitBtn.disabled = false;
}

/**
 * Remove file from selection
 */
function removeFile(index) {
  const fileInput = document.getElementById('file-upload');
  const dt = new DataTransfer();
  const files = Array.from(fileInput.files);
  
  files.forEach((file, i) => {
    if (i !== index) {
      dt.items.add(file);
    }
  });
  
  fileInput.files = dt.files;
  handleFileSelection(fileInput.files);
}

/**
 * Handle GitHub form submission
 */
async function handleGitHubSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const formData = new FormData(form);
  
  const data = {
    repoUrl: formData.get('repoUrl'),
    branch: formData.get('branch') || 'main',
    format: formData.get('format') || 'json'
  };
  
  try {
    setLoading(submitBtn, true);
    showLoadingOverlay();
    
    const response = await fetch('/api/audit/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }
    
    currentAnalysisResults = result.analysis;
    displayResults(result.analysis);
    
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(submitBtn, false);
    hideLoadingOverlay();
  }
}

/**
 * Handle upload form submission
 */
async function handleUploadSubmit(e) {
  e.preventDefault();
  
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const fileInput = document.getElementById('file-upload');
  
  if (fileInput.files.length === 0) {
    showError('Please select at least one file');
    return;
  }
  
  const formData = new FormData();
  Array.from(fileInput.files).forEach(file => {
    formData.append('files', file);
  });
  
  try {
    setLoading(submitBtn, true);
    showLoadingOverlay();
    
    const response = await fetch('/api/audit/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }
    
    currentAnalysisResults = result;
    displayResults(result);
    
  } catch (error) {
    showError(error.message);
  } finally {
    setLoading(submitBtn, false);
    hideLoadingOverlay();
  }
}

/**
 * Display analysis results
 */
function displayResults(results) {
  // Hide analysis section, show results
  document.querySelector('.analysis-section').style.display = 'none';
  document.getElementById('results-section').style.display = 'block';
  
  // Display summary cards
  displaySummaryCards(results.summary);
  
  // Display risk score
  displayRiskScore(results.riskScore, results.summary);
  
  // Display vulnerabilities
  displayVulnerabilities(results.vulnerabilities);
  
  // Display recommendations
  displayRecommendations(results.recommendations);
  
  // Scroll to results
  document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Display summary cards
 */
function displaySummaryCards(summary) {
  const container = document.getElementById('summary-cards');
  
  container.innerHTML = `
    <div class="summary-card">
      <div class="summary-card-label">Total Issues</div>
      <div class="summary-card-value">${summary.total}</div>
    </div>
    <div class="summary-card critical">
      <div class="summary-card-label">Critical</div>
      <div class="summary-card-value">${summary.critical}</div>
    </div>
    <div class="summary-card high">
      <div class="summary-card-label">High</div>
      <div class="summary-card-value">${summary.high}</div>
    </div>
    <div class="summary-card medium">
      <div class="summary-card-label">Medium</div>
      <div class="summary-card-value">${summary.medium}</div>
    </div>
    <div class="summary-card low">
      <div class="summary-card-label">Low</div>
      <div class="summary-card-value">${summary.low}</div>
    </div>
    <div class="summary-card">
      <div class="summary-card-label">Files Analyzed</div>
      <div class="summary-card-value">${summary.filesAnalyzed}</div>
    </div>
  `;
}

/**
 * Display risk score
 */
function displayRiskScore(riskScore, summary) {
  const container = document.getElementById('risk-score-card');
  
  let riskLevel = 'Low Risk';
  let riskClass = 'low';
  
  if (riskScore >= 70) {
    riskLevel = '🔴 High Risk';
    riskClass = 'high';
  } else if (riskScore >= 40) {
    riskLevel = '🟡 Medium Risk';
    riskClass = 'medium';
  } else {
    riskLevel = '🟢 Low Risk';
    riskClass = 'low';
  }
  
  container.className = `risk-score-card ${riskClass}`;
  container.innerHTML = `
    <div class="risk-score-label">Overall Risk Score</div>
    <div class="risk-score-value">${riskScore}/100</div>
    <div class="risk-level">${riskLevel}</div>
    <p style="margin-top: 15px; color: var(--gray-text);">
      ${summary.filesWithIssues || summary.filesAnalyzed} out of ${summary.filesAnalyzed} files contain security issues
    </p>
  `;
}

/**
 * Display vulnerabilities
 */
function displayVulnerabilities(vulnerabilities) {
  currentSeverityFilter = 'all';
  renderVulnerabilities(vulnerabilities);
}

/**
 * Render vulnerabilities based on filter
 */
function renderVulnerabilities(vulnerabilities) {
  const container = document.getElementById('vulnerabilities-list');
  
  let filtered = vulnerabilities;
  if (currentSeverityFilter !== 'all') {
    filtered = vulnerabilities.filter(v => v.severity === currentSeverityFilter);
  }
  
  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--gray-text); padding: 40px;">No vulnerabilities found for this filter.</p>';
    return;
  }
  
  container.innerHTML = filtered.map(vuln => `
    <div class="vulnerability-item ${vuln.severity}">
      <div class="vulnerability-header">
        <div class="vulnerability-title">${escapeHtml(vuln.name)}</div>
        <span class="severity-badge ${vuln.severity}">${vuln.severity}</span>
      </div>
      <div class="vulnerability-details">
        <strong>Description:</strong> ${escapeHtml(vuln.description)}
      </div>
      <div class="vulnerability-details">
        <strong>File:</strong> <span class="vulnerability-file">${escapeHtml(vuln.file)}</span>
        <strong style="margin-left: 15px;">Line:</strong> ${vuln.line}
      </div>
      ${vuln.code ? `<div class="vulnerability-code">${escapeHtml(vuln.code)}</div>` : ''}
      ${vuln.recommendation ? `
        <div class="vulnerability-recommendation">
          <strong>💡 Recommendation:</strong> ${escapeHtml(vuln.recommendation)}
        </div>
      ` : ''}
    </div>
  `).join('');
}

/**
 * Display recommendations
 */
function displayRecommendations(recommendations) {
  const container = document.getElementById('recommendations-list');
  
  if (!recommendations || recommendations.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--gray-text);">No recommendations available.</p>';
    return;
  }
  
  container.innerHTML = recommendations.map(rec => `
    <div class="recommendation-item ${rec.priority}">
      <div class="recommendation-title">${escapeHtml(rec.title)}</div>
      <span class="recommendation-priority ${rec.priority}">${rec.priority}</span>
      <div class="recommendation-description">${escapeHtml(rec.description)}</div>
      <div class="recommendation-actions">
        <strong>Actions:</strong>
        <ul>
          ${rec.actions.map(action => `<li>${escapeHtml(action)}</li>`).join('')}
        </ul>
      </div>
    </div>
  `).join('');
}

/**
 * Filter vulnerabilities by severity
 */
function filterBySeverity(severity) {
  currentSeverityFilter = severity;
  if (currentAnalysisResults) {
    renderVulnerabilities(currentAnalysisResults.vulnerabilities);
  }
}

/**
 * Download report
 */
async function downloadReport() {
  if (!currentAnalysisResults) return;
  
  try {
    const response = await fetch('/api/audit/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analysisResults: currentAnalysisResults,
        format: 'html'
      })
    });
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'security-audit.html';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
  } catch (error) {
    showError('Failed to download report: ' + error.message);
  }
}

/**
 * Reset analysis and show form again
 */
function resetAnalysis() {
  document.querySelector('.analysis-section').style.display = 'block';
  document.getElementById('results-section').style.display = 'none';
  currentAnalysisResults = null;
  currentSeverityFilter = 'all';
  
  // Reset forms
  document.getElementById('github-form').reset();
  document.getElementById('upload-form').reset();
  document.getElementById('file-list').innerHTML = '';
  document.getElementById('upload-submit').disabled = true;
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Set loading state for button
 */
function setLoading(button, isLoading) {
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.classList.remove('loading');
    button.disabled = false;
  }
}

/**
 * Show loading overlay
 */
function showLoadingOverlay() {
  document.getElementById('loading-overlay').style.display = 'flex';
}

/**
 * Hide loading overlay
 */
function hideLoadingOverlay() {
  document.getElementById('loading-overlay').style.display = 'none';
}

/**
 * Show error message
 */
function showError(message) {
  document.getElementById('error-text').textContent = message;
  document.getElementById('error-message').style.display = 'flex';
}

/**
 * Hide error message
 */
function hideError() {
  document.getElementById('error-message').style.display = 'none';
}

/**
 * Close error modal without resetting (just dismiss)
 */
function closeErrorModal() {
  document.getElementById('error-message').style.display = 'none';
  hideLoadingOverlay();
  // Re-enable submit buttons so the form is usable again
  document.querySelectorAll('button[type="submit"]').forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('loading');
  });
}

/**
 * Try Again - close modal and re-enable form for a new attempt
 */
function resetAfterError() {
  closeErrorModal();
  // Scroll back to the form
  const analysisSection = document.querySelector('.analysis-section');
  if (analysisSection) {
    analysisSection.style.display = 'block';
    analysisSection.scrollIntoView({ behavior: 'smooth' });
  }
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Show about dialog
 */
function showAbout() {
  alert('CodeGuard - Automated Security Audit Tool\n\nVersion 1.0.0\n\nBuilt to help developers identify security vulnerabilities in their code.');
}

/**
 * Show documentation
 */
function showDocs() {
  alert('Documentation\n\nFor detailed documentation, please visit the GitHub repository.');
}

// Made with Bob