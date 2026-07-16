import {asyncHandler} from  "../utils/asyncHandler.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/ApiResponse.js"

const registerUser = asyncHandler( async (req , res) =>{
    //get user details from frontend

    const {fullName , email , username , password} = req.body
    //console.log("email:", email);
     

    // validation -> not empty

    if( 
        [fullName , email , username , password].some((field) =>
        field?.trim() === "")
    ){
        throw new ApiError( 400 , "All fields are requied")
    } 


    //check if user already exists: username , email
    
    const exsistedUser = await User.findOne({
        $or : [{ username }, {email}]
    })

    if(exsistedUser) {
        throw new ApiError( 409 , "User with email or username already exists")
    }

    //check for images , avatar

    const avatarLocalPath = req.files?.avatar[0].path;
    //const coverImageLocalPath = req.files?.coverImage[0].path;

let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
         coverImageLocalPath = req.files.coverImage[0].path
    }


if(!avatarLocalPath){
    throw new ApiError(400 , "Avatar file is required")
}

    //upload them to cloudinary ,avatar recheck 

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

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

const generateAccessAndRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return { accessToken , refreshToken}
    } catch (error) {
        throw new ApiError(500 , "Something went wrong while generating refresh and access tokens")
        
    }
}



const loginUser  = asyncHandler(async (req , res) => {
    // get all data 

    const { email , username ,password } = req.body

    //checkk if  username or password is entered or not 

    if(! (username || email)){
        throw new ApiError(400 , "username or email is required")
    }
    
    //find the user

    const user = await User.findOne({ 
        $or :[ {username} , {email}]
    })

    if(!user){
        throw new ApiError(404 , "User does not exsist")
    }
    
    //check password

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401 , "Invalid user credentials")
    }
    
    //access token and refresh token
    
    const {accessToken ,refreshToken } = await generateAccessAndRefreshToken(user._id)
    
    // send them in cookies

     const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

     const options ={      //only backend server can modify the cookies
        httpOnly: true,
        secure: true
     }

     return res.
     status(200)
     .cookie("accessToken" , accessToken , options)
     .cookie("refreshToken", refreshToken , options)
     .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully"
        )
     )
 
})

const logoutUser = asyncHandler(async(req , res ) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new:true
        }
    )
 
    const options ={      
        httpOnly: true,
        secure: true
     }
     return res.status(200)
     .clearCookie("accessToken", options)
     .clearCookie("refreshToken", options)
     .json(new ApiResponse(200 , {} ,"user logged out"))

})
export {registerUser , 
    loginUser,
    logoutUser
}