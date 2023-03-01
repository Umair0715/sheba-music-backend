const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const User = require('../models/userModel');
const Song = require('../models/songModel');
const Beat = require('../models/beatModel');
const { sendSuccessResponse } = require('../utils/helpers');

// 0 = guest , 1 = artist , 2 = songWriter , 3 = beatProducer , 4 = influencer
exports.search = catchAsync( async(req , res , next) => {
    const { type } = req.query;
    const keyword = type === 'song' || type === 'beat' ? {
        title : {
           $regex : req.query.keyword ,
           $options : 'i'
        }
    } : {
        name : {
            $regex : req.query.keyword ,
            $options : 'i'
        }
    } ;
    const page = Number(req.query.page) || 1;
    const pageSize = 10;
    let data ;
    let docCount ;
    if(type === 'song'){ 
        docCount = await Song.countDocuments(keyword);
        data = await Song.find(keyword)
        .limit(pageSize).skip(pageSize * (page - 1 ));
    }else if(type === 'beat'){ 
        docCount = await Beat.countDocuments(keyword);
        data = await Beat.find(keyword)
        .limit(pageSize).skip(pageSize * (page - 1 ));
    }else if(type === 'artist'){
        docCount = await User.countDocuments({...keyword , userType : 1 , isActive : true });
        data = await User.find({ ...keyword , userType : 1 , isActive : true })
        .limit(pageSize).skip(pageSize * (page - 1 ));
    }else if(type === 'songWriter'){ 
        docCount = await User.countDocuments({...keyword , userType : 2 , isActive : true });
        data = await User.find({ ...keyword , userType : 2 , isActive : true })
        .limit(pageSize).skip(pageSize * (page - 1 ));
    }else if(type === 'beatProducer'){ 
        docCount = await User.countDocuments({...keyword , userType : 3 , isActive : true });
        data = await User.find({ ...keyword , userType : 3 , isActive : true })
        .limit(pageSize).skip(pageSize * (page - 1 ));
    }else if(type === 'influencer'){ 
        docCount = await User.countDocuments({...keyword , userType : 4 , isActive : true });
        data = await User.find({ ...keyword , userType : 4 , isActive : true })
        .limit(pageSize).skip(pageSize * (page - 1 ));
    }else {
        docCount = await Song.countDocuments();
        data = await Song.find().limit(pageSize).skip(pageSize * (page - 1 ))
    }
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        data , pages , docCount , page
    });
});


exports.searchSongsAndBeats = catchAsync(async(req , res , next) => {
    const { type } = req.query;
    const keyword = req.query.keyword  ? {
        title : {
           $regex : req.query.keyword ,
           $options : 'i'
        }
    } : {};
    const pageSize = 1 ;
    const page = Number(req.query.page) || 1;
    if(!type){
        const songsDocCount = await Song.countDocuments({...keyword , isActive : true });
        const songs = await Song.find({...keyword , isActive : true })
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .sort({ createdAt : -1 })
        .populate('songCreator' , 'name email phone')
        .populate('category' , 'name type');
        const songsPages = Math.ceil(songsDocCount/pageSize);

        const beatsDocCount = await Beat.countDocuments({...keyword , isActive : true })
        const beats = await Beat.find({...keyword , isActive : true })
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .sort({ createdAt : -1 })
        .populate('beatCreator' , 'name email phone')
        .populate('category' , 'name type');
        const beatsPages = Math.ceil(beatsDocCount/pageSize);

        return sendSuccessResponse(res , 200 , {
            songs , songsDocCount , songsPages , beats , beatsDocCount , page , beatsPages 
        })
    }
    if(type == 1){ //means songs 
        const songs = await Song.find({...keyword , isActive : true })
        .sort({ createdAt : -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .populate('songCreator' , 'name email phone ')
        .populate('category' , 'name type')
        const songsDocCount = await Song.countDocuments({...keyword , isActive : true });
        const songsPages = Math.ceil(songsDocCount/pageSize);

        return sendSuccessResponse(res , 200 , {
            songs , page , songsDocCount , songsPages 
        });
    }
    if(type == 2) { // mean beats 
        const beats = await Beat.find({...keyword , isActive : true })
        .sort({ createdAt : -1 })
        .limit(pageSize)
        .skip(pageSize * (page - 1))
        .populate('beatCreator' , 'name email phone ')
        .populate('category' , 'name type')
        const beatsDocCount = await Beat.countDocuments({...keyword , isActive : true });
        const beatsPages = Math.ceil(beatsDocCount/pageSize);

        return sendSuccessResponse(res , 200 , {
            beats , page , beatsDocCount , beatsPages 
        });
    }
});