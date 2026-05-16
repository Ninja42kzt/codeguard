/**
 * Report Service
 * Generates security audit reports in various formats (JSON, HTML, Markdown)
 */

const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger');

/**
 * Generate report in specified format
 * @param {Object} analysisResults - Analysis results
 * @param {string} format - Report format (json, html, markdown)
 * @param {string} outputPath - Output file path (optional)
 * @returns {Promise<Object>} Report generation result
 */
async function generateReport(analysisResults, format = 'json', outputPath = null) {
  logger.info(`Generating ${format} report`);

  try {
    let reportContent;
    let defaultFilename;

    switch (format.toLowerCase()) {
      case 'json':
        reportContent = generateJSONReport(analysisResults);
        defaultFilename = 'security-audit.json';
        break;
      case 'html':
        reportContent = generateHTMLReport(analysisResults);
        defaultFilename = 'security-audit.html';
        break;
      case 'markdown':
      case 'md':
        reportContent = generateMarkdownReport(analysisResults);
        defaultFilename = 'security-audit.md';
        break;
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }

    // Save to file if output path provided
    if (outputPath) {
      const finalPath = outputPath.endsWith(path.extname(defaultFilename)) 
        ? outputPath 
        : path.join(outputPath, defaultFilename);
      
      await fs.writeFile(finalPath, reportContent, 'utf-8');
      logger.info(`Report saved to: ${finalPath}`);
      
      return {
        success: true,
        format,
        path: finalPath,
        content: reportContent
      };
    }

    return {
      success: true,
      format,
      content: reportContent
    };

  } catch (error) {
    logger.error(`Failed to generate report: ${error.message}`);
    throw error;
  }
}

/**
 * Generate JSON report
 * @param {Object} results - Analysis results
 * @returns {string} JSON report
 */
function generateJSONReport(results) {
  return JSON.stringify(results, null, 2);
}

/**
 * Generate HTML report
 * @param {Object} results - Analysis results
 * @returns {string} HTML report
 */
