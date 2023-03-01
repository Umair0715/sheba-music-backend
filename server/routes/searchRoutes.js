const router = require('express').Router();
const searchController = require('../controllers/searchController');
router.route('/')
    .get(searchController.search);

router.get('/songs-and-beats' , searchController.searchSongsAndBeats);

module.exports = router;