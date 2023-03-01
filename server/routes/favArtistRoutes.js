const router = require('express').Router();
const { addToFavArtists, getMyFavArtists, deleteFromFavArtists } = require('../controllers/favArtistController');
const { protect } = require('../middlewares/protect');


router.post('/' , protect , addToFavArtists );
router.get('/my' , protect , getMyFavArtists );
router.delete('/:artistId' , protect , deleteFromFavArtists);

module.exports = router;