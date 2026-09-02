import cron from "node-cron"
import { Post } from "../models/Post.js";
import { Account } from "../models/Account.js";
import zernio from "../config/zernio.js";
import { ActivityLog } from "../models/ActivityLog.js";
import { uploadMediaToPublicUrl } from "./mediaService.js";

export const initScheduler=()=>{
    cron.schedule("* * * * *",async()=>{
        try {
            const now=new Date();
            const postsToPublish=await Post.find({status:"scheduled",scheduledFor:{$lte:now}});

            for(const post of postsToPublish){
                try {
                    const accounts=await Account.find({
                        user:post.user,
                        platform:{$in:post.platforms},
                        status:"connected",
                        zernioAccountId:{$exists:true}
                    })

                    if(accounts.length===0){
                        console.log(`No connected zernio accounts found for post ${post._id}`);
                        post.status="failed";
                        await post.save();
                        await ActivityLog.create({
                            user:post.user,
                            actionType:"POST_FAILED",
                            description:`Failed to publish post: No connected account found for ${post.platforms.join(", ")}`,
                            relatedPost:post._id,
                        });
                        continue;
                    }

                    const zernioPlatforms=accounts.map((acc)=>({
                        platform:acc.platform as any,
                        accountId:acc.zernioAccountId!
                    }))

                    let finalMediaUrl = post.mediaUrl;

                    if (finalMediaUrl && finalMediaUrl.startsWith("data:")) {
                        try {
                            finalMediaUrl = await uploadMediaToPublicUrl(finalMediaUrl, "scheduled.png");
                            post.mediaUrl = finalMediaUrl;
                        } catch (uploadErr) {
                            console.error("Media upload of data URI failed in scheduler:", uploadErr);
                            finalMediaUrl = undefined;
                        }
                    }

                    const isValidHttpUrl = finalMediaUrl && (finalMediaUrl.startsWith("http://") || finalMediaUrl.startsWith("https://"));

                    const payload={
                        content:post.content,
                        publishNow:true,
                        ...(isValidHttpUrl ? {mediaItems:[{type:post.mediaType || "image",url:finalMediaUrl!}]}:{}),
                        platforms:zernioPlatforms,
                    }

                    console.log(`Publishing post ${post._id} to Zernio with media: ${isValidHttpUrl ? finalMediaUrl : "none"}`)

                    const response =await zernio.posts.createPost({
                        body:payload
                    })

                    const publishedPost=(response.data as any)?.post || response.data;

                    if(!publishedPost){
                        throw new Error("Failed to get post object from zernio response")
                    }

                    console.log(`Zernio post created: ${publishedPost._id || publishedPost.id}`);

                    post.status="published";

                    await post.save();
                    
                    await ActivityLog.create({
                        user:post.user,
                        actionType:"POST_PUBLISHED",
                        description:`Published post to ${accounts.map((a)=>a.platform).join(", ")}`,
                        relatedPost:post._id,

                    })

                } catch (err:any) {
                    const errMsg = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to publish post";
                    console.error(`Failed to publish post ${post._id} :`, errMsg);
                    post.status="failed";
                    await post.save();
                    await ActivityLog.create({
                        user:post.user,
                        actionType:"POST_FAILED",
                        description:`Failed to publish post: ${errMsg}`,
                        relatedPost:post._id,
                    });
                }
            }

            if(postsToPublish.length>0){
                console.log(`Evaluated ${postsToPublish.length} posts at ${now.toISOString()}`)
            }
        } catch (error) {
            console.error("Error in scheduler:",error);
        }
    })

    console.log("Scheduler service initialized")
}