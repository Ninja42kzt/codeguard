/**
 * Audit Controller
 * Handles HTTP requests for security audits
 */

const analysisService = require('../services/analysisService');
const reportService = require('../services/reportService');
const repoService = require('../services/repoService');
const logger = require('../utils/logger');
const path = require('path');

/**
 * Analyze a GitHub repository
 * POST /api/audit/github
 */
async function analyzeGitHubRepo(req, res) {
  try {
    const { repoUrl, branch = 'main', format = 'json' } = req.body;

    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Repository URL is required'
      });
    }

    logger.info(`Analyzing GitHub repository: ${repoUrl}`);

    // Clone repository
    const cloneResult = await repoService.cloneRepository(repoUrl, branch);
    
    if (!cloneResult.success) {
      return res.status(400).json({
        success: false,
        error: cloneResult.error
      });
    }

    // Analyze repository
    const analysisResults = await analysisService.analyzeRepository(cloneResult.path);

    // Generate report in requested format
    const report = await reportService.generateReport(analysisResults, format);

    // Cleanup cloned repository
    await repoService.cleanupRepository(cloneResult.path);

    res.json({
      success: true,
      analysis: analysisResults,
      report: format === 'json' ? analysisResults : report.content
    });

  } catch (error) {
    logger.error(`GitHub analysis failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Analyze a local directory
 * POST /api/audit/local
 */
async function analyzeLocalDirectory(req, res) {
  try {
    const { path: dirPath, format = 'json' } = req.body;

    if (!dirPath) {
      return res.status(400).json({
        success: false,
        error: 'Directory path is required'
      });
    }

    logger.info(`Analyzing local directory: ${dirPath}`);

    // Analyze directory
    const analysisResults = await analysisService.analyzeRepository(dirPath);

    // Generate report in requested format
    const report = await reportService.generateReport(analysisResults, format);

    res.json({
      success: true,
      analysis: analysisResults,
      report: format === 'json' ? analysisResults : report.content
    });

  } catch (error) {
    logger.error(`Local analysis failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Analyze uploaded files
 * POST /api/audit/upload
 */
async function analyzeUploadedFiles(req, res) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    logger.info(`Analyzing ${req.files.length} uploaded files`);

    const files = req.files.map(file => ({
      path: file.originalname,
      content: file.buffer.toString('utf-8')
    }));

    // Run analyzers on uploaded files
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

    // Run all analyzers
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

    // Group by severity
    results.allVulnerabilities.forEach(vuln => {
      if (results.bySeverity[vuln.severity]) {
        results.bySeverity[vuln.severity].push(vuln);
      }
    });

    const summary = {
      total: results.allVulnerabilities.length,
      critical: results.bySeverity.critical.length,
      high: results.bySeverity.high.length,
      medium: results.bySeverity.medium.length,
      low: results.bySeverity.low.length,
      filesAnalyzed: files.length
    };

    const riskScore = analysisService.calculateRiskScore(summary);
    const recommendations = analysisService.generateRecommendations(results);

    const analysisResults = {
      success: true,
      timestamp: new Date().toISOString(),
      filesAnalyzed: files.length,
      summary,
      vulnerabilities: results.allVulnerabilities,
      byCategory: results.byCategory,
      bySeverity: results.bySeverity,
      riskScore,
      recommendations
    };

    res.json(analysisResults);

  } catch (error) {
    logger.error(`Upload analysis failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Get analysis summary
 * GET /api/audit/summary/:id
 */
async function getAnalysisSummary(req, res) {
  try {
    const { id } = req.params;

    // In a real implementation, this would fetch from a database
    // For now, return a placeholder response
    res.json({
      success: true,
      message: 'Summary retrieval not yet implemented',
      id
    });

  } catch (error) {
    logger.error(`Failed to get summary: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Generate report from analysis results
 * POST /api/audit/report
 */
async function generateReportFromResults(req, res) {
  try {
    const { analysisResults, format = 'html' } = req.body;

    if (!analysisResults) {
      return res.status(400).json({
        success: false,
        error: 'Analysis results are required'
      });
    }

    logger.info(`Generating ${format} report`);

    const report = await reportService.generateReport(analysisResults, format);

    // Set appropriate content type
    const contentTypes = {
      json: 'application/json',
      html: 'text/html',
      markdown: 'text/markdown',
      md: 'text/markdown'
    };

    res.setHeader('Content-Type', contentTypes[format] || 'text/plain');
    res.send(report.content);

  } catch (error) {
    logger.error(`Report generation failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Download report as file
 * POST /api/audit/download
 */
async function downloadReport(req, res) {
  try {
    const { analysisResults, format = 'html' } = req.body;

    if (!analysisResults) {
      return res.status(400).json({
        success: false,
        error: 'Analysis results are required'
      });
    }

    const report = await reportService.generateReport(analysisResults, format);

    const filenames = {
      json: 'security-audit.json',
      html: 'security-audit.html',
      markdown: 'security-audit.md',
      md: 'security-audit.md'
    };

    const contentTypes = {
      json: 'application/json',
      html: 'text/html',
      markdown: 'text/markdown',
      md: 'text/markdown'
    };

    res.setHeader('Content-Type', contentTypes[format] || 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename="${filenames[format]}"`);
    res.send(report.content);

  } catch (error) {
    logger.error(`Report download failed: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

/**
 * Health check endpoint
 * GET /api/health
 */
function healthCheck(req, res) {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
}

/**
 * Get supported analyzers
 * GET /api/audit/analyzers
 */
function getAnalyzers(req, res) {
  res.json({
    success: true,
    analyzers: [
      {
        id: 'secrets',
        name: 'Secrets Analyzer',
        description: 'Detects hardcoded secrets, API keys, and credentials'
      },
      {
        id: 'auth',
        name: 'Authentication Analyzer',
        description: 'Identifies authentication and authorization issues'
      },
      {
        id: 'sql',
        name: 'SQL Injection Analyzer',
        description: 'Finds SQL injection vulnerabilities'
      },
      {
        id: 'routes',
        name: 'Route Security Analyzer',
        description: 'Detects exposed routes and endpoint security issues'
      },
      {
        id: 'validation',
        name: 'Input Validation Analyzer',
        description: 'Identifies missing input validation and XSS vulnerabilities'
      }
    ]
  });
}

/**
 * Get vulnerability patterns
 * GET /api/audit/patterns
 */
function getPatterns(req, res) {
  const { getAllPatterns } = require('../utils/patterns');
  
  res.json({
    success: true,
    patterns: getAllPatterns()
  });
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

// Made with Bob