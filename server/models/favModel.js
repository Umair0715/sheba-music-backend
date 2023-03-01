const mongoose = require('mongoose');

const favSchema = new mongoose.Schema({ 
    postId : {
        type : mongoose.Schema.ObjectId ,
        required : true
    } ,
    postType : {
        type : Number , 
        required : true ,
        // 1 = song , 2 = beat 
    },
    user : {
        type : mongoose.Schema.ObjectId ,
        ref : "User" ,
        required : true 
    }
} , { timestamps : true });

const Fav = mongoose.model('Favorite' , favSchema);
module.exports = Fav;