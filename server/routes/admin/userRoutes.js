const router = require('express').Router();
const { protect } = require('../../middlewares/protect');
const userController = require('../../controllers/admin/userController');

router.get('/all' , userController.getAllUsers );
router.get('/artists' , userController.getArtists);
router.get('/beatProducers' , userController.getBeatProducers);
router.get('/guests' , userController.getGuestUsers);
router.get('/songWriters' , userController.getSongWriters);
router.get('/influencers' , userController.getInfluencers);
router.route('/:id')
    .get(protect  , userController.getUserDetails)
    .delete(protect  , userController.deleteUser);



module.exports = router;