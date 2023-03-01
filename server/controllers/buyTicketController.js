const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const BuyTicket = require('../models/buyTicketModel');
const { sendSuccessResponse , createWalletHistory } = require('../utils/helpers');
const Ticket = require('../models/ticketModel');
const Wallet = require('../models/walletModel');
const User = require('../models/userModel');
const TagInfluencer = require('../models/tagInfluencerModel');
const AdminCommission = require('../models/commissionModel');
const sendNotification = require('../utils/sendNotification');
const Notification = require('../models/notificationModel');
const NotificationSettings = require('../models/notificationSettingsModel');

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


exports.buyTicket = catchAsync( async(req , res , next) => {
    // 1) Validation 
    let { ticket , amount , buyStatus , paymentMethod , influencer } = req.body;
    const buyer = req.user._id ;
    let ticketPrice = amount;

    if(!ticket || !amount || paymentMethod === null){
        return next(new AppError('Missing required credentials.' , 400))
    }
    // 2) check already bought 
    const isBuyed = await BuyTicket.findOne({ buyer : req.user._id , ticket , isActive : true , buyStatus : true });
    if(isBuyed){
        return next(new AppError('You have already purchased this ticket.' , 400))
    }
    // 3) check ticket avaibable or not
    const _ticket = await Ticket.findOne({ _id : ticket , isActive : true });
    if(!_ticket){
        return next(new AppError('Ticket not found.' , 404))
    }
    if(_ticket.ticketsAvailable === 0){ 
        return next(new AppError('Tickets sold out.' , 400))
    }
    if(buyer.toString() === _ticket.ticketCreator.toString()){
        return next(new AppError('You cannot buy your own tickets.' , 400))
    }
    // 4) check payment method 
    const buyerWallet = await Wallet.findOne({ user : buyer , isActive : true });
    const ticketOwnerWallet = await Wallet.findOne({ user : _ticket.ticketCreator , isActive : true });
    const admin = await User.findOne({ userType : 5 });
    const adminWallet = await Wallet.findOne({ user : admin._id });
    const ticketOwner = await User.findOne({ _id : _ticket.ticketCreator , isActive : true });

    if(paymentMethod === 0){ //means wallet
        // 4.1) if wallet check wallet amount enough or not
        if(buyerWallet.totalBalance < amount){
            return next(new AppError('You have insufficient balance to buy this ticket.' , 400))
        }
       

        if(influencer){
            const _influencer = await TagInfluencer.findOne({ user : ticketOwner._id , influencer , isActive : true });
            if(!_influencer){
                return next(new AppError("This influencer is not found in ticket owner's influencers list." , 404))
            }

             //detuct ticket amount from buyer wallet 
            buyerWallet.totalBalance = buyerWallet.totalBalance - ticketPrice;
            await buyerWallet.save();
            await createWalletHistory(3 , amount , buyer , buyerWallet._id , 'Purchased a ticket.');
            createAndSendNotification(req.user , 'You purchased a Ticket' , `Event name: ${_ticket.eventName}` , _ticket , 3 , ticketPrice); 

            const influencerWallet = await Wallet.findOne({ user : influencer , isActive : true });

            let influencerProfit = (ticketPrice / 100) * _influencer.profitPercentage;
            ticketPrice -= influencerProfit;
            let influencerCommission = await AdminCommission.findOne({ commissionType : 4 , isActive : true });
            let adminCommissionFromInfluencer = (influencerProfit / 100) * influencerCommission.commission;
            influencerProfit -= adminCommissionFromInfluencer;

            influencerWallet.totalBalance += influencerProfit;
            await influencerWallet.save();
            // influencer wallet history for earning amount
            await createWalletHistory(2 , influencerProfit , influencer , influencerWallet._id , 'Someone purchased a ticket.');
            influencer = await User.findById(influencerWallet.user);
            createAndSendNotification(influencer , `${req.user.name} purchased your shared ticket.` , 'Commission from ticket purchased added to your wallet.' , _ticket , 3 , influencerProfit )

            //add admin commission from influencer
            adminWallet.totalBalance += adminCommissionFromInfluencer;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromInfluencer , adminWallet.user , adminWallet._id , 'Commission from influencer.' );
            createAndSendNotification(admin , `${req.user.name} purchased a ticket.` , `Commission from influencer.` , _ticket , 3 , adminCommissionFromInfluencer );

            //detuct admin commission from ticket owner
            const adminCommission = await AdminCommission.findOne(
                { commissionType : ticketOwner.userType , isActive : true }
            );
            const adminCommissionFromTicketOwner = (ticketPrice / 100) * adminCommission.commission;
            ticketPrice -= adminCommissionFromTicketOwner;
            adminWallet.totalBalance += adminCommissionFromTicketOwner;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromTicketOwner , adminWallet.user , adminWallet._id , 'Commission from Ticket owner.' );
            createAndSendNotification(admin , `${req.user.name} purchased a ticket.` , `Commission from ticket owner.` , _ticket , 3 , adminCommissionFromTicketOwner );

            // add remaining amount to ticket owner wallet 
            ticketOwnerWallet.totalBalance += ticketPrice;
            await ticketOwnerWallet.save();
            await createWalletHistory(2 , ticketPrice , ticketOwner._id , ticketOwnerWallet._id , 'Sold a ticket.')
            createAndSendNotification(ticketOwner , `${req.user.name} purchased your ticket.` , `Ticket profit added to your wallet.` , _ticket , 3 , ticketPrice );
            
            const newPurchasedTicket = await BuyTicket.create({ 
                ticket , amount , buyer , buyStatus , paymentMethod , influencer
            });
            _ticket.ticketsAvailable -= 1;
            await _ticket.save();

            return sendSuccessResponse(res , 200 , {
                message : 'You have successfully purchased a ticket.' , 
                ticket : newPurchasedTicket
            })
        }else {
            //in case of no influencer
            
            //detuct ticket amount from buyer wallet 
            buyerWallet.totalBalance = buyerWallet.totalBalance - ticketPrice;
            await buyerWallet.save();
            await createWalletHistory(3 , amount , buyer , buyerWallet._id , 'Purchased a ticket.')
            createAndSendNotification(req.user , 'You purchased a Ticket' , `Event name: ${_ticket.eventName}` , _ticket , 3 , ticketPrice);

            const adminCommission = await AdminCommission.findOne(
                { commissionType : ticketOwner.userType , isActive : true }
            );
            const adminCommissionFromTicketOwner = (ticketPrice / 100) * adminCommission.commission;
            ticketPrice -= adminCommissionFromTicketOwner;
            adminWallet.totalBalance += adminCommissionFromTicketOwner;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromTicketOwner , adminWallet.user , adminWallet._id , 'Commission from Ticket owner.' );
            createAndSendNotification(admin , `${req.user.name} purchased a ticket.` , `Commission from ticket owner.` , _ticket , 3 , adminCommissionFromTicketOwner );
            

            // add remaining amount to ticket owner wallet 
            ticketOwnerWallet.totalBalance += ticketPrice;
            await ticketOwnerWallet.save();
            await createWalletHistory(2 , ticketPrice , ticketOwner._id , ticketOwnerWallet._id , 'Sold a ticket.')
            createAndSendNotification(ticketOwner , `${req.user.name} purchased your ticket.` , `Ticket profit added to your wallet.` , _ticket , 3 , ticketPrice );

            const newPurchasedTicket = await BuyTicket.create({ 
                ticket , amount , buyer , buyStatus , paymentMethod 
            });
            _ticket.ticketsAvailable -= 1;
            await _ticket.save();

            return sendSuccessResponse(res , 200 , {
                message : 'You have successfully purchased a ticket.' , 
                ticket : newPurchasedTicket
            })
        }
    }else {
        // payment gateway 
        if(influencer){
            const _influencer = await TagInfluencer.findOne({ user : ticketOwner._id , influencer , isActive : true });
            if(!_influencer){
                return next(new AppError("This influencer is not found in ticket owner's influencers list." , 404))
            }
            const influencerWallet = await Wallet.findOne({ user : influencer , isActive : true });

            let influencerProfit = (ticketPrice / 100) * _influencer.profitPercentage;
            ticketPrice -= influencerProfit;
            let influencerCommission = await AdminCommission.findOne({ commissionType : 4 , isActive : true });
            let adminCommissionFromInfluencer = (influencerProfit / 100) * influencerCommission.commission;
            influencerProfit -= adminCommissionFromInfluencer;

            influencerWallet.totalBalance += influencerProfit;
            await influencerWallet.save();
            // influencer wallet history for earning amount
            await createWalletHistory(2 , influencerProfit , influencer , influencerWallet._id , 'Someone purchased a ticket.');
            influencer = await User.findById(influencerWallet.user);
            createAndSendNotification(influencer , `${req.user.name} purchased your shared ticket.` , 'Commission from ticket purchased added to your wallet.' , _ticket , 3 , influencerProfit );
            
            //add admin commission from influencer
            adminWallet.totalBalance += adminCommissionFromInfluencer;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromInfluencer , adminWallet.user , adminWallet._id , 'Commission from influencer.' );
            createAndSendNotification(admin , `${req.user.name} purchased a ticket.` , `Commission from influencer.` , _ticket , 3 , adminCommissionFromInfluencer );

            //detuct admin commission from ticket owner
            const adminCommission = await AdminCommission.findOne(
                { commissionType : ticketOwner.userType , isActive : true }
            );
            const adminCommissionFromTicketOwner = (ticketPrice / 100) * adminCommission.commission;
            ticketPrice -= adminCommissionFromTicketOwner;
            adminWallet.totalBalance += adminCommissionFromTicketOwner;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromTicketOwner , adminWallet.user , adminWallet._id , 'Commission from Ticket owner.' );
            createAndSendNotification(admin , `${req.user.name} purchased a ticket.` , `Commission from ticket owner.` , _ticket , 3 , adminCommissionFromTicketOwner );

            // add remaining amount to ticket owner wallet 
            ticketOwnerWallet.totalBalance += ticketPrice;
            await ticketOwnerWallet.save();
            await createWalletHistory(2 , ticketPrice , ticketOwner._id , ticketOwnerWallet._id , 'Sold a ticket.')
            createAndSendNotification(ticketOwner , `${req.user.name} purchased your ticket.` , `Ticket profit added to your wallet.` , _ticket , 3 , ticketPrice );

            const newPurchasedTicket = await BuyTicket.create({ 
                ticket , amount , buyer , buyStatus , paymentMethod , influencer
            });
            _ticket.ticketsAvailable -= 1;
            await _ticket.save();

            return sendSuccessResponse(res , 200 , {
                message : 'You have successfully purchased a ticket.' , 
                ticket : newPurchasedTicket
            })
        }else {
            //payment gateway in case of no influencer
            const adminCommission = await AdminCommission.findOne(
                { commissionType : ticketOwner.userType , isActive : true }
            );
            const adminCommissionFromTicketOwner = (ticketPrice / 100) * adminCommission.commission;
            ticketPrice -= adminCommissionFromTicketOwner;
            adminWallet.totalBalance += adminCommissionFromTicketOwner;
            await adminWallet.save();
            await createWalletHistory(2 , adminCommissionFromTicketOwner , adminWallet.user , adminWallet._id , 'Commission from Ticket owner.' );
            createAndSendNotification(admin , `${req.user.name} purchased a ticket.` , `Commission from ticket owner.` , _ticket , 3 , adminCommissionFromTicketOwner );

            // add remaining amount to ticket owner wallet 
            ticketOwnerWallet.totalBalance += ticketPrice;
            await ticketOwnerWallet.save();
            await createWalletHistory(2 , ticketPrice , ticketOwner._id , ticketOwnerWallet._id , 'Sold a ticket.')
            createAndSendNotification(ticketOwner , `${req.user.name} purchased your ticket.` , `Ticket profit added to your wallet.` , _ticket , 3 , ticketPrice );


            const newPurchasedTicket = await BuyTicket.create({ 
                ticket , amount , buyer , buyStatus , paymentMethod 
            });
            _ticket.ticketsAvailable -= 1;
            await _ticket.save();

            return sendSuccessResponse(res , 200 , {
                message : 'You have successfully purchased a ticket.' , 
                ticket : newPurchasedTicket
            })
        }
    }
});


// 0 = deposit , 1 = withdrawal , 2 = earning , 3 = purchase


exports.getMyBuyTickets = catchAsync(async(req , res , next ) => {
    const page = Number(req.query.page) || 1;
    const pageSize = 10 ;
    const docCount = await BuyTicket.countDocuments({ buyer : req.user._id , isActive : true })
    const buyTickets = await BuyTicket.find({ buyer : req.user._id , isActive : true })
    .sort({ createdAt : -1 })
    .limit(pageSize)
    .skip(pageSize * (page - 1));
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , {
        docCount , pageSize , pages , buyTickets 
    })
})

