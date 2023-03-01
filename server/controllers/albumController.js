const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Album = require('../models/albumModel');
const { sendSuccessResponse , uploadImage  } = require('../utils/helpers');
const AlbumItems = require('../models/albumItemsModel');
const Song = require('../models/songModel');
const Beat = require('../models/beatModel');
const User = require('../models/userModel');


exports.createAlbum = catchAsync(async ( req , res , next ) => {
    let { name , image , items } = req.body;
    if(!name || !image){
        return next(new AppError('Missing required credentials.' , 400))
    };
   
    image = uploadImage(image , 'albums')
    if(items?.length > 0){
        if(items.length > 20 ) return next(new AppError('Limit error.You can add 20 items in one album.' , 400));

        req.body.albumCreator = req.user._id;
        req.body.itemsCount = items.length;
        
        let newAlbum = await Album.create({...req.body , albumCreator : req.user._id , image });
        for (let item of items ) {
            await AlbumItems.create({
                item : item.id ,
                type : item.type , // 1 = song , 2 = beat 
                album : newAlbum._id 
            })
        }
        newAlbum = await Album.findById(newAlbum._id)
        .populate('albumCreator' , 'name email phone');
        return sendSuccessResponse(res , 200 , {
            message : 'New Album created.',
            album : newAlbum 
        })
        
    }
    
    let newAlbum = await Album.create({...req.body , albumCreator : req.user._id , image });
    newAlbum = await Album.findById(newAlbum._id)
    .populate('albumCreator' , 'name email phone');

    return sendSuccessResponse(res , 201 , {
        message : 'New album created.', 
        album : newAlbum 
    });
});

// /api/album => GET => protected 
exports.getMyAlbums = catchAsync( async ( req , res , next ) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    const albums = await Album.find({ user : req.user._id , isActive : true }).populate('albumCreator' , 'name email phone')
    .limit(pageSize).skip(pageSize * (page - 1))
    .sort({ createdAt : -1 })
    const docCount = await Album.countDocuments({ user : req.user._id , isActive : true });
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        albums , page , pages , docCount  
    });
});

// /api/album/:id => PUT => protected 
exports.updateAlbum = catchAsync( async(req , res , next) => {
    const { id } = req.params;
    const updatedAlbum = await Album.findByIdAndUpdate(id , req.body , {
        new : true ,
        runValidators : true 
    }).populate('albumCreator' , 'name email phone');

    return sendSuccessResponse(res , 200 , {
        album : updatedAlbum
    })
});

// /api/album/:id => DELETE => protected
exports.deleteAlbum = catchAsync( async ( req , res , next ) => {
    const { id } = req.params;
    await Album.findByIdAndUpdate(id , {
        isActive : false 
    } , { new : true });
    return sendSuccessResponse(res , 200 , {
        message : 'Album deleted.'
    })
});


exports.getAllAlbums = catchAsync(async ( req , res , next) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    const albums = await Album.find({ isActive : true })
    .limit(pageSize).skip(pageSize * (page - 1 ))
    .populate('albumCreator' , 'name email phone')
    const docCount = await Album.countDocuments(({ isActive : true }))
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse( res , 200 , {
        albums , page , pages , docCount 
    });
});

exports.getSingleAlbum = catchAsync( async ( req , res , next ) => {
    const { id } = req.params;
    const album = await Album.findOne({ _id : id , isActive : true })
    .populate('albumCreator' , 'name email phone')
    return sendSuccessResponse(res , 200 , {
        album 
    })
});

exports.changeAlbumImage = catchAsync(async(req , res , next) => {
    let { image } = req.body;
    image = uploadImage(image , 'albums');
    let updatedAlbum = await Album.findByIdAndUpdate(req.params.id , { image } , {
        new : true ,
        runValidators : true 
    });
    return sendSuccessResponse(res , 200 , {
        album : updatedAlbum
    })
});


