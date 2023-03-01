const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Wallet = require('../models/walletModel');
const { sendSuccessResponse , createWalletHistory } = require('../utils/helpers');
const WalletHistory = require('../models/walletHistoryModel');
const NotificationSettings = require('../models/notificationSettingsModel');
const Notification = require('../models/notificationModel');
const sendNotification = require('../utils/sendNotification');


const createAndSendTransactionNotification = async (user , title , body , data , type , amount = 0 ) => {
    if(user.fcmToken){
        const userNotificationSettings = await NotificationSettings.findOne({ user : user._id });
        // if(userNotificationSettings.transactionNotify){
            console.log('user' , user);
            sendNotification(user , title , body , data );
        // }
    }
    Notification.create({ 
        title  ,
        body , 
        type  , 
        amount , 
        user : user._id  
    });
}


exports.createWallet = catchAsync(async ( req , res ) => {
    const walletExist = await Wallet.findOne({ user : req.user._id , isActive : true})
    if(walletExist){
        return next(new AppError('Wallet already exist.', 400))
    }
    let newWallet = await Wallet.create({ 
        user : req.user._id 
    });
    newWallet = await Wallet.findById(newWallet._id).populate('user' , 'name email phone')
    return sendSuccessResponse(res , 201 , {
        message : 'wallet created.',
        wallet : newWallet
    }) ;
});

exports.getMyWallet = catchAsync( async(req , res ) => {
    const wallet = await Wallet.findOne({ user : req.user._id , isActive : true }).populate('user' , 'name email phone');
    return sendSuccessResponse(res , 200 , {
        wallet 
    })
});

exports.deleteWallet = catchAsync( async(req , res , next) => {
    await Wallet.findOneAndUpdate({ user : req.params.id , isActive : true } , { isActive : false });
    return sendSuccessResponse(res , 200 , {
        message : 'wallet deleted successfully.'
    })
});

exports.getSingleUserWallet = catchAsync( async(req , res , next) => {
    const wallet = await Wallet.findOne({ user : req.params.id , isActive : true }).populate('user' , 'name email phone');
    if(!wallet){
        return next(new AppError('Wallet not found.' , 404))
    }
    return sendSuccessResponse(res , 200 , {
        wallet 
    })
});

exports.transferToWallet = catchAsync(async(req , res , next) => {
    const { transferToWalletId } = req.params;
    const { amount } = req.body;
    if(!transferToWalletId || !amount){
        return next(new AppError('Missing required credentials.' , 400))
    }
    const sender = req.user ;
    let senderWallet = await Wallet.findOne({ user : sender._id , isActive : true });
    if(!senderWallet){
        return next(new AppError('Sender wallet does not exist.' , 400))
    }
    if(senderWallet.totalBalance < amount) {
        return next(new AppError('You have insufficient balance to transfer this amount. ' , 400))
    }
    let receieverWallet = await Wallet.findById(transferToWalletId)
    .populate('user' , 'name email phone fcmToken');
    if(!receieverWallet){
        return next(new AppError('Invalid receiver wallet id received. Wallet with given id not found.' , 400))
    }
    const receiver = receieverWallet.user;
    senderWallet.totalBalance -= amount;
    await senderWallet.save();
    createWalletHistory(4 , amount , sender._id , senderWallet._id , `Transfered amount to ${receiver.name}`);
    createAndSendTransactionNotification(sender , 'Transaction Notification' , `You transfered amount to ${receiver.name} ` , { amount } , 7 ,  amount  );
    
    receieverWallet.totalBalance += amount;
    await receieverWallet.save();
    createWalletHistory(5 , amount , receiver._id , receieverWallet._id , `Receieved amount from ${sender.name}` );
    createAndSendTransactionNotification(receiver , 'Transaction Notification' , `Received amount from ${sender.name}` , { amount } , 7 , amount );
    console.log('receiver' , receiver)
    return sendSuccessResponse(res , 200 , {
        message : 'Amount transfered successully.'
    });
});

exports.getMyWalletHistory = catchAsync(async(req ,res , next) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    const docCount = await WalletHistory.countDocuments({ user : req.user._id , isActive : true })
    const walletHistories = await WalletHistory.find({ user : req.user._id , isActive : true  })
    .sort({ createdAt : -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        walletHistories , pages , page , docCount 
    }); 
});


exports.depositToWallet = catchAsync(async(req , res ,next) => {
    let { walletId , amount } = req.body;
    amount = Number(amount);
    if(!walletId || !amount){
        return next(new AppError('Missing required credentials.' , 400))
    } 
    if(amount < 1) return next(new AppError('You can deposit minimum 1$.', 400))
    const wallet = await Wallet.findById(walletId);
    if(!wallet){
        return next(new AppError('Invalid id. Wallet not found.', 400))
    }
    wallet.totalBalance += amount;
    await wallet.save();
    return sendSuccessResponse(res , 200 , {
        message : 'Amount deposit to wallet successfully.',
        wallet 
    });
});