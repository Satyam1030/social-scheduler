import { Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generation.js";
import { Post } from "../models/Post.js";
import { uploadMediaToPublicUrl } from "../services/mediaService.js";

//helper to poll leonardo.ai
const pollLeonardoJob=async(generationId:string,apiKey:string):Promise<string>=>{
    const maxRetries=20;
    const delay=5000;

    for(let i=0;i<maxRetries;i++){
        try {
            const response=await axios.get(`https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,{headers:{
                accept:"application/json",
                authorization:`Bearer ${apiKey}`
            }})

            const generation=response.data.generations_by_pk;
            if(generation.status==="COMPLETE"){
                if(generation.generated_images && generation.generated_images.length>0){
                    return generation.generated_images[0].url;
                }
                throw new Error("Generation completed but no images found")
            }

            if(generation.status==="FAILED"){
                throw new Error("Generation completed but no images found")
            }
        } catch (err:any) {
            console.error("Polling error:",err?.response?.data || err.message);
        }

        await new Promise((resolve)=>setTimeout(resolve,delay));
    }

    throw new Error("Leonardo.ai generation time out.")
}

//generate post
//post /api/posts/generate
export const generatePost=async(req:AuthRequest,res:Response):Promise<void>=>{
    try {
        const {prompt,tone,generateImage}=req.body;

        const apiKey=process.env.GEMINI_API_KEY;

        if(!apiKey){
            res.status(400).json({message:"Gemini api key is missing. please add it to server/.env file."})
            return
        }

        const ai=new GoogleGenAI({apiKey});

        //generate text
        const textResponse=await ai.models.generateContent({
            model:"gemini-3.6-flash",
            contents:`Generate a social media post based on this prompt:"${prompt}".
            Tone:${tone},.
            Include relevant hashtags.
            Format the response as JSON with "content" and "imagePrompt" fields.
            The "imagePrompt" should be a highly descriptive prompt for an image generator that complements the post.`
        });

        let content="";
        let imagePrompt=prompt;

        try {
            const rawText=textResponse.text || "";
            const jsonMatch=rawText.match(/\{[\s\S]*\}/)
            const data=jsonMatch ? JSON.parse(jsonMatch[0]) : {content:rawText,imagePrompt:prompt};

            content=data.content;
            imagePrompt=data.imagePrompt;

        } catch (e) {
            content=textResponse.text || ""
        }

        let mediaUrl="";

        if(generateImage){
            try {
                const leonardoKey=process.env.LEONARDO_API_KEY;

                if(leonardoKey){
                    try {
                        //use leonardo key for image generation
                        const leoResponse=await axios.post(
                            "https://cloud.leonardo.ai/api/rest/v2/generations",
                            {
                                "public": false,
                                "model": "gpt-image-2",
                                "parameters":{
                                    "quality": "LOW",
                                    "prompt": imagePrompt,
                                    "quantity": 1,
                                    "width": 1024,
                                    "height": 1024,
                                    "prompt_enhance": "OFF",
                                }
                            },{
                                headers:{
                                    accept:"application/json",
                                    authorization:`Bearer ${leonardoKey}`,
                                    "content-type":"application/json"
                                }
                            }
                        )

                        const generationId=leoResponse.data.generate.generationId;
                        const tempUrl=await pollLeonardoJob(generationId,leonardoKey);

                        //upload to cloudinary for persistence
                        try {
                            const uploadResult=await cloudinary.uploader.upload(tempUrl,{
                                folder:"ai-generations",
                            });
                            mediaUrl=uploadResult.secure_url;
                        } catch {
                            mediaUrl=tempUrl;
                        }
                    } catch (leoErr:any) {
                        console.warn("Leonardo.ai image generation failed or no credits available. Falling back to free AI image generator:", leoErr?.response?.data || leoErr?.message);
                    }
                }

                // If Leonardo was not used or failed (e.g. 0 credits), use free Pollinations AI image generator
                if(!mediaUrl){
                    const seed = Math.floor(Math.random() * 1000000);
                    const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(imagePrompt)}?width=1024&height=1024&seed=${seed}&nologo=true`;
                    
                    try {
                        const uploadResult = await cloudinary.uploader.upload(pollinationsUrl, {
                            folder: "ai-generations",
                        });
                        mediaUrl = uploadResult.secure_url;
                    } catch {
                        // Fallback directly to Pollinations image URL if Cloudinary upload fails
                        mediaUrl = pollinationsUrl;
                    }
                }

            } catch (err:any) {
                console.error("Image generation failed:",err);
            }
        }

        // save generation to db
        const generation=await Generation.create({
            user:req.user._id,
            prompt,content,mediaUrl,
            mediaType:mediaUrl?"image":undefined,
            tone
        })

        res.json(generation)


    } catch (error:any) {
        res.status(500).json({message:error?.message || "Server error"});
    }
}



//get generations
//get /api/posts/generations
export const getGenerations=async(req:AuthRequest,res:Response):Promise<void>=>{
    try {
        const generations=await Generation.find({user:req.user._id}).sort({createdAt:-1})
        res.json(generations);
    } catch (error:any) {
        res.status(500).json({message:error?.message || "Server error"})
    }
}



//get posts
//get /api/posts
export const getPosts=async(req:AuthRequest,res:Response):Promise<void>=>{
    try {
        const posts=await Post.find({user:req.user._id})
        res.json(posts);
    } catch (error:any) {
        res.status(500).json({message:error?.message || "Server error"})
    }
}



//schedule posts
//post /api/posts
export const schedulePost=async(req:AuthRequest,res:Response):Promise<void>=>{
    try {
        const {content,platforms,scheduledFor,status}=req.body;

        //parse platforms if it comes as a stringified array from FormData
        let parsedPlatforms=platforms;
        if(typeof platforms==="string"){
            try {
                parsedPlatforms=JSON.parse(platforms);
            } catch (e) {
                parsedPlatforms=platforms.split(",");
            }
        }

        let mediaUrl:string|undefined =req.body.mediaUrl;

        let mediaType:"image"|"video" |undefined=req.body.mediaType;

        if(req.file){
            try {
                mediaUrl=await uploadMediaToPublicUrl(req.file.buffer, req.file.originalname);
                mediaType=req.file.mimetype.startsWith("video")?"video":"image";
            } catch (err:any) {
                console.error("File upload failed in schedulePost:", err);
            }

        } else if(mediaUrl && mediaUrl.startsWith("data:")){
            try {
                mediaUrl = await uploadMediaToPublicUrl(mediaUrl, "upload.png");
                mediaType = "image";
            } catch (cloudErr: any) {
                console.error("Upload failed for data URI in schedulePost:", cloudErr?.message || cloudErr);
            }
        }

        const post=await Post.create({
            user:req.user._id,
            content,
            platforms:parsedPlatforms,
            mediaUrl,
            mediaType,
            scheduledFor,
            status
        })

        res.status(201).json(post);

    } catch (error:any) {
        res.status(500).json({message:error?.message || "Server error"})
    }
}