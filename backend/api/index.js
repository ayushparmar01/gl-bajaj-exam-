// Vercel Serverless Function entry point with resilient error catching
let app;

module.exports = (req, res) => {
  try {
    if (!app) {
      app = require('../server');
    }
    return app(req, res);
  } catch (err) {
    console.error('CRITICAL SERVERLESS BOOT ERROR:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: false,
      error: 'CRITICAL_BOOT_ERROR',
      message: err.message,
      stack: err.stack
    }, null, 2));
  }
};
