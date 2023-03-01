const User = require('../models/userModel');
const { OAuth2Client } =  require("google-auth-library");
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { sendEmail } = require('../utils/email');
const Facebook = require('facebook-node-sdk');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const twilioClient = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
const Wallet = require('../models/walletModel');
const { sendSuccessResponse , sendErrorResponse , generateToken , sendCookie , signToken , uploadImage } = require('../utils/helpers');
const NotificationSettings = require('../models/notificationSettingsModel');



const createUserWallet = async ( res , id) => {
    try {
        await Wallet.create({ 
            user : id
        });
    } catch (error) {
        console.log('AuthController Create Wallet error' , error)
        return sendSuccessResponse(res , 500 , {
            message : 'Internal server error.'
        })
    }
}

const createUserNotification = async (user) => {
    if(user.userType === 0){
        return await NotificationSettings.create({ user : user._id });
    }
    return await NotificationSettings.create({
        user : user._id ,
        reportNotfify : 0 ,
        playMilestoneNotify : 0 ,
        newSuporterNotify : 0 ,
        tagNotify : 0 ,
    });
}

exports.googleLogin = catchAsync(async (req, res) => {
    const { idToken } = req.body;
  
    const response = await client.verifyIdToken({ 
        idToken , audience: process.env.GOOGLE_CLIENT_ID 
    })
    const { email_verified , name, email } = response.payload;

    if(email_verified){
        const user = await User.findOne({ email });
        if(user){
            const token = signToken({ _id : user._id });
            return res.status(200).json({
                status : 'success' ,
                success : true ,
                data : {
                    user , 
                    token 
                }
            })
        }else{
            const newUser = await User.create({
                name , 
                email , 
                accountType : 'google',
                userType : req.body.userType ? req.body.userType : 'guest' ,
                password : email + process.env.JWT_SECRET ,
                emailVerified : true 
            })
            const token = signToken({ _id : newUser._id });
            res.status(200).json({
                status : 'success' ,
                success : true ,
                data : {
                    user : newUser ,
                    token 
                }
            })
        }
    }else{
        return next(new AppError('Google login error. please try again.' , 400))
    }
});

exports.register = catchAsync( async (req , res , next) => {
    let { name , email , password , country , state , city , phone , profileImage  } = req.body;
    if(!name || !email || !country || !state || !city || !phone ){
        return next(new AppError('Missing required credentials.' , 400))
    }
    if(accountType === 'email' && !password){
        return next(new AppError('Password is required.' , 400))
    }
    const user = await User.findOne({ email });
    if(user){
        return next(new AppError('Email is already taken.' , 400))
    }
    const verificationToken = generateToken(name , email);
    profileImage = profileImage ? uploadImage(profileImage , 'profilePictures')
    : profileImage ;

    const newUser = await User.create({
        name , email  , country , state , city , phone ,
        userType : req.body.userType ? req.body.userType : 0 ,
        verificationToken ,
        profileImage ,
        password : accountType === 'email' ? password : null 
    });
    await createUserWallet(res , newUser._id) 
    await createUserNotification(newUser);
    try {
        const newToken = signToken({ _id : newUser._id });
        // await sendEmail(email , 'Email Verification' , `Your email verification code ${verificationToken} `);
        sendCookie(res , newToken);
        return sendSuccessResponse(res , 201 , {
            // message : `Email sent to ${email}. Please verify your email address` , 
            user : newUser ,
            token : newToken
        });
    } catch (error) {
        // console.log('mail error' , error)
        return sendErrorResponse(res , 500 , {
            message : 'Something went wrong.Please try again.'
        })
    }  
});

exports.login = catchAsync( async( req , res , next) => {
    const { email , password } = req.body;
    if(!email || !password){
        return next(new AppError('Missing required credentials.' , 400))
    }
    const user = await User.findOne({ email });
    if(!user || !(await user.comparePassword(password))){
        return next(new AppError('Wrong email or password.' , 400))
    }
    const token = signToken({ _id : user._id});
    sendCookie(res , token)
    user.password = '';
    return res.status(200).json({
        status : 'success' ,
        success : true ,
        data : {
            user ,
            token 
        }
    })
});

exports.verifyEmail = catchAsync( async(req , res ,next ) => {
    const { token } = req.body;
    if(!token){
        return next(new AppError('Invalid request. Missing required credentials.' , 400));
    }
    const user = await User.findById(req.user_id)
    if(!user){
        return next(new AppError('Email verification failed.' , 400))
    }
    if(user.verificationToken !== token){ 
        return next(new AppError('Email verfication failed.' , 400));
    }
    if(user.emailVerified){
        return res.status(200).json({
            status : 'success' ,
            success : true ,
            data : {
                message : 'This email is alredy verified.'
            }
        })
    }
    user.emailVerified = true ;
    user.verificationToken = '';
    await user.save();
    return res.status(200).json({
        status : 'success' ,
        success : true ,
        data : {
            message : 'Email verified successfully.'
        }
    })
});

