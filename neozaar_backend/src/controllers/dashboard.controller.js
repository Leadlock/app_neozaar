const { Op, fn, col, literal, where, Sequelize } = require('sequelize');
const commonConstant = require('../config/common.constant');
// const Product = require('../models/product');
const User = require('../models/User')
const { Product, LeadDetail } = require('../models/Leads/index');

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const emptyWeek = () =>
  DAYS.reduce((acc, d) => {
    acc[d] = { total: 0, active: 0, draft: 0, unpublished: 0 };
    return acc;
  }, {});

const emptyLeadWeek = () =>
  DAYS.reduce((acc, d) => {
    acc[d] = { total: 0, won: 0, lost: 0, pending: 0 };
    return acc;
  }, {});



const getProductDashboardStats_updated = async (req, res) => {
  try {
    const { role_id, id: userId, role_type } = req.user;
    const isAdmin = role_id === 4;

    const buildDataByType = async (actionType) => {
      const productWhere = {
        action_type: actionType,
        ...(isAdmin ? {} : { user_id: userId })
      };

      /* ---------------- PRODUCT COUNTS ---------------- */
      const [
        total_products,
        active_products,
        draft_products,
        unpublished_products
      ] = await Promise.all([
        Product.count({ where: productWhere }),
        Product.count({
          where: { ...productWhere, is_publish: true, is_approved: true }
        }),
        Product.count({
          where: { ...productWhere, is_drapt: true }
        }),
        Product.count({
          where: { ...productWhere, is_publish: false, is_drapt: false }
        })
      ]);

      /* ---------------- PRODUCT TREND (7 DAYS) ---------------- */
      const productTrendRaw = await Product.findAll({
        attributes: [
          [fn('to_char', col('created_at'), 'dy'), 'day'],
          [fn('COUNT', '*'), 'total'],
          [fn('COUNT', literal(`CASE WHEN is_publish = true AND is_approved = true THEN 1 END`)), 'active'],
          [fn('COUNT', literal(`CASE WHEN is_drapt = true THEN 1 END`)), 'draft'],
          [fn('COUNT', literal(`CASE WHEN is_publish = false AND is_drapt = false THEN 1 END`)), 'unpublished']
        ],
        where: {
          ...productWhere,
          created_at: {
            [Op.gte]: literal(`CURRENT_DATE - INTERVAL '6 days'`)
          }
        },
        group: ['day'],
        raw: true
      });

      const productWeek = emptyWeek();
      productTrendRaw.forEach(r => {
        const d = r.day.toLowerCase();
        if (productWeek[d]) {
          productWeek[d] = {
            total: Number(r.total),
            active: Number(r.active),
            draft: Number(r.draft),
            unpublished: Number(r.unpublished)
          };
        }
      });

      /* ---------------- LEAD COUNTS ---------------- */
      const leadWhere = {
        action_type: actionType
      };

      const leadInclude = [{
        model: Product,
        required: true,
        where: productWhere,
        attributes: []
      }];

      const [
        total_leads,
        won_leads,
        lost_leads,
        pending_leads
      ] = await Promise.all([
        LeadDetail.count({ where: leadWhere, include: leadInclude }),
        LeadDetail.count({ where: { ...leadWhere, status: 'won' }, include: leadInclude }),
        LeadDetail.count({ where: { ...leadWhere, status: 'lost' }, include: leadInclude }),
        LeadDetail.count({ where: { ...leadWhere, status: 'pending' }, include: leadInclude })
      ]);

      /* ---------------- LEAD TREND (7 DAYS) ---------------- */
      const leadTrendRaw = await LeadDetail.findAll({
        attributes: [
          [fn('to_char', col('LeadDetail.created_at'), 'dy'), 'day'],
          [fn('COUNT', '*'), 'total'],
          [fn('COUNT', literal(`CASE WHEN status = 'won' THEN 1 END`)), 'won'],
          [fn('COUNT', literal(`CASE WHEN status = 'lost' THEN 1 END`)), 'lost'],
          [fn('COUNT', literal(`CASE WHEN status = 'pending' THEN 1 END`)), 'pending']
        ],
        where: {
          ...leadWhere,
          created_at: {
            [Op.gte]: literal(`CURRENT_DATE - INTERVAL '6 days'`)
          }
        },
        include: leadInclude,
        group: ['day'],
        raw: true
      });

      const leadWeek = emptyLeadWeek();
      leadTrendRaw.forEach(r => {
        const d = r.day.toLowerCase();
        if (leadWeek[d]) {
          leadWeek[d] = {
            total: Number(r.total),
            won: Number(r.won),
            lost: Number(r.lost),
            pending: Number(r.pending)
          };
        }
      });

      return {
        productCount: {
          total_products,
          active_products,
          draft_products,
          unpublished_products
        },
        totalProductCreatedInLastWeek: productWeek,
        leadCount: {
          total_leads,
          won_leads,
          lost_leads,
          pending_leads
        },
        totalLeadsCreatedInLastWeek: leadWeek
      };
    };

    /* ---------------- FINAL RESPONSE ---------------- */
    return res.status(200).json({
      product_data: await buildDataByType('product'),
      service_data: await buildDataByType('service'),
      solution_data: await buildDataByType('solution')
    });

  } catch (err) {
    console.error('Dashboard Error:', err);
    return res.status(500).json({
      status: 'fail',
      message: 'Internal server error'
    });
  }
};


