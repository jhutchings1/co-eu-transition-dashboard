const helmet = require('helmet');

const attach = app => {
  app.use(helmet());

  // Helmet content security policy (CSP) to allow only assets from same domain.
  app.use(helmet.contentSecurityPolicy({
    directives: {
      fontSrc: ['\'self\' data:'],
      scriptSrc: ['\'self\'', '\'unsafe-inline\'', 'www.google-analytics.com'],
      connectSrc: ['\'self\''],
      mediaSrc: ['\'self\''],
      frameSrc: ['\'none\''],
      imgSrc: ['\'self\'', 'www.google-analytics.com']
    }
  }));

  // Helmet referrer policy
  app.use(helmet.referrerPolicy({ policy: 'origin' }));
};

module.exports = { attach };