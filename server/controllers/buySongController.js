const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendSuccessResponse } = require('../utils/helpers');
const BuySong = require('../models/buySongModel');
const Wallet = require('../models/walletModel');
const WalletHistory = require('../models/walletHistoryModel');
const Song = require('../models/songModel');
const User = require('../models/userModel');
const TagInfluencer = require('../models/tagInfluencerModel');
const AdminCommission = require('../models/commissionModel');
const sendNotification = require('../utils/sendNotification');
const Notification = require('../models/notificationModel');
const NotificationSettings = require('../models/notificationSettingsModel');


const createWalletHistory = async (type , amount , user , wallet , description) => {
    await WalletHistory.create({ 
        type , 
        amount ,
        user ,
        wallet , 
        description 
    })
}

const createAndSendNotification = async (user , title , body , data , type , amount = 0 ) => {
    if(user.fcmToken){
        const userNotificationSettings = await NotificationSettings.findOne({ user : user._id });
        if(userNotificationSettings.purchaseNotify){
            sendNotification(user , title , body , data );
        }
        Notification.create({ 
            title  ,
            body , 
            type  , 
            amount , 
            user : user._id  
        });
    }
}

exports.buySong = catchAsync( async(req , res , next) => {
    // 1) Validation 
    let { song , amount , buyStatus , paymentMethod , influencer } = req.body;
    const buyer = req.user._id ;
    let songPrice = amount;

    if(!song || !amount || paymentMethod === null){
        return next(new AppError('Missing required credentials.' , 400))
    }
    // 2) check already bought 
    const isBuyed = await BuySong.findOne({ buyer : req.user._id , song , isActive : true , buyStatus : true });
    if(isBuyed){
        return next(new AppError('You have already purchased this Song.' , 400))
    }

    // 3) check buyer should not be song owner
    const songToBuy = await Song.findById(song);
    if(buyer.toString() === songToBuy.songCreator.toString()){
        return next(new AppError('You cannot buy your own songs.' , 400))
    }
    if(songToBuy.license.type === 0 ){
        return next(new AppError('This song is free' , 400))
    }

    // wallets
    const buyerWallet = await Wallet.findOne({ user : buyer , isActive : true  });
    const songOwner = await User.findById(songToBuy.songCreator);
    const songOwnerWallet = await Wallet.findOne({ user : songOwner._id , isActive : true });
    const admin = await User.findOne({ userType : 5 });
    const adminWallet = await Wallet.findOne({ user : admin._id });

    //check payment method 
    if(paymentMethod === 0 ){ //mean user pay with his wallet
        if(buyerWallet.totalBalance < songPrice){
            return next(new AppError('You have insufficient balance to buy this song.' , 400))
        }   

        if(influencer){
            const songOwnerInfluencer = await TagInfluencer.findOne({ user : songOwner._id , influencer , isActive : true });
            if(!songOwnerInfluencer){
                return next(new AppError("This influencer is not found in song owner's influencers list." , 404))
            }

            //detuct song amount from buyer wallet 
            buyerWallet.totalBalance -= songPrice;
            await buyerWallet.save();
            await createWalletHistory(3 , amount , buyer , buyerWallet._id , 'Purchased a Song.');
            createAndSendNotification(req.user , 'You purchased a song' , `Song name: ${songToBuy.title}` , songToBuy , 3 , songPrice); 
            
            const influencerWallet = await Wallet.findOne({ user : influencer , isActive : true });
            
            //Influencer 
            let influencerProfit = (songPrice / 100) * songOwnerInfluencer.profitPercentage;
            songPrice -= influencerProfit;
            let influencerAdminCommission = await AdminCommission.findOne({ commissionType : 4 , isActive : true });
            let adminCommissionFromInfluencer = (influencerProfit / 100) * influencerAdminCommission.commission;
            influencerProfit -= adminCommissionFromInfluencer;

            influencerWallet.totalBalance += influencerProfit;
            await influencerWallet.save();
            await createWalletHistory(2 , influencerProfit , songOwnerInfluencer._id , influencerWallet._id , 'Someone purchased your shared song.');
            influencer = await User.findById(influencerWallet.user);
            // sending notification
            createAndSendNotification(influencer , `${req.user.name} purchased your shared song.` , 'Commission from song purchased added to your wallet.' , songToBuy , 3 , influencerProfit );

            //add influencer commission to admin wallet
            adminWallet.totalBalance += adminCommissionFromInfluencer;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromInfluencer , adminWallet.user , adminWallet._id , 'Commission from influencer.' );
            createAndSendNotification(admin , `${req.user.name} purchased a song.` , `Commission from influencer added to your wallet.` , songToBuy , 3 , adminCommissionFromInfluencer );


            //detuct admin commission from Song owner
            const adminCommission = await AdminCommission.findOne(
                { commissionType : songOwner.userType , isActive : true }
            );
            const adminCommissionFromSongOwner = (songPrice / 100) * adminCommission.commission;
            songPrice -= adminCommissionFromSongOwner;
            adminWallet.totalBalance += adminCommissionFromSongOwner;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromSongOwner , adminWallet.user , adminWallet._id , 'Commission from Song owner.' );
            createAndSendNotification(admin , `${req.user.name} purchased a song.` , `Commission from song owner added to your wallet.` , songToBuy , 3 , adminCommissionFromSongOwner );

            // add remaining amount to Song owner wallet 
            songOwnerWallet.totalBalance += songPrice;
            await songOwnerWallet.save();
            await createWalletHistory(2 , songPrice , songOwner._id , songOwnerWallet._id , `${req.user.name} purchased your song.`);
            createAndSendNotification(songOwner , `${req.user.name} purchased your song.` , `Song profit added to your wallet.` , songToBuy , 3 , songPrice );
            
            const newPurchasedSong = await BuySong.create({ 
                song , amount , buyer , buyStatus , paymentMethod , influencer ,
                songOwner : songOwner._id
            });
            
            return sendSuccessResponse(res , 200 , {
                message : 'You have successfully purchased a Song.' , 
                song : newPurchasedSong
            });
        }else {
            //detuct Song amount from buyer wallet 
            buyerWallet.totalBalance -= songPrice;
            await buyerWallet.save();
            await createWalletHistory(3 , amount , buyer , buyerWallet._id , 'Purchased a Song.');
            createAndSendNotification(req.user , 'You purchased a song' , `Song name: ${songToBuy.title}` , songToBuy , 3 , songPrice);

            const adminCommission = await AdminCommission.findOne(
                { commissionType : songOwner.userType , isActive : true }
            );
            const adminCommissionFromSongOwner = (songPrice / 100) * adminCommission.commission;
            songPrice -= adminCommissionFromSongOwner;
            adminWallet.totalBalance += adminCommissionFromSongOwner;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromSongOwner , adminWallet.user , adminWallet._id , 'Commission from Song owner.' );
            createAndSendNotification(admin , `${req.user.name} purchased a song.` , `Commission from song owner added to your wallet.` , songToBuy , 3 , adminCommissionFromSongOwner );

            // add remaining amount to Song owner wallet 
            songOwnerWallet.totalBalance += songPrice;
            await songOwnerWallet.save();
            await createWalletHistory(2 , songPrice , songOwner._id , songOwnerWallet._id , 'Someone purchase your Song.');
            createAndSendNotification(songOwner , `${req.user.name} purchased your song.` , `Song profit added to your wallet.` , songToBuy , 3 , songPrice )
            
            const newPurchasedSong = await BuySong.create({ 
                song , amount , buyer , buyStatus , paymentMethod ,
                songOwner : songOwner._id
            });

            return sendSuccessResponse(res , 200 , {
                message : 'You have successfully purchased a Song.' , 
                song : newPurchasedSong
            })
        }

    }else { // user pay with payment gateway
        if(influencer){
            const songOwnerInfluencer = await TagInfluencer.findOne({ user : songOwner._id , influencer , isActive : true });
            if(!songOwnerInfluencer){
                return next(new AppError("This influencer is not found in song owner's influencers list." , 404))
            }
            const influencerWallet = await Wallet.findOne({ user : songOwnerInfluencer._id , isActive : true });
            
            //Influencer 
            let influencerProfit = (songPrice / 100) * songOwnerInfluencer.profitPercentage;
            songPrice -= influencerProfit;
            let influencerAdminCommission = await AdminCommission.findOne({ commissionType : 4 , isActive : true });
            let adminCommissionFromInfluencer = (influencerProfit / 100) * influencerAdminCommission.commission;
            influencerProfit -= adminCommissionFromInfluencer;

            influencerWallet.totalBalance += influencerProfit;
            await influencerWallet.save();
            await createWalletHistory(2 , influencerProfit , songOwnerInfluencer._id , influencerWallet._id , 'Someone purchased your shared song.');
            influencer = await User.findById(influencerWallet.user)
            createAndSendNotification(influencer , `${req.user.name} purchased your shared song.` , 'Commission from song purchased added to your wallet.' , songToBuy , 3 , influencerProfit );

            //add influencer commission to admin wallet
            adminWallet.totalBalance += adminCommissionFromInfluencer;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromInfluencer , adminWallet.user , adminWallet._id , 'Commission from influencer.' );
            createAndSendNotification(admin , `${req.user.name} purchased a song.` , `Commission from influencer added to your wallet.` , songToBuy , 3 , adminCommissionFromInfluencer );

            //detuct admin commission from Song owner
            const adminCommission = await AdminCommission.findOne(
                { commissionType : songOwner.userType , isActive : true }
            );
            const adminCommissionFromSongOwner = (songPrice / 100) * adminCommission.commission;
            songPrice -= adminCommissionFromSongOwner;
            adminWallet.totalBalance += adminCommissionFromSongOwner;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromSongOwner , adminWallet.user , adminWallet._id , 'Commission from Song owner.' );
            createAndSendNotification(admin , `${req.user.name} purchased a song.` , `Commission from song owner added to your wallet.` , songToBuy , 3 , adminCommissionFromSongOwner );
            // add remaining amount to Song owner wallet 
            songOwnerWallet.totalBalance += songPrice;
            await songOwnerWallet.save();
            await createWalletHistory(2 , songPrice , songOwner._id , songOwnerWallet._id , `${req.user.name} purchased your song.`);

            createAndSendNotification(songOwner , `${req.user.name} purchased your song.` , `Song profit added to your wallet.` , songToBuy , 3 , songPrice )
            
            const newPurchasedSong = await BuySong.create({ 
                song , amount , buyer , buyStatus , paymentMethod , influencer ,
                songOwner : songOwner._id
            });

            return sendSuccessResponse(res , 200 , {
                message : 'You have successfully purchased a Song.' , 
                song : newPurchasedSong
            })
        }else {
            const adminCommission = await AdminCommission.findOne(
                { commissionType : songOwner.userType , isActive : true }
            );
            const adminCommissionFromSongOwner = (songPrice / 100) * adminCommission.commission;
            songPrice -= adminCommissionFromSongOwner;
            adminWallet.totalBalance += adminCommissionFromSongOwner;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromSongOwner , adminWallet.user , adminWallet._id , 'Commission from Song owner.' );
            createAndSendNotification(admin , `${req.user.name} purchased a song.` , `Commission from song owner added to your wallet.` , songToBuy , 3 , adminCommissionFromSongOwner );

            // add remaining amount to Song owner wallet 
            songOwnerWallet.totalBalance += songPrice;
            await songOwnerWallet.save();
            await createWalletHistory(2 , songPrice , songOwner._id , songOwnerWallet._id , 'Someone purchase your Song.')
            createAndSendNotification(songOwner , `${req.user.name} purchased your song.` , `Song profit added to your wallet.` , songToBuy , 3 , songPrice );
            
            const newPurchasedSong = await BuySong.create({ 
                song , amount , buyer , buyStatus , paymentMethod , songOwner : songOwner._id
            });

            return sendSuccessResponse(res , 200 , {
                message : 'You have successfully purchased a Song.' , 
                song : newPurchasedSong
            })
        }

    }
});


