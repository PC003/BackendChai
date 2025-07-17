import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import {ApiResponse} from "../utils/apiResponse.js"
import {uploadOnCloudinary as upload} from "../utils/cloudinary.js"

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


export {registerUser}