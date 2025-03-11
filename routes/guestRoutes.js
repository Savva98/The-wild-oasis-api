const express = require('express');
const { getAllGuests } = require('../controllers/guestController');

const gestRout = '/api/v1/guests';

const router = express.Router();

router.get('/', getAllGuests);

module.exports = { router, gestRout };