exports.sendOtp = catchAsync( async(req ,res ,next) => {
    const { sid } = await twilioClient.verify.services.create({
        friendlyName: "phone verification",
    });
  
    const response = await twilioClient.verify.services(sid).verifications.create({
        to : req.body.phoneNumber ,
        channel: "sms", // sms, call, or email
    });
    console.log(response);
    
    res.status(200).json({
        status : 'success' ,
        success : true ,
        data : {
            message : 'Please check your phone number.'
        }
    })
    
});

exports.verifyOtp = catchAsync( async(req , res , next) => {
    console.log(process.env.VERIFY_SERVICE_SID)
    // const response = await axios.post(`https://verify.twilio.com/v2/Services/${process.env.VERIFY_SERVICE_SID}/VerificationCheck` ,
    // {
    //     to : req.body.phoneNumber ,
    //     code : req.body.otp
    // } ,
    // {
    //     headers : {
    //         authorization : `Basic ${process.env.TWILIO_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    //     }
    // }
     
    // )
    const result = await twilioClient.verify.services(process.env.VERIFY_SERVICE_SID)
    .verificationChecks
    .create({to: req.body.phoneNumber , code: req.body.otp });
    console.log(result);
    res.json(result);

    // if(result.valid){
    //     res.status(200).json({
    //         status : 'success',
    //         success : true ,
    //         data : {
    //             message : 'Phone number verified.'
    //         }
    //     });
    // }else{
    //     res.status(400).json({
    //         status : 'failed',
    //         success : false,
    //         data : {
    //             message : 'Invalid verification code.'
    //         }
    //     })
    // }
});

exports.resetPassword = catchAsync(async(req , res , next) => {
    const { newPassword , email } = req.body;
    if(!newPassword){
        return next(new AppError("Please provide your new password." , 400))
    }
    const user = await User.findOne({ email });
    if(!user){
        return next(new AppError('Received wrong credentials.' , 404))
    }
    user.password = newPassword;
    await user.save();   
    return res.status(200).json({
        status : 'success' ,
        success : true ,
        data : {
            message : 'Password updated successfully.'
        }
    })
});

exports.phoneLogin = catchAsync( async(req , res, next) => {
    const { phoneNumber } = req.body;
    if(!phoneNumber) return next(new AppError('Phone number is required.' ,400))
    const user = await User.findOne({ phone : phoneNumber });
   
    if(user){
        const token = signToken({ _id : user._id });
        sendCookie(res , token)
        return res.status(200).json({
            status : 'success' ,
            success : true ,
            new : false ,
            data : {
                user ,
                token
            }
        })
    }else{
        return res.status(200).json({
            status : 'success' ,
            success : true ,
            new : true ,
            data : {
                message : 'Not registered' 
            }
        });
    }

});

exports.sendForgotPasswordEmail = catchAsync( async(req , res , next) => {
    const { email } = req.body;
    if(!email){
        return next(new AppError('Please provide your email address.' , 400))
    }
    const user = await User.findOne({ email });
    if(!user){
        return next(new AppError('Email is not registered.' , 400));
    }
    const token = generateToken(user.name , user.email);
    try {
        await sendEmail(email , 'Forgot Password Request' , `Your verification code ${token} `);
        user.passwordResetToken = token;
        await user.save();
        return res.status(200).json({
            status  : 'success' ,
            success : true ,
            data : {
                message : `Email sent to ${email}`
            }
        })
    } catch (error) {
        console.log('forgot password email sending error' , error );
        return res.json({
            status : 'error' ,
            success : false ,
            data : {
                message : 'Internal server error'
            }
        })
    }

});

exports.verifyForgotEmail = catchAsync( async(req , res , next) => {
    const { email , token } = req.body;
    const user = await User.findOne({ email });
    if(!user){
        return next(new AppError('received wrong credentials.' ,400))
    }
    if(user.passwordResetToken !== token){
        return next(new AppError('Verification failed.' , 400))
    }
    return res.status(200).json({
        status : 'success' ,
        success : true ,
        data : {
            message : 'Verification completed.'
        }
    })
});

exports.logout = (req , res , next) =>{
    res.cookie('token' , 'loggedOut' , {
        expires : new Date(Date.now() + 10 * 1000), 
        httpOnly : true 
    });

    res.status(200).json({
        status : 'success' ,
        success : true ,
        data : {
            message : 'Logged out successfully.',
            token : 'logout'
        }
    })
}


exports.socialLogin = catchAsync(async(req , res ,next) => {
    let { email , profileImage } = req.body;
    if(!email){
        return next(new AppError('Email is required.' , 400))
    }
    const user = await User.findOne({ email , isActive : true });
    if(user){
        const token = signToken({ _id : user._id});
        sendCookie(res , token)
        user.password = '';
        return sendSuccessResponse(res , 200 , {
            user ,
            token 
        })
    }else {
        profileImage = profileImage ? uploadImage(profileImage , 'profilePictures') : {} 
        const newUser = await User.create({...req.body , profileImage });
        const token = signToken({ _id : newUser._id});
        newUser.password = '';
        return sendSuccessResponse(res , 200 , {
            message : 'Registered successfully.',
            user : newUser ,
            token 
        })
    }
})

