const express = require('express');
const {
  signUp,
  login,
  logout,
  forgotPassword,
} = require('../controllers/authController');

const rout = '/api/v1/auth';
const router = express.Router();

router.post('/signup', signUp);
router.post('/login', login);
router.post('/logout', logout);
router.get('/forgotPassword', forgotPassword);

module.exports = { router, rout };
