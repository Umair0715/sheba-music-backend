const catchAsync = require('../utils/catchAsync');
const Notification = require('../models/notificationModel');
const { sendSuccessResponse } = require('../utils/helpers');


exports.updateNotification = catchAsync( async(req , res , next) => {
    const { notificationId } = req.params;
    if(!notificationId){
        return next(new AppError('Please provide notification id in params.' , 400))
    }
    const updatedNotification = await Notification.findByIdAndUpdate(notificationId , req.body , { 
        new : true , 
        runValidators : true
    });
    return sendSuccessResponse(res , 200 , { notification : updatedNotification })
});

exports.getMyNotifications = catchAsync(async(req ,res ) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    const docCount = await Notification.countDocuments({ user : req.user._id })
    const notifications = await Notification.find({ user : req.user._id })
    .sort({ createdAt : -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
    const pages = Math.ceil(docCount/pageSize);

    return sendSuccessResponse(res , 200 , { notifications  , page , pages , docCount })
})