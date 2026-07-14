const asyncHandler = (requestHandler)=>{
     return (req , res , next) => {
        Promise.resolve(requestHandler(req , res , next)).catch((err) => next(err))
    }
}
//function returning a function


export{ asyncHandler}

/*
"USING TRY-CATCH INSTEAD OF PROMISES"
const asyncHandler = (fun) => async(req , res , next) =>{
    try{
    await fun (req , res , next)
    } catch(error){
     res.status(error.code ||400).json({
     success:false,
     message : error.message
     })
     }
    }
*/