const getProductDashboardStats_old = async (req, res) => {
    try {
        const { role_id, id: userId } = req.user;
        const isAdmin = role_id === 4;

        // Common where condition for product ownership
        const productWhere = isAdmin ? {} : { user_id: userId };

        // -------- PRODUCTS COUNTS --------
        const [totalProducts, activeProducts, draftProducts, unpublishedProducts] = await Promise.all([
            Product.count({ where: productWhere }),
            Product.count({
                where: { ...productWhere, is_publish: true, is_approved: true }
            }),
            Product.count({
                where: { ...productWhere, is_drapt: true }
            }),
            Product.count({
                where: { ...productWhere, is_publish: false, is_drapt: false }
            })
        ]);

        // -------- LEADS COUNTS --------
        const leadWhereBase = {
            action_type: 'product'
        };

        const leadConditions = {
            total: {},
            won: { status: 'won' },
            lost: { status: 'lost' },
            pending: { status: 'pending' }
        };

        const [totalLeads, wonLeads, lostLeads, pendingLeads] = await Promise.all([
            LeadDetail.count({
                where: {
                    ...leadWhereBase,
                    ...(isAdmin ? {} : { '$product.user_id$': userId })
                },
                include: [{ model: Product, as: 'product', attributes: [] }]
            }),
            LeadDetail.count({
                where: {
                    ...leadWhereBase,
                    ...leadConditions.won,
                    ...(isAdmin ? {} : { '$product.user_id$': userId })
                },
                include: [{ model: Product, as: 'product', attributes: [] }]
            }),
            LeadDetail.count({
                where: {
                    ...leadWhereBase,
                    ...leadConditions.lost,
                    ...(isAdmin ? {} : { '$product.user_id$': userId })
                },
                include: [{ model: Product, as: 'product', attributes: [] }]
            }),
            LeadDetail.count({
                where: {
                    ...leadWhereBase,
                    ...leadConditions.pending,
                    ...(isAdmin ? {} : { '$product.user_id$': userId })
                },
                include: [{ model: Product, as: 'product', attributes: [] }]
            })
        ]);

        // -------- PRODUCT TREND (last 7 days) --------
        const productTrends = await Product.findAll({
            attributes: [
                [fn('to_char', fn('date', col('created_at')), 'dy'), 'day_name'],
                [fn('date', col('created_at')), 'day_date'],
                [fn('COUNT', '*'), 'total_products'],
                [fn('COUNT', literal("CASE WHEN is_publish = true AND is_approved = true THEN 1 END")), 'active_products'],
                [fn('COUNT', literal("CASE WHEN is_drapt = true THEN 1 END")), 'draft_products'],
                [fn('COUNT', literal("CASE WHEN is_publish = false THEN 1 END")), 'unpublished_products']
            ],
            where: {
                created_at: {
                    [Op.gte]: literal("CURRENT_DATE - INTERVAL '6 days'"),
                    [Op.lt]: literal("CURRENT_DATE")
                }
            },
            group: ['day_date'],
            order: [[literal('day_date'), 'ASC']],
            raw: true
        });

        const totalProductCreatedInLastWeek = {};
        productTrends.forEach(row => {
            totalProductCreatedInLastWeek[row.day_name] = {
                total_products: Number(row.total_products),
                active_products: Number(row.active_products),
                draft_products: Number(row.draft_products),
                unpublished_products: Number(row.unpublished_products)
            };
        });

        // -------- LEADS TREND (last 7 days) --------
        const leadTrends = await LeadDetail.findAll({
            attributes: [
                [fn('to_char', fn('date', col('created_at')), 'dy'), 'day_name'],
                [fn('date', col('created_at')), 'day_date'],
                [fn('COUNT', '*'), 'total_leads'],
                [fn('COUNT', literal("CASE WHEN status = 'won' THEN 1 END")), 'won_leads'],
                [fn('COUNT', literal("CASE WHEN status = 'lost' THEN 1 END")), 'lost_leads'],
                [fn('COUNT', literal("CASE WHEN status = 'pending' THEN 1 END")), 'pending_leads']
            ],
            where: {
                created_at: {
                    [Op.gte]: literal("CURRENT_DATE - INTERVAL '6 days'")
                }
            },
            group: ['day_date'],
            order: [[literal('day_date'), 'ASC']],
            raw: true
        });

        const totalLeadsCreatedInLastWeek = {};
        leadTrends.forEach(row => {
            totalLeadsCreatedInLastWeek[row.day_name] = {
                total_leads: Number(row.total_leads),
                won_leads: Number(row.won_leads),
                lost_leads: Number(row.lost_leads),
                pending_leads: Number(row.pending_leads)
            };
        });

        // -------- FINAL RESPONSE --------
        res.json({
            status: commonConstant.VARIABLE.SUCCESS,
            data: {
                products: {
                    total_products: totalProducts,
                    active_products: activeProducts,
                    draft_products: draftProducts,
                    unpublished_products: unpublishedProducts
                },
                leads: {
                    total_leads: totalLeads,
                    won_leads: wonLeads,
                    lost_leads: lostLeads,
                    pending_leads: pendingLeads
                },
                totalProductCreatedInLastWeek,
                totalLeadsCreatedInLastWeek
            },
            code: 200
        });

    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({
            status: commonConstant.VARIABLE.FAIL,
            message: 'Internal server error',
            code: 500
        });
    }
};

