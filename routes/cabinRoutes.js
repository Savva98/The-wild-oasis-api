const express = require('express');
const { getAllCabins, getCabin } = require('../controllers/cabinsContoller');

const cabinRout = '/api/v1/cabins';
const router = express.Router();

router.get('/', getAllCabins);
router.route('/:id').get(getCabin);

module.exports = { router, cabinRout };
