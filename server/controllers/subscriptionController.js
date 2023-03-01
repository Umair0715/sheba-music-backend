const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Subscription = require('../models/subscriptionModel');
const { sendSuccessResponse, createWalletHistory } = require('../utils/helpers');
const Package = require("../models/packageModel");
const moment = require('moment');
const Wallet = require('../models/walletModel');
const User = require('../models/userModel');

const endDate = (value , name) => {
    return moment().add(value , name).toDate();
}

exports.createSubscription = catchAsync(async ( req , res , next ) => {
    let { packageId } = req.body;
    const package = await Package.findOne({ _id : packageId , isActive : true });
    if(!package) return next(new AppError('Package not found.' , 400))
    
    if(!package.allowedUsers.includes(req.user.userType)){
        return next(new AppError('You are not allowed to buy this package. This package is for other user account type.', 400))
    }
    const subscriptionExist = await Subscription.findOne({ user : req.user._id , endDate : { $gt : Date.now() }});

    const admin = await User.findOne({ userType : 5 });
    const adminWallet = await Wallet.findOne({ user : admin._id , isActive : true  });
    const buyerWallet = await Wallet.findOne({ user : req.user._id , isActive : true  });
    
    if(subscriptionExist){
        if(subscriptionExist.package.toString() === package._id.toString()){
            //subscriptoin already exist
            return next(new AppError('You have already subscribed to this package.' , 400));
        }else {
            if(!admin) return next(new AppError('Admin not found.' , 400))
            if(!adminWallet) return next(new AppError('Admin Wallet not found.', 400))
            if(!buyerWallet){
                return next(new AppError('User wallet not found.' , 400))
            }
            if(buyerWallet.totalBalance < package.price){
                return next(new AppError('You have insufficient balance to purchase this package.' , 400));
            }
            buyerWallet.totalBalance -= package.price;
            await buyerWallet.save();
            adminWallet.totalBalance += package.price;
            await adminWallet.save();
        
            // User Wallet history
            await createWalletHistory(3 , package.price , req.user._id , buyerWallet._id , 'You purchased subscription package.');
        
            // Admin Wallet history
            await createWalletHistory(2 , package.price , admin._id , adminWallet._id , 'Someone purchased subscription package.');
            //plan updated
            const updatedSubscription = await Subscription.findByIdAndUpdate(subscriptionExist._id , {
                package ,
                endDate : package.duration === 1 ? endDate(1 , 'month') : package.duration === 2 ? endDate(6, 'month') : package.duration === 3 ? endDate(1 , 'year')
                : endDate(1 , 'month') ,
            });
            return sendSuccessResponse(res , 200 , {
                message : 'Subscription Updated.' ,
                subscription : updatedSubscription 
            })
        }
    }

    if(!admin) return next(new AppError('Admin not found.' , 400))
    if(!adminWallet) return next(new AppError('Admin Wallet not found.', 400))
    if(!buyerWallet){
        return next(new AppError('User wallet not found.' , 400))
    }

    if(buyerWallet.totalBalance < package.price){
        return next(new AppError('You have insufficient balance to purchase this package.' , 400));
    }
    buyerWallet.totalBalance -= package.price;
    await buyerWallet.save();
    adminWallet.totalBalance += package.price;
    await adminWallet.save();

    // User Wallet history
    await createWalletHistory(3 , package.price , req.user._id , buyerWallet._id , 'You purchased subscription package.');

    // Admin Wallet history
    await createWalletHistory(2 , package.price , admin._id , adminWallet._id , 'Someone purchased subscription package.');

    const subscription = await Subscription.create({
        user : req.user._id , 
        endDate : package.duration === 1 ? endDate(1 , 'month') : package.duration === 2 ? endDate(6, 'month') : package.duration === 3 ? endDate(1 , 'year') : endDate(1 , 'month') ,
        package : package._id 
    }) 
    return sendSuccessResponse(res , 200 , {
        message : 'Subscription Created.' ,
        subscription  
    })
});

exports.getMySubscription = catchAsync( async ( req , res ) => {
    const subscription = await Subscription.findOne({ user : req.user._id , isActive : true , endDate : { $gt : Date.now() }})
    .populate('user' , 'name email phone')
    .populate('package' , 'name price duration features type allowedUsers');
    return sendSuccessResponse(res , 200 , {
        subscription
    }) 
});


exports.getAllSubscriptions = catchAsync(async(req , res ) => {
    const pageSize = 10 ;
    const page = Number(req.query.page) || 1;
    const docCount = await Subscription.countDocuments({ isActive : true , endDate : { $gt : Date.now() }});
    const subscriptions = await Subscription.find({ isActive : true , endDate : { $gt : Date.now() }})
    .limit(pageSize)
    .skip(pageSize * (page - 1))
    .sort({ createdAt : -1 })
    .populate('user' , 'name email phone')
    .populate('package' , 'name price duration features');

    const pages = Math.ceil(docCount/pageSize);

    return sendSuccessResponse(res , 200 , {
        subscriptions , page , pages , docCount 
    }) 
});