const getProductDashboardStats = async (req, res) => {
    try {
        const { role_id, id: userId } = req.user;
        const isAdmin = [3, 4, 5].includes(role_id);

        // 1. Security Filters
        // Products are filtered by user_id for ISVs
        const productWhere = isAdmin ? {} : { user_id: userId };
        
        // Leads must be filtered by the owner of the linked product
        const leadOwnershipFilter = isAdmin ? {} : { '$product.user_id$': userId };
        const leadWhereBase = { action_type: 'product', ...leadOwnershipFilter };

        // 2. Optimized Counts (Products & Leads)
        const [
            totalProducts, activeProducts, draftProducts, unpublishedProducts, inactiveProducts,
            totalServices, activeServices, draftServices, unpublishedServices, inactiveServices,
            totalSolutions, activeSolutions, draftSolutions, unpublishedSolutions, inactiveSolutions,
            totalLeads, wonLeads, lostLeads, pendingLeads
        ] = await Promise.all([
            // Product Counts
            Product.count({ where: { ...productWhere, action_type: 'product'} }), // total 
            Product.count({ where: { ...productWhere, is_publish: true, is_approved: true, is_drapt:false ,action_type: 'product' } }), //active  
            Product.count({ where: { ...productWhere, is_drapt: true, is_approved: false, is_publish: false, action_type: 'product' } }), // draft
            Product.count({ where: { ...productWhere, is_publish: false, is_approved: true, is_drapt: false, action_type: 'product' } }), // unpulished
            Product.count({ where: { ...productWhere, is_drapt: false, is_approved: false, is_publish: false, action_type: 'product' } }), // inactive
            
            // Service Counts
            Product.count({ where: { ...productWhere, action_type: 'service'} }),
            Product.count({ where: { ...productWhere, is_publish: true, is_approved: true, is_drapt:false ,action_type: 'service' } }),
            Product.count({ where: { ...productWhere, is_drapt: true, is_approved: false, is_publish: false, action_type: 'service' } }),
            Product.count({ where: { ...productWhere, is_publish: false, is_approved: true, is_drapt: false, action_type: 'service' } }),
            Product.count({ where: { ...productWhere, is_drapt: false, is_approved: false, is_publish: false, action_type: 'service' } }),
            // Solution Counts
            Product.count({ where: { ...productWhere, action_type: 'solution'} }),
            Product.count({ where: { ...productWhere, is_publish: true, is_approved: true, action_type: 'solution' } }),
            Product.count({ where: { ...productWhere, is_publish: true, is_approved: true, is_drapt:false ,action_type: 'solution' } }),
            Product.count({ where: { ...productWhere, is_drapt: true, is_approved: false, is_publish: false, action_type: 'solution' } }),
            Product.count({ where: { ...productWhere, is_publish: false, is_approved: true, is_drapt: false, action_type: 'solution' } }),
            Product.count({ where: { ...productWhere, is_drapt: false, is_approved: false, is_publish: false, action_type: 'solution' } }),

            // Lead Counts (Using include to check product ownership)
            LeadDetail.count({ where: leadWhereBase, include: [{ model: Product, as: 'product', attributes: [] }] }),
            LeadDetail.count({ where: { ...leadWhereBase, status: 'won' }, include: [{ model: Product, as: 'product', attributes: [] }] }),
            LeadDetail.count({ where: { ...leadWhereBase, status: 'lost' }, include: [{ model: Product, as: 'product', attributes: [] }] }),
            LeadDetail.count({ where: { ...leadWhereBase, status: 'new' }, include: [{ model: Product, as: 'product', attributes: [] }] })
        ]);

        // 3. Last 7 Days Date Range
        const dateFilter = {
            [Op.gte]: literal("CURRENT_DATE - INTERVAL '6 days'")
        };

        // 4. Trends Queries
         // -------- PRODUCT TREND (last 7 days) --------
        const productTrends = await Product.findAll({
            attributes: [
                [fn('to_char', fn('date', col('created_at')), 'dy'), 'day_name'],
                [fn('date', col('created_at')), 'day_date'],
                [fn('COUNT', '*'), 'total_products'],
                [fn('COUNT', literal("CASE WHEN is_publish = true AND is_approved = true THEN 1 END")), 'active_products'],
                [fn('COUNT', literal("CASE WHEN is_drapt = true AND is_approved = false AND is_publish = false THEN 1 END")), 'draft_products'],
                [fn('COUNT', literal("CASE WHEN is_publish = false AND is_approved = true THEN 1 END")), 'unpublished_products']
            ],
            where: {
                created_at: {
                    [Op.gte]: literal("CURRENT_DATE - INTERVAL '6 days'"),
                    [Op.lt]: literal("CURRENT_DATE")
                }
            },
            group: ['day_date'],
            order: [[literal('day_date'), 'ASC']],
            raw: true
        });

        const totalProductCreatedInLastWeek = {};
        productTrends.forEach(row => {
            totalProductCreatedInLastWeek[row.day_name] = {
                total_products: Number(row.total_products),
                active_products: Number(row.active_products),
                draft_products: Number(row.draft_products),
                unpublished_products: Number(row.unpublished_products)
            };
        });

        // -------- LEADS TREND (last 7 days) --------
        const leadTrends = await LeadDetail.findAll({
            attributes: [
                [fn('to_char', fn('date', col('created_at')), 'dy'), 'day_name'],
                [fn('date', col('created_at')), 'day_date'],
                [fn('COUNT', '*'), 'total_leads'],
                [fn('COUNT', literal("CASE WHEN status = 'won' THEN 1 END")), 'won_leads'],
                [fn('COUNT', literal("CASE WHEN status = 'lost' THEN 1 END")), 'lost_leads'],
                [fn('COUNT', literal("CASE WHEN status = 'new' THEN 1 END")), 'pending_leads']
            ],
            where: {
                created_at: {
                    [Op.gte]: literal("CURRENT_DATE - INTERVAL '6 days'")
                }
            },
            group: ['day_date'],
            order: [[literal('day_date'), 'ASC']],
            raw: true
        });

        const totalLeadsCreatedInLastWeek = {};
        leadTrends.forEach(row => {
            console.log(row.pending_leads);
            totalLeadsCreatedInLastWeek[row.day_name] = {
                total_leads: Number(row.total_leads),
                won_leads: Number(row.won_leads),
                lost_leads: Number(row.lost_leads),
                pending_leads: Number(row.pending_leads)
            };
        });


        // 5. Format Trend Data for Frontend
        const formatTrend = (trends, keys) => {
            const result = {};
            trends.forEach(row => {
                const data = {};
                keys.forEach(key => data[key] = Number(row[key] || 0));
                result[row.day_name] = data;
            });
            return result;
        };

        // 6. Final Response
        return res.status(200).json({
            status: 'success',
            data: {
                products: {
                    total_products: totalProducts,
                    active_products: activeProducts,
                    draft_products: draftProducts,
                    unpublished_products: unpublishedProducts,
                    inactive_products: inactiveProducts
                },
                services: {
                    total_services: totalServices,
                    active_services: activeServices,
                    draft_services: draftServices,
                    unpublished_services: unpublishedServices,
                    inactive_services: inactiveServices
                },
                solutions: {
                    total_solutions: totalSolutions,
                    active_solutions: activeSolutions,
                    draft_solutions: draftSolutions,
                    unpublished_solutions: unpublishedSolutions,
                    inactive_solutions: inactiveSolutions
                },
                leads: {
                    total_leads: totalLeads,
                    won_leads: wonLeads,
                    lost_leads: lostLeads,
                    pending_leads: pendingLeads
                },
                totalProductCreatedInLastWeek: formatTrend(productTrends, ['total', 'active', 'draft', 'unpublished']),
                totalLeadsCreatedInLastWeek: formatTrend(leadTrends, ['total', 'won', 'lost', 'pending'])
            },
            code: 200
        });

    } catch (err) {
        console.error('Dashboard Stats Error:', err);
        return res.status(500).json({
            status: 'fail',
            message: 'Internal server error',
            code: 500
        });
    }
};


