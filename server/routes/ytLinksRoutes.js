const router = require('express').Router();
const { protect } = require('../middlewares/protect');
const ytLinksController = require('../controllers/ytLinksController');

router.route('/')
    .post(protect , ytLinksController.createYoutubeLink)
    .get(protect , ytLinksController.getMyYoutubeLinks)
router.route('/:id')
    .put(ytLinksController.updateYoutubeLink)
    .delete(ytLinksController.deleteYoutubeLink);

router.get('/get/all' , ytLinksController.getAllYoutubeLinks)
router.get('/user/:userId' , ytLinksController.getUserYoutubeLinks)

module.exports = router;