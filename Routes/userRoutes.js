const express = require('express');
const router = express.Router();
const User = require('./../models/user');
const { jwtAuthMiddleware, generateToken } = require('./../jwt');
//check if admin already exist
router.get('/admin/check', async (req, res) => {
  try {
    const admin = await User.findOne({ role: 'admin' });
    return res.status(200).json({ exists: !!admin });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Signup
router.post('/signup', async (req, res) => {
    try {
        let { name, age, email, mobile, address, aadharCardNumber, password, role } = req.body;

        if (Number(age) < 18) {
      return res.status(400).json({ error: 'You must be 18 or older to register' });
    }


        if (role === "admin") {
            // Check if an admin already exists
            const existingAdmin = await User.findOne({ role: "admin" });
            if (existingAdmin) {
                return res.status(400).json({ error: "Admin already exists. Only one admin allowed." });
            }
        } else {
            // Force role to voter for everyone else
            role = "voter";
        }

        const newUser = new User({ name, age:Number(age) , email, mobile, address, aadharCardNumber:String(aadharCardNumber), password, role });
        const savedUser = await newUser.save();

        const payload = { id: savedUser.id };
        const token = generateToken(payload);

        res.status(200).json({ savedUser, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { aadharCardNumber, password } = req.body;
        const user = await User.findOne({ aadharCardNumber:String(aadharCardNumber) });

        if (!user || !(await user.comparePassword(password))) {
            return res.status(401).json({ error: "Invalid username or password" });
        }

        const payload = { id: user.id };
        const token = generateToken(payload);

        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Get Profile
router.get('/profile', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId);
        res.status(200).json({ user });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});
router.get('/notifications', jwtAuthMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Optional: sort by newest first
    const sortedNotifications = (user.notifications || []).sort((a, b) => b.createdAt - a.createdAt);

    res.json({ notifications: sortedNotifications });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update Password
router.put('/profile/password', jwtAuthMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(userId);
        if (!(await user.comparePassword(currentPassword))) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
