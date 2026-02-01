const { lcNormalize } = require('./lc-normalizer');

function normalize(description) {
  return lcNormalize(description);
}

module.exports = { normalize };
