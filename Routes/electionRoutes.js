// Routes/electionRoutes.js
const express = require('express');
const router = express.Router();
const Election = require('../models/election');
const User = require('../models/user');
const { jwtAuthMiddleware } = require('../jwt');
const nodemailer = require('nodemailer');

const isAdmin = async userId => {
  try {
    const user = await User.findById(userId);
    return user && user.role === 'admin';
  } catch (err) {
    return false;
  }
};

// Create election (admin)
router.post('/', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: 'Access denied' });

    const { name, startAt, endAt } = req.body;
    if (!name || !startAt || !endAt) return res.status(400).json({ error: 'name, startAt and endAt required' });

    const newElection = new Election({
      name,
      startAt: new Date(startAt),
      endAt: new Date(endAt),
      status: new Date(startAt) <= Date.now() && new Date(endAt) > Date.now() ? 'ongoing' : 'upcoming'
    });

    const saved = await newElection.save();
    res.status(201).json({ election: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start (force) election (admin)
router.put('/:id/start', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: 'Access denied' });

    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });

    election.status = 'ongoing';
    election.startAt = new Date();
    await election.save();

    res.json({ message: 'Election started', election });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Close election (admin)
router.put('/:id/close', jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) return res.status(403).json({ message: 'Access denied' });

    const election = await Election.findById(req.params.id);
    if (!election) return res.status(404).json({ error: 'Election not found' });

    election.status = 'closed';
    election.endAt = new Date();
    await election.save();

    res.json({ message: 'Election closed', election });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current election (ongoing preferred, then next upcoming)
router.get('/current', async (req, res) => {
  try {
    // 1) ongoing
    let election = await Election.findOne({ status: 'ongoing' }).sort({ startAt: -1 });
    if (!election) {
      // 2) next upcoming
      election = await Election.findOne({ status: 'upcoming' }).sort({ startAt: 1 });
    }
    res.json({ election });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// GET election phase (frontend expects this)
router.get('/phase', async (req, res) => {
  try {
    // prefer ongoing, then next upcoming
    let election = await Election.findOne({ status: 'ongoing' }).sort({ startAt: -1 });
    let phase = 'Not declared';
    if (!election) {
      election = await Election.findOne({ status: 'upcoming' }).sort({ startAt: 1 });
      if (election) phase = 'Upcoming';
    } else {
      phase = 'Voting';
    }
    res.json({ phase });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});


module.exports = router;
