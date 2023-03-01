const mongoose = require('mongoose');

const beatSchema = new mongoose.Schema({
    title : {
        type : String ,
        required : [true , 'beat title is required.']
    } ,
    audio : {
        type : String ,
        required : [true, 'beat audio is required.'] 
    } ,
    beatCover : {
        type : Object ,
        required : [true, 'beat cover is required.'] 
    } ,
    category : {
        type : mongoose.Schema.ObjectId ,
        ref : 'BeatsCategory',
        required : [true, 'beat category is required.'] 
    } ,
    license : {
        type : Object ,
        required : [true , 'Beat license is required.'] 
    } ,
    beatCreator : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User' ,
        required : [true, 'User is required who is going to create the beat.'] 
    },
    isActive : {
        type : Boolean ,
        default : true 
    },
    type : {
        type : String ,
        default : 'beat'
    } ,
    duration : {
        type : String ,
        required : [true , 'Beat duration is required.']
    } ,
    BPM : {
        type : String 
    }
});


const Beat = mongoose.model('Beat' , beatSchema);
module.exports = Beat;