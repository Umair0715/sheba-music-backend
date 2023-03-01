const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Playlist = require('../models/playlistModel');
const { sendSuccessResponse , uploadImage } = require('../utils/helpers');
const PlaylistItems = require('../models/playlistItemsModel');
const Song = require('../models/songModel');
const Beat = require('../models/beatModel');



 exports.createPlaylist = catchAsync(async(req ,res ,next) => {
    const { name , image , items } = req.body;
    if(!name || !image){
        return next(new AppError('Missing required credentials.' , 400))
    };
    let newPlaylist ;
    if(items?.length > 0){
        if(items.length > 20 ) return next(new AppError('Limit error.You can add 20 items in one album.' , 400));

        req.body.image = uploadImage(image , 'playlists');
        req.body.playlistCreator = req.user._id;
        req.body.itemsCount = items.length;
        newPlaylist = await Playlist.create(req.body);

        for (let item of items ) {
            await PlaylistItems.create({
                item : item.id ,
                type : item.type , // 1 = song , 2 = beat 
                playlist : newPlaylist._id 
            })
        }
        
    }else {
        req.body.image = uploadImage(image , 'playlists');
        req.body.playlistCreator = req.user._id;
        req.body.itemsCount = items.length;
        newPlaylist = await Playlist.create(req.body);
    }
    newPlaylist = await Playlist.findById(newPlaylist._id).populate({
        path : 'playlistCreator' ,
        select : 'name email phone' 
    })
    return sendSuccessResponse(res , 201 , {
        message : 'New playlist created.', 
        playlist : newPlaylist
    });
 });



exports.getMyPlaylists = catchAsync( async ( req , res , next ) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    const playlists = await Playlist.find({ user : req.user._id , isActive : true }).populate('playlistCreator' , 'name email phone')
    .limit(pageSize).skip(pageSize * (page - 1));
    const docCount = await Playlist.countDocuments({ user : req.user._id , isActive : true });
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        playlists , pages , page , docCount 
    });
});
    
// /api/playlist/:id => PUT => protected 
exports.updatePlaylist = catchAsync( async(req , res , next) => {
    const { id } = req.params;
    const updatedPlaylist = await Playlist.findByIdAndUpdate(id , req.body , {
        new : true ,
        runValidators : true 
    }).populate('playlistCreator' , 'name email phone')
    return sendSuccessResponse(res , 200 , {
        playlist : updatedPlaylist
    })
});
    
    
// /api/playlist/:id => DELETE => protected
exports.deletePlaylist = catchAsync( async ( req , res ) => {
    const { id } = req.params;
    await Playlist.findByIdAndUpdate(id , {
        isActive : false 
    } , { new : true });
    return sendSuccessResponse(res , 200 , {
        message : 'Playlist deleted.'
    })
});


exports.getAllPlaylists = catchAsync( async(req , res , next) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    const playlists = await Playlist.find({ isActive : true })
    .limit(pageSize)
    .skip(pageSize * (page - 1 ))
    .populate('playlistCreator' , 'name email phone');
    const docCount = await Playlist.countDocuments({ isActive : true })
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        playlists , pages , page , docCount 
    })
});

exports.getSinglePlaylist = catchAsync( async ( req , res , next ) => {
    const { id } = req.params;
    const playlist = await Playlist.findById(id)
    .populate('playlistCreator' , 'name email phone')
    return sendSuccessResponse(res , 200 , { 
        playlist 
    })
});

exports.changePlaylistImage = catchAsync(async(req , res , next) => {
    let { image } = req.body;
    image = uploadImage(image , 'playlists');
    let updatedPlaylist = await Playlist.findByIdAndUpdate(req.params.id , { image } , {
        new : true ,
        runValidators : true 
    });
    return sendSuccessResponse(res , 200 , {
        playlist : updatedPlaylist
    })
}); 



// PlaylistItems Model Code 
exports.addItemsInPlaylist = catchAsync( async ( req , res , next ) => {
    const { items } = req.body;
    const { id } = req.params;
    const playlist = await Playlist.findById(id);
    if(!playlist){
        return next(new AppError('playlist not found.' , 400))
    }
    const totalItems = items.length + playlist.itemsCount;
    if(playlist.itemsCount >= 100 || totalItems > 100){
        return next(new AppError('You can add 100 items in one playlist.' , 400))
    }   
    for (let item of items){
        await PlaylistItems.create({ 
            playlist : playlist._id ,
            type : item.type , 
            item : item.id 
        })
    }
    playlist.itemsCount += items.length;
    await playlist.save();

    return sendSuccessResponse(res , 200 , {
        message : 'Items added.' ,
    }); 
});

