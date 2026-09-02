import axios from "axios";
import FormData from "form-data";
import { cloudinary } from "../config/cloudinary.js";

export const uploadMediaToPublicUrl = async (
    source: Buffer | string,
    filename: string = "image.png"
): Promise<string> => {
    if (typeof source === "string" && (source.startsWith("http://") || source.startsWith("https://"))) {
        return source;
    }

    let buffer: Buffer;
    if (typeof source === "string" && source.startsWith("data:")) {
        const base64Data = source.replace(/^data:[^;]+;base64,/, "");
        buffer = Buffer.from(base64Data, "base64");
    } else if (Buffer.isBuffer(source)) {
        buffer = source;
    } else if (typeof source === "string") {
        buffer = Buffer.from(source);
    } else {
        throw new Error("Invalid image source provided");
    }

    // 1. Try Cloudinary
    try {
        const base64String = `data:image/png;base64,${buffer.toString("base64")}`;
        const uploadResult = await cloudinary.uploader.upload(base64String, {
            folder: "social-scheduler"
        });
        if (uploadResult?.secure_url) {
            return uploadResult.secure_url;
        }
    } catch (cloudErr: any) {
        console.warn("Cloudinary upload failed (403/Error). Falling back to Catbox.moe direct host:", cloudErr?.message || cloudErr);
    }

    // 2. Try Catbox.moe (Direct CDN image host supported by Instagram/Twitter/LinkedIn)
    try {
        const form = new FormData();
        form.append("reqtype", "fileupload");
        form.append("fileToUpload", buffer, { filename, contentType: filename.endsWith(".jpg") || filename.endsWith(".jpeg") ? "image/jpeg" : "image/png" });

        const res = await axios.post("https://catbox.moe/user/api.php", form, {
            headers: form.getHeaders(),
            timeout: 15000
        });

        if (res.data && typeof res.data === "string" && res.data.startsWith("http")) {
            return res.data.trim();
        }
    } catch (catErr: any) {
        console.warn("Catbox.moe upload failed, trying tmpfiles fallback:", catErr?.message || catErr);
    }

    // 3. Fallback to tmpfiles.org
    try {
        const form = new FormData();
        form.append("file", buffer, { filename, contentType: "image/png" });

        const res = await axios.post("https://tmpfiles.org/api/v1/upload", form, {
            headers: form.getHeaders(),
            timeout: 10000
        });

        if (res.data?.data?.url) {
            return res.data.data.url.replace("tmpfiles.org/", "tmpfiles.org/dl/");
        }
    } catch (tmpErr: any) {
        console.error("Public host upload failed:", tmpErr?.message || tmpErr);
    }

    throw new Error("Failed to upload image to public storage");
};
