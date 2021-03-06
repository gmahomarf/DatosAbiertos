'use strict';

var q              = require('q');
var database       = require('../modules/database.js');
var accounts       = require('../modules/accounts.js');
var collectionName = 'orgs';

var mod = function() {

	var getCollection = function() {
		return database.collection(collectionName);
	};

	var getById = function(id) {
		return getCollection().then(function(col) {
			return col.getById(id);
		});
	};

	var create = function(name, firstAdminAccountId) {
		var def = q.defer();
		var orgToAdd = {
			name : name,
			admins : [firstAdminAccountId.toString()]
		};
		getCollection().then(function(col) {
			col.add(orgToAdd).then(function(newOrg) {
				accounts.addOrg(firstAdminAccountId, newOrg).then(function() {
					def.resolve(newOrg);
				});
			});
		});
		return def.promise;
	};

	var getAllForAccount = function(accountId) {
		return getCollection().then(function(coll){
			return coll.getAll({
				admins : accountId.toString()
			});
		});
	};
	
	var addApplication = function(orgId, applicationsName){
		return getCollection().then(function(col) {
			return col.getById(orgId).then(function(org) {
				var applications = org.applications || [];
				applications.push({
					_id : database.newId(),
					name : applicationsName
				});

				return col.modify(orgId, {
					applications : applications
				});
			});
		});
	};
	
	return {
		getById : getById,
		create : create,
		getAllForAccount : getAllForAccount,
		addApplication: addApplication
	};
}();

module.exports = mod;
