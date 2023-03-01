const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Beat = require('../models/beatModel');
const { sendErrorResponse , sendSuccessResponse , uploadImage , countBeats , countSongs , isSubscribed, getAudioDuration , uploadBeat } = require('../utils/helpers');
const Follow = require('../models/followModel');
const Comment = require('../models/commentModel');
const Like = require('../models/likeModel');

// /api/beat => POST => public
exports.createBeat = catchAsync(async (req , res , next ) => {
    const { audio , beatCover , title , category , license , BPM } = req.body;
    if(!audio || !beatCover || !title || !category  || !BPM){
        return next(new AppError("Missing required credentials." , 400))
    }
    if(req.user.userType == 1 || req.user.userType == 2){ // artist/writer
        const songsCount = await countSongs(req.user._id);
        const isUserSubscribed = await isSubscribed(req.user);
        if(!isUserSubscribed && songsCount >= 10 ){
            return next(new AppError('You have reached your upload limit.To upload more songs please upgrade your plan or buy a plan.' , 400))
        }
    }
    if(req.user.userType == 3 ){ // Producer 
        const songsCount = await countSongs(req.user._id);
        const beatsCount = await countBeats(req.user._id);
        const isUserSubscribed = await isSubscribed(req.user);
        const uploadCount = songsCount + beatsCount;
        if(!isUserSubscribed && uploadCount >= 10 ){
            return next(new AppError('You have reached your upload limit.To upload more songs/beats please upgrade your plan or buy a plan.' , 400))
        }
    }
    const _audio = uploadBeat(audio , res);
    const _beatCover = uploadImage(beatCover , 'beatCovers');
    const duration = await getAudioDuration(_audio , 'beats');

    let newBeat = await Beat.create({ 
        audio : _audio ,
        beatCover : _beatCover ,
        title ,
        category ,
        license: license ? license : { 
            type : 0 , 
            name : 'free' , 
            amount : 0 
        } ,
        beatCreator : req.user._id ,
        duration ,
        BPM 
    });
    newBeat = await Beat.findById(newBeat._id)
    .populate('beatCreator' , 'name email phone')
    .populate('category');

    return sendSuccessResponse(res , 201 , { 
        message : 'Beat created.', 
        beat : newBeat 
    })
});


// /api/beat => GET => public
exports.getBeats = catchAsync( async(req , res , next) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    const docCount = await Beat.countDocuments({ isActive : true });
    const beats = await Beat.find({ isActive : true }).limit(pageSize).skip(pageSize * (page -1 ))
    .populate('beatCreator' , 'name email phone')
    .populate('category');
    const pages = Math.ceil(docCount/pageSize);

    return sendSuccessResponse(res , 200 , { 
        docCount , 
        page , 
        pages ,
        beats  
    })
});


//  /api/beat/my => GET => //  /api/beat/my => GET => Protected 
exports.getMyBeats = catchAsync( async(req , res , next) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    const docCount = await Beat.countDocuments({ isActive : true , beatCreator : req.user._id })
    const beats = await Beat.find({ isActive : true , beatCreator : req.user._id })
    .limit(pageSize).skip(pageSize * (page - 1))
    .populate('beatCreator' , 'name email phone')
    .populate('category');
    const pages = Math.ceil(docCount/pageSize);

    return sendSuccessResponse(res , 200 , {
        docCount , pages , page , beats
    });
});




// /api/beat/:id => PUT => public
exports.updateBeat = catchAsync( async (req , res , next ) => {
    const updatedBeat = await Beat.findByIdAndUpdate(req.params.id , req.body , {
        new : true 
    })
    .populate('beatCreator' , 'name email phone')
    .populate('category')

    return sendSuccessResponse(res , 200 , { 
        message : 'Beat updated.',
        beat : updatedBeat
    });
});


// /api/beat/:id => DELETE => public
exports.deleteBeat = catchAsync( async (req , res , next ) => {
    const { id } = req.params;
    await Beat.findByIdAndUpdate(id , {
        isActive : false 
    });
    return sendSuccessResponse(res , 200 , {
        message : 'Beat deleted.'
    })
});


exports.getSingleBeat = catchAsync( async (req , res , next ) => {
    const { id } = req.params;
    const beat = await Beat.findOne({ _id : id , isActive : true })
    .populate('beatCreator' , 'name email phone')
    .populate('category')

    return sendSuccessResponse(res , 200 , {
        beat 
    })
});


exports.getBeatDetails = catchAsync(async(req , res , next) => {
    const { beatId } = req.params;
    const beat = await Beat.findById(beatId)
    .populate('beatCreator' , 'name email phone')
    .populate('category');

    const creatorFollowersCount = await Follow.countDocuments({ user : beat.beatCreator._id , isActive : true });
    const commentsCount = await Comment.countDocuments({ postId : beatId });
    const isFollowed = await Follow.findOne({ user : beat.beatCreator._id , follower : req.user._id });
    const isLiked = await Like.findOne({ postId : beatId , user : req.user._id })
    return sendSuccessResponse(res , 200 , {
        beat , 
        creatorFollowersCount ,
        commentsCount ,
        isFollowed : isFollowed ? true : false ,
        isLiked : isLiked ? true : false 
    });
});

