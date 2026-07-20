import 'dotenv/config';
console.log("MongoDB URI:", process.env.MONGODB_URI)

import express from 'express';
import cors from 'cors';

import connectDB from './config/db.js';

import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest-config/index.js"
import showRouter from './routes/showRoutes.js';
import bookingRouter from './routes/bookingRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import userRouter from './routes/userRoutes.js';
import User from './models/User.js'

const app = express();
const port = 3000;

await connectDB()

//Middleware
app.use(express.json())
app.use(cors({
    origin: 'http://localhost:5173',
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}))
app.use(clerkMiddleware())



app.get('/api/debug-auth', (req, res) => {
    console.log("headers:", req.headers.authorization)
    console.log("auth:", req.auth)
    res.json({ 
        auth: req.auth,
        hasToken: !!req.headers.authorization 
    })
})

app.use((req, res, next) => {
    console.log("URL:", req.url)
    console.log("Auth header:", req.headers.authorization?.substring(0, 20))
    next()
})



//API Routes
app.get('/', (req, res) => 
    res.send('Server is live!'))
app.use('/api/inngest',serve({ client: inngest, functions, signingKey:process.env.INNGEST_SIGNING_KEY,} ))
app.use('/api/show', showRouter)
app.use('/api/booking', bookingRouter)
app.use('/api/admin', adminRouter)
app.use('/api/user', userRouter)

app.get('/api/test-auth', (req, res) => {
    console.log("auth object:", req.auth)
    res.json({ auth: req.auth })
})

//from claude
app.use('/api/inngest', serve({ 
    client: inngest, 
    functions,
    signingKey: process.env.INNGEST_SIGNING_KEY,
    isDev: process.env.NODE_ENV !== 'production'
}))

//also from claude
//just for checking 
app.get('/api/test-inngest', async (req, res) => {
    try {
        await inngest.send({
            name: 'user.created',
            data: {
                id: 'test_user_456',
                first_name: 'Test',
                last_name: 'User',
                email_addresses: [{ email_address: 'test2@example.com' }],
                image_url: 'https://example.com/image.jpg'
            }
        })
        res.json({ success: true, message: 'Event sent' })
    } catch (error) {
        console.error(error)
        res.json({ success: false, message: error.message })
    }
})

//from claude


app.get('/api/test-user-create', async (req, res) => {
    try {
        const userData = {
            _id: 'test_user_789',
            email: 'test3@example.com',
            name: 'Test User',
            image: 'https://example.com/image.jpg'
        }
        await User.create(userData)
        res.json({ success: true, message: 'User created' })
    } catch (error) {
        console.error(error)
        res.json({ success: false, message: error.message })
    }
})

app.listen(port,()=> console.log(`Server listening at http://localhost:${port}`));
