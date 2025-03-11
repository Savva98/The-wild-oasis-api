const express = require('express');
const { getAllGuests } = require('../controllers/guestController');
const { protect, restrictTo } = require('../controllers/authController');

const gestRout = '/api/v1/guests';

const router = express.Router();
router.use(protect);
router.use(restrictTo('admin'));
router.get('/', getAllGuests);

module.exports = { router, gestRout };
