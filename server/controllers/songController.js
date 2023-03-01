const fs = require('fs');
const path = require('path');
const Song = require('../models/songModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendErrorResponse , sendSuccessResponse , uploadImage , countBeats , countSongs , isSubscribed, getAudioDuration } = require('../utils/helpers');
const sendNotification = require('../utils/sendNotification');
const User = require('../models/userModel');
const NotificationSettings = require('../models/notificationSettingsModel');
const Notification = require('../models/notificationModel');
const Follow = require('../models/followModel');
const Comment = require('../models/commentModel');
const Like = require('../models/likeModel');



const convertToMp3 = ( string , res , directory = 'songs' ) => {
    const songName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    fs.writeFileSync(path.resolve(`server/uploads/${directory}` , `${songName}.mp3`) , Buffer.from(string.replace('data:audio/mp3; codecs=opus;base64,', ''), 'base64') , (err) => {
        if(err){
            return sendErrorResponse(res , 500 , { 
                message : 'Internal server error'
            })
        }
    });
    
    return songName + '.mp3';
}


// /api/song => POST => public
exports.createSong = catchAsync(async (req , res , next ) => {
    const { audio , songCover , title , genre , mood , license , type , language } = req.body;
    if(!audio || !songCover || !title || !genre || !mood || !language){
        return next(new AppError("Missing required credentials." , 400))
    }
   
    if(req.user.userType === 1 || req.user.userType === 2){ // artist/writer
        const songsCount = await countSongs(req.user._id);
        const isUserSubscribed = await isSubscribed(req.user);
        if(!isUserSubscribed && (songsCount === 10 || songsCount > 10)){
            return next(new AppError('You have reached your upload limit.To upload more songs please upgrade your plan or buy a plan.' , 400))
        }
    }
    if(req.user.userType === 3 ){ // Producer 
        const songsCount = await countSongs(req.user._id);
        const beatsCount = await countBeats(req.user._id);
        const isUserSubscribed = await isSubscribed(req.user);
        const uploadCount = songsCount + beatsCount;
        if(!isUserSubscribed && (uploadCount === 10 || uploadCount > 10)){
            return next(new AppError('You have reached your upload limit.To upload more songs/beats please upgrade your plan or buy a plan.' , 400))
        }
    }
    const _audio = convertToMp3(audio , res);
    const _songCover = uploadImage(songCover , 'songCovers');
    const duration = await getAudioDuration(_audio);
   
    const newSong = await Song.create({ 
        audio : _audio ,
        songCover : _songCover ,
        title ,
        genre ,
        mood ,
        license: license ? license : { 
            type : 0 , 
            name : 'free' , 
            amount : 0 
        } ,
        type ,
        songCreator : req.user._id ,
        duration ,
        language
    });
    const users = await User.find();
    for (let user of users){
        if(user?.fcmToken){
            let userNotificationSettings = await NotificationSettings.findOne({ user : user._id });
            if(userNotificationSettings?.newSongNotify){
                sendNotification(user , `${req.user.name} added new song.` , `Song Name: ${newSong.title}` , newSong )
            }
            Notification.create({
                title : `${req.user.name} added new song.` ,
                body : `Song Name ${newSong.title}` ,
                user : user._id ,
                type : 2 ,
            });
        }
    }
    return sendSuccessResponse(res , 201 , { 
        message : 'Song created.', 
        song : newSong 
    })
});


// /api/song => GET => public
exports.getSongs = catchAsync( async(req , res ) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    const docCount = await Song.countDocuments({ isActive : true });
    const songs = await Song.find({ isActive : true })
    .populate('songCreator' , 'name email phone')
    .populate('genre')
    .populate('mood')
    .limit(pageSize).skip(pageSize * (page - 1))
    .sort({ createdAt : -1 })
    

    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , { 
        songs , page , pages , docCount 
    })
});


// /api/song/:id => PUT => public
exports.updateSong = catchAsync( async (req , res , next ) => {
    const updatedSong = await Song.findByIdAndUpdate(req.params.id , req.body , {
        new : true 
    }).populate('songCreator' , 'name email phone');

    return sendSuccessResponse(res , 200 , { 
        message : 'Song updated.',
        song : updatedSong
    })
});