exports.deletePlaylistItem = catchAsync( async ( req , res ) => {
    const { playlistId , itemId } = req.params;
    const playlist = await Playlist.findById(playlistId);
    playlist.itemsCount -= 1;
    await playlist.save();
    await PlaylistItems.findByIdAndRemove(itemId);
    return sendSuccessResponse(res , 200 , {
        message : 'Item removed from playlist.'
    });
});

exports.getPlaylistSongsAndBeats = catchAsync(async(req , res ,next) => {
    let playlistSongs = await PlaylistItems.find({ playlist : req.params.playlistId , isActive : true , type : 1 })
    .limit(5);
    playlistSongs = await Promise.all(playlistSongs.map( async song => await Song.findById(song.item)));
    let playlistBeats = await PlaylistItems.find({ playlist : req.params.playlistId , isActive : true , type : 2 })
    .limit(5);
    playlistBeats = await Promise.all(playlistBeats.map(async beat => await Beat.findById(beat.item)))
    
    return sendSuccessResponse(res , 200 , { 
        playlistSongs , playlistBeats
    })
});

exports.getPlaylistSongs = catchAsync(async(req , res ) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    let playlistSongs = await PlaylistItems.find({ playlist : req.params.playlistId , isActive : true , type : 1 })
    .limit(pageSize).skip(pageSize * (page - 1))
    const docCount = await PlaylistItems.countDocuments({ playlist : req.params.playlistId , isActive : true , type : 1 });
    const pages = Math.ceil(docCount/pageSize);
    playlistSongs = await Promise.all(playlistSongs.map(async song => await Song.findById(song.item)));
    return sendSuccessResponse(res , 200 , {
        page , pages , docCount , playlistSongs 
    })
});


exports.getPlaylistBeats = catchAsync(async(req , res , next ) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;
    let playlistBeats = await PlaylistItems.find({ playlist : req.params.playlistId , isActive : true , type : 2 })
    .limit(pageSize).skip(pageSize * (page - 1))
    const docCount = await PlaylistItems.countDocuments({ playlist : req.params.playlistId , isActive : true , type : 2 });
    const pages = Math.ceil(docCount/pageSize);
    playlistBeats = await Promise.all(playlistBeats.map(async beat => await Beat.findById(beat.item)));
    return sendSuccessResponse(res , 200 , {
        page , pages , docCount , playlistBeats 
    })
});




exports.deleteAllPlaylists = async (req ,res) => {
    const playlists = await Playlist.find();
    for (let playlist of playlists) {
        await Playlist.findByIdAndRemove(playlist._id);
    }
    res.json({ msg : 'done'})
}













// // /api/playlist => POST => protected
// exports.createPlaylist = catchAsync(async ( req , res , next ) => {
//     const { name , image , items } = req.body;
//     if(!name || !image){
//         return next(new AppError('Missing required credentials.' , 400))
//     };
//     const uploadedImage = uploadImage(image , 'playlists');
//     req.body.image = uploadedImage;
//     req.body.playlistCreator = req.user._id;

//     let newPlaylist = await Playlist.create(req.body);
//     newPlaylist = await Playlist.findById(newPlaylist._id).populate({
//         path : 'playlistCreator' ,
//         select : 'name email phone' 
//     }).populate({
//         path : 'songs',
//         populate : {
//             path : 'song' ,
//             select : '-__v',
//             populate : {
//                 path : 'songCreator',
//                 select : 'name email phone'
//             }
//         }
//     });
  
//     return sendSuccessResponse(res , 201 , {
//         message : 'New playlist created.', 
//         playlist : newPlaylist
//     });
// });

// // /api/playlist => GET => protected 
// exports.getMyPlaylists = catchAsync( async ( req , res , next ) => {
//     const playlists = await Playlist.find({ user : req.user._id , isActive : true }).populate('playlistCreator' , 'name email phone').populate({
//         path : 'songs',
//         populate : {
//             path : 'song' ,
//             select : 'title audio category songCover songCreator',
//             populate : {
//                 path : 'songCreator',
//                 select : 'name email phone'
//             } ,
//             populate : {
//                 path : 'category' ,
//                 select : 'name' ,
//                 populate : {
//                     path : 'parentId',
//                     select : 'name' ,
//                 }
//             }
//         }
//     });
//     return sendSuccessResponse(res , 200 , {
//         playlists 
//     });
// });

