const router = require('express').Router();
const songController = require('../controllers/songController');
const { protect } = require('../middlewares/protect');
const upload = require('../middlewares/multer');

router.route('/')
    .post( protect , songController.createSong )
    .get(songController.getSongs);
    
router.route('/:id')
    .put(protect , songController.updateSong)
    .delete(protect , songController.deleteSong)
    .get(songController.getSingleSong)

router.get('/song-details/:songId' , protect , songController.getSongDetails);
router.post('/upload/test' , songController.uploadTestFile);
router.post('/upload/file' , upload.single('audio') , songController.uploadSongFile );

router.get('/user-songs/:userId' , songController.getSingleUserSongs);

module.exports = router;