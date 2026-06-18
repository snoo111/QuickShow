import 'dotenv/config';
console.log("MongoDB URI:", process.env.MONGODB_URI)

import express from 'express';
import cors from 'cors';

import connectDB from './config/db.js';

import { clerkMiddleware } from '@clerk/express'
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest-config/index.js"

const app = express();
const port = 3000;

await connectDB()

//Middleware
app.use(express.json())
app.use(cors())
app.use(clerkMiddleware())



//API Routes
app.get('/', (req, res) => 
    res.send('Server is live!'))
app.use('/api/inngest',serve({ client: inngest, functions, signingKey:process.env.INNGEST_SIGNING_KEY,} ))

app.listen(port,()=> console.log(`Server listening at http://localhost:${port}`));