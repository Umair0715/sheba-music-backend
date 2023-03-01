const router = require('express').Router();
const { getMyFavorites } = require('../controllers/favController');
const { protect } = require('../middlewares/protect');

router.route('/')
    .get(protect , getMyFavorites);

module.exports = router