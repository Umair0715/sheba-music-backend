const router = require('express').Router();
const { protect } = require('../middlewares/protect');
const buySongController = require('../controllers/buySongController');

router.route('/')
    .post(protect , buySongController.buySong)
    .get(protect , buySongController.getMyBuySongs)

router.get('/isPurchased/:songId' , protect , buySongController.isSongPurchased)



module.exports = router;