const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/**
 * Submits bug report text for ML classification & database storage.
 * @param {string} reportText 
 * @returns {Promise<{report_id: number, module: string, severity: string, module_confidence: number, severity_confidence: number, module_reason_words?: string[], severity_reason_words?: string[], routed_team?: string, low_confidence_flag?: boolean}>}
 */
export async function triageReport(reportText) {
  const response = await fetch(`${API_URL}/api/triage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ report_text: reportText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Triage API request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Submits human corrections/confirmations for a triaged bug report.
 * @param {number} reportId 
 * @param {string} originalModule 
 * @param {string|null} correctedModule 
 * @param {string} originalSeverity 
 * @param {string|null} correctedSeverity 
 * @returns {Promise<{status: string, correction_id: number}>}
 */
export async function submitCorrection(reportId, originalModule, correctedModule, originalSeverity, correctedSeverity) {
  const response = await fetch(`${API_URL}/api/correct`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      report_id: reportId,
      original_module: originalModule,
      corrected_module: correctedModule,
      original_severity: originalSeverity,
      corrected_severity: correctedSeverity,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Correction API request failed (${response.status})`);
  }

  return response.json();
}

/**
 * Checks backend health status.
 * @returns {Promise<{status: string}>}
 */
export async function checkHealth() {
  const response = await fetch(`${API_URL}/api/health`);
  if (!response.ok) {
    throw new Error(`Backend offline (${response.status})`);
  }
  return response.json();
}

/**
 * Requests an LLM-generated diagnostic fix suggestion from the backend.
 * @param {string} reportText 
 * @param {string} module 
 * @param {string} severity 
 * @returns {Promise<{suggestion: string}>}
 */
export async function suggestFix(reportText, module, severity) {
  const response = await fetch(`${API_URL}/api/suggest-fix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      report_text: reportText,
      module: module,
      severity: severity,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `AI suggestion request failed (${response.status})`);
  }

  return response.json();
}
