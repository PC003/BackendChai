import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

//It’s a security mechanism enforced by browsers that controls how a frontend JavaScript app running at one origin (domain) can interact with resources on a different origin (domain/port/protocol) via HTTP requests (like fetch, axios etc).


app.use(cors(
    {
    origin:process.env.CORS_ORIGIN,
    credentials:true
}
))

// Handle JSON requests from client
app.use(express.json({limit:"16kb"}))

// Handle form submissions
app.use(express.urlencoded({limit:"16kb"}))
//Serve frontend/static files
app.use(express.static("public"))
//Read cookies from requests
app.use(cookieParser())


//routes 
import userRouter from './routes/user.routes.js'

//routes declaration

app.use("/api/v1/users",userRouter)
//->http://localhost:8000/api/v1/users/register
export {app}