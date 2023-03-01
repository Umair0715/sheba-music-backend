const router = require('express').Router();
const beatController = require('../controllers/beatController');
const { protect , restrictTo } = require('../middlewares/protect');


router.route('/')
    .post( protect , beatController.createBeat)
    .get( beatController.getBeats);

router.get('/my' , protect , beatController.getMyBeats);

router.route('/:id')
    .put( protect , beatController.updateBeat)
    .delete(protect , beatController.deleteBeat)
    .get(beatController.getSingleBeat);

router.get('/beat-details/:beatId' , protect , beatController.getBeatDetails);


module.exports = router;