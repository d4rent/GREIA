// paywall middleware (testing version: always allow)
async function requirePayment(req, res, next) {
  return next();
}

module.exports = requirePayment;