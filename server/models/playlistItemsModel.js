const mongoose = require('mongoose');

const playlistItemsSchema = new mongoose.Schema({
    item : {
        type : String ,
        required : true 
    } ,
    playlist : {
        type : mongoose.Schema.ObjectId ,
        ref : 'Playlist' ,
        required : true 
    } ,
    type : {
        type : Number ,
        // 1 = song , 2 = beat 
    } , 
});

const PlaylistItems = mongoose.model('PlaylistItem' , playlistItemsSchema);
module.exports = PlaylistItems;
