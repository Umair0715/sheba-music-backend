const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendSuccessResponse } = require('../utils/helpers');
const FavArtist = require('../models/favArtistModel');
const User = require('../models/userModel');

exports.addToFavArtists = catchAsync(async(req ,res ,next) => {
    const { artist } = req.body;
    if(!artist) return next(new AppError('Please provide artist id.' , 400));

    const favArtistExist = await FavArtist.findOne({ artist });
    if(favArtistExist){
        return next(new AppError('This artist already exist in your favorite artist list.' , 400));
    }
    if((await User.findById(artist)).userType !== 1 ) return next(new AppError('This user is not an artist.' , 400 ))

    const newFavArtist = await FavArtist.create({ 
        user : req.user._id ,
        artist , 
        createdAt : new Date() ,
    });
    return sendSuccessResponse(res , 200 , { 
        favArtist : newFavArtist ,
        message : 'Artist added to your favorite artist list.'
    })
});

exports.getMyFavArtists = catchAsync(async(req , res) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1 ;
    const docCount = await FavArtist.countDocuments({ user : req.user._id });
    const favArtists = await FavArtist.find({ user : req.user._id })
    .limit(pageSize).skip(pageSize * (page - 1))
    .populate('artist' , 'name email phone')
    .populate('user' , 'name email phone');

    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        page , pages , docCount , favArtists 
    })
});

exports.deleteFromFavArtists = catchAsync(async(req ,res ,next) => {
    const { artistId } = req.params;
    await FavArtist.findOneAndRemove({ artist : artistId });
    return sendSuccessResponse(res , 200 , {
        message : 'Artist removed successfully.'
    })
});