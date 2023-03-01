const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendSuccessResponse } = require('../utils/helpers');
const Fav = require('../models/favModel');
const Song = require('../models/songModel');
const Beat = require('../models/beatModel');


exports.getMyFavorites = catchAsync(async( req , res ) => {
    let favItems = [];
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    const docCount = await Fav.countDocuments({ user : req.user._id })
    const favs = await Fav.find({ user : req.user._id })
    .limit(pageSize).skip(pageSize * (page - 1));
    const pages = Math.ceil(docCount/pageSize);

    if(favs?.length > 0 ){
        favItems = await Promise.all(favs.map( async fav => {
            if(fav.postType === 1){ // mean song 
                const song =  await Song.findById(fav.postId)
                .populate('songCreator' , 'name email phone')
                return {...fav._doc , postId : song }
            }
            if(fav.postType === 2 ) { // mean beat
                const beat = await Beat.findById(fav.postId)
                .populate('beatCreator' , 'name email phone')
                return {...fav._doc , postId : beat }
            }
        }))
    }
    return sendSuccessResponse(res , 200 , {
        favorites : favItems , pages , page , docCount 
    })
});