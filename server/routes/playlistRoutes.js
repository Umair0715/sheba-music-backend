const router = require('express').Router();
const playlistController = require('../controllers/playlistController');
const { protect } = require('../middlewares/protect');

router.route('/')
    .post( protect , playlistController.createPlaylist)
    .get( protect , playlistController.getMyPlaylists);

router.get('/list' , playlistController.getAllPlaylists );

router.route('/:id')
    .put(protect , playlistController.updatePlaylist)
    .delete(protect , playlistController.deletePlaylist)
    .get(playlistController.getSinglePlaylist);

router.put('/change-image/:id' , protect , playlistController.changePlaylistImage);

router.delete('/:playlistId/delete-item/:itemId' , protect , playlistController.deletePlaylistItem);
router.put('/add-item/:id' , protect , playlistController.addItemsInPlaylist);
router.get('/get-playlist-songs-and-beats/:playlistId' , playlistController.getPlaylistSongsAndBeats);
router.get('/get-playlist-songs/:playlistId' , playlistController.getPlaylistSongs);
router.get('/get-playlist-beats/:playlistId' , playlistController.getPlaylistBeats);

router.delete('/delete/all' , playlistController.deleteAllPlaylists)

module.exports = router;