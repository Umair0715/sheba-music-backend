const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const Message = require('../models/messageModel');
const { sendSuccessResponse , uploadImage } = require('../utils/helpers');
const Chat = require('../models/chatModel');
const NotificationSettings = require('../models/notificationSettingsModel');
const sendNotification = require('../utils/sendNotification');
const Notification = require('../models/notificationModel');

const createMessageAndSendResponse = async ( req , res , message) => {
    let newMessage = await Message.create(message);
    await Chat.findByIdAndUpdate(newMessage.chat , { latestMessage : newMessage._id });
    const chat = await Chat.findById(message.chat).populate('users' , 'name email fcmToken');
    const receiver = chat.users.find(u => u._id !== req.user._id );
    if(receiver.fcmToken){
        const receiverNotificationSettings = await NotificationSettings.findOne({ user : receiver._id.toString() });
        if(receiverNotificationSettings?.messageNotify){
            sendNotification(receiver , `${req.user.name} sends a new message.` , `New message` , newMessage);
        }
        Notification.create({
            title : `${req.user.name} Sends a new message.` ,
            body : `New message` ,
            user : receiver._id ,
            type : 1 ,
        });
    }
    return sendSuccessResponse(res , 201 , {
        message : newMessage
    });
}

exports.sendMessage = catchAsync( async (req , res , next) => {
    const { type , chatId } = req.body;
    if(!type || !chatId){
        return next(new AppError('Missing required credentials.' , 400))
    }
    if(type === 1 ) { // text only
        if(!req.body.text || req.body.text.length < 1) return next(new AppError("Can't send empty message." , 400))
        await createMessageAndSendResponse( req , res , {
            chat : chatId ,
            type , 
            text : req.body.text ,
            sender : req.user._id , 
        });
        
    }
    if(type === 2 ){ // image only 
        if(!req.body.image) return next(new AppError("Can't send empty message.",400))
        const image = uploadImage(req.body.image , 'messages');
        return await createMessageAndSendResponse( req , res , {
            chat : chatId , 
            type , 
            image ,
            sender : req.user._id 
        })
    }
    if(type === 3 ){ // text + image
        if(!req.body.text || !req.body.image) return next(new AppError("Provide both image and text else change message type." , 400))
        const image = uploadImage(req.body.image , 'messages');
        return await createMessageAndSendResponse( req , res , {
            chat : chatId ,
            type ,
            image ,
            text : req.body.text ,
            sender : req.user._id
        })
    }
});

exports.getMessages = catchAsync( async(req , res) => {
    const { chatId } = req.params;
    const pageSize = 14 ;
    const page = Number(req.query.page) || 1;
    const docCount = await Message.countDocuments({ chat : chatId , isActive : true })
    const messages = await Message.find({ chat : chatId , isActive : true })
    .limit(pageSize).skip(pageSize * (page - 1 ))
    .populate('sender' , 'name email role');
    const pages = Math.ceil(docCount/pageSize);
    return sendSuccessResponse(res , 200 , { 
        messages , page , pages , docCount 
    })
});

