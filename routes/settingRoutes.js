const expres = require('express');
const {
  getSetting,
  updateSetting,
} = require('../controllers/settingController');
const { protect, restrictTo } = require('../controllers/authController');

const router = expres.Router();
const rout = '/api/v1/settings';
// router.use(protect, restrictTo('admin'));
router.get('/', getSetting);
router.patch('/:id', updateSetting);

module.exports = { router, rout };