const getLeadDataFilter = async (req, res) => {
    try{

        const { role_id, id: userId } = req.user;
        const isAdmin = role_id === 4;

        const days = Number(req.query.days || 30);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const leadWhereBase = {
            created_at: {
                [Op.gte]: startDate
            }
        };
        const [ totalLeads, wonLeads, lostLeads, pendingLeads ] = await Promise.all([

            LeadDetail.count({
                where: leadWhereBase,
                include: [{ model: Product, as: 'product', attributes: [] }]
            }),

            LeadDetail.count({
                where: {
                ...leadWhereBase,
                status: 'won'
                },
                include: [{ model: Product, as: 'product', attributes: [] }]
            }),

            LeadDetail.count({
                where: {
                ...leadWhereBase,
                status: 'lost'
                },
                include: [{ model: Product, as: 'product', attributes: [] }]
            }),

            LeadDetail.count({
                where: {
                ...leadWhereBase,
                status: 'new'
                },
                include: [{ model: Product, as: 'product', attributes: [] }]
            })

        ]);


        return res.status(200).json({
                status: 'success',
                data: {
                    leads: {
                        total_leads: totalLeads,
                        won_leads: wonLeads,
                        lost_leads: lostLeads,
                        pending_leads: pendingLeads
                    }
                },
                code: 200
            });
        } catch (err) {
            console.error('Lead Data Filter Error:', err);
            return res.status(500).json({
                status: 'fail',
                message: 'Internal server error',
                code: 500
            });
        }
}


