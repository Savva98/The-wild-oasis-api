const express = require('express');
const {
  getAllCabins,
  getCabin,
  addCabin,
  updateCabin,
  deleteCabin,
} = require('../controllers/cabinsContoller');
const { protect, restrictTo } = require('../controllers/authController');

const cabinRout = '/api/v1/cabins';
const router = express.Router();

router.get('/', getAllCabins);
router
  .route('/:id')
  .get(getCabin)
  .patch(protect, restrictTo('admin'), updateCabin)
  .delete(protect, restrictTo('admin'), deleteCabin);
router.route('/addCabin').post(protect, restrictTo('admin'), addCabin);

module.exports = { router, cabinRout };