function generateHTMLReport(results) {
  const { summary, vulnerabilities, bySeverity, byCategory, recommendations, riskScore } = results;

  const severityColors = {
    critical: '#dc3545',
    high: '#fd7e14',
    medium: '#ffc107',
    low: '#17a2b8'
  };

  const severityBadges = Object.entries(summary)
    .filter(([key]) => ['critical', 'high', 'medium', 'low'].includes(key))
    .map(([severity, count]) => `
      <span class="badge" style="background-color: ${severityColors[severity]}; color: white; padding: 5px 10px; margin: 0 5px; border-radius: 3px;">
        ${severity.toUpperCase()}: ${count}
      </span>
    `).join('');

  const vulnerabilityRows = vulnerabilities.map(vuln => `
    <tr>
      <td style="padding: 8px; border: 1px solid #ddd;">
        <span style="background-color: ${severityColors[vuln.severity]}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 12px;">
          ${vuln.severity.toUpperCase()}
        </span>
      </td>
      <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(vuln.name)}</td>
      <td style="padding: 8px; border: 1px solid #ddd;"><code>${escapeHtml(vuln.file)}</code></td>
      <td style="padding: 8px; border: 1px solid #ddd;">${vuln.line}</td>
      <td style="padding: 8px; border: 1px solid #ddd;">${escapeHtml(vuln.description)}</td>
    </tr>
  `).join('');

  const categoryCards = Object.entries(byCategory).map(([category, data]) => `
    <div style="border: 1px solid #ddd; border-radius: 5px; padding: 15px; margin: 10px 0; background: #f8f9fa;">
      <h3 style="margin-top: 0; color: #333;">${formatCategoryName(category)}</h3>
      <p style="margin: 5px 0;"><strong>Total Issues:</strong> ${data.total}</p>
      <p style="margin: 5px 0;">
        <strong>By Severity:</strong>
        Critical: ${(data.bySeverity.critical || []).length} |
        High: ${(data.bySeverity.high || []).length} |
        Medium: ${(data.bySeverity.medium || []).length} |
        Low: ${(data.bySeverity.low || []).length}
      </p>
    </div>
  `).join('');

  const recommendationsList = recommendations.map(rec => `
    <div style="border-left: 4px solid ${rec.priority === 'critical' ? '#dc3545' : rec.priority === 'high' ? '#fd7e14' : '#ffc107'}; padding: 15px; margin: 15px 0; background: #f8f9fa;">
      <h3 style="margin-top: 0; color: #333;">${escapeHtml(rec.title)}</h3>
      <p><strong>Priority:</strong> <span style="text-transform: uppercase; color: ${rec.priority === 'critical' ? '#dc3545' : rec.priority === 'high' ? '#fd7e14' : '#ffc107'};">${rec.priority}</span></p>
      <p>${escapeHtml(rec.description)}</p>
      <ul>
        ${rec.actions.map(action => `<li>${escapeHtml(action)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const riskLevel = riskScore >= 70 ? 'High Risk' : riskScore >= 40 ? 'Medium Risk' : 'Low Risk';
  const riskColor = riskScore >= 70 ? '#dc3545' : riskScore >= 40 ? '#ffc107' : '#28a745';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CodeGuard Security Audit Report</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 2.5em;
    }
    .summary-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .risk-score {
      font-size: 3em;
      font-weight: bold;
      color: ${riskColor};
      text-align: center;
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background: white;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    th {
      background: #667eea;
      color: white;
      padding: 12px;
      text-align: left;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    .section {
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin: 20px 0;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h2 {
      color: #667eea;
      border-bottom: 2px solid #667eea;
      padding-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🛡️ CodeGuard Security Audit Report</h1>
    <p><strong>Repository:</strong> ${escapeHtml(results.repository)}</p>
    <p><strong>Generated:</strong> ${results.timestamp}</p>
    <p><strong>Duration:</strong> ${results.duration}</p>
    <p><strong>Files Analyzed:</strong> ${results.filesAnalyzed}</p>
  </div>

  <div class="summary-card">
    <h2>Executive Summary</h2>
    <div class="risk-score">
      Risk Score: ${riskScore}/100
      <div style="font-size: 0.4em; color: #666;">${riskLevel}</div>
    </div>
    <div style="text-align: center; margin: 20px 0;">
      ${severityBadges}
    </div>
    <p style="text-align: center; font-size: 1.2em; margin-top: 20px;">
      <strong>Total Vulnerabilities Found: ${summary.total}</strong>
    </p>
    <p style="text-align: center; color: #666;">
      ${summary.filesWithIssues} out of ${summary.filesAnalyzed} files contain security issues
    </p>
  </div>

  <div class="section">
    <h2>Vulnerabilities by Category</h2>
    ${categoryCards}
  </div>

  <div class="section">
    <h2>All Vulnerabilities</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Type</th>
          <th>File</th>
          <th>Line</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        ${vulnerabilityRows}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Recommendations</h2>
    ${recommendationsList}
  </div>

  <div style="text-align: center; margin-top: 40px; padding: 20px; color: #666;">
    <p>Generated by CodeGuard - Automated Security Audit Tool</p>
    <p style="font-size: 0.9em;">Report generated at ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate Markdown report
 * @param {Object} results - Analysis results
 * @returns {string} Markdown report
 */
function generateMarkdownReport(results) {
  const { summary, vulnerabilities, byCategory, recommendations, riskScore } = results;

  const riskLevel = riskScore >= 70 ? '🔴 High Risk' : riskScore >= 40 ? '🟡 Medium Risk' : '🟢 Low Risk';

  let markdown = `# 🛡️ CodeGuard Security Audit Report

## Repository Information
- **Repository:** ${results.repository}
- **Generated:** ${results.timestamp}
- **Duration:** ${results.duration}
- **Files Analyzed:** ${results.filesAnalyzed}

## Executive Summary

### Risk Score: ${riskScore}/100 ${riskLevel}

### Vulnerability Summary
- **Total Vulnerabilities:** ${summary.total}
- **Critical:** ${summary.critical}
- **High:** ${summary.high}
- **Medium:** ${summary.medium}
- **Low:** ${summary.low}
- **Files with Issues:** ${summary.filesWithIssues} / ${summary.filesAnalyzed}

---

## Vulnerabilities by Category

`;

  // Add category breakdown
  Object.entries(byCategory).forEach(([category, data]) => {
    markdown += `### ${formatCategoryName(category)}\n`;
    markdown += `- **Total Issues:** ${data.total}\n`;
    markdown += `- **Critical:** ${(data.bySeverity.critical || []).length}\n`;
    markdown += `- **High:** ${(data.bySeverity.high || []).length}\n`;
    markdown += `- **Medium:** ${(data.bySeverity.medium || []).length}\n`;
    markdown += `- **Low:** ${(data.bySeverity.low || []).length}\n\n`;
  });

  markdown += `---

## Detailed Vulnerabilities

`;

  // Group vulnerabilities by severity
  ['critical', 'high', 'medium', 'low'].forEach(severity => {
    const vulns = vulnerabilities.filter(v => v.severity === severity);
    if (vulns.length > 0) {
      markdown += `### ${severity.toUpperCase()} Severity (${vulns.length})\n\n`;
      
      vulns.forEach((vuln, index) => {
        markdown += `#### ${index + 1}. ${vuln.name}\n`;
        markdown += `- **File:** \`${vuln.file}\`\n`;
        markdown += `- **Line:** ${vuln.line}\n`;
        markdown += `- **Description:** ${vuln.description}\n`;
        if (vuln.code) {
          markdown += `- **Code:** \`${vuln.code}\`\n`;
        }
        if (vuln.recommendation) {
          markdown += `- **Recommendation:** ${vuln.recommendation}\n`;
        }
        markdown += `\n`;
      });
    }
  });

  markdown += `---

## Recommendations

`;

  recommendations.forEach((rec, index) => {
    const priorityEmoji = rec.priority === 'critical' ? '🔴' : rec.priority === 'high' ? '🟠' : '🟡';
    markdown += `### ${priorityEmoji} ${rec.title}\n`;
    markdown += `**Priority:** ${rec.priority.toUpperCase()}\n\n`;
    markdown += `${rec.description}\n\n`;
    markdown += `**Actions:**\n`;
    rec.actions.forEach(action => {
      markdown += `- ${action}\n`;
    });
    markdown += `\n`;
  });

  markdown += `---

## Summary

This security audit identified **${summary.total} vulnerabilities** across **${summary.filesAnalyzed} files**. 
The overall risk score is **${riskScore}/100**, indicating a **${riskLevel.replace(/[🔴🟡🟢]/g, '').trim()}** level.

### Next Steps
1. Address all critical vulnerabilities immediately
2. Create tickets for high and medium severity issues
3. Implement recommended security best practices
4. Schedule regular security audits

---

*Report generated by CodeGuard - Automated Security Audit Tool*  
*Generated at: ${new Date().toLocaleString()}*
`;

  return markdown;
}

/**
 * Escape HTML special characters
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#039;');
}

/**
 * Format category name for display
 * @param {string} category - Category name
 * @returns {string} Formatted name
 */
function formatCategoryName(category) {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate summary report (brief overview)
 * @param {Object} results - Analysis results
 * @returns {Object} Summary report
 */
function generateSummary(results) {
  return {
    repository: results.repository,
    timestamp: results.timestamp,
    riskScore: results.riskScore,
    summary: results.summary,
    topIssues: results.vulnerabilities
      .filter(v => v.severity === 'critical' || v.severity === 'high')
      .slice(0, 10)
      .map(v => ({
        severity: v.severity,
        name: v.name,
        file: v.file,
        line: v.line
      }))
  };
}

module.exports = {
  generateReport,
  generateJSONReport,
  generateHTMLReport,
  generateMarkdownReport,
  generateSummary
};

// Made with Bob