exports.getMyBuySongs = catchAsync( async(req , res , next) => {
    const pageSize = 10;
    const page = Number(req.query.page) || 1;

    const docCount = await BuySong.countDocuments({ buyer : req.user._id , isActive : true });
    const songs = await BuySong.find({ 
        buyer : req.user._id , 
        isActive : true
    })
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt : -1 })
    .populate('buyer' , 'name email phone')
    .populate('song' , 'title audio songCover license')
    .populate('songOwner' , 'name email phone');

    const pages = Math.ceil(docCount/pageSize);

    return sendSuccessResponse(res , 200 , {
        pages , page , docCount , songs 
    })
});


exports.isSongPurchased = catchAsync(async(req , res , next) => {
    const { songId } = req.params;
    if(!songId){
        return next(new AppError('Please provide song id in params.' , 400))
    }
    const song = await Song.findById(songId);
    if(!song){
        return next(new AppError('Invalid id. Song not found.' , 400))
    }
    if(song.license.type === 0){
        return next(new AppError('This song is free.' , 400))
    }
    const songPurchased = await BuySong.findOne({ buyer : req.user._id , song : songId });
    if(songPurchased){
        return sendSuccessResponse(res , 200 , {
            isPurchased : true 
        })
    }
    return sendSuccessResponse(res , 200 , {
        isPurchased : false 
    })
});