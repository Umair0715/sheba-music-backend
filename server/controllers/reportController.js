const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendSuccessResponse } = require('../utils/helpers');
const Report = require('../models/reportModel');
const User = require('../models/userModel');
const sendNotification = require('../utils/sendNotification');


exports.createReport = catchAsync(async(req , res , next) => {
    const { target , reportType } = req.body;
    if(!target || reportType == undefined){
        return next(new AppError('Missing required credentials.' , 400))
    }
    const targetExist = await User.findById(target);
    if(!targetExist){
        return next(new AppError('Target user not found.' , 400))
    }
    const newReport = await Report.create({
        target , reportType , reportBy : req.user._id , 
    });
    sendNotification(targetExist , 'New Report' , `${req.user.name} report you.` , newReport);
    const admin = await User.findOne({ userType : 5 });
    sendNotification(admin , 'New Report' , `${req.user.name} submitted report against ${targetExist.name}` , newReport);
    return sendSuccessResponse(res , 200 , { 
        report : newReport ,
        message : 'You report submitted successfully.'
    })
});

exports.updateReport = catchAsync(async(req , res , next) => {
    const reportExist = await Report.findById(req.params.reportId);
    if(!reportExist){
        return next(new AppError('Report not found.' , 400));
    }
    await Report.findByIdAndUpdate(req.params.reportId , { actionPerformed : req.body.actionPerformed });
    return sendSuccessResponse(res , 200 , { 
        message : 'Report updated successfully.'
    });
});

exports.getReports = catchAsync(async(req , res) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1 ;
    const docCount = await Report.countDocuments();
    const reports = await Report.find()
    .limit(pageSize).skip(pageSize * (page - 1))
    .populate('target' , 'name email phone')
    .populate('reportBy' , 'name email phone');
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        reports , pages , page , docCount 
    })
});


exports.getSingleUserReports = catchAsync(async(req , res) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1 ;
    const docCount = await Report.countDocuments({ target : req.params.userId });
    const reports = await Report.find({ target : req.params.userId })
    .limit(pageSize).skip(pageSize * (page - 1))
    .populate('target' , 'name email phone')
    .populate('reportBy' , 'name email phone');
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        reports , pages , page , docCount 
    }) 
});

exports.deleteReport = catchAsync(async(req , res) => {
    await Report.findByIdAndDelete(req.params.reportId);
    return sendSuccessResponse(res , 200 , {
        message : 'Report deleted successfully.'
    })
});

exports.getMyReports = catchAsync(async(req , res) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1 ;
    const reports = await Report.find({ reportBy : req.user._id })
    .populate('target' , 'name email')
    .populate('reportBy' , 'name email')
    const docCount = await Report.countDocuments({ reportBy : req.user._id });
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        reports , page , pages , docCount 
    })
});