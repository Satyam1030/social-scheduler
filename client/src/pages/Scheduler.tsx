import { useEffect, useState } from "react";
import { PLATFORMS } from "../assets/assets";
import { ArrowRightIcon, CalendarDaysIcon, CalendarIcon, ClockIcon, SendIcon, XIcon } from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";

const Scheduler=()=>{

    const [posts,setPosts]=useState<any[]>([]);
    const [content,setContent]=useState("");
    const [scheduledDate,setScheduledDate]=useState("");
    const [scheduledTime,setScheduledTime]=useState("");
    const [selectedPlatforms,setSelectedPlatforms]=useState<string[]>([]);
    const [mediaFile,setMediaFile]=useState<File | null>(null);
    const [loading,setLoading]=useState(false);
    
    const fetchPosts=async()=>{
        try {
            const {data}=await api.get('/api/posts')
            setPosts(data);
        } catch (error:any) {
            toast.error(error?.response?.data?.message || error?.message);
        }
    }

    useEffect(()=>{
        (async()=>await fetchPosts())();
        const interval=setInterval(async()=>await fetchPosts(),10000);

        return ()=>clearInterval(interval);
    },[])

    const scheduled=posts.filter((p)=>p.status==="scheduled")
    const published=posts.filter((p)=>p.status==="published")
    const failed=posts.filter((p)=>p.status==="failed")

    const togglePlatform=(id:string)=>setSelectedPlatforms((prev)=>(prev.includes(id) ? prev.filter((p)=>p!==id) : [...prev,id]))

    const handleSchedule=async(e:React.FormEvent)=>{
        e.preventDefault();
        if(selectedPlatforms.length===0){
            toast.error("Select atleast one platform");
            return;
        }

        if(!scheduledDate || !scheduledTime){
            toast.error("Select date and time");
            return;
        }

        if(selectedPlatforms.includes('instagram') && !mediaFile){
            toast.error("Instagram requires image or video");
            return;
        }

        const scheduledFor=new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
        const formData=new FormData();
        formData.append("content",content);
        formData.append("scheduledFor",scheduledFor);
        formData.append("status","scheduled");
        formData.append("platforms",JSON.stringify(selectedPlatforms));
        if(mediaFile){
            formData.append("media",mediaFile);
        }
        setLoading(true);
        try {
            await api.post('/api/posts',formData,{headers:{"Content-Type":"multipart/form-data"}})
            toast.success("Post scheduled!");
            setContent("");
            setScheduledDate("");
            setScheduledTime("");
            setSelectedPlatforms([]);
            setMediaFile(null);
            fetchPosts();
        } catch (error:any) {
            toast.error(error?.response?.data?.message|| error?.message);
        }finally{
            setLoading(false);
        }

    }


    return (
        <div className="flex flex-col lg:flex-row gap-6 pb-8">
            {/* Compose Panel */}
            <div className="w-full lg:w-[460px] shrink-0">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center gap-2 mb-6">
                        <h2 className="text-lg text-slate-700">Compose Posts</h2>
                    </div>

                    <form className="space-y-5" onSubmit={handleSchedule}>
                        {/* Platforms */}
                        <div>
                            <label className="block text-xs text-slate-500 uppercase mb-2">Platforms</label>
                            <div className="flex flex-wrap gap-3">
                                {PLATFORMS.map((p)=>{
                                    const active=selectedPlatforms.includes(p.id);

                                    return (
                                        <button key={p.id} type="button" onClick={()=>togglePlatform(p.id)}
                                        className={`flex items-center gap-1.5 p-3 rounded-md border transition-all duration-150
                                        ${active?"bg-red-50 border-red-300 text-red-500 scale-103" :"border-slate-200 text-slate-500 hover:border-slate-300"}`}>
                                            <p.icon className="size-4.5"/>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Content */}
                        <div>
                            <label className="block text-xs text-slate-500 uppercase mb-2">Content</label>
                            <textarea required rows={5} placeholder="What do you want to share today?"
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 text-sm placeholder-slate-400
                            outline-none resize-none" value={content} onChange={(e)=>setContent(e.target.value)}/>
                            <div className={`text-right text-xs mt-1 font-medium ${content.length>270?"text-red-500":"text-slate-400"}`}>
                                {content.length}/280
                            </div>
                        </div>

                        {/* Media upload */}
                        <div>
                            <label className="block text-xs text-slate-500 uppercase mb-2">Media(optional)</label>
                            {mediaFile?(
                                <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                                    {mediaFile.type.startsWith("image/")? <img src={URL.createObjectURL(mediaFile)} alt="preview"
                                    className="w-full h-40 object-cover"/>: <video src={URL.createObjectURL(mediaFile)} className="w-full h-40
                                    object-cover" controls/>}
                                    <button className="absolute top-2 right-2 size-7 bg-slate-900/60 hover:bg-slate-900/80 text-white 
                                    rounded-full flex items-center justify-center transitions-colors" type="button" onClick={()=>setMediaFile(null)}>
                                        <XIcon className="size-3.5"/>
                                    </button>
                                </div>
                            ):(
                                <label className="flex items-center justify-center gap-2 p-5 py-10 border-2 border-dashed
                                border-slate-200 rounded-xl cursor-pointer hover:border-red-300 hover:bg-red:50/30 transition-all group">
                                    <span className="text-sm text-slate-500 group-hover:text-red-600 transition-colors">Click to upload image or video</span>
                                    <input type="file" accept="image/*,video/*" className="hidden"
                                    onChange={(e)=>e.target.files?.[0] && setMediaFile(e.target.files[0])}/>
                                </label>
                            )}

                        </div>

                        {/* Date and time */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs text-slate-500 uppercase mb-2">Date</label>
                                <div className="relative">
                                    <CalendarIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                    <input type="date" required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 
                                    rounded-lg text-slate-900 text-sm outline-none" value={scheduledDate} onChange={(e)=>setScheduledDate(e.target.value)}/>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs text-slate-500 uppercase mb-2">Time</label>
                                <div className="relative">
                                    <ClockIcon className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
                                    <input type="time" required className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 
                                    rounded-lg text-slate-900 text-sm outline-none" value={scheduledTime} onChange={(e)=>setScheduledTime(e.target.value)}/>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 py-3.5
                        bg-red-500 hover:bg-red-600 transition-all text-white rounded-lg font-medium cursor-pointer">
                            {loading?
                            (
                                <>
                                    <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Scheduling...
                                </>):
                            (
                                <>
                                Schedule Post
                                <ArrowRightIcon className="size-4"/>
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>

            {/* Queue Panel */}
            <div className="flex-1 flex flex-col gap-6 min-w-0 pb-12">
                {/* Upcoming */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                        <CalendarDaysIcon className="size-4 text-slate-600"/>
                        <h3 className="text-slate-900 font-medium text-sm">Upcoming Posts</h3>
                        <span className="ml-auto text-xs font-bold bg-slate-200/70 text-slate-700 px-2.5 py-0.5 rounded-full">{scheduled.length}</span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                        {scheduled.length===0?(
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm p-4">No Posts Scheduled Yet</div>
                        ):(
                            scheduled.map((post)=>(
                                <PostCard key={post._id} post={post} type="scheduled" />
                            ))
                        )}
                    </div>
                </div>

                {/* Published */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                        <SendIcon className="size-4 text-slate-600"/>
                        <h3 className="text-slate-900 font-medium text-sm">Published Posts</h3>
                        <span className="ml-auto text-xs font-bold bg-slate-200/70 text-slate-700 px-2.5 py-0.5 rounded-full">{published.length}</span>
                    </div>

                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                        {published.length===0?(
                            <div className="h-full flex items-center justify-center text-slate-400 text-sm p-4">No Published Posts Yet</div>
                        ):(
                            published.map((post)=>(
                                <PostCard key={post._id} post={post} type="published" />
                            ))
                        )}
                    </div>
                </div>

                {/* Failed Posts */}
                {failed.length > 0 && (
                    <div className="bg-white rounded-2xl border border-red-200 overflow-hidden shadow-xs">
                        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-100 bg-red-50/60">
                            <XIcon className="size-4 text-red-500"/>
                            <h3 className="text-red-950 font-medium text-sm">Failed to Publish</h3>
                            <span className="ml-auto text-xs font-bold bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">{failed.length}</span>
                        </div>

                        <div className="max-h-[400px] overflow-y-auto custom-scrollbar divide-y divide-slate-100">
                            {failed.map((post)=>(
                                <PostCard key={post._id} post={post} type="failed" />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

const PostCard = ({ post, type }: { post: any; type: 'scheduled' | 'published' | 'failed' }) => {
    const [expanded, setExpanded] = useState(false);
    const isLong = post.content && post.content.length > 130;

    return (
        <div className="p-4 sm:p-5 hover:bg-slate-50/80 transition-colors">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex gap-1.5 items-center bg-slate-100/80 px-2.5 py-1 rounded-lg">
                    {post.platforms?.map((pl: string) => {
                        const meta = PLATFORMS.find((p) => p.id === pl);
                        return meta ? <meta.icon key={pl} className="size-3.5 text-slate-600" /> : null;
                    })}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {post.mediaType && (
                        <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md capitalize">
                            {post.mediaType}
                        </span>
                    )}

                    <span className="text-xs text-slate-500 font-medium">
                        {new Date(post.scheduledFor || post.updatedAt).toLocaleString(undefined, {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                        })}
                    </span>

                    {type === 'published' && (
                        <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                            Published
                        </span>
                    )}

                    {type === 'failed' && (
                        <span className="text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 px-2.5 py-0.5 rounded-full">
                            Failed
                        </span>
                    )}

                    {type === 'scheduled' && (
                        <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full">
                            Scheduled
                        </span>
                    )}
                </div>
            </div>

            <div className="flex gap-3.5 items-start">
                {post.mediaUrl && (
                    <div className="size-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-100 shadow-xs">
                        <img
                            src={post.mediaUrl}
                            alt="post media"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                            }}
                        />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <p className={`text-sm text-slate-700 leading-relaxed break-words whitespace-pre-line ${!expanded && isLong ? 'line-clamp-2' : ''}`}>
                        {post.content}
                    </p>
                    {isLong && (
                        <button
                            type="button"
                            onClick={() => setExpanded(!expanded)}
                            className="text-xs text-red-500 hover:text-red-600 font-semibold mt-1.5 inline-block cursor-pointer"
                        >
                            {expanded ? 'Show Less' : 'Show More...'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Scheduler;