// // /api/playlist/:id => PUT => protected 
// exports.updatePlaylist = catchAsync( async(req , res , next) => {
//     const { id } = req.params;
//     const updatedPlaylist = await Playlist.findByIdAndUpdate(id , req.body , {
//         new : true ,
//         runValidators : true 
//     }).populate('playlistCreator' , 'name email phone').populate({
//         path : 'songs',
//         populate : {
//             path : 'song' ,
//             select : 'title audio category songCover songCreator' ,
//             populate : {
//                 path : 'songCreator',
//                 select : 'name email phone'
//             } ,
//             populate : {
//                 path : 'category' ,
//                 select : 'name' ,
//                 populate : {
//                     path : 'parentId',
//                     select : 'name' ,
//                 }
//             }
//         }
//     });
//     return sendSuccessResponse(res , 200 , {
//         playlist : updatedPlaylist
//     })
// });


// // /api/playlist/:id => DELETE => protected
// exports.deletePlaylist = catchAsync( async ( req , res , next ) => {
//     const { id } = req.params;
//     await Playlist.findByIdAndUpdate(id , {
//         isActive : false 
//     } , { new : true });
//     return sendSuccessResponse(res , 200 , {
//         message : 'Playlist deleted.'
//     })
// });


// // /api/playlist/addSongs/:id => PUT => protected
// exports.addSongsInPlaylist = catchAsync( async ( req , res , next ) => {
//     const { songs } = req.body;
//     let updatedPlaylist = await Playlist.findByIdAndUpdate(req.params.id , {
//            $addToSet  : {  songs : songs } 
//     } , { new : true });
    
//     updatedPlaylist = await Playlist.findById(updatedPlaylist._id).populate('playlistCreator' , 'name email phone')
//     .populate({
//         path : 'songs' ,
//         populate : {
//             path : 'song' , 
//             select : '-__v' ,
//             populate : {
//                 path : "songCreator",
//                 select : "name email phone"
//             } ,
//             populate : {
//                 path : 'category' ,
//                 select : 'name' ,
//                 populate : {
//                     path : 'parentId',
//                     select : 'name' ,
//                 }
//             }
//         }
//     });

//     return sendSuccessResponse(res , 200 , {
//         message : 'Playlist updated.' ,
//         playlist : updatedPlaylist
//     })
    
// });


// exports.getAllPlaylists = catchAsync( async(req , res , next) => {
//     const pageSize = 10 ;
//     const page = Number(req.query.page) || 1;
//     const playlists = await Playlist.find({ isActive : true }).limit(pageSize)
//     .skip(pageSize * (page - 1 ))
//     .populate('playlistCreator' , 'name email phone').populate({
//         path : 'songs',
//         populate : {
//             path : 'song' ,
//             select : 'title audio category songCover songCreator',
//             populate : {
//                 path : 'songCreator',
//                 select : 'name email phone'
//             } , 
//             populate : {
//                 path : 'category' ,
//                 select : 'name' ,
//                 populate : {
//                     path : 'parentId',
//                     select : 'name' ,
//                 }
//             }
//         }
//     });

//     return sendSuccessResponse(res , 200 , {
//         playlists
//     })

// });

// exports.getSinglePlaylist = catchAsync( async ( req , res , next ) => {
//     const { id } = req.params;
//     const playlist = await Playlist.findById(id)
//     .populate('playlistCreator' , 'name email phone').populate({
//         path : 'songs',
//         populate : {
//             path : 'song' ,
//             select : 'title audio category songCover songCreator',
//             populate : {
//                 path : 'songCreator',
//                 select : 'name email phone'
//             } , 
//             populate : {
//                 path : 'category' ,
//                 select : 'name' ,
//                 populate : {
//                     path : 'parentId',
//                     select : 'name' ,
//                 }
//             }
//         }
//     });
//     return sendSuccessResponse(res , 200 , { 
//         playlist 
//     })
// });

// exports.changePlaylistImage = catchAsync(async(req , res , next) => {
//     let { image } = req.body;
//     image = uploadImage(image , 'playlists');
//     let updatedPlaylist = await Playlist.findByIdAndUpdate(req.params.id , { image } , {
//         new : true ,
//         runValidators : true 
//     });
//     return sendSuccessResponse(res , 200 , {
//         playlist : updatedPlaylist
//     })
// }); 