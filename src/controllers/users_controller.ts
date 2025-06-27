import { Request,Response } from "express"
import { redisClient } from "../config/redis";

export const getUserController=async(req:Request,res:Response)=>{
//    const user=  await redisClient.hGetAll('connectedUsers')
    return res.status(200).json({
        success:true,
        message:"Users fetched successfully",
        // data:user
    });
}