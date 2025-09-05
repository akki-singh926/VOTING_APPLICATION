const express = require("express");
const router = express.Router();
const Candidate = require("./../models/candidate");
const User = require("./../models/user");
const { jwtAuthMiddleware } = require("../jwt");

// 🔹 Check if user is admin
const isAdmin = async (userID) => {
  try {
    const user = await User.findById(userID);
    return user && user.role === "admin";
  } catch (err) {
    return false;
  }
};

// ----------------- ADMIN: Add candidate -----------------
router.post("/", jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ message: "Access denied. Only admin allowed." });
    }

    const data = req.body;
    const newCandidate = new Candidate(data);
    const savedCandidate = await newCandidate.save();

    res.status(201).json({ message: "Candidate added successfully", candidate: savedCandidate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------- ADMIN: Update candidate -----------------
router.put("/:candidateID", jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ message: "Access denied. Only admin allowed." });
    }

    const candidateID = req.params.candidateID;
    const updatedData = req.body;

    const updatedCandidate = await Candidate.findByIdAndUpdate(candidateID, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!updatedCandidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.status(200).json({ message: "Candidate updated successfully", candidate: updatedCandidate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------- ADMIN: Delete candidate -----------------
router.delete("/:candidateID", jwtAuthMiddleware, async (req, res) => {
  try {
    if (!(await isAdmin(req.user.id))) {
      return res.status(403).json({ message: "Access denied. Only admin allowed." });
    }

    const candidateID = req.params.candidateID;
    const deletedCandidate = await Candidate.findByIdAndDelete(candidateID);

    if (!deletedCandidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------- VOTER: Cast vote -----------------
router.post("/votes/:candidateID", jwtAuthMiddleware, async (req, res) => {
  const candidateID = req.params.candidateID;
  const userID = req.user.id;

  try {
    const candidate = await Candidate.findById(candidateID);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    const user = await User.findById(userID);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ❌ Prevent admin from voting
    if (user.role === "admin") {
      return res.status(403).json({ message: "Admin is not allowed to vote" });
    }

    // ❌ Prevent multiple votes
    if (user.isVoted) {
      return res.status(400).json({ message: "User has already voted" });
    }

    candidate.votes.push({ user: userID });
    candidate.voteCount = (candidate.voteCount || 0) + 1;
    await candidate.save();

    user.isVoted = true;
    await user.save();

    res.status(200).json({ message: "Vote recorded successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------- PUBLIC: View results -----------------
router.get("/vote/count", async (req, res) => {
  try {
    const candidates = await Candidate.find().sort({ voteCount: -1 });
    const voteRecord = candidates.map((data) => ({
      name: data.name,
      party: data.party,
      votes: data.voteCount || 0,
    }));

    res.status(200).json({ voteRecord });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ----------------- PUBLIC: Get candidates -----------------
router.get("/candidates", async (req, res) => {
  try {
    const candidates = await Candidate.find();
    res.status(200).json({ candidates });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