// AlbumItems Model Code 
exports.addItemsInAlbum = catchAsync( async ( req , res , next ) => {
    const { items } = req.body;
    const { id } = req.params;
    const album = await Album.findById(id);
    if(!album){
        return next(new AppError('Album not found.' , 400))
    }
    const totalItems = items.length + album.itemsCount;
    if(album.itemsCount >= 20 || totalItems > 20){
        return next(new AppError('You can add only 20 items in one album.' , 400))
    }   
    for (let item of items){
        await AlbumItems.create({ 
            album : album._id ,
            type : item.type , 
            item : item.id 
        })
    }
    album.itemsCount += items.length;
    await album.save();

    return sendSuccessResponse(res , 200 , {
        message : 'Items added.' ,
    }); 
});

exports.deleteAlbumItem = catchAsync( async ( req , res , next ) => {
    const { albumId , itemId } = req.params;
    const album = await Album.findById(albumId);
    if(!album){
        return next(new AppError('Album not found. Make sure to provide corrent album id.' , 400))
    }
    const albumItem = await AlbumItems.findOne({ item : itemId.toString() , album : album._id });
    await albumItem.remove();

    if(album.itemsCount !== 0){
        album.itemsCount -= 1;
        await album.save();
    }
    return sendSuccessResponse(res , 200 , {
        message : 'Item removed from album.'
    });
});

exports.getAlbumSongsAndBeats = catchAsync(async(req , res ,next) => {
    let albumSongs = await AlbumItems.find({ album : req.params.albumId , isActive : true , type : 1 })
    .limit(5);
    albumSongs = await Promise.all(albumSongs.map( async song => await Song.findById(song.item)));
    let albumBeats = await AlbumItems.find({ album : req.params.albumId , isActive : true , type : 2 })
    .limit(5);
    albumBeats = await Promise.all(albumBeats.map(async beat => await Beat.findById(beat.item)))
    
    return sendSuccessResponse(res , 200 , { 
        albumSongs , albumBeats
    })
});

exports.getAlbumSongs = catchAsync(async(req , res , next ) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    let albumSongs = await AlbumItems.find({ album : req.params.albumId , type : 1 })
    .limit(pageSize).skip(pageSize * (page - 1))
    const docCount = await AlbumItems.countDocuments({ album : req.params.albumId , type : 1 });
    const pages = Math.ceil(docCount/pageSize);
    albumSongs = await Promise.all(albumSongs.map(async song => await Song.findById(song.item)));
    return sendSuccessResponse(res , 200 , {
        page , pages , docCount , albumSongs 
    })
});


exports.getAlbumBeats = catchAsync(async(req , res , next ) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    let albumBeats = await AlbumItems.find({ album : req.params.albumId , type : 2 })
    .limit(pageSize).skip(pageSize * (page - 1))
    const docCount = await AlbumItems.countDocuments({ album : req.params.albumId , type : 2 });
    const pages = Math.ceil(docCount/pageSize);
    albumBeats = await Promise.all(albumBeats.map(async beat => await Beat.findById(beat.item)));
    return sendSuccessResponse(res , 200 , {
        page , pages , docCount , albumBeats 
    })
});


exports.deleteAllAlbums = async (req ,res) => {
    const albums = await Album.find();
    for (let album of albums) {
        await Album.findByIdAndRemove(album._id);
    }
    res.json({ msg : 'done'})
}



exports.getSingleUserAlbums = catchAsync(async(req , res , next) => {
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
    const docCount = await Album.countDocuments({ albumCreator : userId , isActive : true });
    const albums = await Album.find({ albumCreator : userId , isActive : true })
    .populate('albumCreator' , 'name email phone')
    .limit(pageSize).skip(pageSize * (page - 1))
    .sort({ createdAt : -1 });
    const pages = Math.ceil(docCount/pageSize);
    
    return sendSuccessResponse(res , 200 , {
        albums , docCount , page , pages , 
    })
});




