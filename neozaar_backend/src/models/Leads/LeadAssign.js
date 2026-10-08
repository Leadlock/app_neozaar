const { DataTypes } = require("sequelize");
const sequelize = require("../../config/sequelize");
const LeadDetail = require("./LeadDetail");
const User = require("../User");


const LeadAssign = sequelize.define('LeadAssign', {
    id: {
        type: DataTypes.BIGINT,
        autoIncrement: true,
        primaryKey: true
    },
    lead_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: LeadDetail, key: 'id' } // assumes LeadDetail exists
    },
    user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: User, key: 'id' }       // user who created/assigned
    },
    assign_user_id: {
        type: DataTypes.BIGINT,
        allowNull: false,
        references: { model: User, key: 'id' }       // user being assigned
    },
    assign_user_type: {
        type: DataTypes.ENUM('ISV', 'CLIENT', 'SUPPORT_PARTNER'),
        allowNull: false
    }
}, {
    tableName: 'lead_assigns',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});
module.exports = LeadAssign;
