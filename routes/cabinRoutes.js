const express = require('express');
const {
  getAllCabins,
  getCabin,
  addCabin,
  updateCabin,
  deleteCabin,
  top5CheapCabins,
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
router.route('/top-5-cheap').get(top5CheapCabins);

module.exports = { router, cabinRout };
