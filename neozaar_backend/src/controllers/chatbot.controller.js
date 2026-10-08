const ChatbotQuestion = require("../models/chatbot");
const pool = require("../config/database");

class ChatbotController {
  static async getquestions(req, res) {
    try {
      const questions = await ChatbotQuestion.findOne({
        attributes: ["id","system_prompt", "instruction", "is_featured"],
        order: [["created_at", "DESC"]],
      });
      return res.status(200).json({
        status: "success",
        data: questions,
      });
    } catch (error) {
      console.error("Error fetching questions:", error);
      res.status(500).json({ error: "Failed to fetch questions" });
    }
  }

  static async getAllQuestions(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const offset = (page - 1) * limit;

      const { count, rows } = await ChatbotQuestion.findAndCountAll({
        limit,
        offset,
        order: [["created_at", "DESC"]],
      });

      return res.status(200).json({
        status: "success",
        data: rows,
        pagination: {
          total: count,
          page,
          limit,
          totalPages: Math.ceil(count / limit),
        },
      });
    } catch (error) {
      console.error("Error fetching questions:", error);

      return res.status(500).json({
        status: "fail",
        message: "Failed to fetch questions",
      });
    }
  }

  static async getQuestionById(req, res) {
    const { id } = req.params;
    try {
      const question = await ChatbotQuestion.findByPk(id);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      res.json(question);
    } catch (error) {
      console.error("Error fetching question:", error);
      res.status(500).json({ error: "Failed to fetch question" });
    }
  }

  static async createQuestion(req, res) {
    const { system_prompt, instruction, is_featured } = req.body;
    try {
      const newQuestion = await ChatbotQuestion.create({
        system_prompt,
        instruction,
        is_featured: is_featured || false,
      });
      res.status(201).json(newQuestion);
    } catch (error) {
      console.error("Error creating question:", error);
      res.status(500).json({ error: "Failed to create question" });
    }
  }

  static async updateQuestion(req, res) {
    const { id } = req.params;
    const { system_prompt, instruction, is_featured } = req.body;
    try {
      const question = await ChatbotQuestion.findByPk(id);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      question.system_prompt = system_prompt || question.system_prompt;
      question.instruction = instruction || question.instruction;
      if (is_featured !== undefined) {
        question.is_featured = is_featured;
      }
      await question.save();
      res.json(question);
    } catch (error) {
      console.error("Error updating question:", error);
      res.status(500).json({ error: "Failed to update question" });
    }
  }

  static async deleteQuestion(req, res) {
    const { id } = req.params;
    try {
      const question = await ChatbotQuestion.findByPk(id);
      if (!question) {
        return res.status(404).json({ error: "Question not found" });
      }
      await question.destroy();
      res.json({ message: "Question deleted successfully" });
    } catch (error) {
      console.error("Error deleting question:", error);
      res.status(500).json({ error: "Failed to delete question" });
    }
  }
}

module.exports = ChatbotController;
