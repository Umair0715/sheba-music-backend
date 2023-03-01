const mongoose = require('mongoose');

const notificationSettingsSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User' ,
        required : [true , 'User id is required.']
    } ,
    newSongNotify : {
        type : Number ,
        default : 1 
    } ,
    messageNotify : {
        type : Number ,
        default : 1 
    } ,
    transactionNotify : {
        type : Number ,
        default : 0 
    } ,
    purchaseNotify : {
        type : Number ,
        default : 1 
    } ,
    ticketNotify : {
        type : Number ,
        default : 0 
    } ,
    liveStreamNotify : {
        type : Number ,
        default : 0 
    } , 
    marketingNotify : {
        type : Number ,
        default : 0 
    } , 
    reportNotfify : Number ,
    playMilestoneNotify : Number ,
    newSuporterNotify : Number ,
    tagNotify : Number , 
} , { timeStamps : true } );

const NotificationSettings = mongoose.model('NotificationSetting' , notificationSettingsSchema);
module.exports = NotificationSettings;