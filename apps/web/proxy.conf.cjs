// A browser navigation to /pulls/:number is the review page. XHR still goes to the API.
function acceptsHtml(accept) {
  const header = Array.isArray(accept) ? accept.join(',') : (accept ?? '');

  return header.includes('text/html');
}

module.exports = {
  '/health': {
    target: 'http://127.0.0.1:3000',
    secure: false,
  },
  '/pulls': {
    target: 'http://127.0.0.1:3000',
    secure: false,
    bypass(req) {
      if (acceptsHtml(req.headers.accept)) {
        return '/index.html';
      }
    },
  },
};
