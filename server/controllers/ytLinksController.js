const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const YoutubeLinks = require('../models/ytLinksModel');
const { sendSuccessResponse } = require('../utils/helpers');

exports.createYoutubeLink = catchAsync( async(req , res , next) => {
    const { link } = req.body;
    if(!link){
        return next(new AppError('Link is required.' , 400))
    }
    const linkExist = await YoutubeLinks.findOne(
        { 
            link , 
            user : req.user._id , 
            isActive : true 
        }
    );
    if(linkExist){
        return next(new AppError('This link is already exist.' , 400))
    }
    let newLink = await YoutubeLinks.create({ 
        user : req.user._id , 
        link 
    });
    newLink = await YoutubeLinks.findById(newLink._id)
    .populate('user' , 'name email phone');
    return sendSuccessResponse(res , 201 , {
        message : "New link created." ,
        link : newLink 
    })
});


exports.getUserLinks = catchAsync( async(req , res , next) => {
    const links = await YoutubeLinks.findOne({ email : req.body.email })
    .populate('user' , 'name email phone');
    if(!links){
        return next(new AppError('Link not found.' , 400))
    }
    return sendSuccessResponse(res , 200 , {
        
    })
})

exports.getMyYoutubeLinks = catchAsync( async(req , res , next) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;

    const docCount = await YoutubeLinks.countDocuments({ user : req.user._id , isActive : true })
    const links = await YoutubeLinks.find({ user : req.user._id , isActive : true })
    .sort({ createdAt : -1 })
    .limit(pageSize).skip(pageSize * (page - 1 ))
    .populate('user' , 'name email phone');
    const pages = Math.ceil(docCount/pageSize);

    return sendSuccessResponse(res , 200 , {
        links , pages , page , docCount 
    });
});

exports.updateYoutubeLink = catchAsync( async(req , res , next) => {
    const { id } = req.params;
    if(!id){
        return next(new AppError('Link id is required.' , 400))
    }
    const updatedLink = await YoutubeLinks.findByIdAndUpdate(id , req.body , {
        new : true ,
        runValidators : true
    }).populate('user' , 'name email phone');

    return sendSuccessResponse(res , 200 , {
        message : 'Link updated successfully.' , 
        link : updatedLink 
    })

});


exports.deleteYoutubeLink = catchAsync( async(req , res , next) => {
    const { id } = req.params;
    if(!id){
        return next(new AppError('Link id is required.' , 400))
    }
    await YoutubeLinks.findByIdAndUpdate(id , { isActive : false } );
    return sendSuccessResponse(res , 200 , {
        message : 'Link deleted.'
    })
});


exports.getUserYoutubeLinks = catchAsync(async(req ,res ,next) => {
    const { userId } = req.params;
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;

    if(!userId){
        return next(new AppError('Please provide user id in params.' , 400))
    }
    const docCount = await YoutubeLinks.countDocuments({ user : userId , isActive : true })
    const links = await YoutubeLinks.find({ user : userId , isActive : true })
    .sort({ createdAt : -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate('user' , 'name email phone');

    const pages = Math.ceil(docCount/pageSize);

    return sendSuccessResponse(res , 200 , {
        links , pages , page , docCount 
    })
});

exports.getAllYoutubeLinks = catchAsync(async(req ,res ,next) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;

    const docCount = await YoutubeLinks.countDocuments({ isActive : true })
    const links = await YoutubeLinks.find({ isActive : true })
    .sort({ createdAt : -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .populate('user' , 'name email phone');

    const pages = Math.ceil(docCount/pageSize);

    return sendSuccessResponse(res , 200 , {
        links , pages , page , docCount 
    })
});

