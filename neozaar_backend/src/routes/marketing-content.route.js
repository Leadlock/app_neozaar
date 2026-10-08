const router=require('express').Router(),c=require('../controllers/marketing-content.controller'),verify=require('../middlewares/auth'),{requireMarketingManager}=require('../middlewares/marketing.middleware');
router.get('/runtime/forms.js',c.formsRuntime);router.get('/pages/public/:slug/personalized',c.personalizedPage);router.get('/pages/public/:slug',c.publicPage);router.get('/assets/:id/download',c.downloadAsset);
router.use(verify,requireMarketingManager);
router.get('/assets',c.listAssets);router.post('/assets',c.saveAsset);router.put('/assets/:id',c.saveAsset);router.delete('/assets/:id',c.deleteAsset);
router.get('/pages',c.listPages);router.post('/pages',c.savePage);router.put('/pages/:id',c.savePage);router.delete('/pages/:id',c.deletePage);
module.exports=router;
