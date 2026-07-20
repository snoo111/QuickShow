// 

import Booking from "../models/booking.js";
import { clerkClient } from "@clerk/express";
import Movie from "../models/Movie.js";
import jwt from "jsonwebtoken";

const getUserId = (req) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return null
    const decoded = jwt.decode(token)
    return decoded?.sub
}

export const getUserBookings = async (req, res) => {
    try {
        const userId = getUserId(req)
        if (!userId) return res.json({ success: false, message: "not authorized" })

        const bookings = await Booking.find({ user: userId }).populate({
            path: "show",
            populate: { path: "movie" }
        }).sort({ createdAt: -1 })

        res.json({ success: true, bookings })

    } catch (error) {
        console.error(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const updateFavorite = async (req, res) => {
    try {
        const { movieId } = req.body
        const userId = getUserId(req)
        if (!userId) return res.json({ success: false, message: "not authorized" })

        const user = await clerkClient.users.getUser(userId)

        if (!user.privateMetadata.favorites) {
            user.privateMetadata.favorites = []
        }

        if (!user.privateMetadata.favorites.includes(movieId)) {
            user.privateMetadata.favorites.push(movieId)
        } else {
            user.privateMetadata.favorites = user.privateMetadata.favorites.filter(
                item => item !== movieId
            )
        }

        await clerkClient.users.updateUserMetadata(userId, {
            privateMetadata: user.privateMetadata
        })

        res.json({ success: true, message: "Favorite movie updated successfully." })

    } catch (error) {
        console.error(error.message)
        res.json({ success: false, message: error.message })
    }
}

export const getFavorites = async (req, res) => {
    try {
        const userId = getUserId(req)
        if (!userId) return res.json({ success: false, message: "not authorized" })

        const user = await clerkClient.users.getUser(userId)
        const favorites = user.privateMetadata.favorites || []

        const movies = await Movie.find({ _id: { $in: favorites } })
        res.json({ success: true, movies })

    } catch (error) {
        console.error(error.message)
        res.json({ success: false, message: error.message })
    }
}