import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {uploadOnCloudinary as upload} from "../utils/cloudinary.js"

const genrateAcessandRefreshToken = async(userId) =>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.genrateAccessToken();
        const refreshToken =  user.genrateRefreshToken();
        
        user.refreshToken = refreshToken

        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"genration of acesses and refresh token failed !")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    //get user details from frontend

   
    const {fullname , email, username, password } = req.body;
    
    //validation -not empty
    if(
        [fullname , email, username, password].some( (filed) => filed?.trim() === "")
    ){
        throw new ApiError (400,"All fields are required")
    }
    //check if user already exists : by username,email
     
    const existedUser = await User.findOne( 
        {$or : [{ username }, { email }]
    })
    
    if(existedUser){
        throw new ApiError(409, " User with email or username already exists")
    }
    //check for image, check for avatar

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    
    // console.log(avatarLocalPath); local path is coming
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }
    if(!coverImageLocalPath){
        throw new ApiError(400, "CoverImage file is required")
    }
    //upload them to cloudinary ,avatar
    const avatar = await upload(avatarLocalPath)
    const coverImage = await upload(coverImageLocalPath)
    
    if(!avatar){
        throw new ApiError(400, "Avatar  is required")
    }
    
    
    //create user object - crate entry in db 
    const user = await User.create({
        fullname,
        avatar : avatar.url,
        coverImge : coverImage.url || "",
        email,
        password,
        username : username.toLowerCase()
    })
    //remove password and refresh token field from response

    const createdUser = await User.findById(user._id).select(
         "-password -refreshToken"
    )
    //check for user creation

    
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }
    //return res
     return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )
})
    
const loginUser = asyncHandler(async (req,res)=>{
      //req body
      //body se user or email check exits or not
      //  find user
      //password check crt or not
      // access and refresh token
      //send cookie 

      const {email,username,password} = req.body;

      if(!(username || email)){
        throw new ApiError(400,"username or email is required")
      }

    const user = await User.findOne(
        {
            $or : [{username},{email}]
        }
    )
    if(!user){
        throw new ApiError(404,"User does not exist")
    }       

    const isPasswordValid = await user.isPasswordValid(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid credential !")
    }
    const {accessToken,refreshToken}= await genrateAcessandRefreshToken(user._id)
    
    const loggedInUser = await User.findById(user._id).
    select(" -password -refreshToken")

    const options = {
        httpOnly :true,
        secure: true,
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "User logged In Successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
     await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new : true
        }
        
     )
    const options = {
        httpOnly :true,
        secure: true,
    }
    return res
    .status(200)
    .clearCookies("accessToken",options)
    .clearCookies("refreshToken",options)
    .json(new ApiResponse(200,"User logged out succesfully!"))
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthorized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401, "Invalid refresh token")
        }
    
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used")
            
        }
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefereshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }

})
const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    

    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched succesfully"
    ))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email} = req.body;

    //dono chahiye
    if(!fullname || !email){
        throw new ApiError(400,"All fields are required!")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        {new: true}
        
    ).select("-password")

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})
const updateAvatarDetails = asyncHandler(async(req,res)=>{
     const avatarLocalPath = req.file?.path

     if (!avatarLocalPath) {
        throw new ApiError(400,"File upload unsuccessful")
     }

     //now we upload
    const avatar = await upload(avatarLocalPath)
   
    if(!avatar.url){
        throw new ApiError(400,"Avatar url issue")
    }
    //now goto database and change the user data avatar file url

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:
            {
               avatar:avatar.url
            }
        },
        {new: true}
    ).select("-password")
    
     
    res
    .status(200)
    .json(
        new ApiResponse(200,user,"Avatar uploaded")
    )
})

const updateCoverImageDetails = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"coverimage is required")
    }
    //now upload on cloundinary 
    const coverImage = await upload(coverImageLocalPath)

    if(!coverImage){
        throw new ApiError(400,"Coverimage upload failed")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password")

    
    res
    .status(200)
    .json(
        new ApiResponse(200,user,"CoverImage uploaded")
    )
})
export {
    registerUser,
    loginUser,   
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    updateAvatarDetails,
    updateAccountDetails,
    updateCoverImageDetails
}