const express = require('express');
const statusRoute = require('./status/route');
const sendLinkRoute = require('./send-link/route');
const verifyLinkRoute = require('./verify-link/route');
const statsRoute = require('./stats/route');
const capcutSearchRoute = require('./capcut-search/route');
const web2apkRoute = require('./web2apk/route');

const router = express.Router();

router.use('/status', statusRoute);
router.use('/send-link', sendLinkRoute);
router.use('/verify-link', verifyLinkRoute);
router.use('/stats', statsRoute);
router.use('/capcut-search', capcutSearchRoute);
router.use('/web2apk', web2apkRoute);

module.exports = router;
