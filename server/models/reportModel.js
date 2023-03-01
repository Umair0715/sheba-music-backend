const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    target : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User' ,
        required : [true , 'Report target is required.']
    } ,
    reportBy : {
        type : mongoose.Schema.ObjectId ,
        ref : 'User' ,
        required : [true , 'ReportBy is required.']
    } ,
    reportType : {
        type : Number ,
        required : [true , 'Report type is required.']
        // 0 = spam , 1 = bullying , 2 = harassment
    } ,
    actionPerformed : {
        type : Number ,
        default : 0 ,
        // 0 = false , 1 = true 
    }
}, { timestamps : true });

const Report = mongoose.model('Report' , reportSchema);
module.exports = Report;