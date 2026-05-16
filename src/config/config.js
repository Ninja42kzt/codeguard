require('dotenv').config();
const path = require('path');

const config = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // Directory Configuration
  tempDir: path.resolve(process.env.TEMP_DIR || './temp'),
  reportsDir: path.resolve(process.env.REPORTS_DIR || './reports'),
  logsDir: path.resolve('./logs'),

  // Repository Configuration
  maxRepoSizeMB: parseInt(process.env.MAX_REPO_SIZE_MB || '100', 10),
  cloneTimeoutMs: parseInt(process.env.CLONE_TIMEOUT_MS || '300000', 10),

  // Analysis Configuration
  analysisTimeoutMs: parseInt(process.env.ANALYSIS_TIMEOUT_MS || '300000', 10),
  maxFileSizeKB: parseInt(process.env.MAX_FILE_SIZE_KB || '1024', 10),

  // Rate Limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '10', 10),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logFile: process.env.LOG_FILE || './logs/codeguard.log',

  // GitHub Configuration
  githubToken: process.env.GITHUB_TOKEN || null,

  // File patterns to exclude from analysis
  excludePatterns: [
    '**/node_modules/**',
    '**/dist/**',
    '**/build/**',
    '**/.git/**',
    '**/coverage/**',
    '**/*.min.js',
    '**/*.min.css',
    '**/package-lock.json',
    '**/yarn.lock'
  ],

  // File extensions to analyze
  analyzeExtensions: [
    '.js',
    '.ts',
    '.jsx',
    '.tsx',
    '.json',
    '.env',
    '.env.example',
    '.config.js',
    '.yml',
    '.yaml'
  ]
};

module.exports = config;

// Made with Bob
