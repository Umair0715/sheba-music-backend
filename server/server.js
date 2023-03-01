const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const app = express();
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const connectDB = require("./utils/db");
const cors = require('cors');
const globalErrorHandler = require('./middlewares/errorHandler');



connectDB();


app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit : '15mb'}));
app.use(express.urlencoded({ extended : true }));
app.use(express.static(__dirname + '/uploads'))
app.use(morgan('dev'));


app.delete('/api/delete-models-data' , async(req , res , next) => {
    const Albums = require('./models/albumModel');
    const Playlist = require('./models/playlistModel');
    const Song = require('./models/songModel');
    const Beat = require('./models/beatModel');

    const albums = await Albums.find() ;
    const playlists = await Playlist.find();
    const songs = await Song.find();
    const beats = await Beat.find();

    for(let album of albums ) {
        await album.remove();
    }
    for(let playlist of playlists) {
        await playlist.remove();
    }
    for(let song of songs){
        await song.remove();
    }
    for(let beat of beats){
        await beat.remove();
    }
    return res.status(200).json({ message : 'Data deleted.'})
})


app.use('/api/auth' , require('./routes/authRoutes'));
app.use('/api/auth' , require('./routes/admin/authRoutes'))
app.use('/api/user' , require('./routes/userRoutes'));
app.use('/api/user' , require('./routes/admin/userRoutes'));
app.use('/api/banner' , require('./routes/admin/bannerRoutes'));
app.use('/api/category' , require('./routes/admin/categoryRoutes'));
app.use('/api/song' , require('./routes/songRoutes'));
app.use('/api/album' , require('./routes/albumRoutes'));
app.use('/api/playlist' , require('./routes/playlistRoutes'));
app.use('/api/license' , require('./routes/admin/licenseRoutes'));
app.use('/api/beat' , require('./routes/beatRoutes'));
app.use('/api/eventCategory' , require('./routes/admin/eventCategoryRoutes'));
app.use('/api/ticket' , require('./routes/ticketRoutes'));
app.use('/api/ticket' , require('./routes/ticketRoutes'));
app.use('/api/follow' , require('./routes/followRoutes'))
app.use('/api/youtubeLink' , require('./routes/ytLinksRoutes'))
app.use('/api/wallet' , require('./routes/walletRoutes'));
app.use('/api/buySong' , require('./routes/buySongRoutes'));
app.use('/api/tag-influencer' , require('./routes/tagInfluencerRoutes'));
app.use('/api/fcm' , require('./routes/fcmRoutes'));
app.use('/api/search' , require('./routes/searchRoutes'));
app.use('/api/admin-commission' , require('./routes/admin/commissionRoutes'));
app.use('/api/favourite-artist' , require('./routes/favouriteArtistRoutes'));
app.use('/api/buy-ticket' , require('./routes/buyTicketRoutes'));
app.use('/api/comment' , require('./routes/commentRoutes'));
app.use('/api/like' , require('./routes/likeRoutes'));
app.use('/api/commentLike' , require('./routes/commentsLikeRoutes'));
app.use('/api/chat' , require('./routes/chatRoutes'));
app.use('/api/message' , require('./routes/messageRoutes'));
app.use('/api/buy-beat' , require('./routes/buyBeatRoutes'));
app.use('/api/download-beat' , require('./routes/downloadBeatsRoutes'));
app.use('/api/download-song' , require('./routes/downloadSongRoutes'));
app.use('/api/package' , require('./routes/admin/packageRoutes'));
app.use('/api/subscription' , require('./routes/subscriptionRoutes'));
app.use('/api/beat-category' , require('./routes/admin/beatsCategoryRoutes'));
app.use('/api/report' , require('./routes/reportRoutes'));
app.use('/api/fav-artist' , require('./routes/favArtistRoutes'));
app.use('/api/notification' , require('./routes/notificationRoutes'));
app.use('/api/favorites' , require('./routes/favRoutes'));


app.use(globalErrorHandler);


const PORT = process.env.PORT || 5500;
const server = app.listen(PORT , () => console.log(`server is listening on port ${PORT}`));

const io = require('socket.io')(server , {
    cors : {
        origin : '*'
    }
});

io.on('connection' , socket => {
    socket.on('setup' , () => console.log('someone connected.' , socket.id));
    socket.on('send message' , message => {
        io.emit('message received' , message );
    })
});