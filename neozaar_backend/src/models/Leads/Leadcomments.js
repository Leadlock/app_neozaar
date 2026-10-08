const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize");
const LeadDetail = require("./LeadDetail");
const User = require("../User");


const LeadComment = sequelize.define('LeadComment', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    lead_id: {
        type: DataTypes.BIGINT,
        references: { model: LeadDetail, key: 'id' }
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: User, key: 'id' }
    },
    comments: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    status: {
        type: DataTypes.STRING(100),
        allowNull: true
    }
}, {
    tableName: 'lead_comments',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    paranoid: true,
    deletedAt: 'deleted_at'
});
module.exports = LeadComment;
