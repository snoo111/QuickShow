// import { clerkClient } from "@clerk/express";

// export const protectAdmin = async(req, res, next) => {
//     try{
//         const {userId} =  req.auth();
//         const user = await clerkClient.users.getUser(userId)

//         if(user.privateMetadata.role !== 'admin'){
//            return res.json({success:false, message:"not authorized"}) 
//         }

//         next();

//     } catch (error){
//         return res.json({success:false, message:"not authorized"});

//     }
// }

//copied from claude to check
import { clerkClient } from "@clerk/express";
import jwt from "jsonwebtoken";

export const protectAdmin = async(req, res, next) => {
    try{
        const token = req.headers.authorization?.split(' ')[1]
        console.log("token received:", token?.substring(0, 20))
        
        if(!token){
            return res.json({success:false, message:"not authorized"})
        }

        const decoded = jwt.decode(token)
        console.log("decoded:", decoded)
        
        const userId = decoded?.sub
        console.log("userId:", userId)

        if(!userId){
            return res.json({success:false, message:"not authorized"})
        }

        const user = await clerkClient.users.getUser(userId)
        console.log("privateMetadata:", user.privateMetadata)

        if(user.privateMetadata.role !== 'admin'){
           return res.json({success:false, message:"not authorized"}) 
        }

        next();

    } catch (error){
        console.log("error:", error.message)
        return res.json({success:false, message:"not authorized"});
    }
}