import {asyncHandler} from  "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req , res) =>{
    //get user details from frontend

    const {fullName , email , username , password} = req.body
    console.log("email:", email);
     

    // validation -> not empty

    if( 
        [fullName , email , username , password].some((field) =>
        field?.trim() === "")
    ){
        throw new ApiError( 400 , "All fields are requied")
    } 


    //check if user already exists: username , email
    
    const exsistedUser = User.findOne({
        $or : [{ username }, {email}]
    })

    if(exsistedUser) {
        throw new ApiError( 409 , "User with email or username already exists")
    }

    //check for images , avatar

    const avatarLocalPath = req.filles?.avatar[0].path;
    constcoverImageLocalPath = req.files?.coverImage[0].path;

if(!avatarLocalPath){
    throw new ApiError(400 , "Avatar file is required")
}

    //upload them to cloudinary ,avatar recheck 

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(constcoverImageLocalPath)

    if(!avatar){
         throw new ApiError(400 , "Avatar file is required")
    }

    //create user object - create entry in db

    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username : username.toLowerCase()
    })

    
    //remove password and refresh token fiels from response

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //check for user creation

    if(!createdUser){
        throw new ApiError(500 , "something went wrong while registering the user")
    }

    //return res

     return res.status(201).json(
        new ApiResponse(200 , createdUser , "User registered successfully")
     )

})

export {registerUser}