'use strict';

var orgModule     = require('../modules/orgs');
var feedModule    = require('../modules/feeds');
var accountModule = require('../modules/accounts');
var auth          = require('../auth');

module.exports.init = function(app) {

	app.get('/orgs', auth.restrict, function(req, res) {
		accountModule.getByEmail(req.user.email).then(function(account) {
			orgModule.getAllForAccount(account._id).then(function(orgs) {
				console.log('Returning %d orgs.', orgs.length);
				res.json(orgs);
			});
		});
	});

	app.get('/orgs/:orgId/feeds', auth.restrict, function(req, res) {
		feedModule.getAllByOrgId(req.params.orgId).then(function(feeds) {
			console.log('Returning ' + feeds.length + ' feeds.');
			res.json(feeds);
		});
	});

	app.post('/orgs/:orgId/feeds', auth.restrict, function(req, res){
		feedModule.create(req.body.name, req.params.orgId).done(function(){
			res.json({status:'ok'});
		});
	});
	
	app.get('/orgs/:id', auth.restrict, function(req, res) {
		orgModule.getById(req.params.id).then(function(org) {
			res.json(org);
		});
	});

	app.post('/orgs', auth.restrict, function(req, res) {
		accountModule.getByEmail(req.user.email).then(function(account) {
			orgModule.create(req.body.name, account._id).done(function() {
				res.json({
					status : 'ok'
				});
			});
		});
	});
	
	app.post('/orgs/:orgId/applications', function(req, res) {
		orgModule.addApplication(req.params.orgId, req.body.name).then(function() {
			res.json({
				status : 'ok'
			});
		});
	});
};
