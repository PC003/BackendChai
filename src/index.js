import dotenv from "dotenv"
import connectDB from "./db/database.js";

dotenv.config({
    path:'./env'
});


connectDB();
/*
import express from "express"

const app = express()

//basic code to connect data base

(async () => {
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)

        app.on("error",(error)=>{
            console.log("Error:",error);
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        console.error("Error:",error);
        throw error
    }
})()*/