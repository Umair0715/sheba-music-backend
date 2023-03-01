const router = require('express').Router();
const { getMyNotifications } = require('../controllers/notificationController');
const { protect } = require('../middlewares/protect');


router.get('/my' , protect , getMyNotifications);

module.exports = router;