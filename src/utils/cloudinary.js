import {v2 as cloudinary} from "cloudinary"

import fs from "fs" //file system

cloudinary.config({ 
        cloud_name: process.env.CLOUDNARY_NAME, 
        api_key: process.env.CLOUDNARY_API_KEY, 
        api_secret: process.env.CLOUDNARY_API_SECRET 
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if(!localFilePath) return null ;

        //upload the file on cloundinary

        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        console.log("file is uploaded on cloundinary",response.url);
        return response;

    } catch (error) {
        fs.unlinkSync(localFilePath)// remove the locallysaved temporary file as the upload operation failed 
        return null ;
    }

}

export {uploadOnCloudinary}