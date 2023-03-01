const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User'
    } ,
    title : {
        type : String ,
        required : true 
    } ,
    body : {
        type : String ,
        required : true 
    } ,
    amount : {
        type : String 
    } ,
    type : {
        type : Number ,
        required : true 
    } 
    // 1 = messageNotify , 2 = songNotify , 3 = purchaseNotify , 4 = ticketNotify , 5 = liveStreamNotify , 6 = influencerTagNotify , 7 = transactionNotify
} , { timestamps : true });

const Notification = mongoose.model('Notification' , notificationSchema);
module.exports = Notification;