// /api/song/:id => DELETE => public
exports.deleteSong = catchAsync( async (req , res , next ) => {
    const { id } = req.params;
    await Song.findByIdAndUpdate(id , {
        isActive : false 
    });
    return sendSuccessResponse(res , 200 , {
        message : 'Song deleted.'
    })
});


exports.getSingleSong = catchAsync( async(req , res , next) => {
    const { id } = req.params;
    const song = await Song.findById(id)
    .populate('songCreator' , 'name email phone')
    .populate('genre')
    .populate('mood');

    return sendSuccessResponse(res , 200 , {
        song 
    })
});

// followersCount , commentCount , isFollowed , isLiked
exports.getSongDetails = catchAsync(async(req , res , next) => {
    const { songId } = req.params;
    const song = await Song.findById(songId)
    .populate('songCreator' , 'name email phone')
    .populate('genre')
    .populate('mood')

    const creatorFollowersCount = await Follow.countDocuments({ user : song.songCreator._id , isActive : true });
    const commentsCount = await Comment.countDocuments({ postId : songId });
    const isFollowed = await Follow.findOne({ user : song.songCreator._id , follower : req.user._id });
    const isLiked = await Like.findOne({ postId : songId , user : req.user._id })
    return sendSuccessResponse(res , 200 , {
        song , 
        creatorFollowersCount ,
        commentsCount ,
        isFollowed : isFollowed ? true : false ,
        isLiked : isLiked ? true : false 
    });
});

// multer file song // song creator should be admin
exports.uploadSongFile = catchAsync(async(req , res , next) => {
    const { songCover , title , genre , mood , license , type , language , thirdPartyId } = req.body ;
    if(!songCover || !title || !genre || !mood || !language || !thirdPartyId){
        return next(new AppError("Missing required credentials." , 400))
    }

    let songExist = await Song.findOne({ thirdPartyId });
    if(songExist){
        songExist = await Song.findById(songExist._id)
        .populate('songCreator' , 'name email phone')
        .populate('genre')
        .populate('mood')
        return sendSuccessResponse(res , 200 , {
            song : songExist 
        });
    }

    const _songCover = uploadImage(songCover , 'songCovers');
    const duration = await getAudioDuration(req.file.filename);
    let songCreator = await User.findOne({ userType : 5 });
    if(!songCreator){
        return next(new AppError('Admin not found.' , 400));
    }
    const newSong = await Song.create({ 
        thirdPartyId ,
        audio : req.file.filename ,
        songCover : _songCover ,
        title ,
        genre ,
        mood ,
        license: license ? {...license , type : Number(license.type) } : { 
            type : 0 , 
            name : 'free' , 
            amount : 0 
        } ,
        type ,
        songCreator ,
        duration ,
        language
    });

    return sendSuccessResponse(res , 201 , { 
        message : 'Song created.', 
        song : newSong 
    })
});



exports.uploadTestFile = catchAsync(async(req ,res) => {
    let { audio , image  } = req.body;
    audio = convertToMp3(audio , res , 'test');
    image = uploadImage(image , 'test');
    return sendSuccessResponse(res , 200 , {
        msg : 'done' ,
        audio , 
        image 
    })
});


exports.getSingleUserSongs = catchAsync(async(req , res , next) => {
    const { userId } = req.params;
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    if(!userId){
        return next(new AppError('Please provide user id in params.',400))
    }
    const user = await User.findById(userId);
    if(!user){
        return next(new AppError('Invalid id. User not found with this id.' , 400))
    }
    const docCount = await Song.countDocuments({ songCreator : userId , isActive : true });
    const songs = await Song.find({ songCreator : userId , isActive : true })
    .populate('songCreator' , 'name email phone')
    .populate('genre')
    .populate('mood')
    .limit(pageSize).skip(pageSize * (page - 1))
    .sort({ createdAt : -1 });
    const pages = Math.ceil(docCount/pageSize);
    
    return sendSuccessResponse(res , 200 , {
        songs , docCount , page , pages , 
    })
});