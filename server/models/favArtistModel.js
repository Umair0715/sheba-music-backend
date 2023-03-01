const mongoose = require('mongoose');

const favArtistSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User' ,
        required : [true , 'User is required.']
    } ,
    artist : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User' ,
        required : [true , 'Artist is required.']
    },
    createdAt : Date 
});

const FavArtist = mongoose.model('FavArtist' , favArtistSchema);
module.exports = FavArtist ;