const getNotifications = async (req, res) => {
    try {
        const pool = require('../config/database');
        const { role_type, id: userId } = req.user;

        let notifications = [];

        if (role_type === 'SUPER_ADMIN' || role_type === 'ADMIN') {
            // Full visibility: pending approvals, new users, all new leads
            const [pendingProducts, pendingServices, pendingSolutions, newUsers, newLeads] = await Promise.all([
                pool.query(`SELECT id, name, 'product' as type, created_at FROM products WHERE is_approved = false AND is_drapt = false AND is_publish = false AND action_type = 'product' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`),
                pool.query(`SELECT id, name, 'service' as type, created_at FROM products WHERE is_approved = false AND is_drapt = false AND is_publish = false AND action_type = 'service' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`),
                pool.query(`SELECT id, name, 'solution' as type, created_at FROM products WHERE is_approved = false AND is_drapt = false AND is_publish = false AND action_type = 'solution' AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 10`),
                pool.query(`SELECT id, name, email, role_type, created_at FROM users WHERE created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 10`),
                pool.query(`SELECT ld.id, ld.status, ld.action_type, ld.created_at, u.name as user_name, u.email as user_email FROM lead_details ld LEFT JOIN users u ON ld.user_id::integer = u.id WHERE ld.created_at >= NOW() - INTERVAL '7 days' ORDER BY ld.created_at DESC LIMIT 10`),
            ]);
            notifications = [
                ...pendingProducts.rows.map(r => ({ id: r.id, message: `New product "${r.name}" pending approval`, type: 'product', created_at: r.created_at })),
                ...pendingServices.rows.map(r => ({ id: r.id, message: `New service "${r.name}" pending approval`, type: 'service', created_at: r.created_at })),
                ...pendingSolutions.rows.map(r => ({ id: r.id, message: `New solution "${r.name}" pending approval`, type: 'solution', created_at: r.created_at })),
                ...newUsers.rows.map(r => ({ id: r.id, message: `New ${r.role_type} registered: ${r.name}`, type: 'user', created_at: r.created_at })),
                ...newLeads.rows.map(r => ({ id: r.id, message: `New lead from ${r.user_name || r.user_email || 'Unknown'}`, type: 'lead', created_at: r.created_at })),
            ];

        } else if (role_type === 'ISV') {
            // ISV sees: approval status of their own products/services/solutions + leads on their listings
            const [approvedItems, rejectedItems, ownLeads] = await Promise.all([
                pool.query(`SELECT id, name, action_type as type, created_at FROM products WHERE user_id = $1 AND is_approved = true AND is_publish = true AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 10`, [userId]),
                pool.query(`SELECT id, name, action_type as type, created_at FROM products WHERE user_id = $1 AND is_approved = false AND is_drapt = false AND is_publish = false AND deleted_at IS NULL AND created_at >= NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 10`, [userId]),
                pool.query(`SELECT ld.id, ld.status, ld.created_at, u.name as user_name, u.email as user_email FROM lead_details ld INNER JOIN products p ON ld.action_id::integer = p.id LEFT JOIN users u ON ld.user_id::integer = u.id WHERE p.user_id = $1 AND ld.created_at >= NOW() - INTERVAL '7 days' ORDER BY ld.created_at DESC LIMIT 10`, [userId]),
            ]);
            notifications = [
                ...approvedItems.rows.map(r => ({ id: r.id, message: `Your ${r.type} "${r.name}" has been approved`, type: r.type, created_at: r.created_at })),
                ...rejectedItems.rows.map(r => ({ id: r.id, message: `Your ${r.type} "${r.name}" is pending review`, type: r.type, created_at: r.created_at })),
                ...ownLeads.rows.map(r => ({ id: r.id, message: `New lead from ${r.user_name || r.user_email || 'Unknown'}`, type: 'lead', created_at: r.created_at })),
            ];

        } else if (role_type === 'ISV_SELLER' || role_type === 'AGENT') {
            // Seller / Affiliate sees leads assigned to them
            const [assignedLeads] = await Promise.all([
                pool.query(`SELECT ld.id, ld.status, ld.created_at, u.name as user_name, u.email as user_email FROM lead_details ld INNER JOIN lead_assigns la ON la.lead_id = ld.id LEFT JOIN users u ON ld.user_id = u.id WHERE la.assign_user_id = $1 AND ld.created_at >= NOW() - INTERVAL '7 days' ORDER BY ld.created_at DESC LIMIT 10`, [userId]),
            ]);
            notifications = [
                ...assignedLeads.rows.map(r => ({ id: r.id, message: `Lead assigned: ${r.user_name || r.user_email || 'Unknown'} (${r.status})`, type: 'lead', created_at: r.created_at })),
            ];

        } else if (role_type === 'SELLER' || role_type === 'M_SELLER' || role_type === 'A_MANAGER' || role_type === 'SUPPORT_PARTNER') {
            // CRM seller roles — show their own CRM opportunity/lead activity
            const [assignedLeads] = await Promise.all([
                pool.query(`SELECT ld.id, ld.status, ld.created_at, u.name as user_name, u.email as user_email FROM lead_details ld INNER JOIN lead_assigns la ON la.lead_id = ld.id LEFT JOIN users u ON ld.user_id = u.id WHERE la.assign_user_id = $1 AND ld.created_at >= NOW() - INTERVAL '7 days' ORDER BY ld.created_at DESC LIMIT 10`, [userId]),
            ]);
            notifications = [
                ...assignedLeads.rows.map(r => ({ id: r.id, message: `Lead assigned: ${r.user_name || r.user_email || 'Unknown'} (${r.status})`, type: 'lead', created_at: r.created_at })),
            ];

        } else {
            // CLIENT / USER sees their own submitted leads/enquiries
            const [myLeads] = await Promise.all([
                pool.query(`SELECT id, status, action_type, created_at FROM lead_details WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '30 days' ORDER BY created_at DESC LIMIT 10`, [userId]),
            ]);
            notifications = [
                ...myLeads.rows.map(r => ({ id: r.id, message: `Your enquiry status: ${r.status}`, type: 'lead', created_at: r.created_at })),
            ];
        }

        notifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return res.status(200).json({
            status: 'success',
            data: { notifications, total: notifications.length }
        });
    } catch (err) {
        console.error('Notifications Error:', err);
        return res.status(500).json({ status: 'fail', message: 'Internal server error' });
    }
};

module.exports = { getProductDashboardStats, getLeadDataFilter, getNotifications };
