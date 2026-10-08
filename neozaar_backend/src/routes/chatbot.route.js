const express = require("express");
const router = express.Router();
const ChatbotController = require("../controllers/chatbot.controller");
const verifyToken = require("../middlewares/auth");

router.get("/get-questions", ChatbotController.getquestions);

router.get("/get-all", verifyToken, ChatbotController.getAllQuestions);
router.get("/get/:id", verifyToken, ChatbotController.getQuestionById);
router.post("/create", verifyToken, ChatbotController.createQuestion);
router.post("/update/:id", verifyToken, ChatbotController.updateQuestion);
router.post("/delete/:id", verifyToken, ChatbotController.deleteQuestion);

module.exports = router;
