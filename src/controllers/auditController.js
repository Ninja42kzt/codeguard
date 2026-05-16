/**
 * Audit Controller
 * Handles HTTP requests for security audits
 */

const analysisService = require('../services/analysisService');
const reportService = require('../services/reportService');
const repoService = require('../services/repoService');
const logger = require('../utils/logger');

/**
 * Analyze a GitHub repository
 * POST /api/audit/github
 */
async function analyzeGitHubRepo(req, res) {
  let clonePath = null;

  try {
    const { repoUrl, branch = 'main', format = 'json' } = req.body;

    if (!repoUrl) {
      return res.status(400).json({ success: false, error: 'Repository URL is required' });
    }

    logger.info(`Analyzing GitHub repository: ${repoUrl}`);

    // Clone repository — throws on failure, returns { clonePath, ... } on success
    let cloneResult;
    try {
      cloneResult = await repoService.cloneRepository(repoUrl, branch);
    } catch (cloneError) {
      logger.error(`Clone failed: ${cloneError.message}`);
      return res.status(400).json({ success: false, error: cloneError.message });
    }

    // repoService returns clonePath (not path or success flag)
    clonePath = cloneResult.clonePath;
    logger.info(`Repository cloned to: ${clonePath}`);

    // Analyze repository
    const analysisResults = await analysisService.analyzeRepository(clonePath);
    logger.info(`Analysis completed successfully`);

    // Generate report
    const report = await reportService.generateReport(analysisResults, format);

    res.json({
      success: true,
      analysis: analysisResults,
      report: format === 'json' ? analysisResults : report.content
    });

  } catch (error) {
    logger.error(`GitHub analysis failed: ${error.message}`);
    logger.error(error.stack);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (clonePath) {
      try {
        await repoService.cleanupRepository(clonePath);
        logger.info(`Cleaned up repository: ${clonePath}`);
      } catch (cleanupError) {
        logger.error(`Cleanup failed: ${cleanupError.message}`);
      }
    }
  }
}

/**
 * Analyze a local directory
 * POST /api/audit/local
 */
async function analyzeLocalDirectory(req, res) {
  try {
    const { path: dirPath, format = 'json' } = req.body;
    if (!dirPath) return res.status(400).json({ success: false, error: 'Directory path is required' });

    logger.info(`Analyzing local directory: ${dirPath}`);
    const analysisResults = await analysisService.analyzeRepository(dirPath);
    const report = await reportService.generateReport(analysisResults, format);

    res.json({ success: true, analysis: analysisResults, report: format === 'json' ? analysisResults : report.content });
  } catch (error) {
    logger.error(`Local analysis failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Analyze uploaded files
 * POST /api/audit/upload
 */
async function analyzeUploadedFiles(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files uploaded' });
    }

    logger.info(`Analyzing ${req.files.length} uploaded files`);

    const files = req.files.map(file => ({
      path: file.originalname,
      content: file.buffer.toString('utf-8')
    }));

    const secretsAnalyzer = require('../analyzers/secretsAnalyzer');
    const authAnalyzer = require('../analyzers/authAnalyzer');
    const sqlAnalyzer = require('../analyzers/sqlAnalyzer');
    const routeAnalyzer = require('../analyzers/routeAnalyzer');
    const validationAnalyzer = require('../analyzers/validationAnalyzer');

    const results = {
      allVulnerabilities: [],
      byCategory: {},
      bySeverity: { critical: [], high: [], medium: [], low: [] }
    };

    const secretsResults = secretsAnalyzer.analyzeMultipleFiles(files);
    const authResults = authAnalyzer.analyzeMultipleFiles(files);
    const sqlResults = sqlAnalyzer.analyzeMultipleFiles(files);
    const routeResults = routeAnalyzer.analyzeMultipleFiles(files);
    const validationResults = validationAnalyzer.analyzeMultipleFiles(files);

    results.byCategory = {
      secrets: secretsResults,
      authentication: authResults,
      sql_injection: sqlResults,
      exposed_routes: routeResults,
      validation: validationResults
    };

    results.allVulnerabilities = [
      ...secretsResults.vulnerabilities,
      ...authResults.vulnerabilities,
      ...sqlResults.vulnerabilities,
      ...routeResults.vulnerabilities,
      ...validationResults.vulnerabilities
    ];

    results.allVulnerabilities.forEach(vuln => {
      if (results.bySeverity[vuln.severity]) results.bySeverity[vuln.severity].push(vuln);
    });

    const summary = {
      total: results.allVulnerabilities.length,
      critical: results.bySeverity.critical.length,
      high: results.bySeverity.high.length,
      medium: results.bySeverity.medium.length,
      low: results.bySeverity.low.length,
      filesAnalyzed: files.length
    };

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      filesAnalyzed: files.length,
      summary,
      vulnerabilities: results.allVulnerabilities,
      byCategory: results.byCategory,
      bySeverity: results.bySeverity,
      riskScore: analysisService.calculateRiskScore(summary),
      recommendations: analysisService.generateRecommendations(results)
    });

  } catch (error) {
    logger.error(`Upload analysis failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
}

async function getAnalysisSummary(req, res) {
  res.json({ success: true, message: 'Summary retrieval not yet implemented', id: req.params.id });
}

async function generateReportFromResults(req, res) {
  try {
    const { analysisResults, format = 'html' } = req.body;
    if (!analysisResults) return res.status(400).json({ success: false, error: 'Analysis results are required' });
    const report = await reportService.generateReport(analysisResults, format);
    const contentTypes = { json: 'application/json', html: 'text/html', markdown: 'text/markdown', md: 'text/markdown' };
    res.setHeader('Content-Type', contentTypes[format] || 'text/plain');
    res.send(report.content);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

async function downloadReport(req, res) {
  try {
    const { analysisResults, format = 'html' } = req.body;
    if (!analysisResults) return res.status(400).json({ success: false, error: 'Analysis results are required' });
    const report = await reportService.generateReport(analysisResults, format);
    const filenames = { json: 'security-audit.json', html: 'security-audit.html', markdown: 'security-audit.md', md: 'security-audit.md' };
    const contentTypes = { json: 'application/json', html: 'text/html', markdown: 'text/markdown', md: 'text/markdown' };
    res.setHeader('Content-Type', contentTypes[format] || 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filenames[format]}"`);
    res.send(report.content);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

function healthCheck(req, res) {
  res.json({ success: true, status: 'healthy', timestamp: new Date().toISOString(), version: '1.0.0' });
}

function getAnalyzers(req, res) {
  res.json({
    success: true,
    analyzers: [
      { id: 'secrets', name: 'Secrets Analyzer', description: 'Detects hardcoded secrets, API keys, and credentials' },
      { id: 'auth', name: 'Authentication Analyzer', description: 'Identifies authentication and authorization issues' },
      { id: 'sql', name: 'SQL Injection Analyzer', description: 'Finds SQL injection vulnerabilities' },
      { id: 'routes', name: 'Route Security Analyzer', description: 'Detects exposed routes and endpoint security issues' },
      { id: 'validation', name: 'Input Validation Analyzer', description: 'Identifies missing input validation and XSS vulnerabilities' }
    ]
  });
}

function getPatterns(req, res) {
  const { getAllPatterns } = require('../utils/patterns');
  res.json({ success: true, patterns: getAllPatterns() });
}

module.exports = {
  analyzeGitHubRepo,
  analyzeLocalDirectory,
  analyzeUploadedFiles,
  getAnalysisSummary,
  generateReportFromResults,
  downloadReport,
  healthCheck,
  getAnalyzers,
  getPatterns
};
