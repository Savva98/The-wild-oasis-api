// const path = require('path');
const process = require('process');
const express = require('express');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const monogoSenitize = require('express-mongo-sanitize');
const { filterXSS } = require('xss');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { router: cabinsRout, cabinRout } = require('./routes/cabinRoutes');
const { router: guestsRout, gestRout } = require('./routes/guestRoutes');
const { router: authRout, rout: authRoutPath } = require('./routes/authRoutes');
const AppError = require('./utils/appError');
const errorHandler = require('./controllers/errorController');

const app = express();
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};
app.use(cors(corsOptions));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'", 'https:', 'http:', 'data:', 'ws:'],
      },
      XMLHttpRequest: {
        'connect-src': ["'self'", 'https:', 'http:', 'ws:'],
      },
    },
  }),
);

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'To many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
app.use(monogoSenitize());
app.use((req, res, next) => {
  const sanitize = (obj) => {
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] === 'string') {
        obj[key] = filterXSS(obj[key], {
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script'],
        });
      } else if (typeof key === 'object' && key !== null) {
        sanitize(obj[key]);
      }
    });
  };
  sanitize(req.body);
  sanitize(req.params);
  sanitize(req.query);
  next();
});
app.use(hpp());

app.use(cabinRout, cabinsRout);
app.use(gestRout, guestsRout);
app.use(authRoutPath, authRout);

app.all('*', (req, res, next) => {
  const err = new AppError(
    `Can't find ${req.originalUrl} on this server!`,
    404,
  );
  next(err);
});
app.options('*', cors(corsOptions));

app.use(errorHandler);

module.exports = app;
